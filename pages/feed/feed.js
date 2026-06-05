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

function isSynthetic(id) {
  return !id || id.indexOf('streak_') === 0 || id.indexOf('achiev_') === 0 || id.indexOf('partner_') === 0
}

Page({
  data: {
    feedItems: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    likedItems: {},
    skip: 0,
    nickname: '',
    avatarUrl: '',
    avatarColor: '#2BB673',
    avatarInitial: '我',
    commentSheetOpen: false,
    activeItemId: '',
    activeItem: null,
    commentInput: '',
    comments: [],
    commentsLoading: false,
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
      likedItems: wx.getStorageSync('feedLikes') || {},
    })
  },

  loadFeed: async function(fresh) {
    if (fresh) {
      this.setData({ loading: true, skip: 0, hasMore: true, personalInjected: false })
    } else {
      this.setData({ loadingMore: true })
    }

    var skip = fresh ? 0 : this.data.skip
    var likedItems = this.data.likedItems

    try {
      var momentRes = await db.collection('moments')
        .where({ type: _.in(['photo', 'video']) })
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
          likeCount: m.likeCount || 0,
          commentCount: m.commentCount || 0,
          isLiked: !!likedItems[id],
          cardSize: imgDisplay.length >= 2 ? 'large' : 'normal',
        }
      })

      if (fresh && !this.data.personalInjected) {
        var personal = this.buildPersonalItems(likedItems)
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

  buildPersonalItems: function(likedItems) {
    var cache = app.globalData.activityCache
    if (!cache) return []
    var nickname = cache.nickname || this.data.nickname
    if (!nickname) return []
    var items = []

    if (cache.streak >= 3) {
      var sid = 'streak_' + nickname
      items.push({
        id: sid,
        type: 'streak',
        author: nickname,
        avatarColor: colorFor(nickname),
        avatarInitial: nickname.slice(-1),
        timeAgo: '今天',
        streakDays: cache.streak,
        hlTitle: nickname + ' 连续打球 ' + cache.streak + ' 天',
        likeCount: 0, commentCount: 0,
        isLiked: !!likedItems[sid],
        cardSize: cache.streak >= 7 ? 'highlight' : 'normal',
      })
    }

    var earned = (cache.achievements || []).filter(function(a) { return a.earned })
    if (earned.length > 0) {
      var a = earned[earned.length - 1]
      var aid = 'achiev_' + nickname + '_' + a.key
      items.push({
        id: aid,
        type: 'achievement',
        author: nickname,
        avatarColor: colorFor(nickname),
        avatarInitial: nickname.slice(-1),
        timeAgo: '近期',
        achievIcon: a.icon,
        achievName: a.name,
        hlTitle: '解锁成就「' + a.name + '」',
        likeCount: 0, commentCount: 0,
        isLiked: !!likedItems[aid],
        cardSize: 'highlight',
      })
    }

    return items
  },

  likeItem: function(e) {
    var id = e.currentTarget.dataset.id
    if (!id) return
    var liked = Object.assign({}, this.data.likedItems)
    var wasLiked = !!liked[id]

    var feedItems = this.data.feedItems.map(function(item) {
      if (item.id !== id) return item
      return Object.assign({}, item, {
        isLiked: !wasLiked,
        likeCount: wasLiked ? Math.max(0, item.likeCount - 1) : item.likeCount + 1,
      })
    })

    if (wasLiked) { delete liked[id] } else { liked[id] = true }
    wx.setStorageSync('feedLikes', liked)
    this.setData({ feedItems: feedItems, likedItems: liked })

    if (!isSynthetic(id)) {
      db.collection('moments').doc(id).update({
        data: { likeCount: _.inc(wasLiked ? -1 : 1) }
      }).catch(function() {})
    }
  },

  openCommentSheet: function(e) {
    var id = e.currentTarget.dataset.id
    var item = null
    var feedItems = this.data.feedItems
    for (var i = 0; i < feedItems.length; i++) {
      if (feedItems[i].id === id) { item = feedItems[i]; break }
    }
    if (!item) return
    this.setData({
      commentSheetOpen: true, activeItemId: id, activeItem: item,
      commentInput: '', comments: [],
    })
    this.loadComments(id)
  },

  closeCommentSheet: function() {
    this.setData({ commentSheetOpen: false, activeItem: null, activeItemId: '' })
  },

  loadComments: async function(momentId) {
    if (isSynthetic(momentId)) {
      this.setData({ commentsLoading: false, comments: [] })
      return
    }
    this.setData({ commentsLoading: true })
    try {
      var res = await db.collection('moments')
        .where({ parentId: momentId })
        .orderBy('createdAt', 'asc')
        .limit(50)
        .get()
      var comments = (res.data || [])
        .filter(function(c) { return c.type === 'comment' })
        .map(function(c) {
          var ts = c.createdAt && (c.createdAt.$date || c.createdAt)
          return {
            id: c._id,
            author: c.author || '球友',
            avatarColor: colorFor(c.author || ''),
            avatarInitial: (c.author || '球').slice(-1),
            content: c.content || '',
            timeAgo: timeAgo(ts),
          }
        })
      this.setData({ comments: comments, commentsLoading: false })
    } catch(e) {
      this.setData({ commentsLoading: false })
    }
  },

  onCommentInput: function(e) {
    this.setData({ commentInput: e.detail.value })
  },

  submitComment: async function() {
    var content = (this.data.commentInput || '').trim()
    if (!content) return
    var nickname = this.data.nickname
    if (!nickname) { wx.showToast({ title: '请先设置昵称', icon: 'none' }); return }
    var id = this.data.activeItemId
    if (isSynthetic(id)) { wx.showToast({ title: '暂不支持评论', icon: 'none' }); return }

    try {
      await db.collection('moments').add({
        data: { parentId: id, type: 'comment', author: nickname, content: content, createdAt: db.serverDate() }
      })
      db.collection('moments').doc(id).update({
        data: { commentCount: _.inc(1) }
      }).catch(function() {})

      var feedItems = this.data.feedItems.map(function(item) {
        if (item.id !== id) return item
        return Object.assign({}, item, { commentCount: item.commentCount + 1 })
      })
      var activeItem = this.data.activeItem
        ? Object.assign({}, this.data.activeItem, { commentCount: this.data.activeItem.commentCount + 1 })
        : null
      this.setData({ feedItems: feedItems, activeItem: activeItem, commentInput: '' })
      this.loadComments(id)
    } catch(e) {
      wx.showToast({ title: '评论失败，请重试', icon: 'none' })
    }
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

  noop: function() {},
})
