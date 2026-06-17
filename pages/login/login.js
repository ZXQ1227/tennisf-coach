var app = getApp()

Page({
  data: {
    avatarUrl: '',
    nickname: '',
    saving: false,
    showPrivacy: false,
    canGoBack: false
  },

  onLoad: function(options) {
    this._returnUrl = options.return ? decodeURIComponent(options.return) : ''
    var pages = getCurrentPages()
    this.setData({ canGoBack: pages.length > 1 })
    var self = this
    app.globalData._onPrivacyNeeded = function() {
      self.setData({ showPrivacy: true })
    }
    if (app.globalData._privacyResolve) {
      this.setData({ showPrivacy: true })
    }
  },

  onAgreePrivacy: function() {
    var resolve = app.globalData._privacyResolve
    if (resolve) {
      resolve({ buttonId: 'privacy-agree-btn' })
      app.globalData._privacyResolve = null
    }
    this.setData({ showPrivacy: false })
  },

  goBack: function() {
    wx.navigateBack()
  },

  onDenyPrivacy: function() {
    this.setData({ showPrivacy: false })
    wx.showToast({ title: '需要授权才能继续', icon: 'none' })
  },

  onChooseAvatar: function(e) {
    var tempUrl = e.detail.avatarUrl
    this.setData({ avatarUrl: tempUrl })
    var self = this
    wx.cloud.uploadFile({
      cloudPath: 'avatars/' + Date.now() + '.jpg',
      filePath: tempUrl,
      success: function(res) {
        self.setData({ avatarUrl: res.fileID })
        wx.setStorageSync('avatarUrl', res.fileID)
      },
      fail: function() {
        // 上传失败保留 tempUrl 用于展示，confirm 时再试
      }
    })
  },

  onNicknameInput: function(e) {
    this.setData({ nickname: e.detail.value })
  },

  confirm: async function() {
    var nickname = (this.data.nickname || '').trim()
    if (!nickname) {
      wx.showToast({ title: '请填写昵称', icon: 'none' })
      return
    }
    if (this.data.saving) return
    this.setData({ saving: true })

    var avatarUrl = this.data.avatarUrl

    // 头像还是临时路径时再试一次上传
    if (avatarUrl && avatarUrl.indexOf('cloud://') === -1 && avatarUrl.indexOf('http') === -1) {
      try {
        var res = await wx.cloud.uploadFile({
          cloudPath: 'avatars/' + Date.now() + '.jpg',
          filePath: avatarUrl
        })
        avatarUrl = res.fileID
        wx.setStorageSync('avatarUrl', avatarUrl)
      } catch(e) {}
    }

    try {
      await wx.cloud.callFunction({
        name: 'savePlayer',
        data: { nickname: nickname, avatarUrl: avatarUrl || '' }
      })
    } catch(e) {}

    // 无论云函数是否成功，本地先记录，不阻塞进入
    var player = Object.assign({}, app.globalData.player || {}, {
      nickname: nickname,
      avatarUrl: avatarUrl || ''
    })
    app.globalData.player = player
    wx.setStorageSync('playerProfile', player)
    wx.setStorageSync('nickname', nickname)

    app._initBackground()
    if (this._returnUrl) {
      wx.redirectTo({ url: this._returnUrl })
    } else {
      wx.switchTab({ url: '/pages/index/index' })
    }
  }
})
