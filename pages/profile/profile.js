var app = getApp()
var db = wx.cloud.database()

// ── 今日推荐计划逻辑 (与 training.js 共用同一套映射) ──────────
var _WEAKNESS_PLAN = {
  '双反':    { title: '双手反手稳定性训练', sub: '强化反手握拍与跟进击球节奏' },
  '单反':    { title: '单手反手技术训练',   sub: '提升单反引拍时机与发力链' },
  '反手':    { title: '反手稳定性训练',     sub: '提升反手击球的稳定性和控制力' },
  '正手':    { title: '正手稳定性训练',     sub: '提升正手击球节奏与落点控制' },
  '发球':    { title: '发球专项训练',       sub: '提升发球速度与落点精准度' },
  '发球无力':{ title: '发球力量训练',       sub: '增强发球爆发力与身体旋转协调' },
  '截击':    { title: '网前截击训练',       sub: '提升网前判断力与接触点控制' },
  '网前':    { title: '网前技术训练',       sub: '加强上网时机判断与截击手感' },
  '步伐':    { title: '步伐专项训练',       sub: '提升移位速度与重心控制能力' },
  '步伐慢':  { title: '步伐灵活性训练',     sub: '改善移动效率与脚步灵活性' },
  '移动':    { title: '移动步伐训练',       sub: '强化横向移动与急停启动能力' },
  '下网':    { title: '过网高度控制训练',   sub: '调整击球弧度，减少下网失误' },
  '不会上旋':{ title: '上旋球技术训练',     sub: '掌握正确的拉球动作与旋转发力' },
  '高压球':  { title: '高压球专项训练',     sub: '强化头顶球判断与发力节奏' },
}
var _GOAL_PLAN = {
  '稳定对拉': { title: '底线稳定性训练',  sub: '强化底线对拉节奏与容错率' },
  '发球提升': { title: '发球专项训练',    sub: '提升发球速度与落点精准度' },
  '上网截击': { title: '上网攻击性训练',  sub: '练习上网时机选择与截击手感' },
  '步伐改善': { title: '步伐灵活性训练',  sub: '提升移步速度与重心稳定性' },
  '提高稳定性':{ title: '全场稳定性训练', sub: '减少非受迫性失误，建立技术框架' },
}
var _LEVEL_META = {
  '1.5': { label: '入门', duration: 20 }, '2.0': { label: '初级', duration: 25 },
  '2.5': { label: '初中级', duration: 30 }, '3.0': { label: '中级', duration: 35 },
  '3.5': { label: '中高级', duration: 40 }, '4.0': { label: '进阶', duration: 50 },
  '4.5': { label: '高级', duration: 60 },
}

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
    radarImgSrc: '',
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
    showInviteSheet: false,
    swingStats: { fhTotal: 0, bhTotal: 0, svTotal: 0, vlTotal: 0, sessions: 0, lastSession: null },
    swingChartData: { series: [], labels: ['周日','周一','周二','周三','周四','周五','周六'], todayIdx: 0, maxVal: 100, hasData: false },
    statusBarHeight: 0,
    weeklyCount: 0,
    swingTotal: 0,
    insightLine1: '',
    insightLine2: '',
    radarImageUrl: '',
    todayDateText: '',
    todayPlan: { title: '基础稳定性训练', sub: '全面提升击球基础', badge: '今日推荐', difficulty: '中级', duration: 30, calories: 240 },
    todaySessionInfo: null,
  },

  onLoad: function() {
    var sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 44 })
  },

  onShow: function() {
    var player = app.globalData.player
    var hasProfile = !!(player && player.nickname)
    var nickname = hasProfile ? player.nickname : ''
    var COLORS = ['#2BB673', '#4ECDC4', '#F7B731', '#A29BFE', '#FF6B6B']
    var avatarColor = nickname ? COLORS[nickname.charCodeAt(nickname.length - 1) % COLORS.length] : '#2BB673'
    var levelInfo = hasProfile ? (LEVEL_MAP[player.level] || LEVEL_MAP.intermediate) : null
    var styleLabel = hasProfile ? (STYLE_LABEL[player.playStyle] || '') : ''
    var likedPartners = wx.getStorageSync('likedPartners') || {}
    var partnerNotes = wx.getStorageSync('partnerNotes') || {}

    var techScores = hasProfile ? this._computeTechScores(player) : null
    var DAYNAMES_FULL = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    var todayDateText = DAYNAMES_FULL[new Date().getDay()]
    var todayPlan = hasProfile ? this._deriveTodayPlan(player) : this.data.todayPlan
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
      techScores: techScores,
      todayDateText: todayDateText,
      todayPlan: todayPlan,
    }, function() {
      if (techScores) self._drawRadarWithRetry(techScores, 0)
    })
    var now = Date.now()
    var stale = !this._lastLoadTs || (now - this._lastLoadTs) > 30000
    if (stale) {
      this._lastLoadTs = now
      if (hasProfile) {
        this.loadActivity()
        this.loadInvites()
      } else {
        this._buildEmptyWeeklyDays()
      }
    }
  },

  goLogin: function() { wx.navigateTo({ url: '/pages/login/login' }) },
  goEdit: function() {
    if (!this.data.hasProfile) { wx.navigateTo({ url: '/pages/login/login' }); return }
    wx.navigateTo({ url: '/pages/setup/setup?mode=edit' })
  },
  goTraining: function() {
    if (!this.data.hasProfile) { wx.navigateTo({ url: '/pages/login/login' }); return }
    wx.navigateTo({ url: '/pages/training/training' })
  },
  goMatches: function() { wx.navigateTo({ url: '/pages/training/training' }) },
  goTrainingRecords: function() {
    if (!app.hasProfile()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/training-records/training-records' })
  },

  openAICoach: function() {
    if (!this.data.hasProfile) { wx.navigateTo({ url: '/pages/login/login' }); return }
    var H5_BASE = 'https://zxq1227.github.io/tennisf-coach/coach.html'
    var player = app.globalData.player || {}
    var fields = {
      nickname: player.nickname,
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
    wx.showModal({
      title: '教练助手',
      content: '点击"复制链接"后，在手机浏览器粘贴即可访问教练助手',
      cancelText: '取消',
      confirmText: '复制链接',
      success: function(res) {
        if (!res.confirm) return
        wx.setClipboardData({
          data: url,
          success: function() {
            wx.showToast({ title: '已复制', icon: 'success' })
          }
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

  _buildEmptyWeeklyDays: function() {
    var DAYNAMES = ['日', '一', '二', '三', '四', '五', '六']
    var weeklyDays = []
    for (var wi = 6; wi >= 0; wi--) {
      var wd = new Date()
      wd.setDate(wd.getDate() - wi)
      weeklyDays.push({
        date: '', dayName: '周' + DAYNAMES[wd.getDay()],
        count: 0, durationText: '', isToday: wi === 0, hasGame: false
      })
    }
    this.setData({ weeklyDays: weeklyDays, weeklyCount: 0, loading: false })
  },

  loadActivity: async function() {
    this.setData({ loading: true })
    try {
      var callRes = await wx.cloud.callFunction({ name: 'getMyActivity' })
      var freshPlayer = this.data.player || {}
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

      // Today session info for Today card
      var todayGames = allRaw.filter(function(p) { return p.date === todayStr && !p.cancelled })
      var todaySessionInfo = null
      if (todayGames.length > 0) {
        var tg = todayGames[0]
        var tgMins = (tg.manuallyEnded && tg.endedAt && tg.gameTimestamp)
          ? Math.max(0, Math.floor((tg.endedAt - tg.gameTimestamp) / 60000))
          : (tg.estimatedDuration || 120)
        var tgH = Math.floor(tgMins / 60), tgM = tgMins % 60
        todaySessionInfo = {
          location: tg.location || '球场',
          durationText: tgH > 0 ? tgH + 'h' + (tgM > 0 ? tgM + 'm' : '') : tgM + 'm',
          partners: (tg.joiners || []).filter(function(j) { return j !== nickname }).slice(0, 2).join('、') || '独自练球',
          count: todayGames.length,
        }
      }

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

      // 挥拍统计（用 freshPlayer 拿最新 swingHistory）
      var raw = (freshPlayer.swingStats) || {}
      var swingHistory = (freshPlayer.swingHistory) || []
      var fhTotal = raw.fhTotal || 0
      var bhTotal = raw.bhTotal || 0
      var svTotal = raw.svTotal || 0
      var vlTotal = raw.vlTotal || 0
      var lastSession = null
      if (raw.lastSession) {
        var lsDate = raw.lastSession.date
        var lsTs = lsDate && (lsDate.$date || lsDate)
        var lsDiff = lsTs ? Math.floor((Date.now() - lsTs) / 86400000) : -1
        var lsDateText = lsDiff === 0 ? '今天' : lsDiff === 1 ? '昨天' : (lsDiff > 0 ? lsDiff + '天前' : '')
        lastSession = { fh: raw.lastSession.fh || 0, bh: raw.lastSession.bh || 0, sv: raw.lastSession.sv || 0, vl: raw.lastSession.vl || 0, dateText: lsDateText }
      }
      var swingStats = { fhTotal: fhTotal, bhTotal: bhTotal, svTotal: svTotal, vlTotal: vlTotal, sessions: raw.sessions || 0, lastSession: lastSession }

      // 本周挥拍趋势图
      var weekDayNames = ['周日','周一','周二','周三','周四','周五','周六']
      var todayDate = new Date()
      var todayDayIdx = todayDate.getDay()
      var weekStartTs = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - todayDayIdx).getTime()
      var dailyTotals = { fh:[0,0,0,0,0,0,0], bh:[0,0,0,0,0,0,0], sv:[0,0,0,0,0,0,0], vl:[0,0,0,0,0,0,0] }
      swingHistory.forEach(function(entry) {
        var ts = entry.ts || (entry.date && (entry.date.$date || entry.date)) || 0
        var diff = ts - weekStartTs
        if (diff < 0 || diff >= 7 * 86400000) return
        var di = Math.floor(diff / 86400000)
        if (di < 0 || di > 6) return
        dailyTotals.fh[di] += entry.fh || 0
        dailyTotals.bh[di] += entry.bh || 0
        dailyTotals.sv[di] += entry.sv || 0
        dailyTotals.vl[di] += entry.vl || 0
      })
      if (!swingHistory.length && lastSession) {
        dailyTotals.fh[todayDayIdx] = lastSession.fh
        dailyTotals.bh[todayDayIdx] = lastSession.bh
        dailyTotals.sv[todayDayIdx] = lastSession.sv
        dailyTotals.vl[todayDayIdx] = lastSession.vl
      }
      var cumData = { fh:[], bh:[], sv:[], vl:[] }
      var running = { fh:0, bh:0, sv:0, vl:0 }
      for (var di = 0; di < 7; di++) {
        var pushDay = function(k) {
          if (di <= todayDayIdx) { running[k] += dailyTotals[k][di]; cumData[k].push(running[k]) }
          else cumData[k].push(null)
        }
        pushDay('fh'); pushDay('bh'); pushDay('sv'); pushDay('vl')
      }
      var chartMax = 0
      ;['fh','bh','sv','vl'].forEach(function(k) {
        cumData[k].forEach(function(v) { if (v !== null && v > chartMax) chartMax = v })
      })
      if (chartMax > 0) {
        var niceStep = chartMax <= 500 ? 100 : chartMax <= 2000 ? 500 : chartMax <= 10000 ? 1000 : 2000
        chartMax = Math.ceil(chartMax / niceStep) * niceStep
      } else {
        chartMax = 100
      }
      var swingChartData = {
        hasData: chartMax > 100,
        labels: weekDayNames,
        todayIdx: todayDayIdx,
        maxVal: chartMax,
        series: [
          { key:'sv', label:'发球', color:'#00E5B4', rgba:'rgba(0,229,180,', total:svTotal, totalDisplay:svTotal.toLocaleString(), data:cumData.sv },
          { key:'fh', label:'正手', color:'#DDDE00', rgba:'rgba(221,222,0,', total:fhTotal, totalDisplay:fhTotal.toLocaleString(), data:cumData.fh },
          { key:'bh', label:'反手', color:'#FF2D78', rgba:'rgba(255,45,120,', total:bhTotal, totalDisplay:bhTotal.toLocaleString(), data:cumData.bh },
          { key:'vl', label:'截击', color:'#B06EFF', rgba:'rgba(176,110,255,', total:vlTotal, totalDisplay:vlTotal.toLocaleString(), data:cumData.vl },
        ]
      }

      var weeklyCount = weeklyDays.filter(function(d) { return d.hasGame }).length

      // Compute insight lines from techScores
      var insightLine1 = '', insightLine2 = ''
      var ts = this._computeTechScores(this.data.player || freshPlayer)
      if (ts) {
        var SKILL_NAMES = { forehand: '正手', backhand: '反手', serve: '发球', volley: '截击', footwork: '步伐' }
        var skillPairs = Object.keys(ts).filter(function(k) { return SKILL_NAMES[k] }).map(function(k) { return { key: k, name: SKILL_NAMES[k], val: ts[k] } })
        if (skillPairs.length > 0) {
          skillPairs.sort(function(a, b) { return b.val - a.val })
          insightLine1 = '你的' + skillPairs[0].name + '表现突出'
          insightLine2 = '继续加强' + skillPairs[skillPairs.length - 1].name
        }
      }

      var swingTotal = swingStats.fhTotal + swingStats.bhTotal + swingStats.svTotal + swingStats.vlTotal

      this.setData({
        totalGames: totalGames, monthlyGames: monthlyGames, streak: streak,
        totalHoursNum: totalHoursNum, totalHoursUnit: totalHoursUnit,
        totalHoursDisplay: totalHoursDisplay,
        hoursChangeStr: hoursChangeStr, hoursChangeColor: hoursChangeColor,
        lastActiveLabel: lastActiveLabel, isActiveToday: isActiveToday, homeCourt: homeCourt,
        partners: partners,
        recentGames: recentGames, heatmapWeeks: heatmapWeeks,
        weeklyDays: weeklyDays, weeklyCount: weeklyCount, loading: false,
        swingStats: swingStats, swingChartData: swingChartData,
        swingTotal: swingTotal, insightLine1: insightLine1, insightLine2: insightLine2,
        todaySessionInfo: todaySessionInfo,
      })
      if (swingStats.sessions > 0) this._drawSwingChartWithRetry(swingChartData, 0)
      this._loadSwingChart()
      // 写入 globalData 供动态页使用
      app.globalData.activityCache = {
        nickname: nickname,
        streak: streak,
        achievements: [],
        partners: partners,
        weeklyCount: weeklyCount,
        weeklyDays: weeklyDays,
        totalHoursNum: totalH,
        updatedAt: Date.now(),
      }
      this.loadRecentMedia(recentGames)
    } catch(e) {
      this.setData({ loading: false })
    }
  },

  _deriveTodayPlan: function(player) {
    var weaknesses = player.weaknesses || []
    var goals = player.goals || []
    var ntrpLevel = player.ntrpLevel || ''
    var title = '基础稳定性训练', sub = '全面提升击球基础', badge = '今日推荐'
    if (player.aiTrainingFocus) {
      title = player.aiTrainingFocus; sub = '专属定制训练方案'; badge = '专属推荐'
    } else if (weaknesses.length > 0) {
      for (var i = 0; i < weaknesses.length; i++) {
        var pm = _WEAKNESS_PLAN[weaknesses[i]]
        if (pm) { title = pm.title; sub = pm.sub; badge = '针对弱点'; break }
      }
    } else if (goals.length > 0) {
      for (var j = 0; j < goals.length; j++) {
        var gm = _GOAL_PLAN[goals[j]]
        if (gm) { title = gm.title; sub = gm.sub; badge = '目标训练'; break }
      }
    }
    var lm = _LEVEL_META[ntrpLevel] || { label: '中级', duration: 30 }
    return { title: title, sub: sub, badge: badge, difficulty: lm.label, duration: lm.duration, calories: Math.round(lm.duration * 8) }
  },

  goSquare: function() { wx.navigateTo({ url: '/pages/square/square' }) },

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
      '不会上旋': { forehand: -15, backhand: -10 }, '心理紧张': { forehand: -5, backhand: -5, serve: -10 },
      '正手不稳': { forehand: -20 }, '反手偏弱': { backhand: -20 },
      '发球不稳': { serve: -20 }, '二发太短': { serve: -15 },
      '网前不自信': { volley: -25 }, '步伐跟不上': { footwork: -20 },
      '方向控制差': { forehand: -10, backhand: -10 }
    }
    ;(player.weaknesses || []).forEach(function(k) {
      var p = weakMap[k] || {}
      Object.keys(p).forEach(function(ax) { s[ax] = Math.max(10, s[ax] + p[ax]) })
    })
    var serveAdjMap = {
      '还在练习稳定发入': -20, '能稳定发入，缺乏威胁': -5,
      '一发有力量，二发较可靠': 10, '发球是主要得分手段': 25
    }
    var serveAdj = serveAdjMap[player.serveAbility] || 0
    if (serveAdj !== 0) s.serve = Math.max(10, Math.min(95, s.serve + serveAdj))
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
          wx.canvasToTempFilePath({
            canvas: res[0].node,
            success: function(r) { self.setData({ radarImgSrc: r.tempFilePath }) },
            fail: function() {}
          })
        } else {
          self._drawRadarWithRetry(scores, attempt + 1)
        }
      })
    }, delays[attempt])
  },

  _loadSwingChart: function() {
    var self = this
    // 等 refreshPlayer (t=1.5s) 完成后读缓存；若缓存仍无 swingHistory 再兜底调云函数
    setTimeout(function() { self._drawSwingChartFromCache() }, 2000)
  },

  _drawSwingChartFromCache: async function() {
    var self = this
    var p = app.globalData.player || {}
    // 若 refreshPlayer 成功，swingHistory 应已就绪；否则兜底请求一次
    if (!p.swingHistory || !p.swingHistory.length) {
      try {
        var res = await wx.cloud.callFunction({ name: 'getPlayer' })
        var fresh = res && res.result && res.result.player
        if (fresh) {
          app.globalData.player = Object.assign({}, app.globalData.player, { swingStats: fresh.swingStats, swingHistory: fresh.swingHistory })
          p = app.globalData.player
        }
      } catch(e) { return }
    }
    var rawStats = p.swingStats || {}
    if (rawStats.sessions > 0) {
      var lastSession = null
      if (rawStats.lastSession) {
        var lsTs = rawStats.lastSession.date && (rawStats.lastSession.date.$date || rawStats.lastSession.date)
        var lsDiff = lsTs ? Math.floor((Date.now() - lsTs) / 86400000) : -1
        var lsDateText = lsDiff === 0 ? '今天' : lsDiff === 1 ? '昨天' : (lsDiff > 0 ? lsDiff + '天前' : '')
        lastSession = { fh: rawStats.lastSession.fh || 0, bh: rawStats.lastSession.bh || 0, sv: rawStats.lastSession.sv || 0, vl: rawStats.lastSession.vl || 0, dateText: lsDateText }
      }
      var freshSwingStats = { fhTotal: rawStats.fhTotal || 0, bhTotal: rawStats.bhTotal || 0, svTotal: rawStats.svTotal || 0, vlTotal: rawStats.vlTotal || 0, sessions: rawStats.sessions, lastSession: lastSession }
      var freshSwingTotal = freshSwingStats.fhTotal + freshSwingStats.bhTotal + freshSwingStats.svTotal + freshSwingStats.vlTotal
      self.setData({ swingStats: freshSwingStats, swingTotal: freshSwingTotal })
    }

    var swingHistory = p.swingHistory
    if (!swingHistory || !swingHistory.length) return
    var raw = rawStats
    var fhTotal = raw.fhTotal || 0, bhTotal = raw.bhTotal || 0
    var svTotal = raw.svTotal || 0, vlTotal = raw.vlTotal || 0
    var todayDate = new Date()
    var todayDayIdx = todayDate.getDay()
    var weekStartTs = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - todayDayIdx).getTime()
    var dt = { fh:[0,0,0,0,0,0,0], bh:[0,0,0,0,0,0,0], sv:[0,0,0,0,0,0,0], vl:[0,0,0,0,0,0,0] }
    swingHistory.forEach(function(e) {
      var ts = e.ts || 0, diff = ts - weekStartTs
      if (diff < 0 || diff >= 7 * 86400000) return
      var di = Math.floor(diff / 86400000)
      if (di < 0 || di > 6) return
      dt.fh[di] += e.fh || 0; dt.bh[di] += e.bh || 0; dt.sv[di] += e.sv || 0; dt.vl[di] += e.vl || 0
    })
    var cum = { fh:[], bh:[], sv:[], vl:[] }, run = { fh:0, bh:0, sv:0, vl:0 }
    for (var di = 0; di < 7; di++) {
      var pushK = function(k) {
        if (di <= todayDayIdx) { run[k] += dt[k][di]; cum[k].push(run[k]) } else cum[k].push(null)
      }
      pushK('fh'); pushK('bh'); pushK('sv'); pushK('vl')
    }
    var mx = 0
    ;['fh','bh','sv','vl'].forEach(function(k) { cum[k].forEach(function(v) { if (v !== null && v > mx) mx = v }) })
    if (mx > 0) { var step = mx <= 500 ? 100 : mx <= 2000 ? 500 : mx <= 10000 ? 1000 : 2000; mx = Math.ceil(mx / step) * step } else mx = 100
    var cd = {
      hasData: mx > 100, labels: ['周日','周一','周二','周三','周四','周五','周六'],
      todayIdx: todayDayIdx, maxVal: mx,
      series: [
        { key:'sv', label:'发球', color:'#00E5B4', rgba:'rgba(0,229,180,', total:svTotal, totalDisplay:svTotal.toLocaleString(), data:cum.sv },
        { key:'fh', label:'正手', color:'#DDDE00', rgba:'rgba(221,222,0,', total:fhTotal, totalDisplay:fhTotal.toLocaleString(), data:cum.fh },
        { key:'bh', label:'反手', color:'#FF2D78', rgba:'rgba(255,45,120,', total:bhTotal, totalDisplay:bhTotal.toLocaleString(), data:cum.bh },
        { key:'vl', label:'截击', color:'#B06EFF', rgba:'rgba(176,110,255,', total:vlTotal, totalDisplay:vlTotal.toLocaleString(), data:cum.vl },
      ]
    }
    self.setData({ swingChartData: cd })
    self._drawSwingChartWithRetry(cd, 0)
  },

  _drawSwingChartWithRetry: function(chartData, attempt) {
    var self = this
    var delays = [300, 700, 1500]
    if (attempt >= delays.length) return
    setTimeout(function() {
      wx.createSelectorQuery().in(self).select('#swingChart').fields({ node: true, size: true }).exec(function(res) {
        if (res && res[0] && res[0].node) {
          self.drawSwingChart(res[0].node, res[0].width, res[0].height, chartData)
        } else {
          self._drawSwingChartWithRetry(chartData, attempt + 1)
        }
      })
    }, delays[attempt])
  },

  drawSwingChart: function(canvas, W, H, chartData) {
    var dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2
    canvas.width = W * dpr; canvas.height = H * dpr
    var ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    var series = chartData.series
    var labels = chartData.labels
    var todayIdx = chartData.todayIdx
    var maxVal = chartData.maxVal
    var N = 7
    var padL = 10, padR = 46, padT = 14, padB = 36
    var cW = W - padL - padR, cH = H - padT - padB

    function xFor(i) { return padL + (i / (N - 1)) * cW }
    function yFor(v) { return padT + cH - (v / maxVal) * cH }

    // 水平网格 + Y 轴标签
    var gridFracs = [0, 0.25, 0.5, 0.75, 1.0]
    ctx.font = '11px PingFang SC'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    gridFracs.forEach(function(frac) {
      var gv = Math.round(frac * maxVal)
      var gy = yFor(gv)
      ctx.setLineDash([3, 5])
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(padL + cW, gy); ctx.stroke()
      if (gv > 0) {
        ctx.setLineDash([])
        ctx.fillStyle = 'rgba(255,255,255,0.28)'
        var lbl = gv >= 1000 ? (gv / 1000) + 'k' : '' + gv
        ctx.fillText(lbl, padL + cW + 6, gy)
      }
    })
    ctx.setLineDash([])

    // 未来日期灰色遮罩
    if (todayIdx < 6) {
      var grayX = xFor(todayIdx) + cW / ((N - 1) * 2)
      ctx.fillStyle = 'rgba(12,12,12,0.55)'
      ctx.fillRect(grayX, padT, padL + cW - grayX, cH + 1)
    }

    // Catmull-Rom 平滑曲线
    function buildPath(pts) {
      ctx.moveTo(pts[0].x, pts[0].y)
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[Math.max(0, i - 1)], p1 = pts[i]
        var p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
        ctx.bezierCurveTo(
          p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
          p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
          p2.x, p2.y
        )
      }
    }

    // 从后往前绘制，使最小值曲线在最上层
    for (var si = series.length - 1; si >= 0; si--) {
      var s = series[si]
      var pts = []
      for (var i = 0; i < N; i++) {
        if (s.data[i] === null) continue
        pts.push({ x: xFor(i), y: yFor(s.data[i]) })
      }
      if (!pts.length) continue
      var baseY = padT + cH

      // 渐变填充
      var grad = ctx.createLinearGradient(0, padT, 0, baseY)
      grad.addColorStop(0, s.rgba + '0.35)')
      grad.addColorStop(1, s.rgba + '0)')
      ctx.beginPath(); buildPath(pts)
      ctx.lineTo(pts[pts.length - 1].x, baseY)
      ctx.lineTo(pts[0].x, baseY)
      ctx.closePath()
      ctx.fillStyle = grad; ctx.fill()

      // 折线
      ctx.beginPath(); buildPath(pts)
      ctx.strokeStyle = s.color; ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()
    }

    // X 轴日期标签
    ctx.font = '11px PingFang SC'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    for (var i = 0; i < N; i++) {
      ctx.fillStyle = i <= todayIdx ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)'
      ctx.fillText(labels[i], xFor(i), padT + cH + 8)
    }
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
