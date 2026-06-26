const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async function(event) {
  const { OPENID: viewerOpenid } = cloud.getWXContext()
  const db = cloud.database()
  const _  = db.command
  const nickname = event.nickname || ''

  if (!nickname) return { error: 'nickname required', player: null, stats: null }

  try {
    // 1. 查球员档案（players 集合 _id === openid）
    const playerRes = await db.collection('players').where({ nickname }).limit(1).get()
    const player = playerRes.data[0] || null
    const playerOpenid = player ? player._id : null

    // 2. 并发查：参与的球局（joinerOpenids）+ 发起的球局（_openid），合并去重做统计
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    let joinedPosts = []
    let createdPosts = []
    if (playerOpenid) {
      const [joinedRes, createdRes] = await Promise.all([
        db.collection('posts')
          .where({ joinerOpenids: _.elemMatch(_.eq(playerOpenid)), createdAt: _.gte(since) })
          .limit(100)
          .get(),
        db.collection('posts')
          .where({ _openid: playerOpenid, createdAt: _.gte(since) })
          .limit(100)
          .get()
      ])
      joinedPosts = joinedRes.data || []
      createdPosts = createdRes.data || []
    }
    // 合并去重（发起的局不会在 joinerOpenids 里，直接 concat 再 Set 去重）
    const joinedIds = new Set(joinedPosts.map(function(p) { return p._id }))
    const posts = joinedPosts.concat(createdPosts.filter(function(p) { return !joinedIds.has(p._id) }))
    const createdCount = createdPosts.length

    // 3. 累计时长
    let totalMinutes = 0
    posts.forEach(function(p) {
      var mins = (p.manuallyEnded && p.endedAt && p.gameTimestamp)
        ? Math.max(0, Math.floor((p.endedAt - p.gameTimestamp) / 60000))
        : (p.estimatedDuration || 120)
      totalMinutes += mins
    })
    const totalHours = Math.floor(totalMinutes / 60)

    // 4. 本月场次
    const now = new Date()
    const pad = function(n) { return String(n).padStart(2, '0') }
    const monthStr = now.getFullYear() + '-' + pad(now.getMonth() + 1)
    const monthCount = posts.filter(function(p) { return p.date && p.date.startsWith(monthStr) }).length

    // 5. 常驻球场 Top 2
    const courtCounts = {}
    posts.forEach(function(p) {
      if (p.location) courtCounts[p.location] = (courtCounts[p.location] || 0) + 1
    })
    const frequentCourts = Object.keys(courtCounts)
      .sort(function(a, b) { return courtCounts[b] - courtCounts[a] })
      .slice(0, 2)

    // 6. 与浏览者共同球局数（用云端 OPENID，不依赖前端传参）
    let togetherCount = 0
    if (viewerOpenid && viewerOpenid !== playerOpenid) {
      togetherCount = posts.filter(function(p) {
        // 浏览者是参与者，或浏览者就是该局创建者
        return (p.joinerOpenids && p.joinerOpenids.indexOf(viewerOpenid) !== -1)
          || p._openid === viewerOpenid
      }).length
    }

    // 7. 独特球友数（成就计算用）—— openid 去重
    const partners = {}
    posts.forEach(function(p) {
      // 参与者
      ;(p.joinerOpenids || []).forEach(function(id) { if (id !== playerOpenid) partners[id] = true })
      // 创建者（当被查球员是参与者时，创建者也算球友）
      if (p._openid && p._openid !== playerOpenid) partners[p._openid] = true
    })

    return {
      player: player,
      stats: {
        total: posts.length,
        created: createdCount,
        monthly: monthCount,
        uniquePartners: Object.keys(partners).length,
        totalHours: totalHours,
        monthCount: monthCount,
        frequentCourts: frequentCourts,
        togetherCount: togetherCount
      }
    }
  } catch(e) {
    return { error: e.message, player: null, stats: null }
  }
}
