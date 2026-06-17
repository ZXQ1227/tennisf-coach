const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()

  const { inviteId, action } = event
  if (!inviteId || !action) return { error: '参数缺失' }

  const docRes = await db.collection('invitations').doc(inviteId).get()
  if (!docRes.data || docRes.data.toOpenId !== OPENID) return { error: '无权操作' }

  const newStatus = action === 'accept' ? 'accepted' : 'ignored'
  await db.collection('invitations').doc(inviteId).update({
    data: { status: newStatus }
  })

  return { ok: true, fromNickname: docRes.data.fromNickname }
}
