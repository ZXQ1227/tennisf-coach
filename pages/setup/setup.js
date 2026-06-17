var app = getApp()

var NTRP_OPTIONS = [
  { value: '1.5', label: '1.5', desc: '刚接触网球' },
  { value: '2.0', label: '2.0', desc: '基础击打阶段' },
  { value: '2.5', label: '2.5', desc: '能稳定对拉' },
  { value: '3.0', label: '3.0', desc: '技术较全面' },
  { value: '3.5', label: '3.5', desc: '有比赛经验' },
  { value: '4.0', label: '4.0+', desc: '竞技级' }
]
var RALLY_OPTIONS = ['1~3拍', '3~5拍', '5~10拍', '10拍以上']
var STRENGTH_OPTIONS = ['正手', '反手', '发球', '截击', '步伐']
var WEAKNESS_OPTIONS = ['下网', '出界', '步伐慢', '发球无力', '不会上旋', '心理紧张']
var GOAL_OPTIONS = ['稳定对拉', '提升比赛胜率', '发球提升', '学会上旋', '步伐敏捷', '进阶3.5']
var FITNESS_OPTIONS = ['30分钟就累', '能稳定打2小时', '体能很好']
var INJURY_OPTIONS = ['肩', '腰', '膝盖', '手腕']

Page({
  data: {
    step: 1,
    totalSteps: 4,
    isEdit: false,
    // Step 1
    tempAvatarUrl: '',
    avatarUrl: '',
    nickname: '',
    ntrpLevel: '2.5',
    ntrpOptions: NTRP_OPTIONS,
    // Step 2
    rallyCount: '',
    rallyOptions: RALLY_OPTIONS,
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
    var isEdit = options.mode === 'edit'
    this.setData({ isEdit: isEdit })
    if (isEdit) {
      var player = app.globalData.player
      if (player) {
        this.setData({
          avatarUrl: player.avatarUrl || '',
          nickname: player.nickname || '',
          ntrpLevel: player.ntrpLevel || '2.5',
          rallyCount: player.rallyCount || '',
          strengths: player.strengths || [],
          weaknesses: player.weaknesses || [],
          goals: player.goals || [],
          fitnessLevel: player.fitnessLevel || '',
          injuries: player.injuries || [],
          hasInjury: (player.injuries || []).length > 0
        })
      }
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
    if (step === 1 && !this.data.nickname.trim()) {
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
  onNicknameInput: function(e) { this.setData({ nickname: e.detail.value }) },

  selectNtrp: function(e) { this.setData({ ntrpLevel: e.currentTarget.dataset.value }) },

  // ── Step 2 ──

  selectRally: function(e) { this.setData({ rallyCount: e.currentTarget.dataset.value }) },

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
      var avatarUrl = this.data.avatarUrl
      if (this.data.tempAvatarUrl) {
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
          nickname: this.data.nickname.trim(),
          avatarUrl: avatarUrl,
          ntrpLevel: this.data.ntrpLevel,
          rallyCount: this.data.rallyCount,
          strengths: this.data.strengths,
          weaknesses: this.data.weaknesses,
          goals: this.data.goals,
          fitnessLevel: this.data.fitnessLevel,
          injuries: this.data.injuries
        }
      })

      var player = Object.assign({}, app.globalData.player || {}, {
        nickname: this.data.nickname.trim(),
        avatarUrl: avatarUrl,
        ntrpLevel: this.data.ntrpLevel,
        rallyCount: this.data.rallyCount,
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
      setTimeout(function() { wx.switchTab({ url: '/pages/index/index' }) }, 1500)
    } catch(e) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      this.setData({ saving: false })
    }
  },

  noop: function() {}
})
