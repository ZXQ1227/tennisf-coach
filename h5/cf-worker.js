// DEEPSEEK_KEY must be set as a Cloudflare Worker secret (wrangler secret put DEEPSEEK_KEY)
/* global DEEPSEEK_KEY */

addEventListener('fetch', function(event) {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  var corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (request.method === 'OPTIONS') {
    return new Response('', { headers: corsHeaders })
  }

  var body = await request.json()
  var messages = body.messages

  var dsRes = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + DEEPSEEK_KEY
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      max_tokens: 600,
      temperature: 0.7
    })
  })

  var data = await dsRes.json()
  var reply = data.choices[0].message.content

  return new Response(JSON.stringify({ reply: reply }), { headers: corsHeaders })
}
