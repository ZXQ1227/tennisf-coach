const db = wx.cloud.database()

var MATCH_TYPE_MAP = { singles: '单打', doubles: '双打', any: '随意' }
var LEVEL_MAP = { beginner: '新手友好', intermediate: '进阶局', advanced: '竞技局' }

Page({
  data: {
    loading: true,
    post: null,
    postId: '',
    statusBarHeight: 20,
    venue: '',
    dateLabel: '',
    matchTypeLabel: '',
    levelLabel: '',
    duration: '',
    finalA: 0,
    finalB: 0,
    setScores: [],
    aSetWins: 0,
    bSetWins: 0,
    players: [],
    photoCount: 0,
    textCount: 0,
    scoreCount: 0,
    hasMoments: false
  },

  onLoad: function(options) {
    var info = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: info.statusBarHeight, postId: options.id || '' })
    this.loadReport()
  },

  loadReport: async function() {
    var id = this.data.postId
    if (!id) { this.setData({ loading: false }); return }
    try {
      var results = await Promise.all([
        db.collection('posts').doc(id).get(),
        db.collection('moments').where({ postId: id }).limit(100).get().catch(function() { return { data: [] } })
      ])
      var p = results[0].data
      var moments = results[1].data || []

      // Duration
      var duration = ''
      if (p.endedAt && p.gameTimestamp) {
        var mins = Math.max(0, Math.floor((p.endedAt - p.gameTimestamp) / 60000))
        var h = Math.floor(mins / 60)
        var m = mins % 60
        duration = h > 0 ? (h + ' 小时' + (m > 0 ? ' ' + m + ' 分' : '')) : m + ' 分钟'
      } else if (p.estimatedDuration) {
        duration = '约 ' + p.estimatedDuration + ' 分钟'
      }

      // Score
      var finalScore = p.finalScore || {}
      var liveScore = p.liveScore || {}
      var finalA = finalScore.a !== undefined ? finalScore.a : (liveScore.a || 0)
      var finalB = finalScore.b !== undefined ? finalScore.b : (liveScore.b || 0)
      var setScores = liveScore.sets || []

      // Set wins count
      var aSetWins = 0, bSetWins = 0
      setScores.forEach(function(ss) {
        if (ss.a > ss.b) aSetWins++
        else if (ss.b > ss.a) bSetWins++
      })
      // Include the final set if it has data
      if (finalA > 0 || finalB > 0) {
        if (finalA > finalB) aSetWins++
        else if (finalB > finalA) bSetWins++
      }

      // Moment stats
      var photoCount = 0, textCount = 0, scoreCount = 0
      moments.forEach(function(m) {
        if (m.type === 'photo') photoCount += (m.imageUrls && m.imageUrls.length) || 1
        else if (m.type === 'text') textCount++
        else if (m.type === 'score') scoreCount++
      })

      // Date label
      var dateLabel = (p.date || '') + (p.time ? '  ' + p.time : '')

      this.setData({
        post: p,
        venue: p.location || '球场',
        dateLabel: dateLabel,
        matchTypeLabel: MATCH_TYPE_MAP[p.matchType] || '',
        levelLabel: LEVEL_MAP[p.level] || '',
        duration: duration,
        finalA: finalA,
        finalB: finalB,
        setScores: setScores,
        aSetWins: aSetWins,
        bSetWins: bSetWins,
        players: p.joiners || [],
        photoCount: photoCount,
        textCount: textCount,
        scoreCount: scoreCount,
        hasMoments: photoCount + textCount + scoreCount > 0,
        loading: false
      })
    } catch(e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  goDetail: function() {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + this.data.postId })
  },

  goSquare: function() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  noop: function() {}
})
