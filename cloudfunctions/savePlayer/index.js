const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async function(event) {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const data = {
    nickname: event.nickname || '',
    avatarUrl: event.avatarUrl || '',
    level: event.level || 'intermediate',
    homeBase: event.homeBase || '',
    preferMatch: event.preferMatch || 'doubles',
    preferCourt: event.preferCourt || 'hard',
    playStyle: event.playStyle || 'steady',
    bio: event.bio || '',
    ntrpLevel: event.ntrpLevel || '',
    rallyCount: event.rallyCount || '',
    strengths: event.strengths || [],
    weaknesses: event.weaknesses || [],
    goals: event.goals || [],
    fitnessLevel: event.fitnessLevel || '',
    injuries: event.injuries || [],
    updatedAt: db.serverDate()
  }
  try {
    await db.collection('players').doc(OPENID).set({ data: data })
    return { success: true }
  } catch(e) {
    return { error: e.message }
  }
}
