var DEVICE_TYPES = [
  { value: 'apple_watch', label: 'Apple Watch',  icon: '⌚' },
  { value: 'garmin',      label: 'Garmin',        icon: '⌚' },
  { value: 'huawei',      label: '华为 Watch',    icon: '⌚' },
  { value: 'suunto',      label: 'Suunto',        icon: '⌚' },
  { value: 'polar',       label: 'Polar',         icon: '⌚' },
  { value: 'other',       label: '其他设备',       icon: '📱' },
]

function uid() { return Date.now() + '_' + Math.floor(Math.random() * 1000) }

Page({
  data: {
    loading: true,
    rackets: [],
    shoes: [],
    devices: [],
    // sheet state
    sheetVisible: false,
    sheetType: 'racket',  // 'racket' | 'shoe' | 'device'
    sheetTitle: '',
    editIndex: -1,
    saving: false,
    // form fields
    formBrand: '',
    formModel: '',
    formWeight: '',
    formTension: '',
    formNotes: '',
    formIsPrimary: false,
    formLabel: '',
    formDeviceTypeIndex: 0,
    deviceTypeOptions: DEVICE_TYPES,
  },

  onLoad: async function() {
    try {
      var res = await wx.cloud.callFunction({ name: 'getPlayer' })
      var player = (res && res.result && res.result.player) || {}
      var gear = player.gear || {}
      this.setData({
        rackets: gear.rackets || [],
        shoes: gear.shoes || [],
        devices: (gear.devices || []).map(this._enrichDevice),
        loading: false,
      })
    } catch(e) {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  _enrichDevice: function(d) {
    var t = DEVICE_TYPES.find(function(x) { return x.value === d.type }) || DEVICE_TYPES[DEVICE_TYPES.length - 1]
    return Object.assign({}, d, { typeLabel: t.label, typeIcon: t.icon })
  },

  // ── Gear saves ──
  _saveGear: async function() {
    var gear = {
      rackets: this.data.rackets,
      shoes: this.data.shoes,
      devices: this.data.devices.map(function(d) {
        var copy = Object.assign({}, d)
        delete copy.typeLabel
        delete copy.typeIcon
        return copy
      }),
    }
    var res = await wx.cloud.callFunction({ name: 'saveGear', data: { gear: gear } })
    if (!res.result || !res.result.success) throw new Error('save failed')
  },

  // ── Add handlers ──
  onAddRacket: function() { this._openSheet('racket', -1) },
  onAddShoe:   function() { this._openSheet('shoe', -1) },
  onAddDevice: function() { this._openSheet('device', -1) },

  // ── Edit handlers ──
  onEditRacket: function(e) { this._openSheet('racket', e.currentTarget.dataset.index) },
  onEditShoe:   function(e) { this._openSheet('shoe',   e.currentTarget.dataset.index) },
  onEditDevice: function(e) { this._openSheet('device', e.currentTarget.dataset.index) },

  // ── Delete handlers ──
  onDeleteRacket: function(e) { this._deleteItem('rackets', e.currentTarget.dataset.index) },
  onDeleteShoe:   function(e) { this._deleteItem('shoes',   e.currentTarget.dataset.index) },
  onDeleteDevice: function(e) { this._deleteItem('devices', e.currentTarget.dataset.index) },

  _deleteItem: function(listKey, index) {
    var self = this
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      confirmColor: '#FF6B6B',
      success: async function(res) {
        if (!res.confirm) return
        var list = self.data[listKey].slice()
        list.splice(index, 1)
        var update = {}; update[listKey] = list
        self.setData(update)
        try {
          await self._saveGear()
          wx.showToast({ title: '已删除', icon: 'success' })
        } catch(e) {
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
  },

  _openSheet: function(type, index) {
    var titles = { racket: index >= 0 ? '编辑球拍' : '添加球拍', shoe: index >= 0 ? '编辑球鞋' : '添加球鞋', device: index >= 0 ? '编辑设备' : '绑定设备' }
    var form = { formBrand: '', formModel: '', formWeight: '', formTension: '', formNotes: '', formIsPrimary: false, formLabel: '', formDeviceTypeIndex: 0 }

    if (index >= 0) {
      if (type === 'racket') {
        var r = this.data.rackets[index]
        form = { formBrand: r.brand || '', formModel: r.model || '', formWeight: r.weight || '', formTension: r.tension || '', formNotes: r.notes || '', formIsPrimary: !!r.isPrimary, formLabel: '', formDeviceTypeIndex: 0 }
      } else if (type === 'shoe') {
        var s = this.data.shoes[index]
        form = { formBrand: s.brand || '', formModel: s.model || '', formWeight: '', formTension: '', formNotes: s.notes || '', formIsPrimary: !!s.isPrimary, formLabel: '', formDeviceTypeIndex: 0 }
      } else {
        var d = this.data.devices[index]
        var dtIdx = DEVICE_TYPES.findIndex(function(x) { return x.value === d.type })
        form = { formBrand: '', formModel: '', formWeight: '', formTension: '', formNotes: '', formIsPrimary: false, formLabel: d.label || '', formDeviceTypeIndex: dtIdx >= 0 ? dtIdx : 0 }
      }
    }

    this.setData(Object.assign({ sheetVisible: true, sheetType: type, sheetTitle: titles[type], editIndex: index }, form))
  },

  onSheetClose: function() { this.setData({ sheetVisible: false }) },

  onSheetSave: async function() {
    if (this.data.saving) return
    var type = this.data.sheetType
    var idx  = this.data.editIndex

    if (type === 'racket') {
      if (!this.data.formBrand.trim()) { wx.showToast({ title: '请填写品牌', icon: 'none' }); return }
      if (!this.data.formModel.trim()) { wx.showToast({ title: '请填写型号', icon: 'none' }); return }
      var item = { id: idx >= 0 ? this.data.rackets[idx].id : uid(), brand: this.data.formBrand.trim(), model: this.data.formModel.trim(), weight: this.data.formWeight.trim(), tension: this.data.formTension.trim(), notes: this.data.formNotes.trim(), isPrimary: this.data.formIsPrimary }
      var list = this.data.rackets.slice()
      if (item.isPrimary) list = list.map(function(r) { return Object.assign({}, r, { isPrimary: false }) })
      if (idx >= 0) list[idx] = item; else list.push(item)
      this.setData({ saving: true, rackets: list })

    } else if (type === 'shoe') {
      if (!this.data.formBrand.trim()) { wx.showToast({ title: '请填写品牌', icon: 'none' }); return }
      if (!this.data.formModel.trim()) { wx.showToast({ title: '请填写型号', icon: 'none' }); return }
      var item = { id: idx >= 0 ? this.data.shoes[idx].id : uid(), brand: this.data.formBrand.trim(), model: this.data.formModel.trim(), notes: this.data.formNotes.trim(), isPrimary: this.data.formIsPrimary }
      var list = this.data.shoes.slice()
      if (item.isPrimary) list = list.map(function(s) { return Object.assign({}, s, { isPrimary: false }) })
      if (idx >= 0) list[idx] = item; else list.push(item)
      this.setData({ saving: true, shoes: list })

    } else {
      var dt = DEVICE_TYPES[this.data.formDeviceTypeIndex]
      var item = { id: idx >= 0 ? this.data.devices[idx].id : uid(), type: dt.value, label: this.data.formLabel.trim() }
      var enriched = this._enrichDevice(item)
      var list = this.data.devices.slice()
      if (idx >= 0) list[idx] = enriched; else list.push(enriched)
      this.setData({ saving: true, devices: list })
    }

    try {
      await this._saveGear()
      this.setData({ saving: false, sheetVisible: false })
      wx.showToast({ title: '已保存', icon: 'success' })
    } catch(e) {
      this.setData({ saving: false })
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  },

  // ── Form inputs ──
  onBrandInput:   function(e) { this.setData({ formBrand: e.detail.value }) },
  onModelInput:   function(e) { this.setData({ formModel: e.detail.value }) },
  onWeightInput:  function(e) { this.setData({ formWeight: e.detail.value }) },
  onTensionInput: function(e) { this.setData({ formTension: e.detail.value }) },
  onNotesInput:   function(e) { this.setData({ formNotes: e.detail.value }) },
  onLabelInput:   function(e) { this.setData({ formLabel: e.detail.value }) },
  onPrimaryChange:function(e) { this.setData({ formIsPrimary: e.detail.value }) },
  onDeviceTypeChange: function(e) { this.setData({ formDeviceTypeIndex: parseInt(e.detail.value) }) },
})
