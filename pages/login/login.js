var app = getApp()

Page({
  data: {
    avatarUrl: '',
    nickname: '',
    saving: false,
    showPrivacy: false,
    canGoBack: false,
    showNickBar: false,
    focusNick: false,
    statusBarHeight: 44,
    navTopPx: 8
  },

  onLoad: function(options) {
    this._returnUrl = options.return ? decodeURIComponent(options.return) : ''
    var pages = getCurrentPages()
    this.setData({ canGoBack: pages.length > 1 })
    var sysInfo = wx.getSystemInfoSync()
    var statusBarHeight = sysInfo.statusBarHeight || 44
    var menu = wx.getMenuButtonBoundingClientRect()
    var navHPx = 72 / 750 * sysInfo.windowWidth
    var navTopPx = Math.round(menu.top + menu.height / 2 - navHPx / 2 - statusBarHeight)
    this.setData({ statusBarHeight: statusBarHeight, navTopPx: navTopPx })
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

  onDenyPrivacy: function() {
    this.setData({ showPrivacy: false })
    wx.showToast({ title: '需要授权才能继续', icon: 'none' })
  },

  goBack: function() { wx.navigateBack() },

  onChooseAvatar: function(e) {
    var tempUrl = e.detail.avatarUrl
    var self = this
    this.setData({ avatarUrl: tempUrl, showNickBar: true, focusNick: true })
    // 渲染稳定后复位，避免后续 setData 重复触发聚焦
    setTimeout(function() { self.setData({ focusNick: false }) }, 600)
    wx.cloud.uploadFile({
      cloudPath: 'avatars/' + Date.now() + '.jpg',
      filePath: tempUrl,
      success: function(res) {
        self.setData({ avatarUrl: res.fileID })
        wx.setStorageSync('avatarUrl', res.fileID)
      },
      fail: function() {}
    })
  },

  onNickFocus: function() {},

  onNickBlur: function() {},

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
    wx.showLoading({ title: '正在登录...', mask: true })

    var avatarUrl = this.data.avatarUrl

    // 头像是临时路径时再试一次上传
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

    var isNew = true
    try {
      var saveRes = await wx.cloud.callFunction({
        name: 'savePlayer',
        data: { nickname: nickname, avatarUrl: avatarUrl || '' }
      })
      isNew = !!(saveRes.result && saveRes.result.isNew)
    } catch(e) {}

    var player = Object.assign({}, app.globalData.player || {}, {
      nickname: nickname,
      avatarUrl: avatarUrl || ''
    })
    app.globalData.player = player
    wx.setStorageSync('playerProfile', player)
    wx.setStorageSync('nickname', nickname)

    wx.hideLoading()

    if (isNew) {
      wx.redirectTo({ url: '/pages/setup/setup' })
    } else {
      app._initBackground()
      if (this._returnUrl) {
        wx.redirectTo({ url: this._returnUrl })
      } else {
        wx.reLaunch({ url: '/pages/profile/profile' })
      }
    }
  },

  noop: function() {}
})
