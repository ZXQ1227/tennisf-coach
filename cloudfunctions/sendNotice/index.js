const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

const TEMPLATE_ID = 'l297m0LohqoohEogMcxM7lIh8m6pw4_a_IbN5kxvxyU'

exports.main = async () => {
  const db = cloud.database()
  const now = Date.now()
  const window25 = now + 20 * 60 * 1000
  const window35 = now + 40 * 60 * 1000

  const { data: posts } = await db.collection('posts')
    .where({
      gameTimestamp: db.command.gte(window25).and(db.command.lte(window35)),
      notified: db.command.neq(true)
    })
    .get()

  for (const post of posts) {
    const openids = post.joinerOpenids || []
    for (const openid of openids) {
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: openid,
          templateId: TEMPLATE_ID,
          page: `pages/detail/detail?id=${post._id}`,
          data: {
            thing9: { value: post.location.slice(0, 20) },
            date4: { value: `${post.date} ${post.time}` },
            name7: { value: post.nickname.slice(0, 10) },
            thing2: { value: '30分钟后开始，记得带球拍' },
            number16: { value: post.joined }
          }
        })
      } catch(e) {
        console.error('send failed', openid, e)
      }
    }

    await db.collection('posts').doc(post._id).update({
      data: { notified: true }
    })
  }

  return { handled: posts.length }
}
