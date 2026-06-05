const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async function(event) {
  const db = cloud.database()
  const _  = db.command
  const nickname       = event.nickname || ''
  const viewerNickname = event.viewerNickname || ''

  if (!nickname) return { error: 'nickname required', player: null, stats: null }

  try {
    // 1. 查球员档案（players 集合 _id === openid）
    const playerRes = await db.collection('players').where({ nickname }).limit(1).get()
    const player = playerRes.data[0] || null

    // 2. 查该用户参与的球局（近 90 天）
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const postsRes = await db.collection('posts')
      .where({
        joiners: _.elemMatch(_.eq(nickname)),
        createdAt: _.gte(since)
      })
      .limit(100)
      .get()
    const posts = postsRes.data || []

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

    // 6. 与浏览者共同球局数
    let togetherCount = 0
    if (viewerNickname) {
      togetherCount = posts.filter(function(p) {
        return p.joiners && p.joiners.indexOf(viewerNickname) !== -1
      }).length
    }

    // 7. 独特球友数（成就计算用）
    const partners = {}
    posts.forEach(function(p) {
      ;(p.joiners || []).forEach(function(j) { if (j !== nickname) partners[j] = true })
    })

    // 8. 发起场次（通过 openid 查，cloud function 有 admin 权限）
    let createdCount = 0
    if (player && player._id) {
      try {
        const cr = await db.collection('posts')
          .where({ _openid: player._id, createdAt: _.gte(since) })
          .count()
        createdCount = cr.total || 0
      } catch(e) {}
    }

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
