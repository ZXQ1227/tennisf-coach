const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })
const db = cloud.database()

exports.main = async (event) => {
  const { token } = event
  if (!token) return { error: 'token required' }

  try {
    const res = await db.collection('ai_tokens')
      .where({ token, used: false })
      .limit(1)
      .get()

    const doc = res.data && res.data[0]
    if (!doc) return { error: 'invalid token' }
    if (Date.now() > doc.exp) return { error: 'token expired' }

    await db.collection('ai_tokens').doc(doc._id).update({ data: { used: true } })

    let player = null
    try {
      const pr = await db.collection('players').doc(doc.openId).get()
      player = pr.data
    } catch (e) {}

    return { openId: doc.openId, player }
  } catch (e) {
    return { error: 'server error' }
  }
}
