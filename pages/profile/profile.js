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

// NTRP 等级对应的综合评分区间（用于计算成长进度）
var _NTRP_SCORE_RANGE = {
  '1.5': { min: 10, max: 20 },
  '2.0': { min: 20, max: 32 },
  '2.5': { min: 32, max: 45 },
  '3.0': { min: 45, max: 58 },
  '3.5': { min: 58, max: 72 },
  '4.0': { min: 72, max: 85 },
  '4.5': { min: 85, max: 99 },
}

// NTRP 等级顺序（用于确定下一级）
var _NTRP_ORDER = ['1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5']

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
    overallScore: 0,
    scoreChange: 0,
    ntrpProgress: 0,         // NTRP 等级成长进度百分比
    nextNTRP: '',            // 下一级 NTRP 等级
    suggestUpgrade: false,   // 是否建议升级
    ntrpProgressDisplay: '', // 进度显示文字 如 "72%"
    ntrpLevelLabel: '',     // 当前等级标签 如 "初中级"
    remainToUpgrade: 0,     // 距升级还差多少
    growthSnapshotCount: 0,
    growthPoints: [],
    growthMilestones: [],
    growthViewStart: 13,
    growthHasData: false,
    growthSnapshotCount: 0,
    currentFocus: null,
    growthEventPopup: null,
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
      todayDateText: todayDateText,
      todayPlan: todayPlan,
    })
    if (this.data.growthHasData && this.data.growthPoints && this.data.growthPoints.length) {
      this._drawGrowthChartWithRetry(this.data.growthPoints, this.data.growthMilestones, this.data.growthViewStart, 0)
    }
    if (this.data.currentFocus) {
      this._drawFocusArcWithRetry(this.data.currentFocus.pct, 0)
    }
    var now = Date.now()
    var stale = !this._lastLoadTs || (now - this._lastLoadTs) > 5000 || app.globalData.activityStale
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
    } catch(e) { console.error('[profile] loadInvites failed:', e) }
  },

  openInviteSheet: function() { this.setData({ showInviteSheet: true }) },
  closeInviteSheet: function() { this.setData({ showInviteSheet: false }) },

  acceptInvite: async function(e) {
    var inviteId = e.currentTarget.dataset.id
    var fromNickname = e.currentTarget.dataset.from
    var postId = e.currentTarget.dataset.postid
    try {
      await wx.cloud.callFunction({ name: 'respondInvite', data: { inviteId: inviteId, action: 'accept' } })
    } catch(e) { console.error('[profile] acceptInvite failed:', e) }
    var invites = this.data.invites.filter(function(i) { return i._id !== inviteId })
    this.setData({ invites: invites, inviteCount: invites.length, showInviteSheet: false })
    if (postId) {
      wx.navigateTo({ url: '/pages/detail/detail?id=' + postId })
    } else {
      wx.setStorageSync('postPrefillNote', '约 ' + fromNickname + ' 一起打')
      wx.setStorageSync('postPrefillPartner', fromNickname)
      wx.navigateTo({ url: '/pages/post/post' })
    }
  },

  ignoreInvite: async function(e) {
    var inviteId = e.currentTarget.dataset.id
    try {
      await wx.cloud.callFunction({ name: 'respondInvite', data: { inviteId: inviteId, action: 'ignore' } })
    } catch(e) { console.error('[profile] ignoreInvite failed:', e) }
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
    app.globalData.activityStale = false
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

      // 提前拉取训练快照，合并到统计数据 + 刷新 globalData
      var scoreSnapshots = []
      var scoreMilestones = []
      try {
        var snapRes = await wx.cloud.callFunction({ name: 'getPlayer' })
        var snapPlayer = (snapRes && snapRes.result && snapRes.result.player) || {}
        if (snapPlayer._id) {
          app.globalData.player = Object.assign({}, app.globalData.player, snapPlayer)
        }
        scoreSnapshots = snapPlayer.scoreSnapshots || []
        scoreMilestones = snapPlayer.scoreMilestones || []
      } catch(e) { console.error('[profile] early getPlayer failed:', e) }

      var totalGames = allRaw.length + scoreSnapshots.length
      var monthlyGames = allRaw.filter(function(p) { return p.date && p.date.indexOf(monthStr) === 0 }).length
      scoreSnapshots.forEach(function(s) {
        if (s.date && s.date.indexOf(monthStr) === 0) monthlyGames++
      })

      var courtCounts = {}
      allRaw.forEach(function(p) {
        if (p.location) courtCounts[p.location] = (courtCounts[p.location] || 0) + 1
      })
      var courtKeys = Object.keys(courtCounts).sort(function(a, b) { return courtCounts[b] - courtCounts[a] })
      var homeCourt = courtKeys[0] || (this.data.player && this.data.player.homeBase) || ''

      var gameDates = {}
      allRaw.forEach(function(p) { if (p.date) gameDates[p.date] = true })
      scoreSnapshots.forEach(function(s) { if (s.date) gameDates[s.date] = true })
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
        } catch(e) { console.error('[profile] loadActivity avatar query failed:', e) }
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
      // 合并训练快照的时长
      scoreSnapshots.forEach(function(s) {
        if (!s.date) return
        if (!dayMatchData[s.date]) dayMatchData[s.date] = { count: 0, minutes: 0 }
        dayMatchData[s.date].count++
        var trainingMins = s.sessionData && s.sessionData.elapsed
          ? Math.floor(s.sessionData.elapsed / 60)
          : 30
        dayMatchData[s.date].minutes += trainingMins
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

        // 比分（兼容新旧 liveScore 格式）
        var ls = p.liveScore
        var scoreText = ''
        if (ls && ls.gameA !== undefined) {
          // 新格式：显示盘分胜负数
          var _swA = (ls.sets || []).filter(function(s) { return s.gamesA > s.gamesB }).length
          var _swB = (ls.sets || []).filter(function(s) { return s.gamesB > s.gamesA }).length
          scoreText = '盘 ' + _swA + ':' + _swB
          if (!ls.matchOver && (ls.gamesA > 0 || ls.gamesB > 0)) {
            scoreText += ' · 局 ' + ls.gamesA + ':' + ls.gamesB
          }
        } else if (ls && ls.a !== undefined && ls.b !== undefined) {
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

      // Today session info for Today card
      var todayGames = allRaw.filter(function(p) { return p.date === todayStr && !p.cancelled })
      var isActiveToday = todayGames.length > 0
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

      // 计算综合评分 + 成长曲线
      var freshPlayerRef = this.data.player || freshPlayer
      // 合并最新 swingStats（getPlayer 可能已刷新）
      if (app.globalData.player && app.globalData.player.swingStats) {
        var gs = app.globalData.player.swingStats
        swingStats = {
          fhTotal: gs.fhTotal || 0, bhTotal: gs.bhTotal || 0,
          svTotal: gs.svTotal || 0, vlTotal: gs.vlTotal || 0,
          sessions: gs.sessions || 0,
          lastSession: swingStats.lastSession
        }
        freshPlayerRef = app.globalData.player
      }

      var ts = this._computeTechScores(freshPlayerRef)
      var overallScore = ts ? this._computeWeightedScore(ts, allRaw, swingStats, freshPlayerRef) : 0
      var growthResult = this._computeGrowthData(allRaw, overallScore, freshPlayerRef, scoreSnapshots, scoreMilestones)
      var currentFocus = ts ? this._computeCurrentFocus(ts, freshPlayerRef) : null
      // 同步到 globalData 供训练页使用
      if (currentFocus) app.globalData.currentFocus = currentFocus
      var ntrpGrowth = freshPlayerRef ? this._computeNTRPGrowth(overallScore, freshPlayerRef) : null

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
        swingTotal: swingTotal,
        overallScore: overallScore,
        scoreChange: growthResult.scoreChange,
        ntrpProgress: ntrpGrowth ? ntrpGrowth.progress : 0,
        ntrpProgressDisplay: ntrpGrowth ? ntrpGrowth.progress + '%' : '--',
        ntrpLevelLabel: ntrpGrowth ? ntrpGrowth.levelLabel : '',
        nextNTRP: ntrpGrowth ? ntrpGrowth.nextNTRP : '',
        suggestUpgrade: ntrpGrowth ? ntrpGrowth.suggestUpgrade : false,
        remainToUpgrade: ntrpGrowth ? ntrpGrowth.remainToUpgrade : 0,
        growthPoints: growthResult.points,
        growthMilestones: growthResult.milestones,
        growthViewStart: growthResult.defaultViewStart,
        growthHasData: growthResult.hasData,
        growthSnapshotCount: scoreSnapshots.length,
        currentFocus: currentFocus,
        todaySessionInfo: todaySessionInfo,
      })
      if (growthResult.points.length) this._drawGrowthChartWithRetry(growthResult.points, growthResult.milestones, growthResult.defaultViewStart, 0)
      if (currentFocus) this._drawFocusArcWithRetry(currentFocus.pct, 0)
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

  goSquare: function() { wx.navigateTo({ url: '/pages/post/post' }) },

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

  _computeStreak: function(allRaw) {
    if (!allRaw || !allRaw.length) return 0
    var ONE_DAY = 86400000
    var today = new Date(); today.setHours(0, 0, 0, 0)
    var days = {}
    allRaw.forEach(function(s) {
      if (!s.date) return
      var d = new Date(s.date); d.setHours(0, 0, 0, 0)
      days[d.getTime()] = true
    })
    var cur = today.getTime()
    if (!days[cur] && !days[cur - ONE_DAY]) return 0
    var streak = 0
    while (days[cur]) { streak++; cur -= ONE_DAY }
    return streak
  },

  _computeWeightedScore: function(ts, allRaw, swingStats, player) {
    // 技术能力 50%
    var techAvg = (ts.forehand + ts.backhand + ts.serve + ts.footwork + ts.volley) / 5

    // 训练活跃度 25%：近 30 天训练次数，满 20 次得满分
    var thirtyAgo = Date.now() - 30 * 86400000
    var recent = allRaw.filter(function(s) { return s.date && new Date(s.date).getTime() > thirtyAgo }).length
    var trainingScore = Math.min(100, recent * 5)

    // 挥拍活跃度 15%：累计挥拍，满 5000 次得满分
    var swings = swingStats ? (swingStats.fhTotal + swingStats.bhTotal + swingStats.svTotal + swingStats.vlTotal) : 0
    var swingScore = Math.min(100, swings / 50)

    // 连续训练 10%：streak 天数，满 10 天得满分
    var streak = this._computeStreak(allRaw)
    var streakScore = Math.min(100, streak * 10)

    var score = Math.round(techAvg * 0.50 + trainingScore * 0.25 + swingScore * 0.15 + streakScore * 0.10)
    return Math.max(10, Math.min(99, score))
  },

  _computeCurrentFocus: function(ts, player) {
    var SKILL_INFO = {
      forehand: { name: '正手击球稳定性', description: '你的正手击球一致性有待提高，建议加强正手击球的随挥动作和跟步练习', gain: 4 },
      backhand: { name: '反手击球稳定性', description: '你的反手击球一致性有待提高，建议加强反手击球的站位和随挥训练', gain: 4 },
      serve:    { name: '发球稳定性',     description: '你的发球控制有提升空间，建议专项练习抛球点的稳定性和击球节奏', gain: 5 },
      footwork: { name: '步伐敏捷性',     description: '你的场上移动效率有待加强，建议进行横移步伐和快速定位专项训练', gain: 3 },
      volley:   { name: '网前截击',       description: '你的网前截击成功率有提升空间，建议加强截击时的手腕控制和站位', gain: 4 },
    }
    var strengthMap = { '正手':'forehand','反手':'backhand','发球':'serve','截击':'volley','步伐':'footwork' }
    var strengthKeys = (player.strengths || []).map(function(s) { return strengthMap[s] }).filter(Boolean)

    var keys = ['forehand', 'backhand', 'serve', 'footwork', 'volley']
    var sorted = keys.map(function(k) { return { key: k, val: ts[k] || 0 } })
      .sort(function(a, b) { return a.val - b.val })

    var focus = null
    for (var i = 0; i < sorted.length; i++) {
      if (strengthKeys.indexOf(sorted[i].key) === -1) { focus = sorted[i]; break }
    }
    if (!focus) focus = sorted[0]

    var info = SKILL_INFO[focus.key]
    return {
      skillKey: focus.key,
      skillName: info.name,
      pct: Math.round(focus.val),
      description: info.description,
      estimatedGain: Math.max(2, Math.round((100 - focus.val) * 0.06) + info.gain),
    }
  },

  // ── NTRP 等级内成长进度计算 ──
  _computeNTRPGrowth: function(overallScore, player) {
    var ntrpLevel = player.ntrpLevel || '2.5'
    var range = _NTRP_SCORE_RANGE[ntrpLevel] || { min: 32, max: 45 }
    var idx = _NTRP_ORDER.indexOf(ntrpLevel)
    var nextNTRP = idx >= 0 && idx < _NTRP_ORDER.length - 1 ? _NTRP_ORDER[idx + 1] : null
    var nextLabel = nextNTRP ? (_LEVEL_META[nextNTRP] || {}).label || nextNTRP : ''

    // 计算当前等级内的进度 (0-100)
    var span = range.max - range.min
    var progress = Math.min(100, Math.max(0, Math.round((overallScore - range.min) / span * 100)))

    // 溢出处理：分数超出当前等级上限时，提示建议升级
    var suggestUpgrade = overallScore >= range.max
    if (suggestUpgrade) progress = 100

    var remain = suggestUpgrade ? 0 : (100 - progress)

    return {
      ntrpLevel: ntrpLevel,
      levelLabel: (_LEVEL_META[ntrpLevel] || {}).label || ntrpLevel,
      progress: progress,
      nextNTRP: nextNTRP || '',
      nextLabel: nextLabel,
      suggestUpgrade: suggestUpgrade,
      remainToUpgrade: remain,
    }
  },

  _computeGrowthData: function(allRaw, overallScore, player, scoreSnapshots, scoreMilestones) {
    var snapshots = scoreSnapshots || []
    var rawMilestones = scoreMilestones || []

    // 少于 3 个快照 → 显示引导
    if (snapshots.length < 3) {
      return { points: [], milestones: [], defaultViewStart: 0, hasData: false, scoreChange: 0 }
    }

    // 真实快照 → chart points
    var points = snapshots.map(function(s, i) {
      var d = new Date(s.date)
      return {
        w: i,
        score: s.overallScore,
        label: (d.getMonth() + 1) + '/' + d.getDate(),
        showLabel: true,
      }
    })

    var scoreChange = snapshots.length >= 2
      ? snapshots[snapshots.length - 1].overallScore - snapshots[0].overallScore
      : 0

    // 真实里程碑 → chart 格式
    var milestones = rawMilestones.map(function(m) {
      var snapIdx = points.length - 1
      for (var i = 0; i < snapshots.length; i++) {
        if (snapshots[i].date >= m.date.slice(0, 10)) { snapIdx = i; break }
      }
      return {
        w: snapIdx,
        label: m.label,
        detail: m.detail || '',
        dateStr: m.date ? m.date.slice(5) : '',
        scoreBefore: snapIdx > 0 ? snapshots[snapIdx - 1].overallScore : snapshots[snapIdx].overallScore,
        scoreAfter: snapshots[snapIdx].overallScore,
      }
    })

    var VISIBLE = 8
    var defaultViewStart = Math.max(0, points.length - VISIBLE)

    return {
      points: points,
      scoreChange: scoreChange,
      milestones: milestones,
      defaultViewStart: defaultViewStart,
      hasData: true,
    }
  },

  _drawGrowthChartWithRetry: function(points, milestones, viewStart, attempt) {
    var self = this
    var delays = [300, 700, 1500]
    if (attempt >= delays.length) return
    setTimeout(function() {
      wx.createSelectorQuery().in(self).select('#growthChart').fields({ node: true, size: true, rect: true }).exec(function(res) {
        if (res && res[0] && res[0].node && res[0].width > 0) {
          if (res[0].top !== undefined) self._growthCanvasRect = { top: res[0].top, left: res[0].left || 0 }
          self.drawGrowthChart(res[0].node, res[0].width, res[0].height, points, milestones, viewStart)
        } else {
          self._drawGrowthChartWithRetry(points, milestones, viewStart, attempt + 1)
        }
      })
    }, delays[attempt])
  },

  _drawGrowthChartNow: function(points, milestones, viewStart) {
    var self = this
    wx.createSelectorQuery().in(self).select('#growthChart').fields({ node: true, size: true, rect: true }).exec(function(res) {
      if (res && res[0] && res[0].node && res[0].width > 0) {
        if (res[0].top !== undefined) self._growthCanvasRect = { top: res[0].top, left: res[0].left || 0 }
        self.drawGrowthChart(res[0].node, res[0].width, res[0].height, points, milestones, viewStart)
      }
    })
  },

  onGrowthTouchStart: function(e) {
    this._growthTouchStartX = e.touches[0].clientX
    this._growthTouchStartY = e.touches[0].clientY
    this._growthViewStartBase = this.data.growthViewStart
    this._growthCurrentViewStart = this.data.growthViewStart
  },

  onGrowthTouchMove: function(e) {
    var dx = e.touches[0].clientX - this._growthTouchStartX
    var chartW = this._growthCanvasW || 260
    var pixPerPt = chartW / 7  // VISIBLE=8，7 个间距
    var shift = Math.round(-dx / pixPerPt)
    var maxStart = Math.max(0, (this.data.growthPoints.length || 0) - 8)
    var newStart = Math.max(0, Math.min(maxStart, (this._growthViewStartBase || 0) + shift))
    if (newStart !== this._growthCurrentViewStart) {
      this._growthCurrentViewStart = newStart
      this._drawGrowthChartNow(this.data.growthPoints, this.data.growthMilestones, newStart)
    }
  },

  onGrowthTouchEnd: function(e) {
    var t = e.changedTouches[0]
    var dx = t.clientX - (this._growthTouchStartX || t.clientX)
    var dy = t.clientY - (this._growthTouchStartY || t.clientY)
    var moved = Math.sqrt(dx * dx + dy * dy)

    var vs = this._growthCurrentViewStart
    if (vs !== undefined && vs !== this.data.growthViewStart) {
      this.setData({ growthViewStart: vs })
    }

    // 轻点（移动 < 8px）触发里程碑弹窗
    if (moved < 8) {
      this._handleGrowthTap(t.clientX, t.clientY)
    }
  },

  _handleGrowthTap: function(clientX, clientY) {
    var rect = this._growthCanvasRect
    var hitAreas = this._growthMilestoneHitAreas
    if (!rect || !hitAreas || !hitAreas.length) return
    var cx = clientX - rect.left
    var cy = clientY - rect.top
    var hit = null
    hitAreas.forEach(function(h) {
      var d = Math.sqrt((cx - h.x) * (cx - h.x) + (cy - h.y) * (cy - h.y))
      if (d <= h.radius) hit = h
    })
    if (hit) {
      this.setData({
        growthEventPopup: {
          label: hit.label,
          dateStr: hit.dateStr,
          detail: hit.detail,
          scoreBefore: hit.scoreBefore,
          scoreAfter: hit.scoreAfter,
        }
      })
    }
  },

  closeGrowthEventPopup: function() {
    this.setData({ growthEventPopup: null })
  },

  goSkillFocus: function() {
    var app = getApp()
    if (!app.requireAuth()) return
    wx.navigateTo({ url: '/pages/training/training' })
  },

  _drawFocusArcWithRetry: function(pct, attempt) {
    var self = this
    var delays = [300, 700, 1500]
    if (attempt >= delays.length) return
    setTimeout(function() {
      wx.createSelectorQuery().in(self).select('#focusArc').fields({ node: true, size: true }).exec(function(res) {
        if (res && res[0] && res[0].node && res[0].width > 0) {
          self._drawFocusArc(res[0].node, res[0].width, res[0].height, pct)
        } else {
          self._drawFocusArcWithRetry(pct, attempt + 1)
        }
      })
    }, delays[attempt])
  },

  _drawFocusArc: function(canvas, W, H, pct) {
    var dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2
    canvas.width = W * dpr; canvas.height = H * dpr
    var ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    var cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 5, lw = 6

    // 背景圆弧
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = lw
    ctx.stroke()

    // 进度弧（从顶部顺时针）
    var start = -Math.PI / 2
    var end = start + (Math.min(pct, 100) / 100) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(cx, cy, R, start, end)
    ctx.strokeStyle = '#B2FF33'
    ctx.lineWidth = lw
    ctx.lineCap = 'round'
    ctx.stroke()
  },

  drawGrowthChart: function(canvas, W, H, allPoints, milestones, viewStart) {
    var VISIBLE = Math.min(8, allPoints.length)
    var totalPts = allPoints.length
    var maxStart = Math.max(0, totalPts - VISIBLE)
    var vs = Math.max(0, Math.min(maxStart, viewStart || 0))
    var points = allPoints.slice(vs, vs + VISIBLE)
    var N = points.length

    if (N === 0) return

    // 重映射里程碑到视口内坐标
    var visMilestones = milestones.filter(function(m) {
      return m.w >= vs && m.w < vs + VISIBLE
    }).map(function(m) {
      return { w: m.w - vs, label: m.label, dateStr: m.dateStr, detail: m.detail || '' }
    })

    // 存储 canvas 宽度供 touch 处理使用
    this._growthCanvasW = W

    var dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2
    canvas.width = W * dpr; canvas.height = H * dpr
    var ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    var padL = 10, padR = 44, padB = 26
    var padT = visMilestones.length > 0 ? 62 : 32
    var cW = W - padL - padR, cH = H - padT - padB

    var minScore = points.reduce(function(m, p) { return Math.min(m, p.score) }, points[0].score)
    var maxScore = points.reduce(function(m, p) { return Math.max(m, p.score) }, points[0].score)

    // 纵轴自适应：根据实际数据范围确定上下界
    var dataRange = maxScore - minScore
    var yStep
    if (dataRange <= 20) yStep = 5
    else if (dataRange <= 50) yStep = 10
    else yStep = 25

    var yMin = Math.floor(minScore / yStep) * yStep
    var yMax = Math.ceil(maxScore / yStep) * yStep + yStep  // 顶部留一个步长的余量
    if (yMax - yMin < yStep * 2) yMax = yMin + yStep * 3   // 保证至少 3 条网格线

    function xFor(i) { return padL + (i / (N - 1)) * cW }
    function yFor(v) { return padT + cH - ((v - yMin) / (yMax - yMin)) * cH }

    // Y 轴网格线 + 右侧标签
    ctx.font = '11px PingFang SC'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    for (var gv = yMin; gv <= yMax; gv += yStep) {
      var gy = yFor(gv)
      ctx.setLineDash([3, 5])
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(padL + cW, gy); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.fillText(String(gv), padL + cW + 8, gy)
    }

    // 数据点坐标
    var pts = points.map(function(p, i) { return { x: xFor(i), y: yFor(p.score) } })

    // Catmull-Rom 平滑曲线
    function buildPath(p) {
      ctx.moveTo(p[0].x, p[0].y)
      for (var i = 0; i < p.length - 1; i++) {
        var p0 = p[Math.max(0, i - 1)], p1 = p[i]
        var p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)]
        ctx.bezierCurveTo(
          p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
          p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
          p2.x, p2.y
        )
      }
    }

    // 渐变填充
    var baseY = padT + cH
    var grad = ctx.createLinearGradient(0, padT, 0, baseY)
    grad.addColorStop(0, 'rgba(178,255,51,0.35)')
    grad.addColorStop(1, 'rgba(178,255,51,0)')
    ctx.beginPath(); buildPath(pts)
    ctx.lineTo(pts[N - 1].x, baseY); ctx.lineTo(pts[0].x, baseY); ctx.closePath()
    ctx.fillStyle = grad; ctx.fill()

    // 折线
    ctx.beginPath(); buildPath(pts)
    ctx.strokeStyle = '#B2FF33'; ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()

    // 中间小圆点
    ctx.fillStyle = '#B2FF33'
    pts.forEach(function(pt, i) {
      if (i === 0 || i === N - 1) return
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2); ctx.fill()
    })

    // 末尾徽章（只当视口末尾是全部数据最后一点时才显示"今天"徽章）
    var showBadge = (vs + VISIBLE >= totalPts)
    var lp = pts[N - 1], ls = points[N - 1].score
    if (showBadge) {
      var bsz = 36, br = 8
      var bx = lp.x - bsz / 2
      var by = lp.y - bsz - 5
      if (bx + bsz > W - padR) bx = W - padR - bsz
      ctx.fillStyle = '#B2FF33'
      ctx.beginPath()
      ctx.moveTo(bx + br, by); ctx.lineTo(bx + bsz - br, by)
      ctx.arcTo(bx + bsz, by, bx + bsz, by + br, br)
      ctx.lineTo(bx + bsz, by + bsz - br)
      ctx.arcTo(bx + bsz, by + bsz, bx + bsz - br, by + bsz, br)
      ctx.lineTo(bx + br, by + bsz)
      ctx.arcTo(bx, by + bsz, bx, by + bsz - br, br)
      ctx.lineTo(bx, by + br)
      ctx.arcTo(bx, by, bx + br, by, br)
      ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.arc(lp.x, lp.y, 5, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#0E1C14'
      ctx.font = 'bold 14px PingFang SC'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(ls), lp.x, by + bsz / 2)
    } else {
      // 非末尾：末尾点画大圆点
      ctx.fillStyle = '#B2FF33'
      ctx.beginPath(); ctx.arc(lp.x, lp.y, 5, 0, Math.PI * 2); ctx.fill()
    }

    // 里程碑标注（视口内）
    visMilestones.forEach(function(m) {
      if (m.w < 0 || m.w >= N) return
      var pt = pts[m.w]
      var mw = 84, mh = 40, mr = 8
      var mx = pt.x - mw / 2
      if (mx < padL) mx = padL
      if (mx + mw > padL + cW) mx = padL + cW - mw
      var my = padT - mh - 4
      ctx.setLineDash([3, 3])
      ctx.strokeStyle = 'rgba(178,255,51,0.35)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y - 6); ctx.lineTo(pt.x, my + mh); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(20,38,28,0.96)'; ctx.strokeStyle = 'rgba(178,255,51,0.3)'; ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(mx + mr, my); ctx.lineTo(mx + mw - mr, my)
      ctx.arcTo(mx + mw, my, mx + mw, my + mr, mr)
      ctx.lineTo(mx + mw, my + mh - mr); ctx.arcTo(mx + mw, my + mh, mx + mw - mr, my + mh, mr)
      ctx.lineTo(mx + mr, my + mh); ctx.arcTo(mx, my + mh, mx, my + mh - mr, mr)
      ctx.lineTo(mx, my + mr); ctx.arcTo(mx, my, mx + mr, my, mr)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = 'rgba(178,255,51,0.85)'; ctx.font = '10px PingFang SC'
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillText(m.dateStr, mx + mw / 2, my + 6)
      ctx.fillStyle = 'rgba(255,255,255,0.82)'
      ctx.fillText(m.label, mx + mw / 2, my + 22)
    })

    // 存储里程碑点击区域（canvas CSS px 坐标）
    this._growthMilestoneHitAreas = visMilestones.map(function(m) {
      var pt = pts[m.w]
      return {
        x: pt.x, y: pt.y, radius: 22,
        label: m.label, dateStr: m.dateStr, detail: m.detail,
        scoreBefore: points[Math.max(0, m.w - 1)].score,
        scoreAfter: points[m.w].score,
      }
    })

    // X 轴日期标签（每隔 1 个显示）
    ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.font = '10px PingFang SC'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    points.forEach(function(p, i) {
      if (i % 2 === 0 || i === N - 1) ctx.fillText(p.label, xFor(i), padT + cH + 6)
    })

    // 左右拖动渐变指示器
    if (vs > 0) {
      var lgL = ctx.createLinearGradient(padL, 0, padL + 28, 0)
      lgL.addColorStop(0, 'rgba(26,40,32,0.88)')
      lgL.addColorStop(1, 'rgba(26,40,32,0)')
      ctx.fillStyle = lgL
      ctx.fillRect(padL, padT, 28, cH)
    }
    if (vs < maxStart) {
      var lgR = ctx.createLinearGradient(padL + cW - 28, 0, padL + cW, 0)
      lgR.addColorStop(0, 'rgba(26,40,32,0)')
      lgR.addColorStop(1, 'rgba(26,40,32,0.88)')
      ctx.fillStyle = lgR
      ctx.fillRect(padL + cW - 28, padT, 28, cH)
    }
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
      } catch(e) { console.error('[profile] drawSwingChartFromCache getPlayer failed:', e); return }
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
      .catch(function(e) { console.error('[profile] loadRecentMedia failed:', e) })
  }
})
