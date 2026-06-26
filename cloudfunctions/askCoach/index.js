const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })
const https = require('https')

const API_KEY = process.env.DEEPSEEK_API_KEY

const SYSTEM_PROMPT = `你是一位专业网球AI教练，名叫 CoachAI。

你的任务：帮助网球爱好者分析技术问题、制定训练计划、回答训练相关问题。

你需要：
1. 根据用户的水平（NTRP评级）调整建议难度
2. 结合用户的具体短板给出针对性建议
3. 使用专业但易懂的中文表达
4. 给出具体可执行的训练方法，不要空泛建议
5. 对于动作技术问题，说明身体各部位的协调要点
6. 不确定的情况下明确说明

你会分析的技术：正手、双反/单反、发球、截击、步伐、重心转移、击球点、上旋/下旋

回答格式：
- 不使用 Markdown 标记（不用 ** 或 * 加粗）
- 用数字列表（1. 2. 3.）表示步骤
- 用换行分段，不要用横线分割
- 语气专业但有温度，像一位真正关心你进步的教练`

function callDeepSeek(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      temperature: 0.7,
      max_tokens: 520
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
        try {
          const parsed = JSON.parse(data)
          if (res.statusCode !== 200) {
            const errMsg = (parsed.error && parsed.error.message) || ('HTTP ' + res.statusCode)
            console.error('DeepSeek non-200:', res.statusCode, errMsg)
            reject(new Error(errMsg))
          } else {
            resolve(parsed)
          }
        } catch(e) {
          console.error('DeepSeek parse error, raw:', data.slice(0, 200))
          reject(e)
        }
      })
    })
    req.setTimeout(50000, () => { req.destroy(new Error('DeepSeek timeout')) })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

exports.main = async (event) => {
  const { question, playerProfile, history } = event
  if (!question) return { error: '问题不能为空' }

  let profileContext = ''
  if (playerProfile && playerProfile.nickname) {
    profileContext = `
[球员信息]
昵称: ${playerProfile.nickname}
水平: ${playerProfile.ntrpLevel || playerProfile.level || '未知'}
多拍能力: ${playerProfile.rallyCount || '未知'}
最稳定技术: ${(playerProfile.strengths || []).join('、') || '未填写'}
主要问题: ${(playerProfile.weaknesses || []).join('、') || '未填写'}
训练目标: ${(playerProfile.goals || []).join('、') || '未填写'}
AI画像: ${playerProfile.aiPersonality || ''}
当前短板: ${playerProfile.aiWeaknessSummary || ''}
`
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + profileContext }
  ]

  if (history && history.length > 0) {
    const recent = history.slice(-6)
    for (const h of recent) {
      messages.push({ role: h.role, content: h.content })
    }
  }
  messages.push({ role: 'user', content: question })

  try {
    const result = await callDeepSeek(messages)
    console.log('DeepSeek raw:', JSON.stringify(result).slice(0, 500))
    const msg = result.choices && result.choices[0] && result.choices[0].message
    const content = msg && (msg.content || msg.reasoning_content)
    if (!content) {
      const detail = !result.choices ? 'no choices' : !result.choices[0] ? 'empty choices' : !msg ? 'no message' : 'content null'
      console.error('Empty content detail:', detail, JSON.stringify(result).slice(0, 300))
      return { error: '服务响应异常(' + detail + ')', debug: JSON.stringify(result).slice(0, 200) }
    }
    return { ok: true, answer: content }
  } catch(e) {
    console.error('askCoach error:', e.message)
    return { error: e.message || '服务暂时不可用' }
  }
}
