var app = getApp()

var WEAKNESS_PLAN_MAP = {
  '双反':    { title: '双手反手稳定性训练', sub: '强化反手握拍与跟进击球节奏', skillKey: 'backhand' },
  '单反':    { title: '单手反手技术训练',   sub: '提升单反引拍时机与发力链',     skillKey: 'backhand' },
  '反手':    { title: '反手稳定性训练',     sub: '提升反手击球的稳定性和控制力', skillKey: 'backhand' },
  '正手':    { title: '正手稳定性训练',     sub: '提升正手击球节奏与落点控制',   skillKey: 'forehand' },
  '发球':    { title: '发球专项训练',       sub: '提升发球速度与落点精准度',     skillKey: 'serve' },
  '发球无力':{ title: '发球力量训练',       sub: '增强发球爆发力与身体旋转协调', skillKey: 'serve' },
  '截击':    { title: '网前截击训练',       sub: '提升网前判断力与接触点控制',   skillKey: 'volley' },
  '网前':    { title: '网前技术训练',       sub: '加强上网时机判断与截击手感',   skillKey: 'volley' },
  '步伐':    { title: '步伐专项训练',       sub: '提升移位速度与重心控制能力',   skillKey: 'footwork' },
  '步伐慢':  { title: '步伐灵活性训练',     sub: '改善移动效率与脚步灵活性',     skillKey: 'footwork' },
  '移动':    { title: '移动步伐训练',       sub: '强化横向移动与急停启动能力',   skillKey: 'footwork' },
  '下网':    { title: '过网高度控制训练',   sub: '调整击球弧度，减少下网失误',   skillKey: 'forehand' },
  '不会上旋':{ title: '上旋球技术训练',     sub: '掌握正确的拉球动作与旋转发力', skillKey: 'forehand' },
  '高压球':  { title: '高压球专项训练',     sub: '强化头顶球判断与发力节奏',     skillKey: 'highball' },
}

var GOAL_PLAN_MAP = {
  '稳定对拉': { title: '底线稳定性训练',   sub: '强化底线对拉节奏与容错率' },
  '发球提升': { title: '发球专项训练',     sub: '提升发球速度与落点精准度' },
  '上网截击': { title: '上网攻击性训练',   sub: '练习上网时机选择与截击手感' },
  '步伐改善': { title: '步伐灵活性训练',   sub: '提升移步速度与重心稳定性' },
  '提高稳定性':{ title: '全场稳定性训练',  sub: '减少非受迫性失误，建立技术框架' },
}

var LEVEL_META = {
  '1.5': { label: '入门',   duration: 20 },
  '2.0': { label: '初级',   duration: 25 },
  '2.5': { label: '初中级', duration: 30 },
  '3.0': { label: '中级',   duration: 35 },
  '3.5': { label: '中高级', duration: 40 },
  '4.0': { label: '进阶',   duration: 50 },
  '4.5': { label: '高级',   duration: 60 },
}

var WEAKNESS_SKILL_MAP = {
  '双反': 'backhand', '单反': 'backhand', '反手': 'backhand',
  '正手': 'forehand', '下网': 'forehand', '不会上旋': 'forehand',
  '发球': 'serve', '发球无力': 'serve',
  '截击': 'volley', '网前': 'volley',
  '步伐': 'footwork', '步伐慢': 'footwork', '移动': 'footwork',
  '高压球': 'highball',
}

var GOAL_SKILL_MAP = {
  '稳定对拉': ['forehand', 'backhand'],
  '发球提升': ['serve'],
  '上网截击': ['volley'],
  '步伐改善': ['footwork'],
}

Page({
  data: {
    statusBarHeight: 0,
    hasProfile: false,
    planTitle: '基础稳定性训练',
    planSub: '全面提升击球基础，建立稳定技术框架',
    planBadge: '推荐',
    planDifficulty: '中级',
    planDuration: 30,
    planCalories: 240,
    skillItems: [],
    weeklyCount: 0,
    weeklyDays: [],
    swingTotal: 0,
    totalHours: 0,
  },

  onLoad: function() {
    var sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 44 })
    this._loadData()
  },

  onShow: function() {
    this._loadData()
  },

  _loadData: function() {
    var player = app.globalData.player || {}
    var swingStats = player.swingStats || {}
    var cache = app.globalData.activityCache || {}
    var weaknesses = player.weaknesses || []
    var strengths = player.strengths || []
    var goals = player.goals || []
    var ntrpLevel = player.ntrpLevel || ''
    var techScores = player.techScores || {}

    var hasProfile = !!(player.nickname && (weaknesses.length > 0 || ntrpLevel))

    // ── 技能优先级 ──────────────────────────────
    var weakSkillKeys = {}
    var goalSkillKeys = {}
    var strengthSkillKeys = {}

    weaknesses.forEach(function(w) {
      var k = WEAKNESS_SKILL_MAP[w]; if (k) weakSkillKeys[k] = true
    })
    goals.forEach(function(g) {
      var ks = GOAL_SKILL_MAP[g] || []; ks.forEach(function(k) { goalSkillKeys[k] = true })
    })
    strengths.forEach(function(s) {
      var k = WEAKNESS_SKILL_MAP[s]; if (k) strengthSkillKeys[k] = true
    })
    // techScores 低于 50 也标为重点
    var scoreKeys = ['forehand', 'backhand', 'serve', 'footwork', 'volley']
    scoreKeys.forEach(function(k) {
      if (techScores[k] > 0 && techScores[k] < 50) weakSkillKeys[k] = true
    })

    var skillDefs = [
      { key: 'forehand', name: '正手训练',  icon: '🎾', count: swingStats.fhTotal || 0 },
      { key: 'backhand', name: '反手训练',  icon: '🎾', count: swingStats.bhTotal || 0 },
      { key: 'serve',    name: '发球训练',  icon: '🎾', count: swingStats.svTotal || 0 },
      { key: 'volley',   name: '截击训练',  icon: '🎾', count: swingStats.vlTotal || 0 },
      { key: 'highball', name: '高压球训练', icon: '🎾', count: 0 },
      { key: 'footwork', name: '步伐训练',  icon: '🎾', count: 0 },
    ]

    var skillItems = skillDefs.map(function(s) {
      var isPriority = !!weakSkillKeys[s.key]
      var isGoal = !!goalSkillKeys[s.key]
      var isStrength = !!strengthSkillKeys[s.key] && !isPriority
      var sortScore = isPriority ? 3 : (isGoal ? 2 : (isStrength ? 0 : 1))
      return Object.assign({}, s, { isPriority: isPriority, isGoal: isGoal, isStrength: isStrength, _sort: sortScore })
    })
    skillItems.sort(function(a, b) { return b._sort - a._sort })

    // ── 推荐计划 ──────────────────────────────
    var planTitle = '基础稳定性训练'
    var planSub = '全面提升击球基础，建立稳定技术框架'
    var planBadge = '推荐'

    if (player.aiTrainingFocus) {
      planTitle = player.aiTrainingFocus
      planSub = '基于你的球员档案量身定制'
      planBadge = '专属推荐'
    } else if (weaknesses.length > 0) {
      for (var i = 0; i < weaknesses.length; i++) {
        var pm = WEAKNESS_PLAN_MAP[weaknesses[i]]
        if (pm) { planTitle = pm.title; planSub = pm.sub; planBadge = '针对弱点'; break }
      }
    } else if (goals.length > 0) {
      for (var j = 0; j < goals.length; j++) {
        var gm = GOAL_PLAN_MAP[goals[j]]
        if (gm) { planTitle = gm.title; planSub = gm.sub; planBadge = '目标训练'; break }
      }
    }

    // ── 难度 / 时长 ──────────────────────────────
    var levelMeta = LEVEL_META[ntrpLevel] || { label: '中级', duration: 30 }
    var planCalories = Math.round(levelMeta.duration * 8)

    var swingTotal = (swingStats.fhTotal || 0) + (swingStats.bhTotal || 0) +
                     (swingStats.svTotal || 0) + (swingStats.vlTotal || 0)

    this.setData({
      hasProfile: hasProfile,
      skillItems: skillItems,
      planTitle: planTitle,
      planSub: planSub,
      planBadge: planBadge,
      planDifficulty: levelMeta.label,
      planDuration: levelMeta.duration,
      planCalories: planCalories,
      swingTotal: swingTotal,
      weeklyCount: cache.weeklyCount || 0,
      weeklyDays: cache.weeklyDays || [],
      totalHours: cache.totalHoursNum || 0,
    })
  },

  goBack: function() { wx.navigateBack() },

  goSetup: function() {
    wx.navigateTo({ url: '/pages/setup/setup?isEdit=true' })
  },

  startFreeTraining: function() {
    var name = this.data.planTitle || '自由训练'
    wx.navigateTo({ url: '/pages/training-prep/training-prep?type=free&name=' + encodeURIComponent(name) })
  },

  startSkillTraining: function(e) {
    var key = e.currentTarget.dataset.key
    var names = {
      forehand: '正手稳定性训练', backhand: '反手稳定性训练',
      serve: '发球力量训练', volley: '截击训练',
      highball: '高压球训练', footwork: '步伐训练',
    }
    var name = names[key] || '技术训练'
    wx.navigateTo({ url: '/pages/training-prep/training-prep?type=' + key + '&name=' + encodeURIComponent(name) })
  },

  goSquare: function() {
    wx.navigateTo({ url: '/pages/square/square' })
  },
  goFindMatches: function() {
    wx.navigateTo({ url: '/pages/square/square?tab=discover' })
  },
  goMyMatches: function() {
    wx.navigateTo({ url: '/pages/square/square?tab=mine' })
  },
})
