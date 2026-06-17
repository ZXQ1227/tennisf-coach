var app = getApp()

// 兜底题库（无档案时使用）
var FALLBACK_QUESTIONS = [
  '为什么我总是下网？',
  '正手击球点在哪里？',
  '怎么练上旋球？',
  '发球总是出界怎么办？',
  '小碎步怎么练？',
  '双反和单反哪个更适合？',
  '如何提高击球一致性？',
  '比赛紧张怎么调整心态？'
]

// 各维度的问题映射
var WEAKNESS_Q = {
  '双反':   ['双反引拍时机该怎么掌握？', '双反稳定性怎么系统提升？'],
  '下网':   ['打球总是下网，怎么调整击球弧线？', '如何提高过网成功率？'],
  '出界':   ['经常出界是什么原因导致的？', '怎么控制落点不出界？'],
  '步伐慢': ['如何提升步伐反应速度？', '分腿垫步和小碎步怎么结合练习？'],
  '发球无力': ['发球怎么增加力量和旋转？', '发球的击球点高度应该怎么把控？'],
  '不会上旋': ['上旋球的刷拍发力是什么感觉？', '如何从平击过渡到稳定上旋？'],
  '心理紧张': ['比赛关键分紧张怎么快速平复？', '如何建立上场前的稳定心理状态？']
}

var GOAL_Q = {
  '稳定对拉':   ['底线多拍对拉怎么提高成功率？', '对拉时跑位和预判怎么练？'],
  '提升比赛胜率': ['业余比赛最有效的战术套路是什么？', '拿分时机和战术变化怎么掌握？'],
  '发球提升':   ['第一发怎么在力量和进球率之间平衡？', '二发如何打出旋转保证进球？'],
  '学会上旋':   ['从零开始学上旋球该怎么练？', '上旋和平击在发力上有什么本质区别？'],
  '步伐敏捷':   ['网球步伐训练有哪些有效方法？', '如何提升预判和第一步启动速度？'],
  '进阶3.5':    ['从3.0突破到3.5最核心该练什么？', '3.5阶段对技术全面性有哪些要求？']
}

var LEVEL_Q = {
  '1.5': '初学者怎么建立正确的击球感和节奏？',
  '2.0': '基础阶段怎么让球稳定地过网？',
  '2.5': '已经能稳定对拉了，下一步该重点练什么？',
  '3.0': '3.0水平怎么系统突破到3.5？',
  '3.5': '3.5水平如何提升实战得分能力？',
  '4.0': '竞技水平如何进一步打磨技术细节？',
  '4.5': '高水平如何保持状态并持续进步？'
}

var GENERAL_Q = [
  '如何提高击球的一致性和稳定性？',
  '怎么在比赛中保持专注和自信？',
  '网球体能专项训练有什么推荐？',
  '拍弦磅数和拍型怎么选择适合自己的？'
]

function buildPersonalizedQuestions(player) {
  if (!player || !player.aiPersonality) return FALLBACK_QUESTIONS

  var pool = []
  var seen = {}

  function add(q) {
    if (!seen[q]) { seen[q] = true; pool.push(q) }
  }

  // 1. 当前训练重点（最高优先级）
  if (player.aiTrainingFocus) {
    add('怎么有针对性地练习「' + player.aiTrainingFocus + '」？')
  }

  // 2. 短板问题（每个短板取第一条）
  var weaknesses = player.weaknesses || []
  weaknesses.forEach(function(w) {
    var qs = WEAKNESS_Q[w]
    if (qs) add(qs[0])
  })

  // 3. 目标问题（每个目标取第一条）
  var goals = player.goals || []
  goals.forEach(function(g) {
    var qs = GOAL_Q[g]
    if (qs) add(qs[0])
  })

  // 4. 水平问题
  if (LEVEL_Q[player.ntrpLevel]) add(LEVEL_Q[player.ntrpLevel])

  // 5. 短板第二条（补充深度）
  weaknesses.forEach(function(w) {
    var qs = WEAKNESS_Q[w]
    if (qs && qs[1]) add(qs[1])
  })

  // 6. 目标第二条
  goals.forEach(function(g) {
    var qs = GOAL_Q[g]
    if (qs && qs[1]) add(qs[1])
  })

  // 7. 通用兜底
  GENERAL_Q.forEach(function(q) { add(q) })

  return pool.slice(0, 8)
}

Page({
  data: {
    player: null,
    hasPortrait: false,
    recentChats: [],
    todayFocus: '',
    planDays: [],
    qOffset: 0,
    allQuestions: FALLBACK_QUESTIONS,
    visibleQuestions: FALLBACK_QUESTIONS.slice(0, 4)
  },

  onShow: function() {
    var player = app.globalData.player
    var hasPortrait = !!(player && player.aiPersonality)
    var allQuestions = buildPersonalizedQuestions(player)
    this.setData({
      player: player,
      hasPortrait: hasPortrait,
      todayFocus: (player && player.aiTrainingFocus) || '',
      planDays: this._parsePlan((player && player.aiWeeklyPlan) || ''),
      allQuestions: allQuestions,
      qOffset: 0,
      visibleQuestions: allQuestions.slice(0, 4)
    })
    this._loadRecentChats()
  },

  _parsePlan: function(plan) {
    if (!plan) return []
    return plan.split('/').map(function(item) {
      var s = item.trim()
      var sep = s.indexOf('：')
      if (sep === -1) sep = s.indexOf(':')
      if (sep === -1) return null
      return { day: s.slice(0, sep).trim(), task: s.slice(sep + 1).trim() }
    }).filter(function(d) { return d && d.day && d.task })
  },

  _loadRecentChats: function() {
    try {
      var chats = wx.getStorageSync('recentChats') || []
      this.setData({ recentChats: chats.slice(0, 2) })
    } catch(e) {}
  },

  refreshQuestions: function() {
    var all = this.data.allQuestions
    var next = (this.data.qOffset + 2) % all.length
    var qs = []
    for (var i = 0; i < 4; i++) qs.push(all[(next + i) % all.length])
    this.setData({ qOffset: next, visibleQuestions: qs })
  },

  goChat: function() {
    wx.navigateTo({ url: '/pages/coach-chat/coach-chat' })
  },

  goChatWithQuestion: function(e) {
    var q = e.currentTarget.dataset.q
    wx.navigateTo({ url: '/pages/coach-chat/coach-chat?q=' + encodeURIComponent(q) })
  },

  goChatReview: function(e) {
    var q = e.currentTarget.dataset.q
    wx.navigateTo({ url: '/pages/coach-chat/coach-chat?review=1&q=' + encodeURIComponent(q) })
  },

  goPhotoAnalysis: function() {
    wx.showToast({ title: '图片分析即将上线 🎾', icon: 'none', duration: 2000 })
  },

  goSetup: function() {
    wx.navigateTo({ url: '/pages/setup/setup' })
  },

  noop: function() {}
})
