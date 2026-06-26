var app = getApp()
var db = wx.cloud.database()

var PAGE_SIZE = 25

Page({
  data: {
    hasProfile: false,
    activeTab: 'discover',
    posts: [],
    filteredPosts: [],
    postsLoading: false,
    postsLoadingMore: false,
    postsHasMore: true,
    activeCount: 0,
    ongoingCount: 0,
    showScoreOverlay: false,
    activeScorePostId: '',
    quickScoreA: 0,
    quickScoreB: 0,
    quickScoreSet: 1,
    nickname: ''
  },

  goLogin: function() { wx.navigateTo({ url: '/pages/login/login' }) },

  onLoad: function(options) {
    var tab = (options && options.tab) || 'discover'
    var player = app.globalData.player
    var hasProfile = !!(player && player.nickname)
    var nickname = hasProfile ? player.nickname : ''
    this.setData({ activeTab: tab, hasProfile: hasProfile, nickname: nickname })
    this._loaded = true
    if (hasProfile) {
      this.loadPosts()
      this._fetchUserLocation()
      this.startRefreshTimer()
    }
  },

  onShow: function() {
    var player = app.globalData.player
    var hasProfile = !!(player && player.nickname)
    var nickname = hasProfile ? player.nickname : ''
    this.setData({ hasProfile: hasProfile, nickname: nickname })
    if (this._loaded && hasProfile) {
      this.loadPosts()
    }
  },

  onHide: function() { this.stopRefreshTimer() },
  onUnload: function() { this.stopRefreshTimer() },

  setTab: function(e) {
    var tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    this._applyFilter()
  },

  // ── 数据加载 ──

  loadPosts: async function() {
    this.setData({ postsLoading: true, postsHasMore: true })
    this._serverSkip = 0
    this.rawPosts = []
    try {
      var batch = await this._fetchBatch(0)
      var cutoff48 = Date.now() - 48 * 3600 * 1000
      this.rawPosts = batch.filter(function(p) { return _keepPost(p, cutoff48) })
      this._serverSkip = batch.length
      this.setData({ postsHasMore: batch.length >= PAGE_SIZE })
      this.refreshStatuses()
    } catch(e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
    this.setData({ postsLoading: false })
  },

  _fetchBatch: async function(skip) {
    var _ = db.command
    var cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000)
    var res = await db.collection('posts')
      .where({ createdAt: _.gte(cutoff) })
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(PAGE_SIZE)
      .get()
    return res.data || []
  },

  onScrollBottom: async function() {
    if (!this.data.postsHasMore || this.data.postsLoadingMore || this.data.postsLoading) return
    this.setData({ postsLoadingMore: true })
    try {
      var batch = await this._fetchBatch(this._serverSkip)
      var cutoff48 = Date.now() - 48 * 3600 * 1000
      var newPosts = batch.filter(function(p) { return _keepPost(p, cutoff48) })
      this.rawPosts = this.rawPosts.concat(newPosts)
      this._serverSkip += batch.length
      this.setData({ postsHasMore: batch.length >= PAGE_SIZE })
      this.refreshStatuses()
    } catch(e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
    this.setData({ postsLoadingMore: false })
  },

  refreshStatuses: function() {
    var rawPosts = this.rawPosts || []
    var currentPosts = this.data.posts || []
    var nickname = this.data.nickname || ''
    var myOpenId = wx.getStorageSync('myOpenId') || ''
    var userLat = this._userLat, userLng = this._userLng

    var posts = rawPosts.map(function(p) {
      var processed = app.processPost(p)
      if (userLat && userLng && p.locationLat && p.locationLng) {
        processed.distanceText = _calcDistance(userLat, userLng, p.locationLat, p.locationLng)
      }
      var current = null
      for (var i = 0; i < currentPosts.length; i++) {
        if (currentPosts[i]._id === p._id) { current = currentPosts[i]; break }
      }
      if (current && current.recentMoments) processed.recentMoments = current.recentMoments
      if (myOpenId) {
        processed.alreadyJoined = (p.joinerOpenids || []).indexOf(myOpenId) !== -1
        processed.isParticipant = p._openid === myOpenId || processed.alreadyJoined
        processed.isMine = p._openid === myOpenId || processed.alreadyJoined
      } else if (nickname) {
        processed.alreadyJoined = (p.joiners || []).indexOf(nickname) !== -1
        processed.isParticipant = processed.alreadyJoined
        processed.isMine = processed.alreadyJoined
      }
      return processed
    })

    var activeCount = 0, ongoingCount = 0
    posts.forEach(function(p) {
      var code = p.gameStatus.code
      if (code === 'recruiting' || code === 'starting-soon') activeCount++
      if (code === 'in-progress') ongoingCount++
    })

    this.setData({ posts: posts, activeCount: activeCount, ongoingCount: ongoingCount })
    this._applyFilter()
    this.loadMomentsForOngoing(posts).catch(function() {})
  },

  _applyFilter: function() {
    var activeTab = this.data.activeTab
    var posts = this.data.posts || []
    var active = posts.filter(function(p) {
      var code = p.gameStatus && p.gameStatus.code
      return code !== 'finished' && code !== 'cancelled'
    })
    var result = activeTab === 'mine'
      ? active.filter(function(p) { return p.isMine })
      : active
    this.setData({ filteredPosts: result })
  },

  loadMomentsForOngoing: async function(posts) {
    var ongoing = (posts || []).filter(function(p) { return p.gameStatus.code === 'in-progress' })
    if (!ongoing.length) return
    var self = this
    var now = Date.now()
    try {
      var ongoingIds = ongoing.map(function(p) { return p._id })
      var res = await db.collection('moments')
        .where({ postId: db.command.in(ongoingIds) })
        .orderBy('createdAt', 'desc')
        .limit(ongoingIds.length * 3)
        .get()
      var momentsByPost = {}
      ;(res.data || []).forEach(function(m) {
        if (!momentsByPost[m.postId]) momentsByPost[m.postId] = []
        if (momentsByPost[m.postId].length < 3) {
          momentsByPost[m.postId].push({
            id: m._id, type: m.type || 'text',
            author: m.author || '', content: m.content || '',
            imageUrls: m.imageUrls || [],
            emoji: m.type === 'photo' ? '📸' : m.type === 'score' ? '🎾' : '✍️',
            nodeClass: 'dot-' + (m.type || 'text'),
            agoLabel: _agoLabel(m.createdAt, now)
          })
        }
      })
      var updatedPosts = self.data.posts.map(function(p) {
        if (momentsByPost[p._id] !== undefined) return Object.assign({}, p, { recentMoments: momentsByPost[p._id] })
        return p
      })
      self.setData({ posts: updatedPosts })
      self._applyFilter()
    } catch(e) {}
  },

  _fetchUserLocation: function() {
    var self = this
    wx.getFuzzyLocation({
      type: 'gcj02',
      success: function(res) {
        self._userLat = res.latitude
        self._userLng = res.longitude
        if (self.rawPosts && self.rawPosts.length) self.refreshStatuses()
      },
      fail: function() {}
    })
  },

  startRefreshTimer: function() {
    var self = this
    this.stopRefreshTimer()
    this.refreshTimer = setInterval(function() { self.refreshStatuses() }, 30000)
  },

  stopRefreshTimer: function() {
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null }
  },

  // ── 导航 ──

  goDetail: function(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },
  goLive: function() {
    var posts = this.data.posts || []
    for (var i = 0; i < posts.length; i++) {
      if (posts[i].gameStatus.code === 'in-progress') {
        wx.navigateTo({ url: '/pages/detail/detail?id=' + posts[i]._id })
        return
      }
    }
  },
  createMatch: function() {
    app.requireProfile(function() {
      wx.navigateTo({ url: '/pages/post/post' })
    })
  },

  // ── 上传现场照片 ──

  quickUpload: async function(e) {
    var postId = e.currentTarget.dataset.id
    var myName = this.data.nickname || '球友'
    var self = this
    try {
      var res = await wx.chooseImage({ count: 4, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
      var paths = res.tempFilePaths || []
      if (!paths.length) return
      wx.showLoading({ title: '上传中...' })
      var imageUrls = []
      for (var i = 0; i < paths.length; i++) {
        var up = await wx.cloud.uploadFile({
          cloudPath: 'moments/' + postId + '/' + Date.now() + '_' + i + '.jpg',
          filePath: paths[i]
        })
        imageUrls.push(up.fileID)
      }
      wx.hideLoading()
      await db.collection('moments').add({
        data: { postId: postId, type: 'photo', author: myName, content: '', imageUrls: imageUrls, createdAt: Date.now() }
      })
      self._prependMoment(postId, {
        id: '_' + Date.now(), type: 'photo', author: myName, content: '', imageUrls: imageUrls,
        emoji: '📸', nodeClass: 'dot-photo', agoLabel: '刚刚'
      })
      wx.showToast({ title: '上传成功 📸', icon: 'none' })
    } catch(e) {
      wx.hideLoading()
      if (e && e.errMsg && e.errMsg.indexOf('cancel') === -1) {
        wx.showToast({ title: '上传失败', icon: 'none' })
      }
    }
  },

  // ── 局分 Sheet ──

  quickScore: function(e) {
    var score = e.currentTarget.dataset.score || {}
    this.setData({
      showScoreOverlay: true,
      activeScorePostId: e.currentTarget.dataset.id,
      quickScoreA: score.a || 0,
      quickScoreB: score.b || 0,
      quickScoreSet: score.set || 1
    })
  },
  cancelScore: function() { this.setData({ showScoreOverlay: false }) },
  addQuickA: function() { this.setData({ quickScoreA: this.data.quickScoreA + 1 }) },
  subQuickA: function() { if (this.data.quickScoreA > 0) this.setData({ quickScoreA: this.data.quickScoreA - 1 }) },
  addQuickB: function() { this.setData({ quickScoreB: this.data.quickScoreB + 1 }) },
  subQuickB: function() { if (this.data.quickScoreB > 0) this.setData({ quickScoreB: this.data.quickScoreB - 1 }) },
  upQuickSet: function() { this.setData({ quickScoreSet: this.data.quickScoreSet + 1 }) },

  confirmScore: async function() {
    var postId = this.data.activeScorePostId
    var a = this.data.quickScoreA, b = this.data.quickScoreB, set = this.data.quickScoreSet
    var myName = this.data.nickname || '球友'
    var content = '比分更新 ' + a + ':' + b + ' 第' + set + '盘'
    this.setData({ showScoreOverlay: false })
    try {
      await db.collection('posts').doc(postId).update({
        data: { liveScore: { a: a, b: b, set: set, tiebreak: false } }
      })
      db.collection('moments').add({
        data: { postId: postId, type: 'score', author: myName, content: content, imageUrls: [], createdAt: Date.now() }
      }).catch(function() {})
      var newScore = { a: a, b: b, set: set, tiebreak: false }
      var newMoment = {
        id: '_' + Date.now(), type: 'score', author: myName, content: content, imageUrls: [],
        emoji: '🎾', nodeClass: 'dot-score', agoLabel: '刚刚'
      }
      var posts = this.data.posts.map(function(p) {
        if (p._id === postId) {
          return Object.assign({}, p, { liveScore: newScore, recentMoments: [newMoment].concat(p.recentMoments || []).slice(0, 3) })
        }
        return p
      })
      this.setData({ posts: posts })
      this._applyFilter()
      wx.showToast({ title: '比分已更新 🎾', icon: 'none' })
    } catch(e) {
      wx.showToast({ title: '更新失败，请重试', icon: 'none' })
    }
  },

  onMomentImgError: function(e) {
    var postId = e.currentTarget.dataset.postId
    var momentId = e.currentTarget.dataset.momentId
    var posts = this.data.posts.map(function(p) {
      if (p._id !== postId) return p
      var moments = (p.recentMoments || []).map(function(m) {
        if (m.id !== momentId) return m
        return Object.assign({}, m, { imageUrls: [] })
      })
      return Object.assign({}, p, { recentMoments: moments })
    })
    this.setData({ posts: posts })
  },

  _prependMoment: function(postId, moment) {
    var posts = this.data.posts.map(function(p) {
      if (p._id === postId) {
        return Object.assign({}, p, { recentMoments: [moment].concat(p.recentMoments || []).slice(0, 3) })
      }
      return p
    })
    this.setData({ posts: posts })
    this._applyFilter()
  },

  noop: function() {}
})

function _agoLabel(ts, now) {
  if (!ts) return ''
  var diff = Math.floor((now - ts) / 60000)
  if (diff < 1) return '刚刚'
  if (diff < 60) return diff + '分前'
  return Math.floor(diff / 60) + '小时前'
}

function _calcDistance(lat1, lng1, lat2, lng2) {
  var R = 6371
  var dLat = (lat2 - lat1) * Math.PI / 180
  var dLng = (lng2 - lng1) * Math.PI / 180
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng/2) * Math.sin(dLng/2)
  var km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  if (km < 1) return Math.round(km * 1000) + 'm'
  return km.toFixed(1) + 'km'
}

function _keepPost(p, cutoff48) {
  if (p.cancelled) return false
  if (p.manuallyEnded) return false
  if (p.gameTimestamp) {
    var end = p.gameTimestamp + (p.estimatedDuration || 120) * 60 * 1000
    if (end < cutoff48) return false
  }
  return true
}
