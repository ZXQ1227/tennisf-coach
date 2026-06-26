var app = getApp()

var NTRP_OPTIONS = [
  { value: '1.5', label: '1.5', desc: '正在学习将球稳定打入场内' },
  { value: '2.0', label: '2.0', desc: '击球不稳定，正建立基础动作' },
  { value: '2.5', label: '2.5', desc: '能与同水平者维持中速对拍' },
  { value: '3.0', label: '3.0', desc: '中速球基本稳定，方向控制欠一致' },
  { value: '3.5', label: '3.5', desc: '方向控制改善，正形成打法风格' },
  { value: '4.0', label: '4.0', desc: '正反手稳定有深度，能主动构建得分' },
  { value: '4.5', label: '4.5', desc: '能运用力量旋转，灵活制定战术' },
  { value: '5.0', label: '5.0+', desc: '预判出色，战术多变，竞技级' }
]
var RALLY_OPTIONS = ['0~3拍', '3~5拍', '5~10拍', '10拍以上']
var SERVE_OPTIONS = ['还在练习稳定发入', '能稳定发入，缺乏威胁', '一发有力量，二发较可靠', '发球是主要得分手段']
var STRENGTH_OPTIONS = ['正手', '反手', '发球', '截击', '步伐']
var WEAKNESS_OPTIONS = ['正手不稳', '反手偏弱', '发球不稳', '二发太短', '网前不自信', '步伐跟不上', '方向控制差', '心理紧张']
var GOAL_OPTIONS = ['稳定对拍', '提升发球威胁', '加强正手', '改善反手', '提升步伐', '学会上旋', '建立网前攻击', '提升比赛胜率']
var FITNESS_OPTIONS = ['30分钟就累', '能稳定打2小时', '体能很好']
var INJURY_OPTIONS = ['肩', '腰', '膝盖', '手腕']

Page({
  data: {
    step: 1,
    totalSteps: 4,
    isEdit: false,
    showPrivacy: false,
    // Step 1
    tempAvatarUrl: '',
    avatarUrl: '',
    nickname: '',
    ntrpLevel: '2.5',
    ntrpOptions: NTRP_OPTIONS,
    // Step 2
    rallyCount: '',
    rallyOptions: RALLY_OPTIONS,
    serveAbility: '',
    serveOptions: SERVE_OPTIONS,
    strengths: [],
    strengthOptions: STRENGTH_OPTIONS,
    // Step 3
    weaknesses: [],
    weaknessOptions: WEAKNESS_OPTIONS,
    goals: [],
    goalOptions: GOAL_OPTIONS,
    // Step 4
    fitnessLevel: '',
    fitnessOptions: FITNESS_OPTIONS,
    hasInjury: false,
    injuries: [],
    injuryOptions: INJURY_OPTIONS,
    saving: false
  },

  onLoad: function(options) {
    var self = this
    app.globalData._onPrivacyNeeded = function() {
      self.setData({ showPrivacy: true })
    }
    if (app.globalData._privacyResolve) {
      this.setData({ showPrivacy: true })
    }
    var isEdit = options.mode === 'edit'
    this.setData({ isEdit: isEdit })
    // 无论新建还是编辑，均从 globalData 预填（新建时 login 已写入 nickname+avatarUrl）
    var player = app.globalData.player
    if (player) {
      this.setData({
        avatarUrl: player.avatarUrl || '',
        nickname: player.nickname || '',
        ntrpLevel: player.ntrpLevel || '2.5',
        rallyCount: player.rallyCount || '',
        serveAbility: player.serveAbility || '',
        strengths: player.strengths || [],
        weaknesses: player.weaknesses || [],
        goals: player.goals || [],
        fitnessLevel: player.fitnessLevel || '',
        injuries: player.injuries || [],
        hasInjury: (player.injuries || []).length > 0
      })
    }
  },

  // ── Step navigation ──

  nextStep: function() {
    var step = this.data.step
    if (!this._validateStep(step)) return
    if (step < 4) {
      this.setData({ step: step + 1 })
    } else {
      this._saveAndFinish()
    }
  },

  prevStep: function() {
    var step = this.data.step
    if (step > 1) this.setData({ step: step - 1 })
    else wx.navigateBack()
  },

  _validateStep: function(step) {
    if (step === 1 && this.data.isEdit && !this.data.nickname.trim()) {
      wx.showToast({ title: '请填写球员昵称', icon: 'none' }); return false
    }
    if (step === 2 && !this.data.rallyCount) {
      wx.showToast({ title: '请选择多拍能力', icon: 'none' }); return false
    }
    if (step === 3 && this.data.goals.length === 0) {
      wx.showToast({ title: '请选择训练目标', icon: 'none' }); return false
    }
    if (step === 4 && !this.data.fitnessLevel) {
      wx.showToast({ title: '请选择体能状态', icon: 'none' }); return false
    }
    return true
  },

  // ── Step 1 ──

  onChooseAvatar: function(e) { this.setData({ tempAvatarUrl: e.detail.avatarUrl }) },
  onAgreePrivacy: function() {
    var resolve = app.globalData._privacyResolve
    if (resolve) {
      resolve({ buttonId: 'setup-privacy-agree-btn' })
      app.globalData._privacyResolve = null
    }
    this.setData({ showPrivacy: false })
  },

  onDenyPrivacy: function() {
    this.setData({ showPrivacy: false })
    wx.showToast({ title: '需要授权才能继续', icon: 'none' })
  },

  onNicknameInput: function(e) { this.setData({ nickname: e.detail.value }) },

  selectNtrp: function(e) { this.setData({ ntrpLevel: e.currentTarget.dataset.value }) },

  // ── Step 2 ──

  selectRally: function(e) { this.setData({ rallyCount: e.currentTarget.dataset.value }) },

  selectServe: function(e) { this.setData({ serveAbility: e.currentTarget.dataset.value }) },

  toggleStrength: function(e) {
    var val = e.currentTarget.dataset.value
    var arr = this.data.strengths.slice()
    var idx = arr.indexOf(val)
    if (idx === -1) { arr.push(val) } else { arr.splice(idx, 1) }
    this.setData({ strengths: arr })
  },

  // ── Step 3 ──

  toggleWeakness: function(e) {
    var val = e.currentTarget.dataset.value
    var arr = this.data.weaknesses.slice()
    var idx = arr.indexOf(val)
    if (idx === -1) { arr.push(val) } else { arr.splice(idx, 1) }
    this.setData({ weaknesses: arr })
  },

  toggleGoal: function(e) {
    var val = e.currentTarget.dataset.value
    var arr = this.data.goals.slice()
    var idx = arr.indexOf(val)
    if (idx === -1) { arr.push(val) } else { arr.splice(idx, 1) }
    this.setData({ goals: arr })
  },

  // ── Step 4 ──

  selectFitness: function(e) { this.setData({ fitnessLevel: e.currentTarget.dataset.value }) },

  toggleHasInjury: function() {
    var h = !this.data.hasInjury
    this.setData({ hasInjury: h, injuries: h ? this.data.injuries : [] })
  },

  toggleInjury: function(e) {
    var val = e.currentTarget.dataset.value
    var arr = this.data.injuries.slice()
    var idx = arr.indexOf(val)
    if (idx === -1) { arr.push(val) } else { arr.splice(idx, 1) }
    this.setData({ injuries: arr })
  },

  _saveAndFinish: async function() {
    if (this.data.saving) return
    this.setData({ saving: true })
    wx.showLoading({ title: '保存中...', mask: true })

    try {
      // 编辑模式下头像可更换；新建模式 nickname/avatarUrl 已在登录时保存，直接取 globalData
      var existingPlayer = app.globalData.player || {}
      var nickname = this.data.isEdit
        ? this.data.nickname.trim()
        : (existingPlayer.nickname || '')
      var avatarUrl = this.data.isEdit ? this.data.avatarUrl : (existingPlayer.avatarUrl || '')

      if (this.data.isEdit && this.data.tempAvatarUrl) {
        try {
          var uploadRes = await wx.cloud.uploadFile({
            cloudPath: 'avatars/' + Date.now() + '.jpg',
            filePath: this.data.tempAvatarUrl
          })
          avatarUrl = uploadRes.fileID
        } catch(e) {}
      }

      await wx.cloud.callFunction({
        name: 'savePlayer',
        data: {
          nickname: nickname,
          avatarUrl: avatarUrl,
          ntrpLevel: this.data.ntrpLevel,
          rallyCount: this.data.rallyCount,
          serveAbility: this.data.serveAbility,
          strengths: this.data.strengths,
          weaknesses: this.data.weaknesses,
          goals: this.data.goals,
          fitnessLevel: this.data.fitnessLevel,
          injuries: this.data.injuries
        }
      })

      var player = Object.assign({}, existingPlayer, {
        nickname: nickname,
        avatarUrl: avatarUrl,
        ntrpLevel: this.data.ntrpLevel,
        rallyCount: this.data.rallyCount,
        serveAbility: this.data.serveAbility,
        strengths: this.data.strengths,
        weaknesses: this.data.weaknesses,
        goals: this.data.goals,
        fitnessLevel: this.data.fitnessLevel,
        injuries: this.data.injuries
      })
      app.globalData.player = player
      wx.setStorageSync('playerProfile', player)
      wx.setStorageSync('nickname', player.nickname)

      wx.hideLoading()
      wx.showToast({ title: '档案已保存', icon: 'success', duration: 1500 })
      setTimeout(function() { wx.reLaunch({ url: '/pages/profile/profile' }) }, 1500)
    } catch(e) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      this.setData({ saving: false })
    }
  },

  confirmLogout: function() {
    wx.showModal({
      title: '退出账号',
      content: '退出后需重新登录才能使用完整功能',
      cancelText: '取消',
      confirmText: '退出',
      confirmColor: '#FF6B6B',
      success: function(res) {
        if (!res.confirm) return
        wx.removeStorageSync('playerProfile')
        wx.removeStorageSync('nickname')
        wx.removeStorageSync('avatarUrl')
        wx.removeStorageSync('myOpenId')
        wx.removeStorageSync('likedPartners')
        wx.removeStorageSync('partnerNotes')
        var app = getApp()
        app.globalData.player = null
        app.globalData.activityCache = null
        wx.reLaunch({ url: '/pages/profile/profile' })
      }
    })
  },

  noop: function() {}
})
