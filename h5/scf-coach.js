'use strict'

const https = require('https')

const DEEPSEEK_KEY = 'sk-d203e6b36cb640e3991212e029fcc234'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
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
        } catch(e) {
          reject(new Error('parse error'))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(25000, function() { req.destroy(); reject(new Error('timeout')) })
    req.write(payload)
    req.end()
  })
}

exports.main_handler = async function(event, context) {
  var method = event.httpMethod || ''

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }

  var body = {}
  try {
    body = JSON.parse(event.body || '{}')
  } catch(e) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'invalid json' }) }
  }

  var messages = body.messages
  if (!messages || !messages.length) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'missing messages' }) }
  }

  try {
    var reply = await callDeepSeek(messages)
    return {
      statusCode: 200,
      headers: Object.assign({ 'Content-Type': 'application/json' }, CORS),
      body: JSON.stringify({ reply: reply })
    }
  } catch(e) {
    return {
      statusCode: 500,
      headers: Object.assign({ 'Content-Type': 'application/json' }, CORS),
      body: JSON.stringify({ error: e.message })
    }
  }
}
