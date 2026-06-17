var app = getApp()

/* ── AI 内容结构化解析 ──
   将 DeepSeek 纯文本输出解析为可渲染的 segment 数组：
   text / numbered / bullet / training
*/
function parseSegs(text) {
  if (!text) return []
  var lines = text.split('\n')
  var segs = []
  var nums = []
  var bullets = []
  var trainPat = /\d+(组|次|分钟|秒|天|周)/

  function flush() {
    if (nums.length) {
      segs.push({ type: 'numbered', items: nums.slice() })
      nums = []
    }
    if (bullets.length) {
      var isTrain = bullets.some(function(b) { return trainPat.test(b) })
      segs.push({ type: isTrain ? 'training' : 'bullet', items: bullets.slice() })
      bullets = []
    }
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim()
    if (!line) { flush(); continue }

    var nm = line.match(/^(\d+)\.\s+(.+)/)
    if (nm) {
      if (bullets.length) flush()
      nums.push({ n: nm[1], t: nm[2] })
      continue
    }

    var bm = line.match(/^[-•]\s+(.+)/)
    if (bm) {
      if (nums.length) flush()
      bullets.push(bm[1])
      continue
    }

    flush()
    segs.push({ type: 'text', text: line })
  }
  flush()
  return segs.length ? segs : [{ type: 'text', text: text }]
}

var INIT_CONTENT = '你好！我是你的 AI 网球教练 🎾\n\n可以问我任何关于网球技术、训练方法的问题。我会根据你的水平给出个性化建议。'

var QUICK_CHIPS = [
  { label: '双反手感', q: '双反怎么找到好的手感和发力感？' },
  { label: '步伐技巧', q: '有什么实用的步伐移动技巧？' },
  { label: '上网截击', q: '上网截击有什么要注意的技巧？' },
  { label: '发球改进', q: '发球出界或下网怎么改进？' },
  { label: '正手上旋', q: '正手怎么打出稳定的上旋球？' },
  { label: '比赛心态', q: '比赛紧张焦虑如何调整心态？' }
]

Page({
  data: {
    messages: [{ role: 'assistant', content: INIT_CONTENT, segs: parseSegs(INIT_CONTENT), id: 'init' }],
    inputText: '',
    sending: false,
    showQuickStarts: true,
    quickChips: QUICK_CHIPS,
    scrollId: '',
    statusBarHeight: 44,
    avatarUrl: ''
  },

  onLoad: function(options) {
    var info = wx.getSystemInfoSync()
    var player = app.globalData.player
    this.setData({
      statusBarHeight: info.statusBarHeight || 44,
      avatarUrl: (player && player.avatarUrl) || ''
    })

    if (options.q && options.review === '1') {
      // 回查模式：从 localStorage 读取历史 Q&A，不重新请求 AI
      var q = decodeURIComponent(options.q)
      try {
        var chats = wx.getStorageSync('recentChats') || []
        var hit = null
        for (var i = 0; i < chats.length; i++) {
          if (chats[i].q === q) { hit = chats[i]; break }
        }
        if (hit && hit.a) {
          var uMsg = { role: 'user', content: q, id: 'u0' }
          var aMsg = { role: 'assistant', content: hit.a, segs: parseSegs(hit.a), id: 'a0' }
          var initMsg = { role: 'assistant', content: INIT_CONTENT, segs: parseSegs(INIT_CONTENT), id: 'init' }
          this.setData({ messages: [initMsg, uMsg, aMsg], showQuickStarts: false })
          this._scrollToBottom()
          return
        }
      } catch(e) {}
      // 没有缓存答案，降级为重新提问
      this._sendMessage(q)
    } else if (options.q) {
      this._sendMessage(decodeURIComponent(options.q))
    }
  },

  onBack: function() { wx.navigateBack() },

  onInput: function(e) { this.setData({ inputText: e.detail.value }) },

  onSend: function() {
    var text = (this.data.inputText || '').trim()
    if (!text || this.data.sending) return
    this.setData({ inputText: '' })
    this._sendMessage(text)
  },

  onChipTap: function(e) {
    var q = e.currentTarget.dataset.q
    this.setData({ showQuickStarts: false })
    this._sendMessage(q)
  },

  _sendMessage: async function(text) {
    if (!text || this.data.sending) return

    var history = this.data.messages
      .filter(function(m) { return !m.thinking && m.id !== 'init' })
      .map(function(m) { return { role: m.role, content: m.content } })

    var userMsg = { role: 'user', content: text, id: 'u' + Date.now() }
    var thinkingMsg = { role: 'assistant', content: '', id: 'thinking', thinking: true }

    var msgs = this.data.messages.concat([userMsg, thinkingMsg])
    this.setData({ messages: msgs, sending: true, showQuickStarts: false })
    this._scrollToBottom()

    var player = app.globalData.player

    try {
      var res = await wx.cloud.callFunction({
        name: 'askCoach',
        data: { question: text, playerProfile: player || null, history: history },
        config: { timeout: 90000 }
      })
      var result = (res && res.result) || {}
      var answer = result.answer || '抱歉，暂时无法回复，请稍后再试。'

      var aiMsg = {
        role: 'assistant',
        content: answer,
        segs: parseSegs(answer),
        id: 'a' + Date.now()
      }
      var finalMsgs = this.data.messages
        .filter(function(m) { return !m.thinking })
        .concat([aiMsg])

      this.setData({ messages: finalMsgs, sending: false })
      this._scrollToBottom()
      this._saveRecentChat(text, answer)
    } catch(e) {
      var errContent = 'AI 服务暂时不可用，请稍后重试。'
      var errMsg = {
        role: 'assistant',
        content: errContent,
        segs: parseSegs(errContent),
        id: 'err' + Date.now()
      }
      var cleanMsgs = this.data.messages
        .filter(function(m) { return !m.thinking })
        .concat([errMsg])
      this.setData({ messages: cleanMsgs, sending: false })
    }
  },

  _scrollToBottom: function() {
    var self = this
    setTimeout(function() {
      var msgs = self.data.messages
      if (!msgs.length) return
      self.setData({ scrollId: msgs[msgs.length - 1].id })
    }, 100)
  },

  _saveRecentChat: function(q, answer) {
    try {
      var chats = wx.getStorageSync('recentChats') || []
      chats = chats.filter(function(c) { return c.q !== q })
      chats.unshift({ q: q, a: answer || '', t: Date.now() })
      if (chats.length > 10) chats = chats.slice(0, 10)
      wx.setStorageSync('recentChats', chats)
    } catch(e) {}
  },

  noop: function() {}
})
