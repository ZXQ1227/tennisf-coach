'use strict'

const http = require('http')
const https = require('https')

const DEEPSEEK_KEY = 'sk-d203e6b36cb640e3991212e029fcc234'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}

function callDeepSeek(messages) {
  return new Promise(function(resolve, reject) {
    var payload = JSON.stringify({ model: 'deepseek-chat', messages: messages, max_tokens: 600, temperature: 0.7 })
    var req = https.request({
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DEEPSEEK_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, function(res) {
      var raw = ''
      res.on('data', function(c) { raw += c })
      res.on('end', function() {
        try {
          var data = JSON.parse(raw)
          resolve(data.choices[0].message.content)
        } catch(e) { reject(new Error('parse error')) }
      })
    })
    req.on('error', reject)
    req.setTimeout(25000, function() { req.destroy(); reject(new Error('timeout')) })
    req.write(payload)
    req.end()
  })
}

var server = http.createServer(function(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, CORS)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, CORS)
    res.end(JSON.stringify({ error: 'method not allowed' }))
    return
  }

  var body = ''
  req.on('data', function(c) { body += c })
  req.on('end', function() {
    var messages
    try {
      messages = JSON.parse(body).messages
    } catch(e) {
      res.writeHead(400, CORS)
      res.end(JSON.stringify({ error: 'invalid json' }))
      return
    }

    if (!messages || !messages.length) {
      res.writeHead(400, CORS)
      res.end(JSON.stringify({ error: 'missing messages' }))
      return
    }

    callDeepSeek(messages).then(function(reply) {
      res.writeHead(200, CORS)
      res.end(JSON.stringify({ reply: reply }))
    }).catch(function(e) {
      res.writeHead(500, CORS)
      res.end(JSON.stringify({ error: e.message }))
    })
  })
})

server.listen(9000, function() {
  console.log('tennisf-coach proxy on :9000')
})
