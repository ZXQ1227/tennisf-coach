const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })
const db = cloud.database()

exports.main = async () => {
  const { OPENID, UNIONID } = cloud.getWXContext()
  if (!OPENID) return { error: 'unauthorized' }

  const token = crypto.randomBytes(32).toString('hex')
  const exp = Date.now() + 5 * 60 * 1000  // 5 分钟有效期

  await db.collection('ai_tokens').add({
    data: {
      token,
      openId: OPENID,
      unionId: UNIONID || null,  // 开放平台绑定后才有值
      exp,
      used: false,
      createdAt: Date.now()
    }
  })

  return { token, exp }
}
