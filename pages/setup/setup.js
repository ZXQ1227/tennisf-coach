var app = getApp()

var STYLE_OPTIONS = [
  { label: '稳健型', value: 'steady', desc: '重视稳定，以少失误为主' },
  { label: '进攻型', value: 'aggressive', desc: '喜欢主动上网，积极得分' },
  { label: '全能型', value: 'allround', desc: '攻守平衡，适应性强' },
  { label: '防守型', value: 'defensive', desc: '擅长回球，以耐力取胜' }
]

Page({
  data: {
    isEdit: false,
    saving: false,
    tempAvatarUrl: '',
    avatarUrl: '',
    nickname: '',
    level: 'intermediate',
    homeBase: '',
    preferMatch: 'doubles',
    preferCourt: 'hard',
    playStyle: 'steady',
    bio: '',
    showOptional: false,
    styleOptions: STYLE_OPTIONS,
    courtTypeOptions: [
      { label: '硬地', value: 'hard', selected: true },
      { label: '红土', value: 'clay', selected: false },
      { label: '草地', value: 'grass', selected: false }
    ],
    matchOptions: [
      { label: '单打', value: 'singles', selected: false },
      { label: '双打', value: 'doubles', selected: true },
      { label: '随意', value: 'any', selected: false }
    ]
  },

  onLoad: function(options) {
    var isEdit = options.mode === 'edit'
    this.setData({ isEdit: isEdit })
    if (isEdit) {
      var player = app.globalData.player
      if (player) {
        this.setData({
          avatarUrl: player.avatarUrl || '',
          nickname: player.nickname || '',
          level: player.level || 'intermediate',
          homeBase: player.homeBase || '',
          preferMatch: player.preferMatch || 'doubles',
          preferCourt: player.preferCourt || 'hard',
          playStyle: player.playStyle || 'steady',
          bio: player.bio || '',
          courtTypeOptions: this.data.courtTypeOptions.map(function(o) {
            return { label: o.label, value: o.value, selected: o.value === (player.preferCourt || 'hard') }
          }),
          matchOptions: this.data.matchOptions.map(function(o) {
            return { label: o.label, value: o.value, selected: o.value === (player.preferMatch || 'doubles') }
          })
        })
      }
    }
  },

  onChooseAvatar: function(e) {
    this.setData({ tempAvatarUrl: e.detail.avatarUrl })
  },

  onNicknameInput: function(e) { this.setData({ nickname: e.detail.value }) },
  onHomeBaseInput: function(e) { this.setData({ homeBase: e.detail.value }) },
  onBioInput: function(e) { this.setData({ bio: e.detail.value }) },

  selectLevel: function(e) { this.setData({ level: e.currentTarget.dataset.value }) },

  selectMatchType: function(e) {
    var val = e.currentTarget.dataset.value
    this.setData({
      preferMatch: val,
      matchOptions: this.data.matchOptions.map(function(o) {
        return { label: o.label, value: o.value, selected: o.value === val }
      })
    })
  },

  selectCourtType: function(e) {
    var val = e.currentTarget.dataset.value
    this.setData({
      preferCourt: val,
      courtTypeOptions: this.data.courtTypeOptions.map(function(o) {
        return { label: o.label, value: o.value, selected: o.value === val }
      })
    })
  },

  selectStyle: function(e) { this.setData({ playStyle: e.currentTarget.dataset.value }) },

  toggleOptional: function() { this.setData({ showOptional: !this.data.showOptional }) },

  save: async function() {
    if (!this.data.nickname.trim()) {
      wx.showToast({ title: '请填写球员昵称', icon: 'none' })
      return
    }
    if (this.data.saving) return
    this.setData({ saving: true })

    try {
      var avatarUrl = this.data.avatarUrl
      if (this.data.tempAvatarUrl) {
        wx.showLoading({ title: '上传头像中...' })
        var uploadRes = await wx.cloud.uploadFile({
          cloudPath: 'avatars/' + Date.now() + '.jpg',
          filePath: this.data.tempAvatarUrl
        })
        avatarUrl = uploadRes.fileID
        wx.hideLoading()
      }

      var res = await wx.cloud.callFunction({
        name: 'savePlayer',
        data: {
          nickname: this.data.nickname.trim(),
          avatarUrl: avatarUrl,
          level: this.data.level,
          homeBase: this.data.homeBase,
          preferMatch: this.data.preferMatch,
          preferCourt: this.data.preferCourt,
          playStyle: this.data.playStyle,
          bio: this.data.bio
        }
      })

      if (res.result && res.result.success) {
        var player = {
          nickname: this.data.nickname.trim(),
          avatarUrl: avatarUrl,
          level: this.data.level,
          homeBase: this.data.homeBase,
          preferMatch: this.data.preferMatch,
          preferCourt: this.data.preferCourt,
          playStyle: this.data.playStyle,
          bio: this.data.bio
        }
        app.globalData.player = player
        wx.setStorageSync('playerProfile', player)
        // Also update nickname for backward compatibility
        wx.setStorageSync('nickname', player.nickname)

        wx.showToast({ title: this.data.isEdit ? '档案已更新' : '球员档案创建成功 🎾', icon: 'none' })
        var self = this
        setTimeout(function() {
          if (self.data.isEdit) {
            wx.navigateBack()
          } else {
            wx.switchTab({ url: '/pages/index/index' })
          }
        }, 800)
      } else {
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
    } catch(e) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
    this.setData({ saving: false })
  }
})
