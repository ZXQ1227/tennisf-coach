var LEVEL_MAP = {
  beginner:     { label: '新手', range: '2.0-2.5', color: '#4ECDC4' },
  intermediate: { label: '进阶', range: '3.0-3.5', color: '#F7B731' },
  advanced:     { label: '竞技', range: '4.0+',    color: '#FF6B6B' }
}
var STYLE_LABEL = {
  steady: '稳健型', aggressive: '进攻型', allround: '全能型', defensive: '防守型'
}
var COLORS = ['#2BB673', '#4ECDC4', '#F7B731', '#A29BFE', '#FF6B6B']

Page({
  data: {
    loading: true,
    error: false,
    notFound: false,
    nickname: '',
    avatarColor: '#2BB673',
    levelInfo: null,
    styleLabel: '',
    bio: '',
    totalHours: 0,
    monthCount: 0,
    frequentCourts: [],
    togetherCount: 0
  },

  onLoad: function(options) {
    var nickname = decodeURIComponent(options.nickname || '')
    if (!nickname) { wx.navigateBack(); return }
    this.partnerNickname = nickname
    wx.setNavigationBarTitle({ title: nickname })
    var color = COLORS[nickname.charCodeAt(nickname.length - 1) % COLORS.length]
    this.setData({ nickname: nickname, avatarColor: color })
    this.loadProfile()
  },

  onShareAppMessage: function() {
    var d = this.data
    var levelStr = d.levelInfo ? d.levelInfo.range : ''
    var court = d.frequentCourts && d.frequentCourts[0] ? '常在' + d.frequentCourts[0] + '打球，' : ''
    return {
      title: (levelStr ? levelStr + ' ' : '') + '靠谱球搭子 ' + d.nickname + '，' + court + '来约一场？',
      path: '/pages/pub-profile/pub-profile?nickname=' + encodeURIComponent(d.nickname)
    }
  },

  loadProfile: async function() {
    this.setData({ loading: true, error: false, notFound: false })
    try {
      var res = await wx.cloud.callFunction({
        name: 'getPublicProfile',
        data: { nickname: this.partnerNickname }
      })
      var result = (res && res.result) || {}

      if (!result.player) {
        this.setData({ loading: false, notFound: true })
        return
      }

      var player   = result.player
      var stats    = result.stats || {}
      var levelInfo  = LEVEL_MAP[player.level] || null
      var styleLabel = STYLE_LABEL[player.playStyle] || ''

      this.setData({
        loading: false, levelInfo: levelInfo, styleLabel: styleLabel,
        bio: player.bio || '',
        totalHours: stats.totalHours || 0,
        monthCount: stats.monthCount || 0,
        frequentCourts: stats.frequentCourts || [],
        togetherCount: stats.togetherCount || 0
      })
    } catch(e) {
      this.setData({ loading: false, error: true })
    }
  },

  inviteToGame: async function() {
    var toNickname = this.partnerNickname
    var player = getApp().globalData.player
    var myNickname = (player && player.nickname) || wx.getStorageSync('nickname') || ''

    if (!myNickname) {
      wx.showToast({ title: '请先创建球员档案', icon: 'none' })
      return
    }

    if (toNickname) {
      wx.setStorageSync('postPrefillNote', '约 ' + toNickname + ' 一起打')
      wx.setStorageSync('postPrefillPartner', toNickname)
    }

    try {
      var res = await wx.cloud.callFunction({
        name: 'sendInvite',
        data: { toNickname: toNickname, fromNickname: myNickname }
      })
      var result = (res && res.result) || {}
      if (result.ok && !result.duplicate) {
        wx.showToast({ title: '已向 ' + toNickname + ' 发出约球邀请', icon: 'none', duration: 2000 })
      }
    } catch(e) {
      // 发送失败不阻断跳转
    }

    wx.navigateTo({ url: '/pages/post/post' })
  }
})
