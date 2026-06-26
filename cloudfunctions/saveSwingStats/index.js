const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async function(event) {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const _ = db.command

  const fh = parseInt(event.fh) || 0
  const bh = parseInt(event.bh) || 0
  const sv = parseInt(event.sv) || 0
  const vl = parseInt(event.vl) || 0

  try {
    let doc
    try {
      const res = await db.collection('players').doc(OPENID).field({ swingStats: true, swingHistory: true }).get()
      doc = res.data
    } catch(e) {
      doc = {}
    }

    const prev = (doc && doc.swingStats) || {}
    const newStats = {
      fhTotal: (prev.fhTotal || 0) + fh,
      bhTotal: (prev.bhTotal || 0) + bh,
      svTotal: (prev.svTotal || 0) + sv,
      vlTotal: (prev.vlTotal || 0) + vl,
      sessions: (prev.sessions || 0) + 1,
      lastSession: {
        fh: fh,
        bh: bh,
        sv: sv,
        vl: vl,
        date: db.serverDate()
      }
    }

    // 追加本次记录，保留最近 90 条
    const prevHistory = ((doc && doc.swingHistory) || []).slice(-89)
    const newHistory = prevHistory.concat([{ ts: Date.now(), fh, bh, sv, vl }])

    await db.collection('players').doc(OPENID).update({
      data: { swingStats: newStats, swingHistory: newHistory, updatedAt: db.serverDate() }
    })
    return { success: true, stats: newStats }
  } catch(e) {
    return { error: e.message }
  }
}
