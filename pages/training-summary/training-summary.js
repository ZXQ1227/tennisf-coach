var app = getApp()

var SCORE_LABELS = [
  { min: 90, title: '完美表现！' },
  { min: 80, title: '太棒了！' },
  { min: 70, title: '很好！继续加油' },
  { min: 60, title: '不错的训练' },
  { min: 0, title: '完成训练！' },
]

function getScoreTitle(score) {
  for (var i = 0; i < SCORE_LABELS.length; i++) {
    if (score >= SCORE_LABELS[i].min) return SCORE_LABELS[i].title
  }
  return '完成训练！'
}

Page({
  data: {
    trainingName: '训练',
    score: 0,
    scoreTitle: '完成训练！',
    improvement: 0,
    elapsedText: '00:00',
    swingCount: 0,
    hitRate: 0,
    calories: 0,
    avgHeartRate: 0,
    maxHeartRate: 0,
    aiReview: '',
    goalResults: [],
  },

  onLoad: function() {
    var session = app.globalData.lastTrainingSession || {}
    var score = session.score || 0
    var improvement = Math.round(Math.random() * 18 + 3)

    this.setData({
      trainingName: session.name || '训练',
      score: score,
      scoreTitle: getScoreTitle(score),
      improvement: improvement,
      elapsedText: session.elapsedText || '00:00',
      swingCount: session.swingCount || 0,
      hitRate: session.hitRate || 0,
      calories: session.calories || 0,
      avgHeartRate: session.avgHeartRate || 0,
      maxHeartRate: session.maxHeartRate || 0,
      aiReview: session.aiReview || '训练完成！继续保持这个好的训练习惯。',
      goalResults: session.goalResults || [],
    })

    var self = this
    setTimeout(function() { self._drawHRChart(session) }, 300)
  },

  _drawHRChart: function(session) {
    var query = wx.createSelectorQuery()
    query.select('#hrCanvas').fields({ node: true, size: true }).exec(function(res) {
      // fallback to canvas-id if node API not available
    })

    var ctx = wx.createCanvasContext('hrCanvas', this)
    var w = 700
    var h = 200
    var avgHR = session.avgHeartRate || 130
    var maxHR = session.maxHeartRate || 160
    var elapsed = session.elapsed || 1800
    var pts = 24
    var step = w / (pts - 1)

    // Generate simulated HR curve
    var hrPoints = []
    for (var i = 0; i < pts; i++) {
      var t = i / (pts - 1)
      var warmupPct = Math.min(1, t * 3)
      var base = avgHR * 0.75 + avgHR * 0.25 * warmupPct
      var variation = Math.sin(t * 6.28 * 2) * 10
      var noise = (Math.random() - 0.5) * 8
      hrPoints.push(Math.min(maxHR, Math.max(avgHR * 0.7, base + variation + noise)))
    }

    var minHR = avgHR * 0.68
    var hrRange = maxHR - minHR
    var padT = 16, padB = 16

    // Draw gradient fill
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (var j = 0; j < pts; j++) {
      var x = j * step
      var y = padT + (1 - (hrPoints[j] - minHR) / hrRange) * (h - padT - padB)
      if (j === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.lineTo((pts - 1) * step, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.setFillStyle('rgba(178,255,51,0.08)')
    ctx.fill()

    // Draw line
    ctx.beginPath()
    ctx.setStrokeStyle('#B2FF33')
    ctx.setLineWidth(3)
    for (var k = 0; k < pts; k++) {
      var lx = k * step
      var ly = padT + (1 - (hrPoints[k] - minHR) / hrRange) * (h - padT - padB)
      if (k === 0) ctx.moveTo(lx, ly)
      else ctx.lineTo(lx, ly)
    }
    ctx.stroke()

    ctx.draw()
  },

  goCoachChat: function() {
    var session = app.globalData.lastTrainingSession || {}
    var player = app.globalData.player || {}
    var H5_BASE = 'https://zxq1227.github.io/tennisf-coach/coach.html'
    var fields = {
      nickname: player.nickname,
      level: player.level,
      ntrpLevel: player.ntrpLevel,
      playStyle: player.playStyle,
      strengths: player.strengths,
      weaknesses: player.weaknesses,
      goals: player.goals,
      fitnessLevel: player.fitnessLevel,
      injuries: player.injuries
    }
    var q = '我刚完成了一次' + (session.name || '训练') + '，训练时长' + (session.elapsedText || '') +
            '，击球' + (session.swingCount || 0) + '次，命中率' + (session.hitRate || 0) + '%，得分' +
            (session.score || 0) + '分。请给我一个训练复盘和下次的训练建议。'
    var url = H5_BASE + '?p=' + encodeURIComponent(JSON.stringify(fields)) + '&q=' + encodeURIComponent(q)
    wx.showModal({
      title: '教练助手',
      content: '点击"复制链接"后，在手机浏览器粘贴即可访问教练助手',
      cancelText: '取消',
      confirmText: '复制链接',
      success: function(res) {
        if (!res.confirm) return
        wx.setClipboardData({
          data: url,
          success: function() {
            wx.showToast({ title: '已复制', icon: 'success' })
          }
        })
      }
    })
  },

  goRecords: function() {
    wx.navigateTo({ url: '/pages/training-records/training-records' })
  },

  trainAgain: function() {
    wx.navigateBack({ delta: 2 })
  },
})
