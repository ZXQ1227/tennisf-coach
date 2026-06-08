const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const { postId } = event

  if (!postId) return { error: '缺少 postId' }
  if (!OPENID) return { error: '无法获取用户身份' }

  try {
    const { data: post } = await db.collection('posts').doc(postId).get()
    if (!post) return { error: '球局不存在' }
    if (post._openid !== OPENID) return { error: '无权操作' }

    await db.collection('posts').doc(postId).update({
      data: { cancelled: true }
    })

    return { success: true }
  } catch (e) {
    return { error: e.message || '服务异常' }
  }
}
