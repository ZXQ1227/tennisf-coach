const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { created: [], joined: [] }

  const db = cloud.database()
  const _ = db.command

  let createdData = []
  let joinedData = []

  // 查我创建的球局
  try {
    const res = await db.collection('posts')
      .where({ _openid: OPENID })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()
    createdData = res.data || []
  } catch (e) {}

  // 查我参与的球局（独立查询，互不影响）
  try {
    const createdIds = new Set(createdData.map(p => p._id))
    const res = await db.collection('posts')
      .where({ joinerOpenids: _.elemMatch(_.eq(OPENID)) })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()
    joinedData = (res.data || []).filter(p => !createdIds.has(p._id))
  } catch (e) {}

  return { created: createdData, joined: joinedData }
}
