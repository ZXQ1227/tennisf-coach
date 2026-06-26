const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async function(event) {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  try {
    await db.collection('players').doc(OPENID).update({
      data: { gear: event.gear, updatedAt: db.serverDate() }
    })
    return { success: true }
  } catch(e) {
    return { error: e.message }
  }
}
