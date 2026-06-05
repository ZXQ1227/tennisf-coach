const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const { postId } = event

  const { data: post } = await db.collection('posts').doc(postId).get()
  if (post._openid !== OPENID) return { error: '无权操作' }

  await db.collection('posts').doc(postId).update({
    data: { cancelled: true }
  })

  return { success: true }
}
