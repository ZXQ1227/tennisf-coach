const https = require('https')

const DEEPSEEK_KEY = 'sk-d203e6b36cb640e3991212e029fcc234'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}

function reply(statusCode, data) {
  return { statusCode, headers: CORS, body: JSON.stringify(data) }
}

function callDeepSeek(messages) {
  return new Promise(function(resolve, reject) {
    var payload = JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      max_tokens: 600,
      temperature: 0.7
    })
    var options = {
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DEEPSEEK_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    }
    var req = https.request(options, function(res) {
      var raw = ''
      res.on('data', function(c) { raw += c })
      res.on('end', function() {
        try {
          var data = JSON.parse(raw)
          resolve(data.choices[0].message.content)
        } catch(e) { reject(new Error('parse error: ' + raw.slice(0, 100))) }
      })
    })
    req.on('error', reject)
    req.setTimeout(25000, function() { req.destroy(); reject(new Error('deepseek timeout')) })
    req.write(payload)
    req.end()
  })
}

exports.main = async function(event) {
  // HTTP 触发器格式
  if (event.httpMethod === 'OPTIONS') return reply(200, {})

  var body = {}
  try {
    body = JSON.parse(event.body || '{}')
  } catch(e) {
    return reply(400, { error: 'invalid json' })
  }

  var messages = body.messages
  if (!messages || !messages.length) return reply(400, { error: 'missing messages' })

  try {
    var text = await callDeepSeek(messages)
    return reply(200, { reply: text })
  } catch(e) {
    return reply(500, { error: e.message })
  }
}
