var app = getApp()

var WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate()
}

function firstDayOfMonth(y, m) {
  return new Date(y, m, 1).getDay()
}

Page({
  data: {
    weekdays: WEEKDAYS,
    monthTitle: '',
    calCells: [],
    selectedDay: 0,
    selectedDateTitle: '',
    selectedSessions: [],
    monthTrainDays: 0,
    monthTotalMins: 0,
    isCurrentMonth: true,
    loading: true,
  },

  _year: 0,
  _month: 0,
  _dayMap: {},   // date string → [{ location, time, partners, duration }]

  onLoad: function() {
    var now = new Date()
    this._year = now.getFullYear()
    this._month = now.getMonth()
    this._fetchAndBuild()
  },

  onShow: function() {
    this._fetchAndBuild()
  },

  _fetchAndBuild: async function() {
    this.setData({ loading: true })
    try {
      var res = await wx.cloud.callFunction({ name: 'getMyActivity' })
      var result = (res && res.result) || {}
      var created = result.created || []
      var joined = result.joined || []
      var allRaw = created.concat(joined)

      var nickname = (app.globalData.player && app.globalData.player.nickname) || ''
      var dayMap = {}
      allRaw.forEach(function(p) {
        if (!p.date) return
        if (!dayMap[p.date]) dayMap[p.date] = []
        var partners = (p.joiners || []).filter(function(j) { return j !== nickname })
        var mins = (p.manuallyEnded && p.endedAt && p.gameTimestamp)
          ? Math.max(0, Math.floor((p.endedAt - p.gameTimestamp) / 60000))
          : (p.estimatedDuration || 120)
        dayMap[p.date].push({
          location: p.location || '未填写场地',
          time: p.time || '',
          partners: partners.length > 0 ? partners.join('、') : '独自练球',
          durationText: mins >= 60
            ? Math.floor(mins / 60) + 'h' + (mins % 60 > 0 ? mins % 60 + 'm' : '')
            : mins + 'm',
          matchType: p.matchType || 'singles',
          cancelled: !!p.cancelled,
        })
      })
      this._dayMap = dayMap
      this._buildCalendar()
    } catch(e) {
      this.setData({ loading: false })
    }
  },

  _buildCalendar: function() {
    var y = this._year
    var m = this._month
    var now = new Date()
    var isCurrentMonth = (y === now.getFullYear() && m === now.getMonth())
    var totalDays = daysInMonth(y, m)
    var firstDay = firstDayOfMonth(y, m)
    var cells = []
    var pad = function(n) { return String(n).padStart(2, '0') }

    for (var i = 0; i < firstDay; i++) {
      cells.push({ empty: true })
    }

    var trainDays = 0, totalMins = 0

    for (var d = 1; d <= totalDays; d++) {
      var ds = y + '-' + pad(m + 1) + '-' + pad(d)
      var hasTrain = !!(this._dayMap[ds] && this._dayMap[ds].length > 0)
      var isToday = isCurrentMonth && d === now.getDate()
      cells.push({ day: d, date: ds, hasTrain: hasTrain, isToday: isToday, isSelected: false })
      if (hasTrain) {
        trainDays++
      }
    }

    this.setData({
      monthTitle: y + ' 年 ' + (m + 1) + ' 月',
      calCells: cells,
      isCurrentMonth: isCurrentMonth,
      selectedDay: 0,
      selectedSessions: [],
      selectedDateTitle: '',
      monthTrainDays: trainDays,
      monthTotalMins: totalMins,
      loading: false,
    })
  },

  selectDay: function(e) {
    var idx = e.currentTarget.dataset.idx
    var cells = this.data.calCells
    var cell = cells[idx]
    if (!cell || cell.empty || !cell.hasTrain) return

    var sessions = (this._dayMap[cell.date] || [])
    var newCells = cells.map(function(c, i) {
      return Object.assign({}, c, { isSelected: i === idx })
    })

    this.setData({
      calCells: newCells,
      selectedDay: cell.day,
      selectedDateTitle: (this._month + 1) + ' 月 ' + cell.day + ' 日',
      selectedSessions: sessions,
    })
  },

  prevMonth: function() {
    if (this._month === 0) {
      this._year--; this._month = 11
    } else {
      this._month--
    }
    this._buildCalendar()
  },

  nextMonth: function() {
    var now = new Date()
    if (this._year === now.getFullYear() && this._month === now.getMonth()) return
    if (this._month === 11) {
      this._year++; this._month = 0
    } else {
      this._month++
    }
    this._buildCalendar()
  },
})
