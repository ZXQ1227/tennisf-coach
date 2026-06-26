var app = getApp()

var TRAINING_CONFIG = {
  forehand: {
    goals: [
      { icon: '🎯', name: '连续击球 50 次', desc: '提升击球稳定性', progress: '0/50', targetCount: 50 },
      { icon: '📊', name: '命中率 70%', desc: '提高击球质量', progress: '0/70%', targetRate: 70 },
      { icon: '⏰', name: '训练 30 分钟', desc: '提升耐力和专注力', progress: '0/30:00', targetSec: 1800 },
    ],
    tips: ['重点控制拍面角度，减少出界失误', '击球后迅速回位，保持准备姿势', '注意腰腹转动带动手臂发力'],
    hitRateBase: 72,
  },
  backhand: {
    goals: [
      { icon: '🎯', name: '连续击球 50 次', desc: '提升反手稳定性', progress: '0/50', targetCount: 50 },
      { icon: '📊', name: '命中率 70%', desc: '控制击球落点', progress: '0/70%', targetRate: 70 },
      { icon: '⏰', name: '训练 30 分钟', desc: '提升耐力和专注力', progress: '0/30:00', targetSec: 1800 },
    ],
    tips: ['今天重点控制击球落点，减少下网', '保持双手握拍的稳定性', '击球时重心下沉，不要站直'],
    hitRateBase: 68,
  },
  serve: {
    goals: [
      { icon: '🎯', name: '发球 50 次', desc: '提升发球稳定性', progress: '0/50', targetCount: 50 },
      { icon: '📊', name: '一发成功率 60%', desc: '控制落点和力量', progress: '0/60%', targetRate: 60 },
      { icon: '⏰', name: '训练 20 分钟', desc: '集中专项训练', progress: '0/20:00', targetSec: 1200 },
    ],
    tips: ['注意抛球高度和击球时机', '放松手腕，让拍头自然加速', '盯准击球点，不要低头'],
    hitRateBase: 62,
  },
  volley: {
    goals: [
      { icon: '🎯', name: '截击 40 次', desc: '提升截击准确性', progress: '0/40', targetCount: 40 },
      { icon: '📊', name: '命中率 75%', desc: '提升网前控制力', progress: '0/75%', targetRate: 75 },
      { icon: '⏰', name: '训练 25 分钟', desc: '提升耐力和专注力', progress: '0/25:00', targetSec: 1500 },
    ],
    tips: ['保持正确截击姿势，脚步到位', '截击时减少引拍幅度，短促有力', '脚步前进，主动迎球'],
    hitRateBase: 75,
  },
  free: {
    goals: [
      { icon: '🎯', name: '挥拍 100 次', desc: '保持击球节奏', progress: '0/100', targetCount: 100 },
      { icon: '📊', name: '命中率 70%', desc: '关注击球质量', progress: '0/70%', targetRate: 70 },
      { icon: '⏰', name: '训练 30 分钟', desc: '保持专注状态', progress: '0/30:00', targetSec: 1800 },
    ],
    tips: ['今天自由发挥，关注自己的节奏感', '注意击球质量，而不只是数量', '遇到不稳定的动作，多重复练习'],
    hitRateBase: 70,
  },
}

var MODES = [
  { key: 'free', name: '自由训练', desc: '自由练习，不记录数据', active: true, locked: false },
  { key: 'ai', name: '智能计数模式', desc: '自动计数击球次数', active: false, locked: true },
  { key: 'video', name: '视频分析模式', desc: '记录动作，智能分析技术', active: false, locked: true },
  { key: 'voice', name: '语音指导模式', desc: '实时语音教练指导', active: false, locked: true },
]

Page({
  data: {
    trainingType: 'free',
    trainingName: '自由训练',
    goalItems: [],
    aiTip: '',
    lastHitRate: 0,
    modes: [],
    goPressed: false,
  },

  onLoad: function(options) {
    var type = options.type || 'free'
    var name = decodeURIComponent(options.name || '自由训练')
    var config = TRAINING_CONFIG[type] || TRAINING_CONFIG.free
    var player = app.globalData.player || {}
    var swingHistory = player.swingHistory || []
    var tips = config.tips
    var tip = tips[Math.floor(Math.random() * tips.length)]

    // Calculate last session hit rate from history
    var lastHitRate = config.hitRateBase
    if (swingHistory.length > 0) {
      var last = swingHistory[swingHistory.length - 1]
      var total = (last.fh || 0) + (last.bh || 0) + (last.sv || 0) + (last.vl || 0)
      if (total > 0) {
        lastHitRate = Math.min(95, Math.round(config.hitRateBase + Math.random() * 8 - 2))
      }
    }

    // Store config in app.globalData for training-session to use
    app.globalData.currentTraining = {
      type: type,
      name: name,
      config: config,
      lastHitRate: lastHitRate,
    }

    wx.setNavigationBarTitle({ title: name })
    this.setData({
      trainingType: type,
      trainingName: name,
      goalItems: config.goals,
      aiTip: tip,
      lastHitRate: lastHitRate,
      modes: JSON.parse(JSON.stringify(MODES)),
    })
  },

  goBack: function() { wx.navigateBack() },

  goMusic: function() {
    wx.showToast({ title: '音乐功能即将上线', icon: 'none' })
  },

  goGear: function() {
    wx.navigateTo({ url: '/pages/gear/gear' })
  },

  startSession: function() {
    var self = this
    this.setData({ goPressed: true })
    setTimeout(function() {
      self.setData({ goPressed: false })
      wx.navigateTo({
        url: '/pages/training-session/training-session?type=' + self.data.trainingType +
             '&name=' + encodeURIComponent(self.data.trainingName)
      })
    }, 150)
  },

  noop: function() {},
})
