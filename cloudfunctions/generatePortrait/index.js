const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })
const https = require('https')

const API_KEY = process.env.DEEPSEEK_API_KEY

const NTRP_MAP = {
  '1.5': '1.5 - 刚接触网球',
  '2.0': '2.0 - 基础击打阶段',
  '2.5': '2.5 - 有一定基础，能对打',
  '3.0': '3.0 - 技术稳定，开始打比赛',
  '3.5': '3.5 - 有一定实战经验',
  '4.0': '4.0 - 竞技级',
  '4.5': '4.5+ - 高竞技级'
}

function callDeepSeek(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      temperature: 0.5,
      max_tokens: 350
    })
    const options = {
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch(e) { reject(e) }
      })
    })
    req.setTimeout(75000, () => { req.destroy(new Error('DeepSeek request timed out')) })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()

  const { nickname, avatarUrl, ntrpLevel, rallyCount, strengths, weaknesses, goals, fitnessLevel, injuries } = event

  const prompt = `你是一位专业网球AI教练。

根据以下球员信息，生成一份专业的AI球员画像。

[球员信息]
昵称: ${nickname || '球员'}
水平: ${NTRP_MAP[ntrpLevel] || ntrpLevel || '未知'}
多拍能力: ${rallyCount || '未知'}
最稳定技术: ${(strengths || []).join('、') || '未填写'}
主要问题: ${(weaknesses || []).join('、') || '未填写'}
训练目标: ${(goals || []).join('、') || '未填写'}
体能状态: ${fitnessLevel || '未知'}
伤病情况: ${(injuries || []).length > 0 ? injuries.join('、') : '无'}

请严格按照以下JSON格式输出，不要添加任何其他文字，不要用Markdown代码块：
{"personality":"稳定型底线建立者","stage":"稳定性建立期","strengths":["正手意识好","节奏稳定"],"weakness":"击球点偏晚","trainingFocus":"提前引拍 + 小碎步启动","weeklyPlan":"周二：正手稳定性 / 周四：步伐启动 / 周六：对拉训练","techScores":{"forehand":65,"backhand":45,"serve":40,"footwork":55,"volley":20},"coachNote":"你的正手有潜力，但需要先解决引拍时机问题。坚持小碎步训练会让你整体提升明显。"}`

  try {
    const result = await callDeepSeek([
      { role: 'system', content: '你是专业网球教练，只输出JSON格式结果，不加其他文字。' },
      { role: 'user', content: prompt }
    ])

    const content = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content
    if (!content) return { error: 'AI 生成失败' }

    let portrait
    try {
      const cleaned = content.replace(/```json?/g, '').replace(/```/g, '').trim()
      portrait = JSON.parse(cleaned)
    } catch(e) {
      return { error: 'AI 解析失败，请重试' }
    }

    // 保存到 players 集合
    const playerData = {
      nickname: nickname,
      avatarUrl: avatarUrl || '',
      ntrpLevel: ntrpLevel,
      rallyCount: rallyCount,
      strengths: strengths || [],
      weaknesses: weaknesses || [],
      goals: goals || [],
      fitnessLevel: fitnessLevel,
      injuries: injuries || [],
      aiPersonality: portrait.personality,
      currentStage: portrait.stage,
      aiStrengths: portrait.strengths,
      aiWeaknessSummary: portrait.weakness,
      aiTrainingFocus: portrait.trainingFocus,
      aiWeeklyPlan: portrait.weeklyPlan,
      techScores: portrait.techScores,
      aiCoachNote: portrait.coachNote,
      portraitGeneratedAt: Date.now()
    }

    if (OPENID) {
      let existingData = {}
      try {
        const existing = await db.collection('players').doc(OPENID).get()
        existingData = existing.data || {}
      } catch(e) {}
      const merged = Object.assign({}, existingData, playerData)
      delete merged._id
      delete merged._openid
      await db.collection('players').doc(OPENID).set({ data: merged })
    }

    return { ok: true, portrait: portrait }
  } catch(e) {
    console.error('generatePortrait error:', e)
    return { error: 'AI 服务暂时不可用' }
  }
}
