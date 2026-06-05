const db = wx.cloud.database()

const LEVEL_HINTS = {
  beginner: '2.0-2.5 · 刚开始打，以拉球为主',
  intermediate: '3.0-3.5 · 有一定基础，可以对打',
  advanced: '4.0+ · 比赛级别，认真对打'
}

var SLOT_COLORS = ['#2BB673', '#4ECDC4', '#F7B731', '#A29BFE', '#FF6B6B']
function slotColor(name) {
  if (!name) return '#CCCCCC'
  return SLOT_COLORS[name.charCodeAt(name.length - 1) % SLOT_COLORS.length]
}

Page({
  data: {
    step: 1,
    nickname: '',
    location: '',
    date: '',
    time: '',
    need: 4,
    needOptions: [
      { value: 2, selected: false }, { value: 3, selected: false },
      { value: 4, selected: true }, { value: 5, selected: false },
      { value: 6, selected: false }
    ],
    estimatedDuration: 120,
    durationOptions: [
      { label: '1小时', value: 60, selected: false },
      { label: '1.5小时', value: 90, selected: false },
      { label: '2小时', value: 120, selected: true },
      { label: '3小时', value: 180, selected: false }
    ],
    level: 'intermediate',
    levelHint: LEVEL_HINTS.intermediate,
    courtType: 'hard',
    courtTypeOptions: [
      { label: '硬地', value: 'hard', selected: true },
      { label: '红土', value: 'clay', selected: false },
      { label: '草地', value: 'grass', selected: false }
    ],
    indoor: false,
    matchType: 'doubles',
    matchTypeOptions: [
      { label: '单打', value: 'singles', selected: false },
      { label: '双打', value: 'doubles', selected: true },
      { label: '随意', value: 'any', selected: false }
    ],
    fee: 'free',
    feeOptions: [
      { label: '免费', value: 'free', selected: true },
      { label: 'AA制', value: 'split', selected: false },
      { label: '固定收费', value: 'fixed', selected: false }
    ],
    contactInfo: '',
    note: '',
    dateMin: '',
    submitting: false,
    // 坑位管理
    slots: [],
    showSlotSheet: false,
    editingSlotIndex: -1,
    slotInput: '',
    slotSearchResults: []
  },

  onLoad: function(options) {
    const today = new Date()
    const pad = function(n) { return String(n).padStart(2, '0') }
    const todayStr = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate())
    this.todayStr = todayStr
    if (options && options.note) this.setData({ note: decodeURIComponent(options.note) })
    const savedNickname = wx.getStorageSync('nickname') || ''
    this.setData({ dateMin: todayStr, date: todayStr, time: this.getDefaultTime(), nickname: savedNickname })
    this._rebuildSlots()
  },

  onShow: function() {
    this.setData({ step: 1 })
    var update = {}
    var player = getApp().globalData.player
    update.nickname = (player && player.nickname) ? player.nickname : (wx.getStorageSync('nickname') || '')
    var prefillNote = wx.getStorageSync('postPrefillNote')
    if (prefillNote) { update.note = prefillNote; wx.removeStorageSync('postPrefillNote') }
    this.setData(update)
    this._rebuildSlots()

    // 预留约球对象的坑位
    var partnerName = wx.getStorageSync('postPrefillPartner')
    if (partnerName) {
      wx.removeStorageSync('postPrefillPartner')
      this._prefillPartnerSlot(partnerName)
    }
  },

  getDefaultTime: function() {
    const t = new Date()
    return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0')
  },


  nextStep: function() {
    const step = this.data.step
    if (step === 1 && (!this.data.nickname.trim() || !this.data.location.trim() || !this.data.date || !this.data.time)) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    this.setData({ step: step + 1 })
  },

  prevStep: function() { this.setData({ step: this.data.step - 1 }) },

  onNicknameInput: function(e) { this.setData({ nickname: e.detail.value }) },
  onLocationInput: function(e) { this.setData({ location: e.detail.value }) },
  onContactInput: function(e) { this.setData({ contactInfo: e.detail.value }) },
  onNoteInput: function(e) { this.setData({ note: e.detail.value }) },

  onDateChange: function(e) {
    const date = e.detail.value
    const update = { date: date }
    if (date === this.todayStr) update.time = this.getDefaultTime()
    this.setData(update)
  },

  onTimeChange: function(e) { this.setData({ time: e.detail.value }) },

  selectNeed: function(e) {
    const val = e.currentTarget.dataset.value
    this.setData({
      need: val,
      needOptions: this.data.needOptions.map(function(o) { return { value: o.value, selected: o.value === val } })
    })
    this._rebuildSlots()
  },

  selectDuration: function(e) {
    const val = e.currentTarget.dataset.value
    this.setData({
      estimatedDuration: val,
      durationOptions: this.data.durationOptions.map(function(o) {
        return { label: o.label, value: o.value, selected: o.value === val }
      })
    })
  },

  selectLevel: function(e) {
    const val = e.currentTarget.dataset.value
    this.setData({ level: val, levelHint: LEVEL_HINTS[val] })
  },

  selectCourtType: function(e) {
    const val = e.currentTarget.dataset.value
    this.setData({
      courtType: val,
      courtTypeOptions: this.data.courtTypeOptions.map(function(o) {
        return { label: o.label, value: o.value, selected: o.value === val }
      })
    })
  },

  setIndoor: function(e) { this.setData({ indoor: e.currentTarget.dataset.value === 'true' }) },

  selectMatchType: function(e) {
    const val = e.currentTarget.dataset.value
    var defaultNeed = val === 'singles' ? 2 : val === 'doubles' ? 4 : this.data.need
    this.setData({
      matchType: val,
      need: defaultNeed,
      needOptions: [2, 3, 4, 5, 6].map(function(v) { return { value: v, selected: v === defaultNeed } }),
      matchTypeOptions: this.data.matchTypeOptions.map(function(o) {
        return { label: o.label, value: o.value, selected: o.value === val }
      })
    })
    this._rebuildSlots()
  },

  selectFee: function(e) {
    const val = e.currentTarget.dataset.value
    this.setData({
      fee: val,
      feeOptions: this.data.feeOptions.map(function(o) {
        return { label: o.label, value: o.value, selected: o.value === val }
      })
    })
  },

  // ── 坑位管理 ──

  _prefillPartnerSlot: async function(partnerName) {
    var slots = this.data.slots
    if (slots.length < 2) return  // 人数只有1时无可预留的坑
    var avatarUrl = ''
    try {
      var res = await db.collection('players').where({ nickname: partnerName }).limit(1).get()
      if (res.data && res.data[0]) avatarUrl = res.data[0].avatarUrl || ''
    } catch(e) {}
    var newSlots = slots.map(function(s) {
      if (s.slotIndex === 1 && s.status === 'OPEN') {
        return { slotIndex: 1, status: 'RESERVED', nickname: partnerName, avatarUrl: avatarUrl, avatarColor: slotColor(partnerName) }
      }
      return s
    })
    this.setData({ slots: newSlots })
  },

  _rebuildSlots: function() {
    var need = this.data.need
    var name = this.data.nickname || wx.getStorageSync('nickname') || ''
    var existingSlots = this.data.slots || []
    var slots = []

    // 坑 0：发起人，永远 CONFIRMED
    slots.push({ slotIndex: 0, status: 'CONFIRMED', nickname: name, avatarColor: slotColor(name) })

    // 其余坑：保留已预留的，其他设为 OPEN
    for (var i = 1; i < need; i++) {
      var existing = null
      for (var j = 0; j < existingSlots.length; j++) {
        if (existingSlots[j].slotIndex === i) { existing = existingSlots[j]; break }
      }
      if (existing && existing.status === 'RESERVED') {
        slots.push(existing)
      } else {
        slots.push({ slotIndex: i, status: 'OPEN', nickname: null, avatarColor: null })
      }
    }
    this.setData({ slots: slots })
  },

  onSlotPlusTap: function(e) {
    var idx = e.currentTarget.dataset.index
    this.setData({ showSlotSheet: true, editingSlotIndex: idx, slotInput: '' })
  },

  clearSlot: function(e) {
    var idx = e.currentTarget.dataset.index
    var slots = this.data.slots.map(function(s) {
      if (s.slotIndex === idx) return { slotIndex: idx, status: 'OPEN', nickname: null, avatarColor: null }
      return s
    })
    this.setData({ slots: slots })
  },

  onSlotSearch: async function(e) {
    var keyword = (e.detail.value || '').trim()
    this.setData({ slotInput: keyword })
    if (!keyword) { this.setData({ slotSearchResults: [] }); return }
    try {
      var db = wx.cloud.database()
      var res = await db.collection('players')
        .where({ nickname: db.RegExp({ regexp: keyword, options: 'i' }) })
        .limit(8).get()
      var myName = this.data.nickname
      var LEVEL = { beginner: '新手 2.0-2.5', intermediate: '进阶 3.0-3.5', advanced: '竞技 4.0+' }
      var results = (res.data || []).filter(function(p) { return p.nickname !== myName }).map(function(p) {
        return { nickname: p.nickname, avatarUrl: p.avatarUrl || '', avatarColor: slotColor(p.nickname), initial: p.nickname.slice(-1), levelLabel: LEVEL[p.level] || '' }
      })
      this.setData({ slotSearchResults: results })
    } catch(e) { this.setData({ slotSearchResults: [] }) }
  },

  selectSlotPartner: function(e) {
    var idx = e.currentTarget.dataset.index
    var partner = this.data.slotSearchResults[idx]
    if (!partner) return
    var slotIdx = this.data.editingSlotIndex
    var slots = this.data.slots.map(function(s) {
      if (s.slotIndex === slotIdx) {
        return { slotIndex: slotIdx, status: 'RESERVED', nickname: partner.nickname, avatarUrl: partner.avatarUrl, avatarColor: partner.avatarColor }
      }
      return s
    })
    this.setData({ slots: slots, showSlotSheet: false, slotInput: '', slotSearchResults: [] })
  },

  closeSlotSheet: function() { this.setData({ showSlotSheet: false, slotInput: '', slotSearchResults: [] }) },

  noop: function() {},

  // ── 提交 ──

  submit: async function() {
    const data = this.data
    if (data.submitting) return
    if (!getApp().hasProfile()) { getApp().requireProfile(null); return }

    this.setData({ submitting: true })
    try {
      var player = getApp().globalData.player
      var nickname = (player && player.nickname) || wx.getStorageSync('nickname') || '球友'
      const year = Number(data.date.split('-')[0])
      const month = Number(data.date.split('-')[1])
      const day = Number(data.date.split('-')[2])
      const hour = Number(data.time.split(':')[0])
      const minute = Number(data.time.split(':')[1])
      const gameTimestamp = new Date(year, month - 1, day, hour, minute).getTime()

      let myOpenid = ''
      try {
        const r = await wx.cloud.callFunction({ name: 'getOpenId' })
        myOpenid = r.result.openid
      } catch(e) {}

      // 同步 slot 0 昵称（可能在 onShow 之后昵称更新了）
      var slots = data.slots.slice()
      if (slots.length > 0) slots[0] = { slotIndex: 0, status: 'CONFIRMED', nickname: nickname, avatarColor: slotColor(nickname) }

      await db.collection('posts').add({
        data: {
          nickname: nickname,
          location: data.location,
          date: data.date,
          time: data.time,
          gameTimestamp: gameTimestamp,
          estimatedDuration: data.estimatedDuration,
          need: data.need,
          level: data.level,
          courtType: data.courtType,
          indoor: data.indoor,
          matchType: data.matchType,
          fee: data.fee,
          contactInfo: data.contactInfo,
          note: data.note,
          creatorNickname: nickname,
          joined: 1,
          joiners: [nickname],
          joinerOpenids: myOpenid ? [myOpenid] : [],
          slots: slots,
          recruitingOpen: true,
          waitlist: [],
          notified: false,
          cancelled: false,
          createdAt: db.serverDate()
        }
      })

      wx.setStorageSync('nickname', data.nickname)
      wx.showToast({ title: '球局已发布 🎾', icon: 'none' })
      setTimeout(function() { wx.switchTab({ url: '/pages/index/index' }) }, 800)
    } catch(e) {
      wx.showToast({ title: '发布失败，请重试', icon: 'none' })
    }
    this.setData({ submitting: false })
  }
})
