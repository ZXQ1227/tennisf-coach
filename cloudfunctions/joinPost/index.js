const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

var COLORS = ['#2BB673', '#4ECDC4', '#F7B731', '#A29BFE', '#FF6B6B']
function avatarColor(name) {
  if (!name) return '#2BB673'
  return COLORS[name.charCodeAt(name.length - 1) % COLORS.length]
}

exports.main = async function(event) {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const { postId, nickname } = event

  try {
    const postRes = await db.collection('posts').doc(postId).get()
    const post = postRes.data
    const slots = post.slots || null

    let updateData = {
      joined: db.command.inc(1),
      joiners: db.command.push([nickname]),
      joinerOpenids: db.command.push([OPENID])
    }

    if (slots) {
      // 新坑位系统：优先找为该用户预留的 RESERVED 坑
      let targetIdx = -1
      for (var i = 0; i < slots.length; i++) {
        if (slots[i].status === 'RESERVED' && slots[i].nickname === nickname) {
          targetIdx = i; break
        }
      }
      // 没有预留坑则找第一个 OPEN 坑
      if (targetIdx === -1) {
        for (var j = 0; j < slots.length; j++) {
          if (slots[j].status === 'OPEN') { targetIdx = j; break }
        }
      }
      if (targetIdx === -1) return { error: '人已满了' }

      const color = avatarColor(nickname)
      const updatedSlots = slots.map(function(s, idx) {
        if (idx === targetIdx) {
          return { slotIndex: s.slotIndex, status: 'CONFIRMED', nickname: nickname, avatarColor: color }
        }
        return s
      })
      updateData.slots = updatedSlots
    }

    await db.collection('posts').doc(postId).update({ data: updateData })
    return { success: true }
  } catch(e) {
    return { error: e.message || '加入失败' }
  }
}
