const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

exports.main = async function(event) {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()

  // Build update payload from only the fields that were provided
  const data = { updatedAt: db.serverDate() }
  const fields = [
    'nickname', 'avatarUrl', 'level', 'homeBase', 'preferMatch', 'preferCourt',
    'playStyle', 'bio', 'ntrpLevel', 'rallyCount', 'serveAbility',
    'strengths', 'weaknesses', 'goals', 'fitnessLevel', 'injuries'
  ]
  fields.forEach(function(k) {
    if (event[k] !== undefined) data[k] = event[k]
  })

  try {
    const existing = await db.collection('players').doc(OPENID).get()
    const isNew = !(existing.data && existing.data.ntrpLevel)
    await db.collection('players').doc(OPENID).update({ data: data })
    return { success: true, isNew: isNew }
  } catch(e) {
    // Doc doesn't exist — create with defaults for all fields
    const defaults = {
      level: 'intermediate', homeBase: '', preferMatch: 'doubles',
      preferCourt: 'hard', playStyle: 'steady', bio: '',
      ntrpLevel: '', rallyCount: '', serveAbility: '',
      strengths: [], weaknesses: [], goals: [], fitnessLevel: '', injuries: []
    }
    await db.collection('players').doc(OPENID).set({ data: Object.assign(defaults, data) })
    return { success: true, isNew: true }
  }
}
