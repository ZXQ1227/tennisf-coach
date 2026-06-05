const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const _ = db.command

  try {
    await db.collection('posts').doc(event.postId).update({
      data: {
        joined: _.inc(-1),
        joiners: _.pull(event.nickname),
        joinerOpenids: _.pull(OPENID)
      }
    })
    return { success: true }
  } catch (e) {
    return { error: e.message || '退出失败' }
  }
}
