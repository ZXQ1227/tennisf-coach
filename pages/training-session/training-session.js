var app = getApp()

var TIPS_BY_TYPE = {
  forehand: ['保持击球后的随挥动作，有助于稳定落点', '注意脚步，提前移动到合适位置', '放松肩膀，用腰腹带动手臂发力'],
  backhand: ['保持双手握拍稳定，减少手腕晃动', '击球时重心下沉，膝盖微弯', '控制好随挥方向，避免出界'],
  serve: ['抛球高度稳定是关键，多练抛球', '击球瞬间手腕内旋加速', '注意站位，利用好身体旋转'],
  volley: ['截击时减少引拍，以接触为主', '脚步前进截击，不要后退', '保持拍面稳定，控制角度'],
  free: ['关注自己的击球节奏，保持专注', '每10球做一次休息和评估', '注意击球质量，不只是数量'],
}

var HIT_RATE_BASE = { forehand: 72, backhand: 68, serve: 62, volley: 74, free: 70 }

function fmt(sec) {
  var m = Math.floor(sec / 60)
  var s = sec % 60
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s
}

function calcHitRate(type, elapsed, swings) {
  if (swings === 0) return 0
  var base = HIT_RATE_BASE[type] || 70
  var warmup = Math.min(8, Math.round(elapsed / 60))
  return Math.min(95, base - 8 + warmup + Math.round(Math.sin(elapsed / 90) * 3))
}

Page({
  data: {
    statusBarHeight: 44,
    trainingType: 'free',
    trainingName: '自由训练',
    elapsed: 0,
    elapsedText: '00:00',
    targetText: '30:00',
    targetSec: 1800,
    targetHitRate: 70,
    swingCount: 0,
    consecutiveHits: 0,
    hitRate: 0,
    heartRate: 92,
    calories: 0,
    aiTip: '',
    isPaused: false,
    isLocked: false,
  },

  _timer: null,
  _tipIdx: 0,
  _tips: [],

  onLoad: function(options) {
    var info = wx.getSystemInfoSync()
    var type = options.type || 'free'
    var name = decodeURIComponent(options.name || '自由训练')
    var training = app.globalData.currentTraining || {}
    var config = training.config || {}
    var goals = config.goals || []
    var targetSec = (goals[2] && goals[2].targetSec) || 1800
    var targetHitRate = (goals[1] && goals[1].targetRate) || 70
    var tips = TIPS_BY_TYPE[type] || TIPS_BY_TYPE.free

    this._tips = tips
    this.setData({
      statusBarHeight: info.statusBarHeight || 44,
      trainingType: type,
      trainingName: name,
      targetText: fmt(targetSec),
      targetSec: targetSec,
      targetHitRate: targetHitRate,
      aiTip: tips[0],
    })
    this._startTimer()
  },

  _startTimer: function() {
    var self = this
    if (this._timer) clearInterval(this._timer)
    this._timer = setInterval(function() {
      if (self.data.isPaused) return
      var e = self.data.elapsed + 1
      var type = self.data.trainingType
      var warmSec = Math.min(300, e)
      var hr = Math.round(92 + warmSec / 10 + Math.sin(e / 30) * 4)
      var cal = Math.round(e * 0.12)
      var hitRate = calcHitRate(type, e, self.data.swingCount)

      if (e % 300 === 0) {
        self._tipIdx = (self._tipIdx + 1) % self._tips.length
        self.setData({ aiTip: self._tips[self._tipIdx] })
      }

      self.setData({ elapsed: e, elapsedText: fmt(e), heartRate: hr, calories: cal, hitRate: hitRate })
    }, 1000)
  },

  togglePause: function() {
    this.setData({ isPaused: !this.data.isPaused })
  },

  toggleLock: function() {
    var next = !this.data.isLocked
    this.setData({ isLocked: next })
    wx.showToast({ title: next ? '已锁屏' : '已解锁', icon: 'none', duration: 800 })
  },

  onUnload: function() {
    if (this._timer) clearInterval(this._timer)
  },

  endSession: function() {
    var self = this
    wx.showModal({
      title: '结束训练',
      content: '确定结束本次训练吗？将保存训练记录。',
      confirmText: '结束',
      confirmColor: '#B2FF33',
      success: function(res) {
        if (!res.confirm) return
        if (self._timer) { clearInterval(self._timer); self._timer = null }
        self._saveAndNavigate()
      },
    })
  },

  _saveAndNavigate: function() {
    var type = this.data.trainingType
    var name = this.data.trainingName
    var elapsed = this.data.elapsed
    var swingCount = this.data.swingCount
    var hitRate = this.data.hitRate || calcHitRate(type, elapsed, swingCount)
    var calories = this.data.calories
    var heartRate = this.data.heartRate
    var targetSec = this.data.targetSec
    var training = app.globalData.currentTraining || {}
    var config = training.config || {}
    var goals = config.goals || []
    var swingTarget = (goals[0] && goals[0].targetCount) || 50

    var timePts = Math.min(50, Math.round(elapsed / (targetSec / 50)))
    var swingPts = Math.min(50, Math.round(swingCount / swingTarget * 50))
    var score = Math.max(30, timePts + swingPts)

    var reviews = [
      '今天的' + name + '训练很有收获！命中率达到了' + hitRate + '%，状态不错。建议下次继续保持节奏，加强落点控制。',
      '本次' + name + '完成度良好。击球数' + swingCount + '次，命中率' + hitRate + '%。下次训练建议加强薄弱区域的覆盖练习。',
      '训练数据显示你的击球稳定性在提升！坚持每天训练，进步会更明显。下次试着把命中率提高2-3%。',
    ]
    var aiReview = reviews[Math.floor(Math.random() * reviews.length)]

    var goalResults = [
      {
        icon: (goals[0] && goals[0].icon) || '🎯',
        name: (goals[0] && goals[0].name) || '挥拍目标',
        pct: Math.min(100, swingTarget > 0 ? Math.round(swingCount / swingTarget * 100) : 0),
        achievedText: swingCount + '次',
        targetText: swingTarget + '次',
        completed: swingCount >= swingTarget,
      },
      {
        icon: (goals[1] && goals[1].icon) || '📊',
        name: (goals[1] && goals[1].name) || '命中率目标',
        pct: Math.min(100, this.data.targetHitRate > 0 ? Math.round(hitRate / this.data.targetHitRate * 100) : 0),
        achievedText: hitRate + '%',
        targetText: this.data.targetHitRate + '%',
        completed: hitRate >= this.data.targetHitRate,
      },
      {
        icon: (goals[2] && goals[2].icon) || '⏰',
        name: (goals[2] && goals[2].name) || '训练时长',
        pct: Math.min(100, Math.round(elapsed / targetSec * 100)),
        achievedText: fmt(elapsed),
        targetText: fmt(targetSec),
        completed: elapsed >= targetSec,
      },
    ]

    app.globalData.lastTrainingSession = {
      type: type,
      name: name,
      elapsed: elapsed,
      elapsedText: fmt(elapsed),
      swingCount: swingCount,
      hitRate: hitRate,
      calories: calories,
      maxHeartRate: Math.round(heartRate * 1.12),
      avgHeartRate: Math.round(heartRate * 0.92),
      score: score,
      goalResults: goalResults,
      aiReview: aiReview,
      timestamp: Date.now(),
    }

    var statsData = { durationSec: elapsed }
    if (type === 'forehand') statsData.fh = swingCount
    else if (type === 'backhand') statsData.bh = swingCount
    else if (type === 'serve') statsData.sv = swingCount
    else if (type === 'volley') statsData.vl = swingCount
    else {
      statsData.fh = Math.round(swingCount * 0.4)
      statsData.bh = Math.round(swingCount * 0.3)
      statsData.sv = Math.round(swingCount * 0.2)
      statsData.vl = swingCount - statsData.fh - statsData.bh - statsData.sv
    }

    wx.cloud.callFunction({ name: 'saveSwingStats', data: statsData }).catch(function() {})
    if (typeof app.refreshPlayer === 'function') app.refreshPlayer()

    wx.redirectTo({ url: '/pages/training-summary/training-summary' })
  },
})
