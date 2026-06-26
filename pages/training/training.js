var app = getApp()

Page({
  data: {
    statusBarHeight: 0,
    planTitle: '反手稳定性训练',
    planSub: '提升反手击球的稳定性和控制力',
    skillItems: [],
    weeklyCount: 0,
    weeklyDays: [],
    swingTotal: 0,
    totalHours: 0,
  },

  onLoad: function() {
    var sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 44 })
    this._loadData()
  },

  onShow: function() {
    this._loadData()
  },

  _loadData: function() {
    var player = app.globalData.player || {}
    var swingStats = player.swingStats || {}
    var cache = app.globalData.activityCache || {}

    var skillItems = [
      { key: 'forehand', name: '正手训练', icon: '🎾', count: swingStats.fhTotal || 0 },
      { key: 'backhand', name: '反手训练', icon: '🎾', count: swingStats.bhTotal || 0 },
      { key: 'serve', name: '发球训练', icon: '🎾', count: swingStats.svTotal || 0 },
      { key: 'volley', name: '截击训练', icon: '🎾', count: swingStats.vlTotal || 0 },
      { key: 'highball', name: '高压球训练', icon: '🎾', count: 0 },
      { key: 'footwork', name: '步伐训练', icon: '🎾', count: 0 },
    ]

    var planTitle = '反手稳定性训练'
    var planSub = '提升反手击球的稳定性和控制力'
    if (player.weaknesses && player.weaknesses.length > 0) {
      var w = player.weaknesses[0]
      var planMap = {
        '步伐慢': { title: '步伐专项训练', sub: '改善移动效率与脚步灵活性' },
        '发球无力': { title: '发球力量训练', sub: '增强发球速度与落点控制' },
        '下网': { title: '高度控制训练', sub: '改善击球弧度，减少下网失误' },
        '不会上旋': { title: '上旋球技术训练', sub: '掌握正确的拉球动作与转速' },
      }
      if (planMap[w]) { planTitle = planMap[w].title; planSub = planMap[w].sub }
    }

    var swingTotal = (swingStats.fhTotal || 0) + (swingStats.bhTotal || 0) +
                     (swingStats.svTotal || 0) + (swingStats.vlTotal || 0)

    this.setData({
      skillItems: skillItems,
      planTitle: planTitle, planSub: planSub,
      swingTotal: swingTotal,
      weeklyCount: cache.weeklyCount || 0,
      weeklyDays: cache.weeklyDays || [],
      totalHours: cache.totalHoursNum || 0,
    })
  },

  goBack: function() { wx.navigateBack() },

  startFreeTraining: function() {
    var name = this.data.planTitle || '自由训练'
    wx.navigateTo({ url: '/pages/training-prep/training-prep?type=free&name=' + encodeURIComponent(name) })
  },

  startSkillTraining: function(e) {
    var key = e.currentTarget.dataset.key
    var names = {
      forehand: '正手稳定性训练', backhand: '反手稳定性训练',
      serve: '发球力量训练', volley: '截击训练',
      highball: '高压球训练', footwork: '步伐训练',
    }
    var name = names[key] || '技术训练'
    wx.navigateTo({ url: '/pages/training-prep/training-prep?type=' + key + '&name=' + encodeURIComponent(name) })
  },

  goSquare: function() {
    wx.navigateTo({ url: '/pages/square/square' })
  },
  goFindMatches: function() {
    wx.navigateTo({ url: '/pages/square/square?tab=discover' })
  },
  goMyMatches: function() {
    wx.navigateTo({ url: '/pages/square/square?tab=mine' })
  },
})
