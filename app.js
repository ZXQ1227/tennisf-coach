App({
  globalData: {
    player: null,
    activityCache: null,
    _privacyResolve: null,
    _onPrivacyNeeded: null,
  },

  onLaunch: function() {
    wx.cloud.init({
      env: 'cloud1-d0g1q4d5p6fc28083',
      traceUser: true,
      timeout: 90000
    })

    var self = this
    wx.onNeedPrivacyAuthorization(function(resolve) {
      self.globalData._privacyResolve = resolve
      if (self.globalData._onPrivacyNeeded) self.globalData._onPrivacyNeeded()
    })

    // Load player from cache first, then refresh from cloud
    var cached = wx.getStorageSync('playerProfile')
    if (cached && cached.nickname) {
      this.globalData.player = cached
    }
    // 游客也可进入，功能入口再按需触发登录
    this._initBackground()
  },

  _initBackground: function() {
    var self = this
    // 延迟刷新：让首屏先渲染，避免云函数冷启动 timeout 卡在启动路径
    setTimeout(function() { self.refreshPlayer() }, 1500)
    // 缓存 openid，供各页面判断是否是创建者
    wx.cloud.callFunction({ name: 'getOpenId' }).then(function(res) {
      if (res.result && res.result.openid) {
        wx.setStorageSync('myOpenId', res.result.openid)
      }
    }).catch(function() {})
  },

  refreshPlayer: function() {
    var self = this
    wx.cloud.callFunction({ name: 'getPlayer' }).then(function(res) {
      if (res.result && res.result.player) {
        self.globalData.player = res.result.player
        wx.setStorageSync('playerProfile', res.result.player)
      }
    }).catch(function() {})
  },

  onUnhandledRejection: function(res) {
    // 静默拦截云函数/DB 查询超时产生的 unhandled rejection，防止出现 WAServiceMainContext 错误
  },

  hasProfile: function() {
    return !!(this.globalData.player && this.globalData.player.nickname)
  },

  requireAuth: function(returnUrl) {
    if (this.hasProfile()) return true
    var url = '/pages/login/login'
    if (returnUrl) url += '?return=' + encodeURIComponent(returnUrl)
    wx.navigateTo({ url: url })
    return false
  },

  requireProfile: function(onSuccess) {
    if (this.hasProfile()) {
      if (onSuccess) onSuccess()
      return
    }
    wx.navigateTo({ url: '/pages/login/login?return=' + encodeURIComponent('/pages/post/post') })
  },

  formatDate: function(dateStr) {
    if (!dateStr) return ''
    var today = new Date()
    var pad = function(n) { return String(n).padStart(2, '0') }
    var todayStr = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate())
    var tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    var yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    var tomorrowStr = tomorrow.getFullYear() + '-' + pad(tomorrow.getMonth() + 1) + '-' + pad(tomorrow.getDate())
    var yesterdayStr = yesterday.getFullYear() + '-' + pad(yesterday.getMonth() + 1) + '-' + pad(yesterday.getDate())
    if (dateStr === todayStr) return '今天'
    if (dateStr === tomorrowStr) return '明天'
    if (dateStr === yesterdayStr) return '昨天'
    var parts = dateStr.split('-')
    return parts[1] + '/' + parts[2]
  },

  computeGameStatus: function(p, now) {
    if (p.cancelled) {
      return { code: 'cancelled', label: '已取消', color: '#FF6B6B', bg: '#FFF0F0', dim: true }
    }
    if (p.manuallyEnded) {
      return { code: 'finished', label: '已结束', color: '#AAAAAA', bg: '#F5F5F5', dim: true }
    }

    // 优先用 gameTimestamp；没有则从 date + time 字段推算
    var start = p.gameTimestamp
    if (!start && p.date && p.time) {
      var timeParts = p.time.split(':')
      var d = new Date(p.date)
      d.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1] || 0, 10), 0, 0)
      var derived = d.getTime()
      if (!isNaN(derived)) start = derived
    }

    // 仍然没有时间信息 → 只能认为招募中
    if (!start) {
      return { code: 'recruiting', label: '招募中', color: '#2BB673', bg: '#E8F9F1', dim: false }
    }

    var durationMs = (p.estimatedDuration || 120) * 60 * 1000
    var end = start + durationMs
    var msTillStart = start - now

    if (now >= end) {
      return { code: 'finished', label: '已结束', color: '#AAAAAA', bg: '#F5F5F5', dim: true }
    }
    if (now >= start) {
      return { code: 'in-progress', label: '正在进行', color: '#2BB673', bg: '#E8F9F1', dim: false, live: true }
    }
    if (p.joined >= p.need) {
      return { code: 'full', label: '已满员', color: '#888888', bg: '#F2F2F2', dim: false }
    }
    if (msTillStart <= 30 * 60 * 1000) {
      return { code: 'starting-soon', label: '即将开打', color: '#FF6B2B', bg: '#FFF3EE', dim: false, pulse: true }
    }
    return { code: 'recruiting', label: '招募中', color: '#2BB673', bg: '#E8F9F1', dim: false }
  },

  computeTimeLabel: function(p, statusCode, now) {
    var start = p.gameTimestamp
    if (!start) return (p.dateLabel || '') + ' ' + (p.time || '')
    var durationMs = (p.estimatedDuration || 120) * 60 * 1000
    var msTillStart = start - now
    var msElapsed = now - start

    if (statusCode === 'finished') {
      var actualMs = (p.manuallyEnded && p.endedAt && start) ? (p.endedAt - start) : durationMs
      actualMs = Math.max(actualMs, 0)
      var h = Math.floor(actualMs / 3600000)
      var m = Math.floor((actualMs % 3600000) / 60000)
      return '打了 ' + (h > 0 ? h + '小时' : '') + (m > 0 ? m + '分钟' : (h === 0 ? '不到1分钟' : ''))
    }
    if (statusCode === 'in-progress') {
      var elapsedMin = Math.floor(msElapsed / 60000)
      return elapsedMin + ' 分钟'
    }
    if (statusCode === 'starting-soon') {
      var minLeft = Math.max(1, Math.floor(msTillStart / 60000))
      return '还有 ' + minLeft + ' 分钟'
    }
    if (msTillStart < 2 * 3600000) {
      var totalMin = Math.floor(msTillStart / 60000)
      var hh = Math.floor(totalMin / 60)
      var mm = totalMin % 60
      if (hh > 0) return '还有 ' + hh + '小时' + (mm > 0 ? mm + '分' : '')
      return '还有 ' + mm + ' 分钟'
    }
    return (p.dateLabel || '') + ' ' + (p.time || '')
  },

  processPost: function(p) {
    var AVATAR_COLORS = ['#2BB673', '#4ECDC4', '#F7B731', '#A29BFE', '#FF6B6B', '#FD79A8', '#00CEC9', '#FDCB6E']
    var LEVEL_MAP = {
      beginner: { label: '新手', full: '新手 2.0-2.5', color: '#4ECDC4' },
      intermediate: { label: '进阶', full: '进阶 3.0-3.5', color: '#F7B731' },
      advanced: { label: '竞技', full: '竞技 4.0+', color: '#FF6B6B' }
    }
    var MATCH_MAP = { singles: '单打', doubles: '双打', any: '随意' }
    var COURT_MAP = { hard: '硬地', clay: '红土', grass: '草地' }
    var FEE_MAP = { free: '免费', split: 'AA制', fixed: '固定收费' }

    var joined = p.joined || 0
    var need = p.need || 1

    // doubles need at least 4 players
    if (p.matchType === 'doubles' && need < 4) need = 4

    var now = Date.now()
    var gameStatus = this.computeGameStatus(p, now)
    var code = gameStatus.code

    // in-progress joined cannot be 0 — fallback to joiners array or 1
    if (code === 'in-progress' && joined === 0) {
      joined = Math.max((p.joiners || []).length, 1)
    }

    var spotsLeft = Math.max(0, need - joined)
    var timeLabel = this.computeTimeLabel(p, code, now)

    var result = Object.assign({}, p)
    result.joined = joined
    result.need = need
    result.dateLabel = this.formatDate(p.date)
    result.levelInfo = LEVEL_MAP[p.level] || null
    result.matchLabel = MATCH_MAP[p.matchType] || ''
    result.courtLabel = COURT_MAP[p.courtType] || ''
    result.feeLabel = FEE_MAP[p.fee] || ''
    result.fillPercent = Math.round((joined / need) * 100)
    result.spotsLeft = spotsLeft
    result.gameStatus = gameStatus
    result.timeLabel = timeLabel
    result.canJoin = gameStatus.code === 'recruiting' || gameStatus.code === 'starting-soon'
    result.canWaitlist = gameStatus.code === 'full'

    // 预计算 class 字符串（避免 WXML 里跨行表达式）
    result.cardClass = 'card' + (code === 'starting-soon' ? ' card-starting-soon' : '') + (code === 'in-progress' ? ' card-in-progress' : '') + (gameStatus.dim ? ' card-dim' : '')
    result.heroStatusDotClass = 'hero-status-dot' + (gameStatus.live ? ' dot-live-white' : '') + (gameStatus.pulse ? ' dot-pulse-white' : '')
    result.heroStyle = (code === 'finished' || code === 'cancelled') ? 'opacity:0.75' : ''
    result.bottomBtnClass = 'bottom-btn' + (code === 'starting-soon' ? ' bottom-btn-soon' : '')
    result.bottomBtnText = code === 'starting-soon' ? '快加入 🔥' : '加入球局'
    result.statusDotClass = 'status-dot' + (gameStatus.live ? ' dot-live' : '') + (gameStatus.pulse ? ' dot-pulse' : '')
    result.timeLabelClass = 'time-label' + (code === 'starting-soon' ? ' time-label-urgent' : '') + (code === 'in-progress' ? ' time-label-live' : '')
    result.spotsMainClass = 'spots-main' + (code === 'finished' || code === 'full' ? ' spots-dim' : '')
    result.spotsText = code === 'in-progress' ? timeLabel : code === 'finished' ? timeLabel : spotsLeft === 0 ? '已满员' : '还差 ' + spotsLeft + ' 人'
    if (code === 'in-progress') {
      var isFull = joined >= need
      var isOpen = p.recruitingOpen !== false
      result.liveJoinable = !isFull && isOpen
      result.liveSubLabel = isFull ? '已满员' : (isOpen ? '缺人中' : '已关闭')
      result.liveSubColor = isFull ? '#FF6B6B' : (isOpen ? '#A6FF33' : '#F7B731')
    }
    result.avatars = (p.joiners || []).filter(function(n) { return !!n }).slice(0, 3).map(function(name, i) {
      return { initial: name.slice(-1), color: AVATAR_COLORS[i % AVATAR_COLORS.length] }
    })
    result.avatarsFull = (p.joiners || []).filter(function(n) { return !!n }).map(function(name, i) {
      return { initial: name.slice(-1), name: name, color: AVATAR_COLORS[i % AVATAR_COLORS.length] }
    })
    result.extraCount = Math.max(0, joined - 3)
    return result
  }
})
