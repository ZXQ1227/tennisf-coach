# TennisF 项目记录

> 一个年轻人的网球生活记录小程序。不只是约球工具，更是网球社区和运动档案。

---

## 版本历史

| 版本 | 日期 | 描述 |
|------|------|------|
| 0.0.1 | 2026-06-03 | 初版上线：约球广场、发起球局、球员档案 |
| 0.0.2 | 2026-06-04 | 打卡海报升级（Design Tokens + 圆角卡片 + 荧光绿）、Tennis Mode 沉浸页、首页实况 Live Card |
| 0.0.3 | 2026-06-04 | Bug 修复：status 状态机补全（date+time 推算 gameTimestamp）、数据库索引建立、getMyActivity 云函数修复 |
| 0.0.4 | 2026-06-04 | Bug 修复 + 功能迭代（见下方 0.0.4 记录）|
| 0.0.5 | 2026-06-05 | Tennis Mode 防抖、safe-area 修复、比分面板显示真实球员名、赛制联动人数 |
| 0.0.6 | 2026-06-05 | 主页热力图+累计时长、成就置顶+详情Sheet、详情页照片Gallery、球搭子公开主页 |
| 0.0.7 | 2026-06-05 | pub-profile 重构：HeaderCard+StatsCard+BadgeCard+FixedBottomCTA，新增 getPublicProfile 云函数 |
| 0.0.8 | 2026-06-05 | 今日球报页（game-report）、index 分页（PAGE_SIZE=25，onReachBottom）、头像上传确认完整 |
| 0.0.9 | 2026-06-05 | profile 主页社区化重设计（Hero 双向光晕、动态 Feed、本周节奏、球搭子关系称号）、pub-profile 适合一起打卡片、修复发起人退出 Bug、补全取消球局入口 |

---

## 项目基本信息

| 项 | 值 |
|----|----|
| 项目名称 | TennisF |
| 类型 | 微信小程序 |
| AppID | `wxddbaf99d932656d5` |
| 云环境 ID | `cloud1-d0g1q4d5p6fc28083` |
| 基础库版本 | 3.16.1（灰度）|
| 开发工具 | 微信开发者工具 |
| 主语言 | JavaScript（原生小程序）|

---

## 目录结构

```
tennis-match/
├── app.js                  全局逻辑：云初始化、processPost、状态机、时间格式化
├── app.json                页面注册、TabBar 配置
├── app.wxss                全局样式（空，各页面独立样式）
│
├── pages/
│   ├── index/              约球广场（TabBar 首页）
│   ├── post/               发起球局
│   ├── profile/            我的 / 球员档案（TabBar）
│   ├── setup/              创建 / 编辑球员档案
│   ├── detail/             球局详情 + 打卡海报生成
│   └── tennis-mode/        Tennis Mode 沉浸式打球中页面
│
└── cloudfunctions/
    ├── joinPost/           加入球局（含生命周期校验）
    ├── cancelJoin/         退出球局
    ├── cancelPost/         取消球局
    ├── getMyActivity/      获取我的球局记录（创建 + 参与）
    ├── getPlayer/          获取球员档案
    ├── savePlayer/         保存 / 更新球员档案
    ├── getOpenId/          获取 OpenID（发起球局时使用）
    └── sendNotice/         发送订阅消息通知
```

---

## 页面说明

### `pages/index` — 约球广场

- 展示所有球局卡片，按 `createdAt` 降序
- 过滤：已取消 + 超过 48 小时的已结束球局不显示
- **进行中球局**渲染为 Live Card（暗色风格）：
  - 实时显示比分（`liveScore` 字段）
  - 实况 Timeline：最新 3 条 `moments` 动态
  - 两个 Action Button：`📷 上传现场瞬间` / `🔢 更新局分`
  - 更新局分弹出底部 Sheet，写入 `posts.liveScore` + 新增一条 score moment
- 有进行中球局时顶部显示 Live Banner
- 每 30 秒自动刷新状态（`setInterval`）
- 筛选器：全部 / 新手友好 / 进阶局 / 竞技局

### `pages/post` — 发起球局

- 填写场地、时间、级别、人数、费用、备注
- 调用 `getOpenId` 云函数获取 OpenID
- 写入 `posts` 集合
- 支持订阅消息通知

### `pages/detail` — 球局详情

- 根据状态显示不同底部栏：
  - `recruiting` → 输入昵称加入
  - `starting-soon` → 快加入
  - `in-progress` → 实况信息 + **`Tennis Mode →`** 按钮（荧光绿）
  - `finished` → 生成打卡海报 📸
  - `cancelled` → 已取消提示
- **打卡海报**：Canvas 生成，保存到相册
  - 背景：`#0E231A` Deep Court + 球场格线 + 斜线纹理
  - 场地名超大字（48-58px，动态字号）
  - 时长荧光绿大字（`#A6FF33`）
  - 主数据卡片（圆角 18px，暗色背景，细白边框）
  - 标签卡片（霓虹绿边框）
  - 球友头像（圆形 + 荧光绿光圈）
  - 品牌落款 TennisF

### `pages/tennis-mode` — Tennis Mode

- 沉浸式暗色全屏页面（`navigationStyle: custom`）
- **头部**：实时计时器（每秒更新 `已打 X 分钟`）、场地名、球员列表
- **比分面板**：
  - 大字计分板（`我方 : 对方`）
  - `[−] [+]` 按钮加减分，自动写入 `posts.liveScore`
  - 盘数切换（下一盘自动重置比分，写一条 score moment）
  - 抢七切换
- **动态流 Timeline**：
  - 实时拉取 `moments` 集合（每 15 秒刷新）
  - 时间轴样式（点 + 竖线 + 卡片）
- **底部 Action Bar**：
  - `📸 照片`：`wx.chooseImage` → 上传 Cloud Storage → 写 moments
  - `✍️ 状态`：弹出输入 Sheet → 写 moments
  - `🎾 记录比分`：记录当前比分快照到 moments
  - `结束 →`：弹窗确认 → 写 `posts.manuallyEnded` + `endedAt` + `finalScore`

### `pages/profile` — 我的 / 球员档案

- Hero 球员卡（头像色块 + 昵称 + 级别）
- 统计数据：总场次、本月场次、连续天数
- 常驻球场（按频次推算）
- 常打球友（按合作次数排序，最多 5 人）
- 最近 6 场球局时间线
- 成就系统（6 个成就，基于统计解锁）

### `pages/setup` — 球员档案编辑

- 昵称、级别、打球风格、主场、自我介绍
- 调用 `savePlayer` 云函数写入 `players` 集合

---

## 数据库设计

### `posts` 集合

```javascript
{
  _id,
  _openid,          // 创建者 OpenID
  location,         // 场地名
  date,             // "2026-06-04"
  time,             // "19:00"
  gameTimestamp,    // 开始时间戳（ms），部分旧数据用 date+time 推算
  estimatedDuration,// 预计时长（分钟，默认 120）
  need,             // 需要人数
  joined,           // 已加入人数
  joiners,          // 昵称数组 ["Zoi", "ZZB"]
  joinerOpenids,    // OpenID 数组
  level,            // beginner / intermediate / advanced
  matchType,        // singles / doubles / any
  courtType,        // hard / clay / grass
  indoor,           // bool
  fee,              // free / split / fixed
  note,             // 备注
  contactInfo,      // 联系方式（加入后可见）
  cancelled,        // bool
  liveScore,        // { a, b, set, tiebreak } 实时比分
  manuallyEnded,    // bool
  endedAt,          // 手动结束时间戳
  finalScore,       // { a, b } 最终比分
  createdAt         // 创建时间戳
}
```

**索引**（当前 5 个）：
| 索引 | 用途 |
|------|------|
| `_id`（默认）| 按 ID 查单条 |
| `createdAt 降序` | 广场列表排序 |
| `_openid + createdAt 降序` | getMyActivity 创建查询 |
| `joinerOpenids + createdAt 降序` | getMyActivity 参与查询 |
| `_id`（系统）| 默认主键 |

### `moments` 集合

```javascript
{
  _id,
  postId,           // 关联的球局 ID
  type,             // "text" | "photo" | "score"
  author,           // 发布者昵称
  content,          // 文字内容
  imageUrls,        // Cloud Storage FileID 数组
  createdAt         // 时间戳
}
```

**索引**（当前 3 个）：
| 索引 | 用途 |
|------|------|
| `_id`（默认）| 默认主键 |
| `postId + createdAt 降序` | 按球局查动态（主查询）|
| `createdAt 降序` | 全局动态排序 |

### `players` 集合

```javascript
{
  _id,              // 即 OpenID
  _openid,
  nickname,
  level,            // beginner / intermediate / advanced
  playStyle,        // steady / aggressive / allround / defensive
  homeBase,         // 主场
  bio,              // 自我介绍
  avatarUrl         // 头像（预留）
}
```

---

## 云函数说明

| 函数 | 触发时机 | 核心逻辑 |
|------|----------|----------|
| `joinPost` | 用户点击加入 | 校验状态（未开始/未满/未重复加入）→ inc joined / push joiners+joinerOpenids |
| `cancelJoin` | 用户退出球局 | 验证是本人 → dec joined / pull nickname |
| `cancelPost` | 发起者取消球局 | 验证是创建者（_openid）→ set cancelled:true |
| `getMyActivity` | 进入「我的」页面 | 并行查创建的和参与的球局，去重，各限 100 条 |
| `getPlayer` | 进入任意需要身份的页面 | 查 players 集合，不存在返回 null |
| `savePlayer` | 提交档案表单 | upsert players 集合 |
| `getOpenId` | 发起球局时 | 返回 OPENID（客户端无法直接获取）|
| `sendNotice` | joinPost 成功后 | 发送订阅消息通知给发起者 |
| `getPublicProfile` | 进入他人公开主页 | 按昵称查 players + 聚合近90天 posts 统计（totalHours/monthCount/frequentCourts/togetherCount），含管理员权限查 _openid |

---

## 角色与权限

> **每新增一个操作功能，必须先对照本节确认：谁能做、执行层在哪里、有没有后端兜底。**

### 角色定义

系统中有 4 种角色，每次进入详情页（detail.js `loadPost`）动态计算：

| 角色 | 英文标识 | 判断方式 |
|------|----------|----------|
| **发起人** | `isCreator` | `post._openid === myOpenId`（openid 比对，唯一可靠） |
| **已加入参与者** | `alreadyJoined` | openid 在 `joinerOpenids` 中（优先），或 nickname 在 `joiners` 中（兜底） |
| **参与者（含发起人）** | `isParticipant` | `isCreator \|\| alreadyJoined` |
| **被预留球友** | `isReservedUser` | 坑位系统：`slots` 中有 `status=RESERVED` 且 `nickname` 匹配 |
| **路人** | —（以上均为 false）| 无需额外计算 |

> 发起人创建球局时 nickname 写入 `joiners`、openid 写入 `joinerOpenids`，因此 `isCreator=true` 时 `alreadyJoined` 也为 true。

Tennis Mode 中的控制权 `canControl` 等价于 `isParticipant`，优先用 openid 比对，降级用 nickname。

---

### 权限矩阵

✅ 允许 ｜ ❌ 禁止 ｜ 🔒 后端强制 ｜ 🖥 仅前端 guard

| 操作 | 发起人 | 参与者 | 被预留 | 路人 | 执行层 |
|------|:------:|:------:|:------:|:----:|--------|
| 查看球局详情 | ✅ | ✅ | ✅ | ✅ | 公开 |
| 查看联系方式 | ✅ | ✅ | ❌ | ❌ | 🖥 `alreadyJoined` |
| 加入球局 | ❌ | ❌ | via 接受邀请 | ✅ | 🔒 `joinPost` 云函数 |
| 退出球局 | ❌ | ✅ | ✅ | ❌ | 🔒 `cancelJoin` 云函数 |
| **取消球局** | ✅ | ❌ | ❌ | ❌ | 🔒 `cancelPost` 云函数（openid 校验）|
| 上传现场照片 | ✅ | ✅ | ❌ | ❌ | 🖥 `isParticipant` |
| 更新局分 | ✅ | ✅ | ❌ | ❌ | 🖥 `isParticipant` |
| 开关"开放空降" | ✅ | ❌ | ❌ | ❌ | 🖥 `isCreator` |
| 生成打卡海报 | ✅ | ✅ | ✅ | ✅ | 公开（结束状态） |
| 进入 Tennis Mode | ✅ | ✅ | ❌¹ | 旁观² | 🖥 页面路由无限制 |
| Tennis Mode 控制比分 | ✅ | ✅ | ❌ | ❌ | 🖥 `canControl` |
| Tennis Mode 结束球局 | ✅ | ✅ | ❌ | ❌ | 🖥 `canControl` |
| 接受坑位邀请 | ❌ | ❌ | ✅ | ❌ | 🖥 `isReservedUser` |
| 婉拒并释放坑位 | ❌ | ❌ | ✅ | ❌ | 🔒 `rejectSlot` 云函数 |
| 查看/编辑自己的档案 | — | — | — | — | 🔒 `getMyActivity` / `savePlayer`（openid 自动） |
| 查看他人公开档案 | ✅ | ✅ | ✅ | ✅ | 公开（players 集合全体可读）|

¹ 被预留球友在接受邀请前尚未 `alreadyJoined`，页面进得去但无 canControl  
² 任何人可直接构造 URL 进入 Tennis Mode，非参与者显示旁观模式（只读），无操作控件

---

### 执行层说明

本项目权限执行分三层，安全强度从低到高：

```
🖥 前端 WXML guard（wx:if）
   │  最弱：仅控制 UI 显示，绕过方式：构造 API 请求
   │  用途：视觉隐藏非当前角色的按钮

📡 客户端直接 DB 操作（db.collection().update()）
   │  依赖数据库安全规则
   │  posts 集合当前规则：所有用户可读，登录用户可写（写宽松）
   │  moments 集合当前规则：所有用户可读，仅创建者可写

🔒 云函数（callFunction）
   │  最强：在服务端通过 cloud.getWXContext().OPENID 获取真实身份
   │  无法被客户端伪造，所有不可逆操作必须走这层
   └  joinPost / cancelJoin / cancelPost / rejectSlot 均在此层
```

**当前安全边界（已知可接受风险）**：

| 操作 | 问题 | 风险等级 | 状态 |
|------|------|---------|------|
| `toggleRecruiting` | 仅 WXML guard，无后端验证 | 低 | 可接受 |
| `confirmScore` | 仅 WXML guard，无后端验证 | 低 | 可接受 |
| `cancelJoin` | nickname 由客户端传入，攻击者可构造移除他人昵称（但 openid 仍保留，不影响身份判断） | 低 | 可接受 |
| `joinPost` | 无重复加入检测，前端有 guard 但后端无法阻止重复写入 | 低 | 可接受 |

---

### 新增功能权限规范

每次新增涉及数据写入的功能，按以下 checklist 检查：

**1. 确认操作的角色边界**
- 哪些角色允许执行？（发起人 / 参与者 / 任何人）
- 是否需要区分"自己的数据"和"他人的数据"？

**2. 选择正确的执行层**

```
不可逆操作（取消、删除、支付）→ 必须走云函数，服务端校验 openid
涉及他人数据的写入         → 必须走云函数
简单状态切换（低风险）      → 客户端直接 DB + WXML guard 可接受
只读查询                  → 客户端直接 DB 即可
```

**3. WXML guard 规范**
- 写操作的按钮必须加 `wx:if="{{角色条件}}"`
- 多角色条件用括号明确：`wx:if="{{isCreator || alreadyJoined}}"`
- 不要用 `disabled` 代替 `wx:if`（仍会渲染在 DOM 中）

**4. 云函数内部规范**
```javascript
// 必须从 WXContext 获取身份，不信任 event 传入的 openid
const { OPENID } = cloud.getWXContext()

// 需要验证所有权时
const post = await db.collection('posts').doc(event.postId).get()
if (post.data._openid !== OPENID) return { error: '无权操作' }
```

**5. 数据库字段可见性**
- 敏感字段（contactInfo 等）在 WXML 用角色条件控制，不在 DB 层做字段级隔离
- 如需字段级隔离，需用云函数中间层做 `field()` 过滤后再返回

---

## 全局逻辑（app.js）

### `processPost(p)` — 数据规范化

将数据库原始数据转换为页面可直接绑定的对象，包含：
- `gameStatus`：调用状态机计算当前状态
- `timeLabel`：动态时间文案（"还有 23 分钟" / "已打 1 小时" 等）
- `dateLabel`：智能日期（"今天" / "明天" / "昨天" / "06/03"）
- `cardClass`、`statusDotClass` 等预计算 CSS 类名
- `avatars`、`avatarsFull`：头像数据

### `computeGameStatus(p, now)` — 状态机

```
cancelled → 已取消
gameTimestamp（或 date+time 推算）→
  now >= end         → 已结束
  now >= start       → 正在进行
  joined >= need     → 已满员
  till start ≤ 30m   → 即将开打
  else               → 招募中
```

> **关键**：`gameTimestamp` 缺失时从 `date`+`time` 字段推算，避免旧数据永远显示「招募中」。

---

## Design Tokens（视觉规范）

| Token | 值 | 用途 |
|-------|----|------|
| Deep Court | `#0E231A` | Tennis Mode / 打卡海报背景 |
| Tennis Neon | `#A6FF33` | 核心高亮（比分、按钮、光圈、LIVE 标记）|
| Brand Green | `#2BB673` | 品牌绿（普通卡片状态色、TabBar 选中色）|
| Card Deep | `rgba(10,24,18,0.70)` | 暗色卡片背景 |
| Primary White | `#FFFFFF` | 主文字 |
| Muted | `rgba(255,255,255,0.40)` | 次要文字 |
| Divider | `rgba(255,255,255,0.10)` | 暗色背景下分割线 |

动画：
- `pulse-dot`：绿色呼吸点（LIVE 状态，1.5s ease-in-out）
- `card-glow`：进行中卡片发光边框（3s ease-in-out）
- `slide-up`：动态条目进入动画（0.28s ease-out）

---

## 0.0.4 修复与迭代记录（2026-06-04）

### Bug 修复

| 文件 | 问题 | 修复 |
|------|------|------|
| `index.wxml` | Live Card 显示"已打 已打 11 分钟"重复 | `timeLabel` 本身含前缀，移除 wxml 中的硬编码"已打" |
| `index.wxml/js` | 比分更新 sheet 内 +/- 按钮无响应 | `catchtap=""` 空字符串无法阻止冒泡，改为 `catchtap="noop"` + 定义空函数 |
| `app.js` | 手动结束球局后首页卡片仍显示"进行中" | `computeGameStatus` 加 `manuallyEnded` 检查，优先于时间判断 |
| `app.js` | 结束球局 `timeLabel` 显示预设时长而非实际时长 | `computeTimeLabel` 用 `endedAt - gameTimestamp` 计算实际打球时长 |
| `getMyActivity/index.js` | `Promise.all` 任一查询超时导致整体报错，profile 全量数据归零 | 两条查询改为独立 try/catch，互不影响 |
| `profile.js` | `callRes.result` 为 null 时 `result.created` 抛 TypeError | 加 null 保护：`(callRes && callRes.result) \|\| {}` |
| `tennis-mode.wxml/js` | `catchtap=""` 同上，输入 sheet 冒泡问题 | 同 index 修法，`catchtap="noop"` |
| `index.js` | posts 查询走全表扫描超时（无 where 子句，索引未触发） | 加 `where({ createdAt: _.gte(new Date(Date.now() - 90天)) })` 触发 createdAt 索引 |
| `detail.wxml/js` | 打卡海报使用旧版同步 Canvas API，基础库 3.x deprecation 警告 | 迁移至 Canvas 2d API（`type="2d"` + `createSelectorQuery` + 标准 ctx 属性赋值） |

### 功能迭代

**Tennis Mode 增强**
- 历史盘分展示：记分卡上方显示已完成的盘（如 `6:4 第1盘`），持久化在 `liveScore.sets`
- 下一盘高亮提示：任一方达到 6 分时"下一盘 →"按钮自动高亮（`tm-set-btn-suggest`）
- 权限控制：通过 `getOpenId` 比对 `joinerOpenids` / `post._openid`，非参与者隐藏所有操作控件，显示"旁观模式 · 比分实时同步"

**详情页**
- "Tennis Mode →" 按钮文案改为 **"进入实况记分 →"**

**我的主页 profile 重构**
- 删除与 Hero 卡重复的"运动数据"白色 card
- Hero 卡底部加 `lastActiveLabel`（最近活跃状态）+ `homeCourt`（常驻主场）
- 球搭子列表右侧加**"约球"按钮**，跳转发帖页并预填备注（`/pages/post/post?note=约XXX一起打`）
- 最近球局 timeline 加**颜色图例**（青=新手 / 黄=进阶 / 红=竞技）
- 最近球局条目**可点击**跳转详情页，右侧显示 `›` 箭头

**发帖页**
- `onLoad` 接收 `?note=` 参数，支持从球搭子约球预填备注

**moments 权限（需控制台操作）**
- 将 moments 集合权限改为"所有用户可读，仅创建者可写"，消除 `_openid` 自动注入导致的索引失效和 timeout

---

## 0.0.5 修复与迭代记录（2026-06-05）

### Tennis Mode 优化

| 文件 | 变更 | 说明 |
|------|------|------|
| `tennis-mode.js` | `logScoreEvent` 防抖 | `this.data.logging` 改为实例变量 `this._logging`，消除 setData 异步窗口下的双击竞态 |
| `tennis-mode.wxss/wxml` | 底部 spacer safe-area 修复 | 新增 `.tm-scroll-end { padding-bottom: env(safe-area-inset-bottom) }`，iPhone 全面屏绿点不再穿透底部栏 |
| `tennis-mode.js` | 比分面板显示真实球员名 | 移除 canControl 判断，`teamALabel/teamBLabel` 对所有人（参与者+旁观者）均显示实际昵称 |
| `post.js` | 切换赛制自动更新人数 | `selectMatchType` 确认实现：单打→2人，双打→4人，随意→保持当前值 |

---

## 0.0.6 功能迭代记录（2026-06-05）

### 主页（profile）重构

**热力图 + 累计时长**
- Hero 卡数据区替换为：大字**累计打球时长**（整数小时，不足1小时显示分钟）+ 右侧本月场次/连续天数
- GitHub 风格 **17周×7天热力图**（按格子颜色区分场次：空/浅绿/中绿/荧光绿 = 0/1/2/3+场）
- 热力图按周排列为列（Mon→Sun），支持横向滚动
- 点击有记录的格子 → 底部 Day Sheet 列出当天球局（可跳详情页）
- 数据来源：`allRaw` 按日期聚合，实际打球时长优先用 `endedAt - gameTimestamp`，否则 `estimatedDuration`

**成就详情 Sheet + 置顶**
- 点击任意成就格子 → 弹出底部 Sheet（大图标 + 名称 + 解锁条件）
- 已解锁成就可"置顶展示"（最多3个），状态存 `localStorage('pinnedAchievements')`
- 置顶的成就在 Hero 卡昵称下方以荧光绿徽章形式外显
- 成就格子置顶后显示淡绿边框 + "置顶"角标

**球搭子交互升级**
- 点击头像或昵称 → `viewPartner(e)` → 跳转 `/pages/pub-profile/pub-profile?nickname=xxx`
- "约球"按钮去掉 `switchTab + setTimeout` 的 hack，改为直接 `wx.navigateTo`

### 详情页（detail）：精彩瞬间 Gallery

- `onLoad` / `onShow` 同时调用 `loadGallery()`，查询 `moments` 集合中 `type='photo'` 的条目
- 提取所有 `imageUrls` 展示为横向可滑动相册（220rpx 圆角缩略图）
- 点击图片调 `wx.previewImage` 全屏预览

### 新增页面：球搭子公开主页（pub-profile）

| 项 | 说明 |
|----|------|
| 路由 | `/pages/pub-profile/pub-profile?nickname=xxx` |
| 展示内容 | 头像色块（首字母）、级别/风格、Bio、主场、约球按钮 |
| 数据获取 | 调用 `getPlayer` 云函数，传 `{ nickname }` 参数 |
| 降级处理 | 云函数返回 null 时（档案不存在/权限不足）仍显示姓名+约球按钮 |

### getPlayer 云函数更新

```javascript
// 新增：支持 { nickname } 参数查询他人档案
if (event && event.nickname) {
  const res = await db.collection('players').where({ nickname: event.nickname }).limit(1).get()
  return { player: res.data[0] || null }
}
// 默认路径不变：返回当前用户自己的档案
```

> **⚠️ 需控制台操作**：`players` 集合权限改为"所有用户可读"，`getPlayer` 按昵称查询才能生效。

---

## 待办 / 已知问题

- [x] Canvas 打卡海报：已迁移至 Canvas 2d API（0.0.4）
- [x] `logScoreEvent` 防抖：改用实例变量 `this._logging`，消除双击竞态（0.0.5）
- [x] Tennis Mode 滚动区底部 spacer 加 `env(safe-area-inset-bottom)`，修复 iPhone 上绿点穿透底部栏（0.0.5）
- [x] Tennis Mode 比分面板始终显示真实球员名（teamALabel/teamBLabel），不再区分参与者/旁观者（0.0.5）
- [x] 发帖页切换赛制自动更新默认人数（单打→2人，双打→4人）（0.0.5）
- [x] `players` 集合权限已改为"所有用户可读，仅创建者可写"（READONLY，via TCB API，0.0.6）
- [x] 球员档案头像上传：`open-type="chooseAvatar"` + 云存储上传至 `avatars/` 路径，profile 正常展示（0.0.6）
- [x] Tennis Mode 结束后跳转今日球报页（game-report），展示时长/比分/盘分/球员/动态统计（0.0.8）
- [x] `posts` 分页：PAGE_SIZE=25，skip 累加，`onReachBottom` 自动加载下一页（0.0.8）
- [x] 修复发起人在招募阶段看到"退出球局"按钮的 Bug（bottom bar 加 `isCreator` 分支，0.0.9）
- [x] 补全取消球局入口：发起人底部栏显示"取消球局"按钮，调用 `cancelPost` 云函数（0.0.9）
- [x] profile 主页社区化重设计（动态 Feed、本周节奏、球搭子关系称号、Hero 双向光晕，0.0.9）
- [ ] `moments`/`avatars` 云存储安全规则：需控制台配置允许已登录用户上传（见下方说明）
- [ ] 球搭子"约球"按钮目前仅跳转发帖页 + 预填备注，未来可做好友内消息通知闭环

---

## 快速参考

**本地开发**：微信开发者工具，导入 `/Users/ziqly/tennis-match`

**云函数部署**：
```bash
# 部署单个云函数
tcb fn deploy <functionName> -e cloud1-d0g1q4d5p6fc28083

# 查看所有索引
tcb db nosql execute -e cloud1-d0g1q4d5p6fc28083 \
  --command '[{"TableName":"posts","CommandType":"COMMAND","Command":"{\"listIndexes\":\"posts\",\"cursor\":{}}"}]'
```

**新建数据库索引**：
```bash
tcb db nosql execute -e cloud1-d0g1q4d5p6fc28083 \
  --command '[{"TableName":"<集合>","CommandType":"COMMAND","Command":"{\"createIndexes\":\"<集合>\",\"indexes\":[{\"key\":{\"<字段>\":<1或-1>},\"name\":\"<索引名>\",\"background\":true}]}"}]'
```

---

## 云存储安全规则配置（⚠️ 需手动操作）

目前 `moments/` 和 `avatars/` 路径的图片上传依赖客户端 `wx.cloud.uploadFile`，需要在控制台配置权限，否则非创建者无法上传。

**操作步骤**：
1. 打开 [微信云开发控制台](https://console.cloud.tencent.com/tcb) → 选择环境 `cloud1-d0g1q4d5p6fc28083`
2. 左侧导航 → **云存储** → **权限设置**
3. 切换为「自定义安全规则」，粘贴以下规则：

```
{
  "read": true,
  "write": "auth != null"
}
```

这条规则表示：所有人可读，已登录用户（即任何打开小程序的微信用户）可写。

> 如果希望更严格（仅文件所有者可删除），可分路径配置，但上述规则已满足当前需求。
