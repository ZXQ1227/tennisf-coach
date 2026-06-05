const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async function(event) {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  try {
    // 公开主页：按昵称查询另一个球员的档案
    if (event && event.nickname) {
      const res = await db.collection('players').where({ nickname: event.nickname }).limit(1).get()
      return { player: res.data[0] || null }
    }
    // 默认：返回当前用户自己的档案
    const res = await db.collection('players').doc(OPENID).get()
    return { player: res.data }
  } catch(e) {
    return { player: null }
  }
}
