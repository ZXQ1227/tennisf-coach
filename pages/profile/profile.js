var app = getApp()
var db = wx.cloud.database()

var LEVEL_MAP = {
  beginner: { label: '新手', range: '2.0-2.5', color: '#4ECDC4' },
  intermediate: { label: '进阶', range: '3.0-3.5', color: '#F7B731' },
  advanced: { label: '竞技', range: '4.0+', color: '#FF6B6B' }
}

var STYLE_LABEL = {
  steady: '稳健型', aggressive: '进攻型', allround: '全能型', defensive: '防守型'
}


Page({
  data: {
    player: null,
    hasProfile: false,
    nickname: '',
    avatarUrl: '',
    avatarColor: '#2BB673',
    levelInfo: null,
    styleLabel: '',
    bio: '',
    techScores: null,
    totalGames: 0,
    monthlyGames: 0,
    streak: 0,
    totalHoursNum: '0',
    totalHoursUnit: '小时',
    totalHoursDisplay: '--',
    hoursChangeStr: '',
    hoursChangeColor: 'rgba(255,255,255,0.4)',
    lastActiveLabel: '',
    isActiveToday: false,
    homeCourt: '',
    partners: [],
    likedPartners: {},
    partnerNotes: {},
    noteSheetOpen: false,
    activeNotePartner: '',
    noteInput: '',
    recentGames: [],
    weeklyDays: [],
    heatmapWeeks: [],
    showDaySheet: false,
    daySheetDate: '',
    daySheetGames: [],
    loading: true,
    invites: [],
    inviteCount: 0,
    showInviteSheet: false
  },

  onShow: function() {
    var player = app.globalData.player
    var hasProfile = !!(player && player.nickname)
    var nickname = hasProfile ? player.nickname : (wx.getStorageSync('nickname') || '')
    var COLORS = ['#2BB673', '#4ECDC4', '#F7B731', '#A29BFE', '#FF6B6B']
    var avatarColor = nickname ? COLORS[nickname.charCodeAt(nickname.length - 1) % COLORS.length] : '#2BB673'
    var levelInfo = hasProfile ? (LEVEL_MAP[player.level] || LEVEL_MAP.intermediate) : null
    var styleLabel = hasProfile ? (STYLE_LABEL[player.playStyle] || '') : ''
    var likedPartners = wx.getStorageSync('likedPartners') || {}
    var partnerNotes = wx.getStorageSync('partnerNotes') || {}

    var techScores = hasProfile ? this._computeTechScores(player) : null
    var self = this
    this.setData({
      player: player || null,
      hasProfile: hasProfile,
      nickname: nickname,
      avatarUrl: (player && player.avatarUrl) || '',
      avatarColor: avatarColor,
      levelInfo: levelInfo,
      styleLabel: styleLabel,
      bio: (player && player.bio) || '',
      likedPartners: likedPartners,
      partnerNotes: partnerNotes,
      techScores: techScores
    }, function() {
      if (techScores) self._drawRadarWithRetry(techScores, 0)
    })
    this.loadActivity()
    if (hasProfile) this.loadInvites()
  },

  goSetup: function() { wx.navigateTo({ url: '/pages/setup/setup' }) },
  goEdit: function() { wx.navigateTo({ url: '/pages/setup/setup?mode=edit' }) },
  goPostTab: function() { wx.navigateTo({ url: '/pages/post/post' }) },

  openAICoach: function() {
    var H5_BASE = 'https://zxq1227.github.io/tennisf-coach/coach.html'
    var player = app.globalData.player || {}
    var fields = {
      nickname: player.nickname,
      avatarUrl: player.avatarUrl,
      level: player.level,
      ntrpLevel: player.ntrpLevel,
      playStyle: player.playStyle,
      strengths: player.strengths,
      weaknesses: player.weaknesses,
      goals: player.goals,
      fitnessLevel: player.fitnessLevel,
      injuries: player.injuries
    }
    var url = H5_BASE + '?p=' + encodeURIComponent(JSON.stringify(fields))
    wx.setClipboardData({
      data: url,
      success: function() {
        wx.showModal({
          title: 'AI 教练',
          content: '链接已复制\n请在手机浏览器粘贴访问',
          showCancel: false,
          confirmText: '知道了'
        })
      }
    })
  },

  goDetailFromTimeline: function(e) {
    var id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  viewPartner: function(e) {
    var name = e.currentTarget.dataset.name || ''
    if (!name) return
    wx.navigateTo({ url: '/pages/pub-profile/pub-profile?nickname=' + encodeURIComponent(name) })
  },

  invitePartner: function(e) {
    var name = e.currentTarget.dataset.name || ''
    if (name) {
      wx.setStorageSync('postPrefillNote', '约 ' + name + ' 一起打')
      wx.setStorageSync('postPrefillPartner', name)
    }
    wx.navigateTo({ url: '/pages/post/post' })
  },

  likePartner: function(e) {
    var name = e.currentTarget.dataset.name
    var liked = Object.assign({}, this.data.likedPartners)
    if (liked[name]) {
      delete liked[name]
    } else {
      liked[name] = true
      wx.showToast({ title: '已添加喜爱 ❤️', icon: 'none' })
    }
    wx.setStorageSync('likedPartners', liked)
    this.setData({ likedPartners: liked })
  },

  showNoteSheet: function(e) {
    var name = e.currentTarget.dataset.name
    var note = (this.data.partnerNotes || {})[name] || ''
    this.setData({ noteSheetOpen: true, activeNotePartner: name, noteInput: note })
  },

  closeNoteSheet: function() { this.setData({ noteSheetOpen: false }) },

  onNoteInput: function(e) { this.setData({ noteInput: e.detail.value }) },

  clearNote: function() {
    var name = this.data.activeNotePartner
    var notes = Object.assign({}, this.data.partnerNotes)
    delete notes[name]
    wx.setStorageSync('partnerNotes', notes)
    this.setData({ partnerNotes: notes, noteSheetOpen: false })
  },

  submitNote: function() {
    var name = this.data.activeNotePartner
    var note = (this.data.noteInput || '').trim()
    var notes = Object.assign({}, this.data.partnerNotes)
    if (note) { notes[name] = note } else { delete notes[name] }
    wx.setStorageSync('partnerNotes', notes)
    this.setData({ partnerNotes: notes, noteSheetOpen: false })
    if (note) wx.showToast({ title: '备注已保存', icon: 'none' })
  },

  // ── Heatmap ──

  onHeatmapCellTap: function(e) {
    var date = e.currentTarget.dataset.date
    var count = e.currentTarget.dataset.count
    if (!count || count <= 0) return
    var games = (this._gamesByDate && this._gamesByDate[date]) || []
    var parts = date.split('-')
    var label = parts.length >= 3 ? (parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日') : date
    this.setData({ showDaySheet: true, daySheetDate: label, daySheetGames: games })
  },

  closeDaySheet: function() { this.setData({ showDaySheet: false }) },

  noop: function() {},

  // ── Invitations ──

  loadInvites: async function() {
    try {
      var res = await wx.cloud.callFunction({ name: 'getInvitations' })
      var invites = (res && res.result && res.result.invitations) || []
      this.setData({ invites: invites, inviteCount: invites.length })
    } catch(e) {}
  },

  openInviteSheet: function() { this.setData({ showInviteSheet: true }) },
  closeInviteSheet: function() { this.setData({ showInviteSheet: false }) },

  acceptInvite: async function(e) {
    var inviteId = e.currentTarget.dataset.id
    var fromNickname = e.currentTarget.dataset.from
    try {
      await wx.cloud.callFunction({ name: 'respondInvite', data: { inviteId: inviteId, action: 'accept' } })
    } catch(e) {}
    var invites = this.data.invites.filter(function(i) { return i._id !== inviteId })
    this.setData({ invites: invites, inviteCount: invites.length, showInviteSheet: false })
    wx.setStorageSync('postPrefillNote', '约 ' + fromNickname + ' 一起打')
    wx.setStorageSync('postPrefillPartner', fromNickname)
    wx.navigateTo({ url: '/pages/post/post' })
  },

  ignoreInvite: async function(e) {
    var inviteId = e.currentTarget.dataset.id
    try {
      await wx.cloud.callFunction({ name: 'respondInvite', data: { inviteId: inviteId, action: 'ignore' } })
    } catch(e) {}
    var invites = this.data.invites.filter(function(i) { return i._id !== inviteId })
    this.setData({ invites: invites, inviteCount: invites.length })
    if (invites.length === 0) this.setData({ showInviteSheet: false })
  },

  loadActivity: async function() {
    this.setData({ loading: true })
    try {
      var callRes = await wx.cloud.callFunction({ name: 'getMyActivity' })
      var result = (callRes && callRes.result) || {}
      var created = result.created || []
      var joined = result.joined || []
      var allRaw = created.concat(joined).sort(function(a, b) {
        var ta = (a.createdAt && (a.createdAt.$date || a.createdAt)) || 0
        var tb = (b.createdAt && (b.createdAt.$date || b.createdAt)) || 0
        if (ta && tb) return tb - ta
        return new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)
      })

      var pad = function(n) { return String(n).padStart(2, '0') }
      var now = new Date()
      var monthStr = now.getFullYear() + '-' + pad(now.getMonth() + 1)
      var todayStr = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())

      var totalGames = allRaw.length
      var monthlyGames = allRaw.filter(function(p) { return p.date && p.date.indexOf(monthStr) === 0 }).length

      var courtCounts = {}
      allRaw.forEach(function(p) {
        if (p.location) courtCounts[p.location] = (courtCounts[p.location] || 0) + 1
      })
      var courtKeys = Object.keys(courtCounts).sort(function(a, b) { return courtCounts[b] - courtCounts[a] })
      var homeCourt = courtKeys[0] || (this.data.player && this.data.player.homeBase) || ''

      var gameDates = {}
      allRaw.forEach(function(p) { if (p.date) gameDates[p.date] = true })
      var streak = 0
      for (var i = 0; i < 60; i++) {
        var d = new Date(now)
        d.setDate(d.getDate() - i)
        var ds = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
        if (gameDates[ds]) streak++
        else if (i > 0) break
      }

      var lastActiveLabel = '暂无记录'
      if (allRaw.length > 0 && allRaw[0].date) {
        var diff = Math.floor((new Date(todayStr) - new Date(allRaw[0].date)) / 86400000)
        lastActiveLabel = diff === 0 ? '今天打球了 🎾' : diff === 1 ? '昨天打球' : diff + '天前打球'
      }

      var nickname = this.data.nickname
      var partnerCounts = {}
      allRaw.forEach(function(p) {
        ;(p.joiners || []).forEach(function(j) {
          if (j !== nickname) partnerCounts[j] = (partnerCounts[j] || 0) + 1
        })
      })
      var PCOLORS = ['#2BB673', '#4ECDC4', '#F7B731', '#A29BFE', '#FF6B6B', '#FD79A8']
      var partnerKeys = Object.keys(partnerCounts).sort(function(a, b) { return partnerCounts[b] - partnerCounts[a] })
      var partnerNames = partnerKeys.slice(0, 5)
      var partners = partnerNames.map(function(name, i) {
        return { name: name, count: partnerCounts[name], color: PCOLORS[i % PCOLORS.length], initial: name.slice(-1), avatarUrl: '' }
      })

      // 同步批量查询球搭子真实头像（在同一 async 上下文中）
      if (partnerNames.length > 0) {
        try {
          var avatarRes = await db.collection('players')
            .where({ nickname: db.command.in(partnerNames) })
            .field({ nickname: true, avatarUrl: true })
            .get()
          var avatarMap = {}
          ;(avatarRes.data || []).forEach(function(p) { avatarMap[p.nickname] = p.avatarUrl || '' })
          partners = partners.map(function(p) { return Object.assign({}, p, { avatarUrl: avatarMap[p.name] || '' }) })
        } catch(e) {}
      }

      // Per-day data for heatmap + total hours
      var dayMatchData = {}
      allRaw.forEach(function(p) {
        if (!p.date) return
        if (!dayMatchData[p.date]) dayMatchData[p.date] = { count: 0, minutes: 0 }
        dayMatchData[p.date].count++
        var minutes = (p.manuallyEnded && p.endedAt && p.gameTimestamp)
          ? Math.max(0, Math.floor((p.endedAt - p.gameTimestamp) / 60000))
          : (p.estimatedDuration || 120)
        dayMatchData[p.date].minutes += minutes
      })

      var prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      var prevMonthStr = prevMonthDate.getFullYear() + '-' + pad(prevMonthDate.getMonth() + 1)

      var totalMinutes = 0, curMonthMinutes = 0, prevMonthMinutes = 0
      Object.keys(dayMatchData).forEach(function(k) {
        totalMinutes += dayMatchData[k].minutes
        if (k.indexOf(monthStr) === 0) curMonthMinutes += dayMatchData[k].minutes
        if (k.indexOf(prevMonthStr) === 0) prevMonthMinutes += dayMatchData[k].minutes
      })
      var totalH = Math.floor(totalMinutes / 60)
      var totalHoursNum = totalH > 0 ? String(totalH) : String(totalMinutes)
      var totalHoursUnit = totalH > 0 ? '小时' : '分钟'
      var totalHoursDisplay = totalH > 0 ? totalH + 'h' : totalMinutes + 'min'

      var curMonthH = Math.round(curMonthMinutes / 60 * 10) / 10
      var prevMonthH = Math.round(prevMonthMinutes / 60 * 10) / 10
      var hoursChangeDelta = Math.round((curMonthH - prevMonthH) * 10) / 10
      var hoursChangeStr = prevMonthMinutes === 0 ? '' : (hoursChangeDelta >= 0 ? '+' + hoursChangeDelta + 'h' : hoursChangeDelta + 'h')
      var hoursChangeColor = hoursChangeDelta > 0 ? '#B2FF33' : hoursChangeDelta < 0 ? '#FF6B6B' : 'rgba(255,255,255,0.4)'

      // Games by date (for day sheet tap)
      var gamesByDate = {}
      allRaw.forEach(function(p) {
        if (!p.date) return
        var processed = app.processPost(p)
        processed.partners = (p.joiners || []).filter(function(j) { return j !== nickname }).join('、') || '独自练球'
        if (!gamesByDate[p.date]) gamesByDate[p.date] = []
        gamesByDate[p.date].push(processed)
      })
      this._gamesByDate = gamesByDate

      // Heatmap: 17 weeks × 7 days, columns = weeks, rows = days (Mon→Sun)
      var heatmapWeeks = []
      var todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      var dayOfWeek = (todayDate.getDay() + 6) % 7 // 0=Mon 6=Sun
      var startDate = new Date(todayDate)
      startDate.setDate(startDate.getDate() - dayOfWeek - 16 * 7)
      for (var w = 0; w < 17; w++) {
        var week = []
        for (var dd = 0; dd < 7; dd++) {
          var cellDate = new Date(startDate)
          cellDate.setDate(cellDate.getDate() + w * 7 + dd)
          var cellDs = cellDate.getFullYear() + '-' + pad(cellDate.getMonth() + 1) + '-' + pad(cellDate.getDate())
          var isFuture = cellDate > todayDate
          var dayData = dayMatchData[cellDs] || { count: 0, minutes: 0 }
          var cnt = dayData.count
          var intensity = isFuture ? 0 : (cnt >= 3 ? 3 : cnt >= 2 ? 2 : cnt >= 1 ? 1 : 0)
          week.push({
            date: cellDs, count: cnt, intensity: intensity,
            isFuture: isFuture,
            cellClass: isFuture ? 'hm-future' : 'hm-i' + intensity
          })
        }
        heatmapWeeks.push(week)
      }

      var AVATAR_COLORS = ['#2BB673', '#4ECDC4', '#F7B731', '#A29BFE', '#FF6B6B']
      var recentGames = allRaw.slice(0, 8).map(function(p) {
        var processed = app.processPost(p)

        // 对阵球友
        var opponents = (p.joiners || []).filter(function(j) { return j !== nickname })
        var hasOpponent = opponents.length > 0
        var opponentAvatars = opponents.slice(0, 2).map(function(name) {
          return { name: name, initial: name.slice(-1), color: AVATAR_COLORS[name.charCodeAt(name.length - 1) % AVATAR_COLORS.length] }
        })
        var opponentText = opponents.length > 2
          ? opponents.slice(0, 2).join('、') + ' 等' + opponents.length + '人'
          : opponents.join('、')

        // 比分（liveScore 存储当前/最终盘分）
        var ls = p.liveScore
        var scoreText = ''
        if (ls && ls.a !== undefined && ls.b !== undefined) {
          scoreText = ls.a + ':' + ls.b
          if (ls.set && ls.set > 1) scoreText += '（第' + ls.set + '盘）'
        }

        // 打球时长
        var mins = (p.manuallyEnded && p.endedAt && p.gameTimestamp)
          ? Math.max(0, Math.floor((p.endedAt - p.gameTimestamp) / 60000))
          : (p.estimatedDuration || 120)
        var dh = Math.floor(mins / 60); var dm = mins % 60
        var durationText = dh > 0 ? dh + 'h' + (dm > 0 ? dm + 'm' : '') : dm + 'm'

        // 时间描述
        var dayDiff = Math.floor((new Date(todayStr) - new Date(p.date)) / 86400000)
        var dayAgoText = dayDiff === 0 ? '今天' : dayDiff === 1 ? '昨天' : (p.date || '').slice(5).replace('-', '月') + '日'

        // 氛围描述
        var vibeText
        if (p.cancelled) { vibeText = '已取消' }
        else if (!hasOpponent) { vibeText = '独自练球' }
        else if (p.matchType === 'doubles') { vibeText = '双打搭档' }
        else { vibeText = '单打对决' }

        // 轻 feed 一行描述
        var rmDesc
        if (p.cancelled) {
          rmDesc = '🚫 已取消'
        } else if (!hasOpponent) {
          rmDesc = '🎾 独自练球 · ' + durationText
        } else if (scoreText) {
          rmDesc = '🎾 对战 ' + opponentText + ' · ' + scoreText
        } else {
          rmDesc = '🎾 和 ' + opponentText + ' · ' + durationText
        }

        return Object.assign({}, processed, {
          hasOpponent: hasOpponent, opponentAvatars: opponentAvatars, opponentText: opponentText,
          scoreText: scoreText, durationText: durationText, dayAgoText: dayAgoText,
          vibeText: vibeText, rmDesc: rmDesc, mediaUrls: [], hasMedia: false, mediaCount: 0
        })
      })

      var isActiveToday = lastActiveLabel === '今天打球了 🎾'

      // Weekly rhythm: last 7 days
      var DAYNAMES = ['日', '一', '二', '三', '四', '五', '六']
      var weeklyDays = []
      for (var wi = 6; wi >= 0; wi--) {
        var wd = new Date(now)
        wd.setDate(wd.getDate() - wi)
        var wds = wd.getFullYear() + '-' + pad(wd.getMonth() + 1) + '-' + pad(wd.getDate())
        var wdData = dayMatchData[wds] || { count: 0, minutes: 0 }
        var wdH = Math.floor(wdData.minutes / 60)
        var wdM = wdData.minutes % 60
        weeklyDays.push({
          date: wds,
          dayName: '周' + DAYNAMES[wd.getDay()],
          count: wdData.count,
          durationText: wdData.count > 0 ? (wdH > 0 ? wdH + 'h' : wdM + 'm') : '',
          isToday: wi === 0,
          hasGame: wdData.count > 0
        })
      }

      // ── 球搭子系统 v2 ──
      var partnerLastGame = {}
      var partnerCourts = {}     // name → { courtName: count }
      var partnerNight = {}      // name → { night: 0, total: 0 }
      var partnerDoubles = {}    // name → { doubles: 0, total: 0 }

      allRaw.forEach(function(p) {
        var hour = p.time ? parseInt(p.time.split(':')[0]) : 12
        var isNight = hour >= 18
        var isDoubles = p.matchType === 'doubles'
        ;(p.joiners || []).forEach(function(j) {
          if (j !== nickname) {
            if (!partnerLastGame[j] || p.date > partnerLastGame[j]) partnerLastGame[j] = p.date
            if (p.location) {
              if (!partnerCourts[j]) partnerCourts[j] = {}
              partnerCourts[j][p.location] = (partnerCourts[j][p.location] || 0) + 1
            }
            if (!partnerNight[j]) partnerNight[j] = { night: 0, total: 0 }
            partnerNight[j].total++
            if (isNight) partnerNight[j].night++
            if (!partnerDoubles[j]) partnerDoubles[j] = { doubles: 0, total: 0 }
            partnerDoubles[j].total++
            if (isDoubles) partnerDoubles[j].doubles++
          }
        })
      })

      partners = partners.map(function(p) {
        var cnt = p.count

        // 主关系称号（按场次）
        var title, titleIcon, isStrong
        if (cnt >= 10) { title = '黄金搭子'; titleIcon = '🏆'; isStrong = true }
        else if (cnt >= 6) { title = '固定搭子'; titleIcon = '🤝'; isStrong = true }
        else if (cnt >= 3) { title = '老搭子'; titleIcon = '⭐'; isStrong = false }
        else { title = '球搭子'; titleIcon = '🎾'; isStrong = false }

        // 上次时间
        var lastDate = partnerLastGame[p.name] || ''
        var lastText = ''
        if (lastDate) {
          var ld = Math.floor((new Date(todayStr) - new Date(lastDate)) / 86400000)
          lastText = ld === 0 ? '今天' : ld === 1 ? '昨天' : ld + ' 天前'
        }

        // 情景标签：夜场搭子 / 黄金双打
        var badges = []
        var nd = partnerNight[p.name] || { night: 0, total: 1 }
        var dd = partnerDoubles[p.name] || { doubles: 0, total: 1 }
        if (cnt >= 3 && nd.night >= 2 && nd.night / nd.total >= 0.55) {
          badges.push({ label: '夜场搭子', icon: '🌙' })
        }
        if (cnt >= 3 && dd.doubles >= 2 && dd.doubles / dd.total >= 0.5) {
          badges.push({ label: '黄金双打', icon: '🎾' })
        }
        if (badges.length > 0) isStrong = true

        // 常去球场（最多 2 个）
        var courts = partnerCourts[p.name] || {}
        var commonCourts = Object.keys(courts)
          .sort(function(a, b) { return courts[b] - courts[a] })
          .slice(0, 2)

        return Object.assign({}, p, {
          title: title, titleIcon: titleIcon, lastText: lastText,
          badges: badges, commonCourts: commonCourts, isStrong: isStrong
        })
      })

      this.setData({
        totalGames: totalGames, monthlyGames: monthlyGames, streak: streak,
        totalHoursNum: totalHoursNum, totalHoursUnit: totalHoursUnit,
        totalHoursDisplay: totalHoursDisplay,
        hoursChangeStr: hoursChangeStr, hoursChangeColor: hoursChangeColor,
        lastActiveLabel: lastActiveLabel, isActiveToday: isActiveToday, homeCourt: homeCourt,
        partners: partners,
        recentGames: recentGames, heatmapWeeks: heatmapWeeks,
        weeklyDays: weeklyDays, loading: false
      })
      // 写入 globalData 供动态页使用
      app.globalData.activityCache = {
        nickname: nickname,
        streak: streak,
        achievements: [],
        partners: partners,
        updatedAt: Date.now(),
      }
      this.loadRecentMedia(recentGames)
    } catch(e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  _computeTechScores: function(player) {
    if (player.techScores && player.techScores.forehand) return player.techScores
    var NTRP_BASE = { '1.5': 20, '2.0': 30, '2.5': 38, '3.0': 52, '3.5': 63, '4.0': 75, '4.5': 85 }
    var base = NTRP_BASE[player.ntrpLevel] || 40
    var s = { forehand: base, backhand: base, serve: base, footwork: base, volley: base }
    var strengthMap = { '正手': 'forehand', '反手': 'backhand', '发球': 'serve', '截击': 'volley', '步伐': 'footwork' }
    ;(player.strengths || []).forEach(function(k) {
      if (strengthMap[k]) s[strengthMap[k]] = Math.min(95, s[strengthMap[k]] + 20)
    })
    var weakMap = {
      '步伐慢': { footwork: -20 }, '发球无力': { serve: -20 },
      '下网': { forehand: -10, backhand: -10 }, '出界': { forehand: -10, backhand: -10 },
      '不会上旋': { forehand: -15, backhand: -10 }, '心理紧张': { forehand: -5, backhand: -5, serve: -10 }
    }
    ;(player.weaknesses || []).forEach(function(k) {
      var p = weakMap[k] || {}
      Object.keys(p).forEach(function(ax) { s[ax] = Math.max(10, s[ax] + p[ax]) })
    })
    return s
  },

  _drawRadarWithRetry: function(scores, attempt) {
    var self = this
    var delays = [300, 700, 1500]
    if (attempt >= delays.length) return
    setTimeout(function() {
      var query = wx.createSelectorQuery().in(self)
      query.select('#radar').fields({ node: true, size: true }).exec(function(res) {
        if (res && res[0] && res[0].node) {
          self.drawRadarChart(res[0].node, res[0].width, res[0].height, scores)
        } else {
          self._drawRadarWithRetry(scores, attempt + 1)
        }
      })
    }, delays[attempt])
  },

  drawRadarChart: function(canvas, W, H, scores) {
      var dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2
      canvas.width = W * dpr; canvas.height = H * dpr
      var ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)

      var cx = W / 2, cy = H / 2 + 6, R = Math.min(W, H) * 0.30
      var labels = ['正手', '反手', '发球', '步伐', '截击']
      var keys   = ['forehand', 'backhand', 'serve', 'footwork', 'volley']
      var N = 5
      var angle = function(i) { return (i * 2 * Math.PI / N) - Math.PI / 2 }

      // Grid rings
      ctx.strokeStyle = 'rgba(178,255,51,0.15)'
      ctx.lineWidth = 1
      for (var ring = 1; ring <= 4; ring++) {
        ctx.beginPath()
        for (var i = 0; i < N; i++) {
          var r = R * ring / 4
          var x = cx + r * Math.cos(angle(i)), y = cy + r * Math.sin(angle(i))
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.closePath(); ctx.stroke()
      }

      // Axes
      ctx.strokeStyle = 'rgba(178,255,51,0.2)'
      for (var i = 0; i < N; i++) {
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + R * Math.cos(angle(i)), cy + R * Math.sin(angle(i)))
        ctx.stroke()
      }

      // Data polygon
      ctx.beginPath()
      for (var i = 0; i < N; i++) {
        var v = Math.max(0, Math.min(100, scores[keys[i]] || 0)) / 100
        var x = cx + R * v * Math.cos(angle(i)), y = cy + R * v * Math.sin(angle(i))
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = 'rgba(178,255,51,0.18)'; ctx.fill()
      ctx.strokeStyle = 'rgba(178,255,51,0.85)'; ctx.lineWidth = 2; ctx.stroke()

      // Data dots
      ctx.fillStyle = '#B2FF33'
      for (var i = 0; i < N; i++) {
        var v = Math.max(0, Math.min(100, scores[keys[i]] || 0)) / 100
        var x = cx + R * v * Math.cos(angle(i)), y = cy + R * v * Math.sin(angle(i))
        ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI); ctx.fill()
      }

      // Labels
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = 'bold 13px PingFang SC'
      var pad = 28
      for (var i = 0; i < N; i++) {
        var a = angle(i)
        var lx = cx + (R + pad) * Math.cos(a), ly = cy + (R + pad) * Math.sin(a)
        ctx.fillText(labels[i], lx, ly)
      }
  },

  loadRecentMedia: function(games) {
    var self = this
    if (!games || !games.length) return
    var ids = games.map(function(g) { return g._id }).filter(Boolean)
    if (!ids.length) return
    db.collection('moments')
      .where({ postId: db.command.in(ids) })
      .limit(60)
      .get()
      .then(function(res) {
        var photoMap = {}
        ;(res.data || []).forEach(function(m) {
          if (m.type === 'photo' && m.imageUrls && m.imageUrls.length) {
            if (!photoMap[m.postId]) photoMap[m.postId] = []
            photoMap[m.postId] = photoMap[m.postId].concat(m.imageUrls)
          }
        })
        var updated = (self.data.recentGames || []).map(function(g) {
          var urls = (photoMap[g._id] || []).slice(0, 3)
          return Object.assign({}, g, { mediaUrls: urls, hasMedia: urls.length > 0, mediaCount: urls.length })
        })
        self.setData({ recentGames: updated })
      })
      .catch(function() {})
  }
})
