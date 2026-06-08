const db = wx.cloud.database()
const app = getApp()

const FILTERS = [
  { label: '全部', value: 'all' },
  { label: '新手友好', value: 'beginner' },
  { label: '进阶局', value: 'intermediate' },
  { label: '竞技局', value: 'advanced' }
]

var PAGE_SIZE = 25

Page({
  data: {
    posts: [],
    filteredPosts: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    filters: FILTERS,
    activeFilter: 'all',
    nickname: '',
    activeCount: 0,
    ongoingCount: 0,
    showScoreOverlay: false,
    activeScorePostId: '',
    quickScoreA: 0,
    quickScoreB: 0,
    quickScoreSet: 1
  },

  onShow: function() {
    const nickname = wx.getStorageSync('nickname') || ''
    this.setData({ nickname: nickname })
    this.loadPosts()
    this.startRefreshTimer()
  },

  onHide: function() { this.stopRefreshTimer() },
  onUnload: function() { this.stopRefreshTimer() },

  onPullDownRefresh: function() {
    this.loadPosts().then(function() { wx.stopPullDownRefresh() })
  },

  startRefreshTimer: function() {
    var self = this
    this.stopRefreshTimer()
    this.refreshTimer = setInterval(function() { self.refreshStatuses() }, 30000)
  },

  stopRefreshTimer: function() {
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null }
  },

  // ── Data Loading ──

  loadPosts: async function() {
    this.setData({ loading: true, hasMore: true })
    this._serverSkip = 0
    this.rawPosts = []
    try {
      var batch = await this._fetchBatch(0)
      var cutoff48 = Date.now() - 48 * 3600 * 1000
      this.rawPosts = batch.filter(function(p) { return _keepPost(p, cutoff48) })
      this._serverSkip = batch.length
      this.setData({ hasMore: batch.length >= PAGE_SIZE })
      this.refreshStatuses()
    } catch(e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
    this.setData({ loading: false })
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

  onReachBottom: async function() {
    if (!this.data.hasMore || this.data.loadingMore || this.data.loading) return
    this.setData({ loadingMore: true })
    try {
      var batch = await this._fetchBatch(this._serverSkip)
      var cutoff48 = Date.now() - 48 * 3600 * 1000
      var newPosts = batch.filter(function(p) { return _keepPost(p, cutoff48) })
      this.rawPosts = this.rawPosts.concat(newPosts)
      this._serverSkip += batch.length
      this.setData({ hasMore: batch.length >= PAGE_SIZE })
      this.refreshStatuses()
    } catch(e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
    this.setData({ loadingMore: false })
  },

  refreshStatuses: function() {
    var rawPosts = this.rawPosts || []
    var currentPosts = this.data.posts || []
    var nickname = this.data.nickname || ''

    // Process posts, preserving recentMoments from current state
    var myOpenId = wx.getStorageSync('myOpenId') || ''
    var posts = rawPosts.map(function(p) {
      var processed = app.processPost(p)
      var current = null
      for (var i = 0; i < currentPosts.length; i++) {
        if (currentPosts[i]._id === p._id) { current = currentPosts[i]; break }
      }
      if (current && current.recentMoments) {
        processed.recentMoments = current.recentMoments
      }
      if (nickname) {
        processed.alreadyJoined = (p.joiners || []).indexOf(nickname) !== -1
      }
      // 参与者校验：openid 优先，降级用昵称
      if (myOpenId) {
        processed.isParticipant = p._openid === myOpenId || (p.joinerOpenids || []).indexOf(myOpenId) !== -1
      } else if (nickname) {
        processed.isParticipant = (p.joiners || []).indexOf(nickname) !== -1
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
    this.applyFilter(this.data.activeFilter)

    // Load moments for ongoing posts (async, non-blocking)
    this.loadMomentsForOngoing(posts)
  },

  loadMomentsForOngoing: async function(posts) {
    var ongoing = (posts || []).filter(function(p) { return p.gameStatus.code === 'in-progress' })
    if (!ongoing.length) return
    var self = this
    var now = Date.now()
    try {
      var results = await Promise.all(ongoing.map(function(p) {
        return db.collection('moments')
          .where({ postId: p._id })
          .orderBy('createdAt', 'desc')
          .limit(3)
          .get()
      }))

      var momentsByPost = {}
      ongoing.forEach(function(p, i) {
        var raw = (results[i] && results[i].data) || []
        momentsByPost[p._id] = raw.map(function(m) {
          return {
            id: m._id,
            type: m.type || 'text',
            author: m.author || '',
            content: m.content || '',
            imageUrls: m.imageUrls || [],
            emoji: m.type === 'photo' ? '📸' : m.type === 'score' ? '🎾' : '✍️',
            nodeClass: 'dot-' + (m.type || 'text'),
            agoLabel: _agoLabel(m.createdAt, now)
          }
        })
      })

      var updatedPosts = self.data.posts.map(function(p) {
        if (momentsByPost[p._id] !== undefined) {
          return Object.assign({}, p, { recentMoments: momentsByPost[p._id] })
        }
        return p
      })
      self.setData({ posts: updatedPosts })
      self.applyFilter(self.data.activeFilter)
    } catch(e) {
      // moments collection may not exist yet — silent
    }
  },

  // ── Filter ──

  onFilterTap: function(e) { this.applyFilter(e.currentTarget.dataset.filter) },

  applyFilter: function(filter) {
    var posts = this.data.posts
    var filtered = filter === 'all' ? posts : posts.filter(function(p) { return p.level === filter })
    this.setData({ filteredPosts: filtered, activeFilter: filter })
  },

  goDetail: function(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  goPost: function() {
    var app = getApp()
    app.requireProfile(function() {
      wx.navigateTo({ url: '/pages/post/post' })
    })
  },

  goLive: function() {
    var posts = this.data.posts || []
    var livePost = null
    for (var i = 0; i < posts.length; i++) {
      if (posts[i].gameStatus.code === 'in-progress') { livePost = posts[i]; break }
    }
    if (livePost) {
      wx.navigateTo({ url: '/pages/detail/detail?id=' + livePost._id })
    }
  },

  noop: function() {},

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
      this.applyFilter(this.data.activeFilter)
      wx.showToast({ title: '比分已更新 🎾', icon: 'none' })
    } catch(e) {
      wx.showToast({ title: '更新失败，请重试', icon: 'none' })
    }
  },

  _prependMoment: function(postId, moment) {
    var posts = this.data.posts.map(function(p) {
      if (p._id === postId) {
        return Object.assign({}, p, { recentMoments: [moment].concat(p.recentMoments || []).slice(0, 3) })
      }
      return p
    })
    this.setData({ posts: posts })
    this.applyFilter(this.data.activeFilter)
  }
})

function _agoLabel(ts, now) {
  if (!ts) return ''
  var diff = Math.floor((now - ts) / 60000)
  if (diff < 1) return '刚刚'
  if (diff < 60) return diff + '分前'
  return Math.floor(diff / 60) + '小时前'
}

function _keepPost(p, cutoff48) {
  if (p.cancelled) return false
  if (p.gameTimestamp) {
    var end = p.gameTimestamp + (p.estimatedDuration || 120) * 60 * 1000
    if (end < cutoff48) return false
  }
  return true
}
