var app = getApp()
var db = wx.cloud.database()
var _ = db.command

var COLORS = ['#2BB673', '#4ECDC4', '#F7B731', '#A29BFE', '#FF6B6B', '#FD79A8']
var MATCH_MAP = { singles: '单打', doubles: '双打', any: '随意', group: '团战' }
var PAGE_SIZE = 15

function colorFor(name) {
  if (!name) return COLORS[0]
  return COLORS[name.charCodeAt(name.length - 1) % COLORS.length]
}

function timeAgo(ts) {
  if (!ts) return ''
  var diff = Date.now() - ts
  var m = Math.floor(diff / 60000)
  if (m < 2) return '刚刚'
  if (m < 60) return m + '分钟前'
  var h = Math.floor(m / 60)
  if (h < 24) return h + '小时前'
  var d = Math.floor(h / 24)
  if (d === 1) return '昨天'
  if (d < 30) return d + '天前'
  return Math.floor(d / 30) + '个月前'
}

function gridClass(n) {
  if (n <= 1) return 'imgs-1'
  if (n === 2) return 'imgs-2'
  if (n === 4) return 'imgs-4'
  return 'imgs-grid'
}

Page({
  data: {
    feedItems: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    skip: 0,
    nickname: '',
    avatarUrl: '',
    avatarColor: '#2BB673',
    avatarInitial: '我',
    personalInjected: false,
  },

  onLoad: function() {
    this._syncUser()
    this.loadFeed(true)
  },

  onShow: function() {
    this._syncUser()
  },

  onPullDownRefresh: function() {
    var self = this
    this.loadFeed(true).then(function() { wx.stopPullDownRefresh() })
  },

  onReachBottom: function() {
    if (!this.data.hasMore || this.data.loadingMore || this.data.loading) return
    this.loadFeed(false)
  },

  _syncUser: function() {
    var player = app.globalData.player
    var nickname = player ? (player.nickname || '') : (wx.getStorageSync('nickname') || '')
    var avatarUrl = player ? (player.avatarUrl || '') : ''
    this.setData({
      nickname: nickname,
      avatarUrl: avatarUrl,
      avatarColor: colorFor(nickname),
      avatarInitial: nickname ? nickname.slice(-1) : '我',
    })
  },

  _getPartnerNames: async function() {
    var nickname = this.data.nickname || wx.getStorageSync('nickname') || ''
    if (!nickname) return []
    try {
      var res = await db.collection('posts')
        .where({ joiners: db.command.all([nickname]) })
        .field({ joiners: true })
        .limit(100)
        .get()
      var counts = {}
      ;(res.data || []).forEach(function(p) {
        ;(p.joiners || []).forEach(function(j) {
          if (j !== nickname) counts[j] = (counts[j] || 0) + 1
        })
      })
      return Object.keys(counts)
    } catch(e) { return [] }
  },

  loadFeed: async function(fresh) {
    if (fresh) {
      this.setData({ loading: true, skip: 0, hasMore: true, personalInjected: false })
    } else {
      this.setData({ loadingMore: true })
    }

    var skip = fresh ? 0 : this.data.skip
    try {
      // 展示自己 + 球搭子内容
      var myNickname = this.data.nickname || wx.getStorageSync('nickname') || ''
      var partnerNames = await this._getPartnerNames()
      var authors = myNickname ? [myNickname].concat(partnerNames) : partnerNames
      if (!authors.length) {
        this.setData({ feedItems: [], loading: false, loadingMore: false, hasMore: false })
        return
      }

      var momentRes = await db.collection('moments')
        .where({ type: _.in(['photo', 'video']), author: _.in(authors) })
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(PAGE_SIZE)
        .get()

      var rawMoments = momentRes.data || []

      // Batch-enrich with post context (location + matchType)
      var postIds = []
      rawMoments.forEach(function(m) {
        if (m.postId && postIds.indexOf(m.postId) === -1) postIds.push(m.postId)
      })
      var postMap = {}
      if (postIds.length > 0) {
        try {
          var pRes = await db.collection('posts')
            .where({ _id: _.in(postIds) })
            .field({ _id: true, location: true, matchType: true })
            .get()
          ;(pRes.data || []).forEach(function(p) { postMap[p._id] = p })
        } catch(e) {}
      }

      var items = rawMoments.map(function(m) {
        var ts = m.createdAt && (m.createdAt.$date || m.createdAt)
        var post = postMap[m.postId] || {}
        var imgFull = m.imageUrls || []
        var imgDisplay = imgFull.slice(0, 9)
        var id = m._id
        return {
          id: id,
          type: m.type === 'video' ? 'video' : 'photo',
          postId: m.postId || '',
          author: m.author || '球友',
          avatarUrl: '',
          avatarColor: colorFor(m.author || ''),
          avatarInitial: (m.author || '球').slice(-1),
          timeAgo: timeAgo(ts),
          location: post.location || '',
          matchType: MATCH_MAP[post.matchType] || '',
          content: m.content || '',
          images: imgFull,
          imagesDisplay: imgDisplay,
          imgCount: imgFull.length,
          imgMore: imgFull.length > 9 ? imgFull.length - 9 : 0,
          gridClass: gridClass(imgDisplay.length),
          hasImages: imgDisplay.length > 0,
          hasVideo: m.type === 'video',
          videoUrl: m.videoUrl || '',
          videoCover: m.videoCover || (imgFull[0] || ''),
          cardSize: imgDisplay.length >= 2 ? 'large' : 'normal',
        }
      })

      // Batch-fetch author avatars from players collection
      var authors = []
      items.forEach(function(item) {
        if (item.author && authors.indexOf(item.author) === -1) authors.push(item.author)
      })
      if (authors.length > 0) {
        try {
          var playerRes = await db.collection('players')
            .where({ nickname: _.in(authors) })
            .field({ nickname: true, avatarUrl: true })
            .get()
          var avatarMap = {}
          ;(playerRes.data || []).forEach(function(p) { if (p.avatarUrl) avatarMap[p.nickname] = p.avatarUrl })
          items = items.map(function(item) {
            var url = avatarMap[item.author] || ''
            return url ? Object.assign({}, item, { avatarUrl: url }) : item
          })
        } catch(e) {}
      }

      if (fresh && !this.data.personalInjected) {
        var personal = this.buildPersonalItems()
        items = personal.concat(items)
        this.setData({ personalInjected: true })
      }

      this.setData({
        feedItems: fresh ? items : this.data.feedItems.concat(items),
        loading: false,
        loadingMore: false,
        hasMore: rawMoments.length >= PAGE_SIZE,
        skip: skip + rawMoments.length,
      })
    } catch(e) {
      this.setData({ loading: false, loadingMore: false })
      if (fresh) wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  buildPersonalItems: function() {
    var cache = app.globalData.activityCache
    if (!cache) return []
    var nickname = cache.nickname || this.data.nickname
    if (!nickname) return []
    var items = []

    if (cache.streak >= 3) {
      items.push({
        id: 'streak_' + nickname,
        type: 'streak',
        author: nickname,
        avatarColor: colorFor(nickname),
        avatarInitial: nickname.slice(-1),
        timeAgo: '今天',
        streakDays: cache.streak,
        hlTitle: nickname + ' 连续打球 ' + cache.streak + ' 天',
        cardSize: cache.streak >= 7 ? 'highlight' : 'normal',
      })
    }

    var earned = (cache.achievements || []).filter(function(a) { return a.earned })
    if (earned.length > 0) {
      var a = earned[earned.length - 1]
      items.push({
        id: 'achiev_' + nickname + '_' + a.key,
        type: 'achievement',
        author: nickname,
        avatarColor: colorFor(nickname),
        avatarInitial: nickname.slice(-1),
        timeAgo: '近期',
        achievIcon: a.icon,
        achievName: a.name,
        hlTitle: '解锁成就「' + a.name + '」',
        cardSize: 'highlight',
      })
    }

    return items
  },

  previewImages: function(e) {
    var urls = e.currentTarget.dataset.urls
    var current = e.currentTarget.dataset.current
    if (!urls || !urls.length) return
    wx.previewImage({ urls: urls, current: current || urls[0] })
  },

  goDetail: function(e) {
    var postId = e.currentTarget.dataset.postId
    if (postId) wx.navigateTo({ url: '/pages/detail/detail?id=' + postId })
  },

  goAuthor: function(e) {
    var name = e.currentTarget.dataset.name
    if (name) wx.navigateTo({ url: '/pages/pub-profile/pub-profile?nickname=' + encodeURIComponent(name) })
  },

  onAvatarError: function(e) {
    var idx = e.currentTarget.dataset.index
    var items = (this.data.feedItems || []).slice()
    if (items[idx]) {
      items[idx] = Object.assign({}, items[idx], { avatarUrl: '' })
      this.setData({ feedItems: items })
    }
  },

  onImgError: function(e) {
    var itemIdx = e.currentTarget.dataset.itemIndex
    var imgIdx = e.currentTarget.dataset.imgIndex
    var items = (this.data.feedItems || []).slice()
    if (items[itemIdx]) {
      var display = (items[itemIdx].imagesDisplay || []).slice()
      display.splice(imgIdx, 1)
      items[itemIdx] = Object.assign({}, items[itemIdx], {
        imagesDisplay: display,
        hasImages: display.length > 0
      })
      this.setData({ feedItems: items })
    }
  },

  noop: function() {},
})
