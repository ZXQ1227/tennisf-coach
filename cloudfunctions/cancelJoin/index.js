const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const _ = db.command

  try {
    // 先查询帖子，验证用户确实已加入
    const postRes = await db.collection('posts').doc(event.postId).get()
    const post = postRes.data

    if (!post) {
      return { error: '球局不存在' }
    }

    // 验证该 OPENID 是否在 joinerOpenids 中
    const isInOpenidList = (post.joinerOpenids || []).indexOf(OPENID) !== -1
    // 兜底：验证 nickname 是否在 joiners 中
    const isInNameList = (post.joiners || []).indexOf(event.nickname) !== -1

    if (!isInOpenidList && !isInNameList) {
      return { error: '你未加入该球局，无法退出' }
    }

    // 释放该用户的坑位（CONFIRMED → OPEN）
    var updateData = {
      joined: _.inc(-1),
      joiners: _.pull(event.nickname),
      joinerOpenids: _.pull(OPENID)
    }

    var slots = post.slots
    if (slots) {
      var updatedSlots = slots.map(function(s) {
        if (s.status === 'CONFIRMED' && s.nickname === event.nickname) {
          return { slotIndex: s.slotIndex, status: 'OPEN', nickname: null, avatarColor: null }
        }
        return s
      })
      updateData.slots = updatedSlots
    }

    await db.collection('posts').doc(event.postId).update({
      data: updateData
    })
    return { success: true }
  } catch (e) {
    return { error: e.message || '退出失败' }
  }
}
