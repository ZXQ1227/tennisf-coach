const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()

  // 确保集合存在
  try { await db.createCollection('invitations') } catch (e) {}

  const { toNickname, fromNickname, postId } = event
  if (!toNickname || !fromNickname) return { error: '参数缺失' }
  if (toNickname === fromNickname) return { error: '不能邀请自己' }

  const playerRes = await db.collection('players')
    .where({ nickname: toNickname })
    .limit(1)
    .get()

  const toPlayer = playerRes.data[0]
  if (!toPlayer) return { error: '用户不存在' }

  const toOpenId = toPlayer._openid || toPlayer._id

  // 重复检查：同一对用户间的 pending 邀请只保留一个
  // 若已有通用邀请（无 postId），新的带 postId 邀请会覆盖旧的
  var dupQuery = { fromOpenId: OPENID, toOpenId: toOpenId, status: 'pending' }
  var dupRes = await db.collection('invitations').where(dupQuery).count()

  if (dupRes.total > 0) {
    // 如果新邀请带有 postId，升级旧邀请（补充 postId）
    if (postId) {
      var oldRes = await db.collection('invitations').where(dupQuery).limit(1).get()
      if (oldRes.data.length > 0) {
        await db.collection('invitations').doc(oldRes.data[0]._id).update({
          data: { postId: postId }
        })
      }
    }
    return { ok: true, duplicate: true }
  }

  await db.collection('invitations').add({
    data: {
      fromNickname: fromNickname,
      fromOpenId: OPENID,
      toNickname: toNickname,
      toOpenId: toOpenId,
      postId: postId || null,
      status: 'pending',
      createdAt: Date.now()
    }
  })

  return { ok: true }
}
