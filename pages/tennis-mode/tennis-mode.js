const db = wx.cloud.database()

Page({
  data: {
    post: null,
    postId: '',
    elapsedLabel: '0 分钟',
    scoreA: 0,
    scoreB: 0,
    currentSet: 1,
    tiebreak: false,
    setScores: [],
    canNextSet: false,
    canControl: false,
    moments: [],
    showInput: false,
    inputText: '',
    myName: '',
    joinersLabel: '',
    statusBarHeight: 20,
    uploading: false,
    teamALabel: '我方',
    teamBLabel: '对方'
  },

  onLoad: function(options) {
    var info = wx.getSystemInfoSync()
    this.postId = options.id
    this.setData({
      statusBarHeight: info.statusBarHeight,
      myName: wx.getStorageSync('nickname') || '球友'
    })
    this.loadPost()
    this.loadMoments()
  },

  onShow: function() {
    this.startTimer()
    this.startMomentRefresh()
  },

  onHide: function() {
    this.stopTimer()
    this.stopMomentRefresh()
  },

  onUnload: function() {
    this.stopTimer()
    this.stopMomentRefresh()
  },

  // ── Data ──

  loadPost: async function() {
    try {
      var results = await Promise.all([
        db.collection('posts').doc(this.postId).get(),
        wx.cloud.callFunction({ name: 'getOpenId' }).catch(function() { return null })
      ])
      var p = results[0].data
      var openIdRes = results[1]
      var myOpenId = openIdRes && openIdRes.result && openIdRes.result.openid

      var joiners = p.joiners || []
      var joinerOpenids = p.joinerOpenids || []
      // openid 优先，兜底用已缓存的 openid + 昵称双保险
      var cachedOpenId = wx.getStorageSync('myOpenId') || ''
      var effectiveOpenId = myOpenId || cachedOpenId
      var canControl = false
      if (effectiveOpenId) {
        canControl = p._openid === effectiveOpenId || joinerOpenids.indexOf(effectiveOpenId) !== -1
      }
      if (!canControl) {
        var myName = this.data.myName
        canControl = !!(myName && joiners.indexOf(myName) !== -1)
      }

      var post = getApp().processPost(p)
      var joinersLabel = joiners.slice(0, 4).join(' · ')
      var setScores = (p.liveScore && p.liveScore.sets) || []
      var teamALabel = joiners[0] || '球队A'
      var teamBLabel = joiners.length > 1 ? joiners.slice(1).join('/') : '球队B'
      this.setData({ post: post, joinersLabel: joinersLabel, canControl: canControl, setScores: setScores, teamALabel: teamALabel, teamBLabel: teamBLabel })

      if (p.liveScore) {
        var a = p.liveScore.a || 0, b = p.liveScore.b || 0
        this.setData({
          scoreA: a, scoreB: b,
          currentSet: p.liveScore.set || 1,
          tiebreak: !!p.liveScore.tiebreak,
          canNextSet: Math.max(a, b) >= 6
        })
      }
    } catch(e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  loadMoments: async function() {
    try {
      var res = await db.collection('moments')
        .where({ postId: this.postId })
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get()
      var now = Date.now()
      var moments = (res.data || []).map(function(m) {
        return {
          id: m._id,
          type: m.type || 'text',
          author: m.author || '球友',
          content: m.content || '',
          imageUrls: m.imageUrls || [],
          emoji: m.type === 'photo' ? '📸' : m.type === 'score' ? '🎾' : '✍️',
          nodeClass: 'dot-' + (m.type || 'text'),
          agoLabel: _agoLabel(m.createdAt, now),
          createdAt: m.createdAt || 0
        }
      })
      this.setData({ moments: moments })
    } catch(e) {
      // moments collection may not exist yet — silent
    }
  },

  // ── Timer ──

  startTimer: function() {
    var self = this
    this.stopTimer()
    this._tick()
    this.timerInterval = setInterval(function() { self._tick() }, 1000)
  },

  stopTimer: function() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null }
  },

  _tick: function() {
    var post = this.data.post
    if (!post || !post.gameTimestamp) return
    var elapsed = Math.max(0, Math.floor((Date.now() - post.gameTimestamp) / 1000))
    var h = Math.floor(elapsed / 3600)
    var m = Math.floor((elapsed % 3600) / 60)
    var label = h > 0 ? h + ' 小时 ' + m + ' 分钟' : (m > 0 ? m + ' 分钟' : '刚开始')
    this.setData({ elapsedLabel: label })
  },

  startMomentRefresh: function() {
    var self = this
    this.stopMomentRefresh()
    this.momentTimer = setInterval(function() { self.loadMoments() }, 15000)
  },

  stopMomentRefresh: function() {
    if (this.momentTimer) { clearInterval(this.momentTimer); this.momentTimer = null }
  },

  // ── Score ──

  addA: function() { this.setData({ scoreA: this.data.scoreA + 1 }); this._updateCanNextSet(); this.saveScore() },
  subA: function() {
    if (this.data.scoreA <= 0) return
    this.setData({ scoreA: this.data.scoreA - 1 }); this._updateCanNextSet(); this.saveScore()
  },
  addB: function() { this.setData({ scoreB: this.data.scoreB + 1 }); this._updateCanNextSet(); this.saveScore() },
  subB: function() {
    if (this.data.scoreB <= 0) return
    this.setData({ scoreB: this.data.scoreB - 1 }); this._updateCanNextSet(); this.saveScore()
  },

  _updateCanNextSet: function() {
    this.setData({ canNextSet: Math.max(this.data.scoreA, this.data.scoreB) >= 6 })
  },

  toggleTiebreak: function() {
    var entering = !this.data.tiebreak
    this.setData({ tiebreak: entering })
    this.saveScore()
    if (entering) this.addMoment({ type: 'score', content: '进入抢七！🔥' })
  },

  newSet: function() {
    var a = this.data.scoreA, b = this.data.scoreB, s = this.data.currentSet
    var setScores = this.data.setScores.concat([{ set: s, a: a, b: b }])
    var content = '第' + s + '盘结束 ' + a + ':' + b + ' · 进入第' + (s + 1) + '盘'
    this.setData({ currentSet: s + 1, scoreA: 0, scoreB: 0, tiebreak: false, setScores: setScores, canNextSet: false })
    this.saveScore()
    this.addMoment({ type: 'score', content: content })
  },

  saveScore: function() {
    db.collection('posts').doc(this.postId).update({
      data: {
        liveScore: {
          a: this.data.scoreA,
          b: this.data.scoreB,
          set: this.data.currentSet,
          tiebreak: this.data.tiebreak,
          sets: this.data.setScores
        }
      }
    }).catch(function() {})
  },

  // ── Text Moment ──

  showTextInput: function() { this.setData({ showInput: true, inputText: '' }) },
  cancelInput: function() { this.setData({ showInput: false }) },
  onInput: function(e) { this.setData({ inputText: e.detail.value }) },

  postText: function() {
    var text = (this.data.inputText || '').trim()
    if (!text) { wx.showToast({ title: '请输入内容', icon: 'none' }); return }
    this.setData({ showInput: false })
    this.addMoment({ type: 'text', content: text })
  },

  logScoreEvent: function() {
    if (this._logging) return
    this._logging = true
    var self = this
    var a = this.data.scoreA, b = this.data.scoreB
    var suffix = this.data.tiebreak ? '（抢七）' : ' 第' + this.data.currentSet + '盘'
    this.addMoment({ type: 'score', content: '比分 ' + a + ':' + b + suffix }).then(function() {
      self._logging = false
    }).catch(function() {
      self._logging = false
    })
  },

  // ── Photo Upload ──

  choosePhoto: async function() {
    if (this.data.uploading) return
    var self = this
    try {
      var res = await wx.chooseImage({
        count: 4,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      var paths = res.tempFilePaths || []
      if (!paths.length) return
      self.setData({ uploading: true })
      wx.showLoading({ title: '上传中...' })
      var imageUrls = []
      for (var i = 0; i < paths.length; i++) {
        var up = await wx.cloud.uploadFile({
          cloudPath: 'moments/' + self.postId + '/' + Date.now() + '_' + i + '.jpg',
          filePath: paths[i]
        })
        imageUrls.push(up.fileID)
      }
      wx.hideLoading()
      self.setData({ uploading: false })
      self.addMoment({ type: 'photo', content: '', imageUrls: imageUrls })
    } catch(e) {
      wx.hideLoading()
      self.setData({ uploading: false })
      if (e && e.errMsg && e.errMsg.indexOf('cancel') === -1) {
        wx.showToast({ title: '上传失败', icon: 'none' })
      }
    }
  },

  // ── Add Moment ──

  addMoment: async function(opts) {
    var self = this
    var now = Date.now()
    var doc = {
      postId: self.postId,
      type: opts.type || 'text',
      author: self.data.myName,
      content: opts.content || '',
      imageUrls: opts.imageUrls || [],
      createdAt: now
    }
    try {
      var dbRes = await db.collection('moments').add({ data: doc })
      var m = {
        id: dbRes._id,
        type: doc.type,
        author: doc.author,
        content: doc.content,
        imageUrls: doc.imageUrls,
        emoji: doc.type === 'photo' ? '📸' : doc.type === 'score' ? '🎾' : '✍️',
        nodeClass: 'dot-' + doc.type,
        agoLabel: '刚刚',
        createdAt: now
      }
      self.setData({ moments: [m].concat(self.data.moments) })
    } catch(e) {
      wx.showToast({ title: '发布失败，请重试', icon: 'none' })
    }
  },

  previewImg: function(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.url,
      urls: e.currentTarget.dataset.urls
    })
  },

  // ── End Session ──

  endSession: function() {
    var self = this
    wx.showModal({
      title: '结束球局 🎾',
      content: '确认结束今天的球局？结束后将生成今日球报',
      confirmText: '结束',
      confirmColor: '#A6FF33',
      cancelText: '继续打',
      success: function(res) {
        if (res.confirm) self.doEndSession()
      }
    })
  },

  doEndSession: async function() {
    wx.showLoading({ title: '生成球报中...' })
    try {
      await db.collection('posts').doc(this.postId).update({
        data: {
          manuallyEnded: true,
          endedAt: Date.now(),
          finalScore: { a: this.data.scoreA, b: this.data.scoreB }
        }
      })
      wx.hideLoading()
      this.stopTimer()
      this.stopMomentRefresh()
      wx.redirectTo({ url: '/pages/game-report/game-report?id=' + this.postId })
    } catch(e) {
      wx.hideLoading()
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  noop: function() {},

  goBack: function() { wx.navigateBack() }
})

function _agoLabel(ts, now) {
  if (!ts) return ''
  var diff = Math.floor((now - ts) / 60000)
  if (diff < 1) return '刚刚'
  if (diff < 60) return diff + '分前'
  return Math.floor(diff / 60) + '小时前'
}
