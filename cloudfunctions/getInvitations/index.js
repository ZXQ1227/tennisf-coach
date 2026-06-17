const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()

  const res = await db.collection('invitations')
    .where({ toOpenId: OPENID, status: 'pending' })
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get()

  return { invitations: res.data }
}
