var LEVEL_MAP = {
  beginner:     { label: '新手', range: '2.0-2.5', color: '#4ECDC4' },
  intermediate: { label: '进阶', range: '3.0-3.5', color: '#F7B731' },
  advanced:     { label: '竞技', range: '4.0+',    color: '#FF6B6B' }
}
var STYLE_LABEL = {
  steady: '稳健型', aggressive: '进攻型', allround: '全能型', defensive: '防守型'
}
var ALL_ACHIEVEMENTS = [
  { icon: '🎾', name: '初出茅庐', desc: '完成第一场球局',   key: 'first' },
  { icon: '📣', name: '召集令',   desc: '发起3场球局',      key: 'org3' },
  { icon: '🤝', name: '球友磁铁', desc: '结识3位球友',      key: 'social3' },
  { icon: '⚡', name: '常驻球员', desc: '累计参与10场',     key: 'play10' },
  { icon: '🌟', name: '月度之星', desc: '本月打球5场',      key: 'monthly5' },
  { icon: '🏆', name: '赛场老将', desc: '累计参与20场',     key: 'play20' },
]
var ACHIEVEMENT_CHECKS = {
  first:   function(s) { return s.total >= 1 },
  org3:    function(s) { return s.created >= 3 },
  social3: function(s) { return s.uniquePartners >= 3 },
  play10:  function(s) { return s.total >= 10 },
  monthly5:function(s) { return s.monthly >= 5 },
  play20:  function(s) { return s.total >= 20 },
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
    togetherCount: 0,
    unlockedBadges: []
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
    var viewerNickname = wx.getStorageSync('nickname') || ''
    try {
      var res = await wx.cloud.callFunction({
        name: 'getPublicProfile',
        data: { nickname: this.partnerNickname, viewerNickname: viewerNickname }
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

      var achievStats = {
        total: stats.total || 0, created: stats.created || 0,
        monthly: stats.monthly || 0, uniquePartners: stats.uniquePartners || 0
      }
      var unlockedBadges = ALL_ACHIEVEMENTS.filter(function(a) {
        return ACHIEVEMENT_CHECKS[a.key](achievStats)
      })

      this.setData({
        loading: false, levelInfo: levelInfo, styleLabel: styleLabel,
        bio: player.bio || '',
        totalHours: stats.totalHours || 0,
        monthCount: stats.monthCount || 0,
        frequentCourts: stats.frequentCourts || [],
        togetherCount: stats.togetherCount || 0,
        unlockedBadges: unlockedBadges
      })
    } catch(e) {
      this.setData({ loading: false, error: true })
    }
  },

  onBadgeTap: function(e) {
    wx.showToast({ title: e.currentTarget.dataset.desc, icon: 'none', duration: 2500 })
  },

  inviteToGame: function() {
    var name = this.partnerNickname
    if (name) {
      wx.setStorageSync('postPrefillNote', '约 ' + name + ' 一起打')
      wx.setStorageSync('postPrefillPartner', name)
    }
    wx.navigateTo({ url: '/pages/post/post' })
  }
})
