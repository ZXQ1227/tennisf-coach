const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()

  const { toNickname, fromNickname } = event
  if (!toNickname || !fromNickname) return { error: '参数缺失' }
  if (toNickname === fromNickname) return { error: '不能邀请自己' }

  const playerRes = await db.collection('players')
    .where({ nickname: toNickname })
    .limit(1)
    .get()

  const toPlayer = playerRes.data[0]
  if (!toPlayer) return { error: '用户不存在' }

  const toOpenId = toPlayer._openid || toPlayer._id

  const dupRes = await db.collection('invitations')
    .where({ fromOpenId: OPENID, toOpenId: toOpenId, status: 'pending' })
    .count()

  if (dupRes.total > 0) return { ok: true, duplicate: true }

  await db.collection('invitations').add({
    data: {
      fromNickname: fromNickname,
      fromOpenId: OPENID,
      toNickname: toNickname,
      toOpenId: toOpenId,
      status: 'pending',
      createdAt: Date.now()
    }
  })

  return { ok: true }
}
