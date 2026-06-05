const db = wx.cloud.database()
const app = getApp()
const TEMPLATE_ID = 'l297m0LohqoohEogMcxM7lIh8m6pw4_a_IbN5kxvxyU'

Page({
  data: {
    post: null,
    myName: '',
    joining: false,
    alreadyJoined: false,
    isCreator: false,
    isParticipant: false,
    showScoreSheet: false,
    quickScoreA: 0,
    quickScoreB: 0,
    quickScoreSet: 1,
    uploading: false,
    galleryPhotos: [],
    // 坑位系统
    hasSlots: false,
    displaySlots: [],
    isReservedUser: false,
    myReservedSlotIndex: -1,
    hasOpenSlot: false
  },

  onLoad: function(options) {
    this.postId = options.id
    var player = getApp().globalData.player
    var savedNickname = (player && player.nickname) || wx.getStorageSync('nickname') || ''
    this.setData({ myName: savedNickname })
    this.loadPost()
    this.loadGallery()
  },

  onShow: function() {
    if (this.postId) { this.loadPost(); this.loadGallery() }
  },

  loadGallery: async function() {
    if (!this.postId) return
    try {
      var res = await db.collection('moments')
        .where({ postId: this.postId, type: 'photo' })
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get()
      var photos = []
      ;(res.data || []).forEach(function(m) { photos = photos.concat(m.imageUrls || []) })
      this.setData({ galleryPhotos: photos })
    } catch(e) {}
  },

  previewGallery: function(e) {
    wx.previewImage({ current: e.currentTarget.dataset.url, urls: e.currentTarget.dataset.urls })
  },

  onShareAppMessage: function() {
    const post = this.data.post
    if (!post) return {}
    const status = post.gameStatus || {}
    const title = status.code === 'recruiting'
      ? post.location + '约球！' + post.dateLabel + ' ' + post.time + '，还差 ' + post.spotsLeft + ' 人'
      : post.location + ' · ' + status.label
    return { title: title, path: '/pages/detail/detail?id=' + this.postId }
  },

  loadPost: async function() {
    try {
      const res = await db.collection('posts').doc(this.postId).get()
      const post = app.processPost(res.data)
      const myName = this.data.myName
      const myOpenId = wx.getStorageSync('myOpenId') || ''
      // openid 比对（最可靠）
      const joinedByOpenId = !!(myOpenId && (res.data.joinerOpenids || []).indexOf(myOpenId) !== -1)
      // 昵称比对兜底（兼容旧数据、openid 尚未缓存的场景）
      const joinedByName = !!(myName && (post.joiners || []).indexOf(myName) !== -1)
      // isCreator：openid 主判 + creatorNickname 兜底（openid 未缓存时仍能识别）
      const isCreator = !!(myOpenId && res.data._openid === myOpenId)
        || !!(myName && res.data.creatorNickname && res.data.creatorNickname === myName)
      // 已加入但非发起人（排除创建者自己，避免被算成普通参与者）
      post.alreadyJoined = !isCreator && (joinedByOpenId || joinedByName)
      const isParticipant = isCreator || post.alreadyJoined

      // ── 坑位处理 ──
      const rawSlots = res.data.slots || null
      var hasSlots = !!rawSlots
      var displaySlots = []
      var isReservedUser = false
      var myReservedSlotIndex = -1
      var hasOpenSlot = false

      if (rawSlots) {
        var COLORS = ['#2BB673', '#4ECDC4', '#F7B731', '#A29BFE', '#FF6B6B']
        displaySlots = rawSlots.map(function(s) {
          var color = s.avatarColor || (s.nickname ? COLORS[s.nickname.charCodeAt(s.nickname.length - 1) % COLORS.length] : '#CCC')
          var isMySlot = s.status === 'RESERVED' && s.nickname === myName
          if (isMySlot) { isReservedUser = true; myReservedSlotIndex = s.slotIndex }
          if (s.status === 'OPEN') hasOpenSlot = true
          return {
            slotIndex: s.slotIndex,
            status: s.status,
            nickname: s.nickname || null,
            avatarColor: color,
            initial: s.nickname ? s.nickname.slice(-1) : '+',
            isMySlot: isMySlot
          }
        })

        // 6 小时自动释放：若即将开打且仍有 RESERVED 坑，自动公开
        var gameStart = res.data.gameTimestamp
        var now = Date.now()
        if (gameStart && gameStart > now && (gameStart - now) < 6 * 3600 * 1000) {
          var hasReserved = rawSlots.some(function(s) { return s.status === 'RESERVED' })
          if (hasReserved) {
            wx.cloud.callFunction({ name: 'rejectSlot', data: { postId: this.postId, autoRelease: true } })
              .then(function() { /* 触发成功后页面会在 onShow 刷新 */ })
            // 乐观更新本地 displaySlots
            displaySlots = displaySlots.map(function(s) {
              if (s.status === 'RESERVED') return Object.assign({}, s, { status: 'OPEN', nickname: null, initial: '+', isMySlot: false })
              return s
            })
            isReservedUser = false
            myReservedSlotIndex = -1
            hasOpenSlot = true
          }
        }
      }

      this.setData({
        post: post, alreadyJoined: post.alreadyJoined, isCreator: isCreator, isParticipant: isParticipant,
        hasSlots: hasSlots, displaySlots: displaySlots,
        isReservedUser: isReservedUser, myReservedSlotIndex: myReservedSlotIndex, hasOpenSlot: hasOpenSlot
      })
      // 异步补充球友真实头像（不阻塞页面渲染）
      this.loadJoinerAvatars(post.joiners || [])
    } catch(e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  loadJoinerAvatars: async function(joiners) {
    if (!joiners.length) return
    try {
      var res = await db.collection('players')
        .where({ nickname: db.command.in(joiners) })
        .field({ nickname: true, avatarUrl: true })
        .get()
      var avatarMap = {}
      ;(res.data || []).forEach(function(p) { avatarMap[p.nickname] = p.avatarUrl || '' })

      var COLORS = ['#2BB673', '#4ECDC4', '#F7B731', '#A29BFE', '#FF6B6B']
      var avatarsFull = joiners.map(function(name) {
        var color = COLORS[name.charCodeAt(name.length - 1) % COLORS.length]
        return { name: name, avatarUrl: avatarMap[name] || '', color: color, initial: name.slice(-1) }
      })
      var post = this.data.post
      if (post) this.setData({ 'post.avatarsFull': avatarsFull })

      // 同步更新 displaySlots 中已存储的 avatarUrl（CONFIRMED 槽位）
      var displaySlots = this.data.displaySlots
      if (displaySlots.length) {
        var updated = displaySlots.map(function(s) {
          if (s.nickname && !s.avatarUrl && avatarMap[s.nickname]) {
            return Object.assign({}, s, { avatarUrl: avatarMap[s.nickname] })
          }
          return s
        })
        this.setData({ displaySlots: updated })
      }
    } catch(e) {}
  },

  // 接受预留邀请（复用 join 逻辑）
  acceptInvite: function() { this.join() },

  // 婉拒并释放坑位
  rejectInvite: function() {
    var self = this
    var slotIndex = this.data.myReservedSlotIndex
    wx.showModal({
      title: '婉拒邀请',
      content: '确认婉拒？该坑位将立即向所有人公开',
      confirmText: '婉拒',
      confirmColor: '#FF6B6B',
      cancelText: '再想想',
      success: function(res) {
        if (!res.confirm) return
        wx.showLoading({ title: '处理中...' })
        wx.cloud.callFunction({ name: 'rejectSlot', data: { postId: self.postId, slotIndex: slotIndex } })
          .then(function() {
            wx.hideLoading()
            wx.showToast({ title: '已婉拒，坑位已公开 🔓', icon: 'none' })
            self.loadPost()
          }).catch(function() {
            wx.hideLoading()
            wx.showToast({ title: '操作失败，请重试', icon: 'none' })
          })
      }
    })
  },

  // 普通用户点击已预留坑位
  onReservedSlotTap: function() {
    wx.showToast({ title: '该坑位已为发起人好友预留，若对方放弃将自动公开', icon: 'none', duration: 2500 })
  },

  goToPubProfile: function(e) {
    var name = e.currentTarget.dataset.name
    if (!name) return
    wx.navigateTo({ url: '/pages/pub-profile/pub-profile?nickname=' + encodeURIComponent(name) })
  },

  onNameInput: function(e) { this.setData({ myName: e.detail.value }) },

  join: async function() {
    const post = this.data.post
    const myName = this.data.myName
    const joining = this.data.joining
    if (joining) return
    if (!myName.trim()) {
      wx.showToast({ title: '输入你的昵称', icon: 'none' })
      return
    }

    const statusCode = post.gameStatus ? post.gameStatus.code : ''
    if (statusCode === 'in-progress' && !post.liveJoinable) {
      var hint = (post.liveSubLabel === '已满员') ? '球局已满员 👥' : '创建者已关闭招募'
      wx.showToast({ title: hint, icon: 'none' })
      return
    }
    if (statusCode === 'finished') {
      wx.showModal({ title: '这场已经结束啦', content: '看看广场还有谁在打 🎾', showCancel: false, confirmText: '去广场' })
      return
    }

    // 订阅消息不阻塞加入流程
    wx.requestSubscribeMessage({ tmplIds: [TEMPLATE_ID] }).catch(function() {})

    this.setData({ joining: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'joinPost',
        data: { postId: post._id, nickname: myName.trim() }
      })
      const result = res.result
      if (result.error === 'started') {
        wx.showModal({ title: '球局已经开打啦 🎾', content: '下次早点来～', showCancel: false })
      } else if (result.error === 'finished') {
        wx.showModal({ title: '这场已经结束啦', content: '去广场找找下一场 🎾', showCancel: false })
      } else if (result.error === '人已满了') {
        wx.showToast({ title: '球友已经组满啦 👥', icon: 'none' })
      } else if (result.error === '你已经报名了') {
        wx.showToast({ title: '你已经在里面啦', icon: 'none' })
      } else if (result.error) {
        wx.showToast({ title: result.error, icon: 'none' })
      } else {
        wx.setStorageSync('nickname', myName.trim())
        const myJoinedIds = wx.getStorageSync('myJoinedIds') || []
        if (myJoinedIds.indexOf(post._id) === -1) {
          myJoinedIds.unshift(post._id)
          wx.setStorageSync('myJoinedIds', myJoinedIds.slice(0, 50))
        }
        wx.showToast({ title: '球搭子+1 🎾', icon: 'none' })
        await this.loadPost()
      }
    } catch(e) {
      wx.showToast({ title: '网络挥拍失误了，再试一次？', icon: 'none' })
    }
    this.setData({ joining: false })
  },

  cancelJoin: function() {
    const post = this.data.post
    const myName = this.data.myName
    const self = this
    wx.showModal({
      title: '退出球局',
      content: '确认退出这场约球？',
      confirmText: '退出',
      confirmColor: '#FF6B6B',
      cancelText: '再想想',
      success: function(res) {
        if (!res.confirm) return
        wx.showLoading({ title: '退出中...' })
        wx.cloud.callFunction({
          name: 'cancelJoin',
          data: { postId: post._id, nickname: myName }
        }).then(function(r) {
          wx.hideLoading()
          var result = (r && r.result) || {}
          if (result.error) {
            wx.showToast({ title: result.error, icon: 'none' })
          } else {
            wx.showToast({ title: '已退出球局', icon: 'none' })
            self.loadPost()
          }
        }).catch(function() {
          wx.hideLoading()
          wx.showToast({ title: '网络问题，请重试', icon: 'none' })
        })
      }
    })
  },

  cancelGame: function() {
    var self = this
    var post = this.data.post
    var othersJoined = post && (post.joined || 1) > 1
    wx.showModal({
      title: '取消球局',
      content: othersJoined ? '确认取消这场约球？已加入的球友都会收到通知' : '确认取消这场约球？',
      confirmText: '取消球局',
      confirmColor: '#FF6B6B',
      cancelText: '再想想',
      success: function(res) {
        if (!res.confirm) return
        wx.showLoading({ title: '处理中...' })
        wx.cloud.callFunction({ name: 'cancelPost', data: { postId: self.postId } })
          .then(function(r) {
            wx.hideLoading()
            var result = (r && r.result) || {}
            if (result.error) {
              wx.showToast({ title: result.error, icon: 'none' })
            } else {
              wx.showToast({ title: '球局已取消', icon: 'none' })
              self.loadPost()
            }
          }).catch(function() {
            wx.hideLoading()
            wx.showToast({ title: '操作失败，请重试', icon: 'none' })
          })
      }
    })
  },

  goIndex: function() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  // ── 上传现场照片 ──

  quickUpload: async function() {
    if (this.data.uploading) return
    var postId = this.postId
    var myName = this.data.myName || '球友'
    var self = this
    try {
      var res = await wx.chooseImage({ count: 4, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
      var paths = res.tempFilePaths || []
      if (!paths.length) return
      self.setData({ uploading: true })
      wx.showLoading({ title: '上传中...' })
      var imageUrls = []
      for (var i = 0; i < paths.length; i++) {
        var up = await wx.cloud.uploadFile({
          cloudPath: 'moments/' + postId + '/' + Date.now() + '_' + i + '.jpg',
          filePath: paths[i]
        })
        imageUrls.push(up.fileID)
      }
      wx.hideLoading()
      self.setData({ uploading: false })
      await db.collection('moments').add({
        data: { postId: postId, type: 'photo', author: myName, content: '', imageUrls: imageUrls, createdAt: Date.now() }
      })
      wx.showToast({ title: '上传成功 📸', icon: 'none' })
    } catch(e) {
      wx.hideLoading()
      self.setData({ uploading: false })
      if (e && e.errMsg && e.errMsg.indexOf('cancel') === -1) {
        wx.showToast({ title: '上传失败', icon: 'none' })
      }
    }
  },

  // ── 局分 Sheet ──

  openScoreSheet: function() {
    var score = (this.data.post && this.data.post.liveScore) || {}
    this.setData({ showScoreSheet: true, quickScoreA: score.a || 0, quickScoreB: score.b || 0, quickScoreSet: score.set || 1 })
  },
  closeScoreSheet: function() { this.setData({ showScoreSheet: false }) },
  noop: function() {},

  addQuickA: function() { this.setData({ quickScoreA: this.data.quickScoreA + 1 }) },
  subQuickA: function() { if (this.data.quickScoreA > 0) this.setData({ quickScoreA: this.data.quickScoreA - 1 }) },
  addQuickB: function() { this.setData({ quickScoreB: this.data.quickScoreB + 1 }) },
  subQuickB: function() { if (this.data.quickScoreB > 0) this.setData({ quickScoreB: this.data.quickScoreB - 1 }) },
  upQuickSet: function() { this.setData({ quickScoreSet: this.data.quickScoreSet + 1 }) },

  confirmScore: async function() {
    var a = this.data.quickScoreA, b = this.data.quickScoreB, set = this.data.quickScoreSet
    var myName = this.data.myName || '球友'
    this.setData({ showScoreSheet: false })
    try {
      await db.collection('posts').doc(this.postId).update({
        data: { liveScore: { a: a, b: b, set: set, tiebreak: false } }
      })
      db.collection('moments').add({
        data: { postId: this.postId, type: 'score', author: myName, content: '比分更新 ' + a + ':' + b + ' 第' + set + '盘', imageUrls: [], createdAt: Date.now() }
      }).catch(function() {})
      wx.showToast({ title: '比分已更新 🎾', icon: 'none' })
      this.loadPost()
    } catch(e) {
      wx.showToast({ title: '更新失败，请重试', icon: 'none' })
    }
  },

  toggleRecruiting: async function(e) {
    var newValue = e.detail.value
    try {
      await db.collection('posts').doc(this.postId).update({ data: { recruitingOpen: newValue } })
      var p = this.data.post
      var isFull = (p.joined || 0) >= (p.need || 1)
      var updated = Object.assign({}, p, {
        recruitingOpen: newValue,
        liveJoinable: !isFull && newValue,
        liveSubLabel: isFull ? '已满员' : (newValue ? '缺人中' : '已关闭'),
        liveSubColor: isFull ? '#FF6B6B' : (newValue ? '#A6FF33' : '#F7B731')
      })
      this.setData({ post: updated })
      wx.showToast({ title: newValue ? '已开放空降 🟢' : '已关闭招募 🔒', icon: 'none' })
    } catch(e) {
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  },

  enterTennisMode: function() {
    wx.navigateTo({ url: '/pages/tennis-mode/tennis-mode?id=' + this.postId })
  },

  generatePoster: function() {
    var self = this
    var post = this.data.post
    if (!post) return

    wx.showLoading({ title: '生成中...' })

    wx.createSelectorQuery().in(this).select('#posterCanvas').fields({ node: true, size: true }).exec(function(res) {
      var canvas = res[0] && res[0].node
      if (!canvas) {
        wx.hideLoading()
        wx.showToast({ title: '生成失败，请重试', icon: 'none' })
        return
      }

      // 逻辑尺寸 → 物理像素 2x（高清输出）
      var W = 375, H = 660, DPR = 2
      canvas.width = W * DPR
      canvas.height = H * DPR

      var ctx = canvas.getContext('2d')
      ctx.scale(DPR, DPR)

      // 圆角矩形路径
      function roundRect(x, y, w, h, r) {
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + w - r, y)
        ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0)
        ctx.lineTo(x + w, y + h - r)
        ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2)
        ctx.lineTo(x + r, y + h)
        ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
        ctx.lineTo(x, y + r)
        ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 3 / 2)
        ctx.closePath()
      }

      // ── 1. 背景 ──
      ctx.fillStyle = '#0E231A'
      ctx.fillRect(0, 0, W, H)

      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 0.5
      ;[H * 0.20, H * 0.40, H * 0.60, H * 0.77].forEach(function(y) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      })
      ;[W * 0.07, W * 0.5, W * 0.93].forEach(function(x) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * 0.80); ctx.stroke()
      })

      ctx.strokeStyle = 'rgba(255,255,255,0.055)'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(-30, H * 0.28); ctx.lineTo(W + 30, H * 0.46); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-30, H * 0.58); ctx.lineTo(W + 30, H * 0.76); ctx.stroke()

      // 右上角光晕（Canvas 2d 用 createRadialGradient）
      var grd = ctx.createRadialGradient(W, 0, 0, W, 0, 280)
      grd.addColorStop(0, 'rgba(166,255,51,0.18)')
      grd.addColorStop(1, 'rgba(166,255,51,0)')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, W, H)

      // ── 2. 打卡徽章 ──
      ctx.fillStyle = 'rgba(166,255,51,0.11)'
      ctx.fillRect(24, 34, 172, 28)
      ctx.fillStyle = '#A6FF33'
      ctx.fillRect(24, 34, 3, 28)
      ctx.font = 'bold 11px PingFang SC'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#A6FF33'
      ctx.fillText('打球打卡  CHECK-IN', 35, 53)

      // ── 3. 副标题 ──
      ctx.fillStyle = 'rgba(255,255,255,0.40)'
      ctx.font = 'normal 14px PingFang SC'
      ctx.fillText('今天打球了 🎾', 24, 90)

      // ── 4. 场地名 ──
      var loc = post.location || '未知场地'
      var locSize = loc.length <= 3 ? 58 : loc.length <= 6 ? 48 : loc.length <= 9 ? 38 : 32
      if (loc.length > 10) { loc = loc.slice(0, 10) + '…'; locSize = 32 }
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold ' + locSize + 'px PingFang SC'
      ctx.fillText(loc, 24, 150)
      ctx.fillStyle = '#A6FF33'
      ctx.fillRect(24, 162, 50, 4)

      // ── 5. 主数据卡片 ──
      var c1x = 24, c1y = 176, c1w = W - 48, c1h = 118, c1r = 18
      ctx.fillStyle = 'rgba(10,24,18,0.70)'
      roundRect(c1x, c1y, c1w, c1h, c1r); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'
      ctx.lineWidth = 1
      roundRect(c1x, c1y, c1w, c1h, c1r); ctx.stroke()

      ctx.fillStyle = 'rgba(255,255,255,0.36)'
      ctx.font = 'normal 11px PingFang SC'
      ctx.textAlign = 'left'
      ctx.fillText('打球时长 · DURATION', c1x + 18, c1y + 22)
      ctx.fillStyle = '#A6FF33'
      ctx.font = 'bold 30px PingFang SC'
      ctx.fillText(post.timeLabel || '—', c1x + 18, c1y + 56)

      ctx.strokeStyle = 'rgba(255,255,255,0.10)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(c1x + 18, c1y + 68); ctx.lineTo(c1x + c1w - 18, c1y + 68)
      ctx.stroke()

      var dateStr = post.dateLabel || '—'
      var timeStr = post.time || '—'
      var midX = c1x + c1w / 2
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = 'normal 14px PingFang SC'
      ctx.fillText(dateStr, c1x + 18, c1y + 89)
      ctx.fillStyle = 'rgba(255,255,255,0.30)'
      ctx.font = 'normal 10px PingFang SC'
      ctx.fillText('日期 · DATE', c1x + 18, c1y + 106)

      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(midX, c1y + 73); ctx.lineTo(midX, c1y + c1h - 10)
      ctx.stroke()

      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = 'normal 14px PingFang SC'
      ctx.textAlign = 'left'
      ctx.fillText(timeStr, midX + 18, c1y + 89)
      ctx.fillStyle = 'rgba(255,255,255,0.30)'
      ctx.font = 'normal 10px PingFang SC'
      ctx.fillText('时间 · TIME', midX + 18, c1y + 106)

      // ── 6. 标签卡片 ──
      var tags = []
      if (post.levelInfo) tags.push(post.levelInfo.label || post.levelInfo.full)
      if (post.matchLabel) tags.push(post.matchLabel)
      if (post.courtLabel) tags.push(post.courtLabel)
      if (post.indoor !== undefined) tags.push(post.indoor ? '室内' : '室外')

      var tagsDrawn = tags.length > 0
      var c2y = c1y + c1h + 14

      if (tagsDrawn) {
        var c2x = 24, c2w = W - 48, c2h = 46, c2r = 14
        ctx.fillStyle = 'rgba(52,199,89,0.06)'
        roundRect(c2x, c2y, c2w, c2h, c2r); ctx.fill()
        ctx.strokeStyle = 'rgba(52,199,89,0.44)'
        ctx.lineWidth = 1
        roundRect(c2x, c2y, c2w, c2h, c2r); ctx.stroke()

        var tx = c2x + 14
        tags.slice(0, 4).forEach(function(t) {
          var tw = t.length * 13 + 24
          ctx.fillStyle = 'rgba(52,199,89,0.18)'
          roundRect(tx, c2y + 10, tw, 26, 8); ctx.fill()
          ctx.strokeStyle = 'rgba(52,199,89,0.36)'
          ctx.lineWidth = 1
          roundRect(tx, c2y + 10, tw, 26, 8); ctx.stroke()
          ctx.fillStyle = '#34C759'
          ctx.font = 'normal 12px PingFang SC'
          ctx.textAlign = 'left'
          ctx.fillText(t, tx + 12, c2y + 27)
          tx += tw + 10
        })
      }

      // ── 7. 球友头像 ──
      var joiners = post.joiners || []
      var friendsBaseY = tagsDrawn ? (c2y + 46 + 18) : (c1y + c1h + 18)

      if (joiners.length > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.30)'
        ctx.font = 'normal 11px PingFang SC'
        ctx.textAlign = 'left'
        ctx.fillText('球友 · WITH FRIENDS', 24, friendsBaseY + 12)

        var avColors = ['#1C4231', '#208B8B', '#2E5984', '#6B3F5A', '#4A4B8A']
        var avR = 24
        var avCY = friendsBaseY + 12 + 22 + avR
        var avStartX = 24 + avR

        joiners.slice(0, 4).forEach(function(name, i) {
          var cx = avStartX + i * (avR * 2 + 14)
          ctx.fillStyle = avColors[i % avColors.length]
          ctx.beginPath(); ctx.arc(cx, avCY, avR, 0, Math.PI * 2); ctx.fill()
          ctx.strokeStyle = 'rgba(166,255,51,0.55)'
          ctx.lineWidth = 1.5
          ctx.beginPath(); ctx.arc(cx, avCY, avR, 0, Math.PI * 2); ctx.stroke()
          ctx.fillStyle = '#FFFFFF'
          ctx.font = 'bold 14px PingFang SC'
          ctx.textAlign = 'center'
          ctx.fillText(name.charAt(0), cx, avCY + 5)
          ctx.fillStyle = 'rgba(255,255,255,0.44)'
          ctx.font = 'normal 10px PingFang SC'
          ctx.fillText(name.length > 4 ? name.slice(0, 4) : name, cx, avCY + avR + 13)
        })
      }

      // ── 8. 分割线 ──
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(24, H - 108); ctx.lineTo(W - 24, H - 108)
      ctx.stroke()

      // ── 9. 品牌落款 ──
      ctx.fillStyle = '#A6FF33'
      ctx.font = 'bold 22px PingFang SC'
      ctx.textAlign = 'center'
      ctx.fillText('TennisF', W / 2, H - 62)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.font = 'normal 11px PingFang SC'
      ctx.fillText('找人打网球，就用 TennisF', W / 2, H - 40)

      // ── 保存 ──
      wx.canvasToTempFilePath({
        canvas: canvas,
        success: function(r) {
          wx.hideLoading()
          wx.saveImageToPhotosAlbum({
            filePath: r.tempFilePath,
            success: function() { wx.showToast({ title: '已保存到相册 📸', icon: 'none' }) },
            fail: function() {
              wx.showModal({ title: '需要相册权限', content: '请在手机设置中允许访问相册', showCancel: false })
            }
          })
        },
        fail: function() {
          wx.hideLoading()
          wx.showToast({ title: '生成失败，请重试', icon: 'none' })
        }
      })
    })
  }
})
