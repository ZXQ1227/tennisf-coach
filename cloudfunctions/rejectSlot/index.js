const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async function(event) {
  const db = cloud.database()
  const { postId, slotIndex, autoRelease } = event

  try {
    const postRes = await db.collection('posts').doc(postId).get()
    const slots = postRes.data.slots || []

    const updatedSlots = slots.map(function(s) {
      const shouldRelease = autoRelease
        ? s.status === 'RESERVED'
        : (s.slotIndex === slotIndex && s.status === 'RESERVED')
      if (shouldRelease) {
        return { slotIndex: s.slotIndex, status: 'OPEN', nickname: null, avatarColor: null }
      }
      return s
    })

    await db.collection('posts').doc(postId).update({ data: { slots: updatedSlots } })
    return { success: true }
  } catch(e) {
    return { error: e.message }
  }
}
