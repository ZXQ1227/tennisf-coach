const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async function(event) {
  const db = cloud.database()
  const { postId, liveScore, author, content } = event

  try {
    // 更新比分（管理员权限，不受集合写限制）
    await db.collection('posts').doc(postId).update({
      data: { liveScore: liveScore }
    })
    // 同步写入比分动态（云端写入，同样不受客户端权限限制）
    if (content) {
      await db.collection('moments').add({
        data: {
          postId: postId,
          type: 'score',
          author: author || '球友',
          content: content,
          imageUrls: [],
          createdAt: Date.now()
        }
      })
    }
    return { success: true }
  } catch(e) {
    return { error: e.message || '更新失败' }
  }
}
