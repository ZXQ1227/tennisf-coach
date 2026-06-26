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
| 0.1.0 | 2026-06-08 | 首页 UI/逻辑修复 9 项、Tennis Mode 穿透 & 对比度修复、动态页发布者头像接入 players 集合 |
| 0.1.1 | 2026-06-08 | 发帖页定位改为地图选择器（wx.chooseLocation），支持搜索任意球场，无需在球场附近 |
| 0.1.2 | 2026-06-08 | 详情页新增球场导航入口（wx.openLocation）；审核文案优化：去除"社区"词汇，动态→记录 |
| 0.1.3 | 2026-06-09 | 移除点赞/评论功能（审核驳回）；移除距离计算（getLocation 个人主体无权限）；配置 requiredPrivateInfos |
| 0.1.4 | 2026-06-15 | AI 云函数 Bug 修复：generatePortrait OPENID guard、DB ID 方案统一（doc(OPENID).set()）、全链路超时上调至 90s |
| 0.1.5 | 2026-06-15 | 成长页暗色主题完整重设计：新拟态统计面板、毛玻璃编辑按钮、Canvas 雷达图、荧光绿 CTA、AI 技能分析卡 |
| 0.1.6 | 2026-06-15 | AI 教练个性化快速提问、删除本周训练计划模块、删除成就系统、"比赛回忆"改名"训练记录" |
| 0.1.7 | 2026-06-16 | 修复 generatePortrait set() 覆盖问题：写入前先 get() 合并已有文档，保留 savePlayer 字段 |
| 0.1.8 | 2026-06-16 | 应对审核驳回（深度合成技术）：移除所有 AI 功能，小程序回归纯工具定位 |
| 0.1.9 | 2026-06-16 | 微信登录页 + 游客模式：新增 login 页采集微信头像/昵称，冷启动直接进首页，功能入口按需触发登录 |
| 0.2.0 | 2026-06-16 | 成长页 UI 迭代：技能掌握度模块（左侧时长统计+右侧雷达图双栏）、今日状态移入模块、CTA 按钮 3:2 比例；雷达图 timeout 修复（单次 createSelectorQuery + 重试机制）；H5 AI 教练 Token 架构（generateAIToken 云函数 + 剪贴板链接）|
| 0.2.1 | 2026-06-16 | 合规优化：运动记录页改为仅展示自己+球搭子内容（非陌生人公开流）；首页距离显示预置（getFuzzyLocation，待审批后生效）；组局页移除用户信息编辑入口，昵称/头像只在成长页修改；Tennis Mode 布局修复（min-height→height:100vh 解决 scroll-view 坍缩）|
| 0.2.2 | 2026-06-17 | H5 AI 教练上线：GitHub Pages 静态托管 + Cloudflare Worker 转发 DeepSeek，小程序成长页直接将球员档案编码进 URL 生成链接；雷达图 timeout 再修复（setData 回调后触发绘制 + 延迟加长至 300/700/1500ms）；微信后台隐私指引补充「获取你的昵称」|
| 0.2.3 | 2026-06-17 | 审核驳回修复：setup 页补充隐私授权弹窗（从成长页进入时 chooseAvatar 静默卡死）；「AI 教练」→「教练助手」+导航栏「AI 球员档案」→「球员档案」规避深度合成技术驳回；教练助手按钮改为先弹 modal 再写剪贴板，解决 setClipboardData 回调在真机静默丢失问题|
| 0.2.4 | 2026-06-18 | pub-profile 移除遗留荣誉勋章模块；feed 页全量重构为 Keep 风格沉浸式行动仪表盘（暗色全屏/网球场底纹背景、三模式 Tab、GO 按钮呼吸动效、自由训练页内计时器、计分比赛直通 tennis-mode、底部历史抽屉）；Tab Bar 深色化（`#0D1F16` + 荧光绿选中色）|
| 0.2.5 | 2026-06-18 | 装备模块：新增 `pages/gear` 页（球拍/球鞋/运动设备三分区，底部抽屉增删改表单）+ `saveGear` 云函数；`post.js` 新增 `autoTennisMode` 参数，建局成功后直跳 tennis-mode；feed 装备按钮从 toast 改为跳装备页|
| 0.2.6 | 2026-06-18 | 修复 chooseLocation 真机无反馈：post 页补挂 `_onPrivacyNeeded` 回调，首次调用地图前弹隐私授权 sheet；Tab Bar 重命名：训练→约球、记录→训练 |
| 0.2.7 | 2026-06-18 | 成长页"训练记录"改为"挥拍记录"（正反手总量、比例条、上次记录）；自由训练结束后弹挥拍数据上报 sheet；新增 `saveSwingStats` 云函数（累加写入 `players.swingStats`）|
| 0.2.8 | 2026-06-18 | 云存储权限修复：新增 `getTempUrls` 云函数（管理员权限批量转换 cloud:// 为临时 HTTPS URL），feed 加载时自动转换图片/头像/视频封面，解决球搭子照片无法加载问题 |
| 0.2.9 | 2026-06-18 | 挥拍数据扩展为四维：新增发球（sv）、截击（vl）上报；`saveSwingStats` 云函数同步记录 `swingHistory`（每条含时间戳，保留最近 90 条）；成长页挥拍记录模块替换为本周累计趋势折线图（Canvas 2D，Catmull-Rom 平滑曲线+渐变填充+未来日期灰色遮罩）；挥拍记录移至球搭子上方；CTA 按钮文案调整：约球→训练、教练助手→教练 |
| 0.3.0 | 2026-06-18 | 产品架构重构：移除 TabBar，成长页升为独立首页（自定义导航栏 + 问候区 + 数据统计行 + 档案雷达卡 + 训练/教练入口卡 + 训练日历 + 挥拍摘要 + 球搭子横滚）；新建训练二级页（`pages/training`，含推荐计划 Banner、技术训练 2×3 网格、实战训练入口）；约球广场、feed 训练页改为二级导航；所有 `switchTab` 改为 `navigateTo`/`navigateBack`/`reLaunch` |
| 0.3.1 | 2026-06-18 | 雷达图 canvas 漂移修复：画完后 `canvasToTempFilePath` 导出图片，canvas 移至屏幕外，scroll-view 中改用 `<image>` 展示，消除原生层漂移问题 |
| 0.3.2 | 2026-06-18 | 合规文案清理：移除表层所有"AI"、"智能"前缀及"Beta"标签（profile 首页、training 页、coach-chat、coach 页面及其 json） |
| 0.3.3 | 2026-06-22 | 训练模块架构调整：去除"自由训练"/"组局比赛" Tab，训练页默认展示自由训练内容；新建球局广场三级页（`pages/square`），含"发现球局"+"我的球局"两 Tab；训练页三个入口（查看更多/我的球局/发现球局）均跳转 square 页对应 Tab；canvas timeout 根治（移除 `canvasToTempFilePath` 离屏导出，雷达图直接以 in-flow canvas 渲染）；新增 profile onShow 30s 防抖、loadActivity 静默失败 |
| 0.3.4 | 2026-06-22 | 球局广场体验修复：移除自定义导航栏（改用原生 navigationBarTitleText），消除双返回按钮；Tab 栏右侧集成"发起球局"按钮；两 Tab 空状态统一（图标+文案+发起按钮）；发帖成功后改为 navigateBack 返回球局广场，不再强制跳训练页 |
| 0.3.5 | 2026-06-22 | 训练四页全链路重设计：training-prep（AI教练卡+目标列表+四种训练模式+音乐/GO/装备底栏）；training-session（GPS/心率/卡路里状态栏+虚线计时框+动效视觉区+Swiper统计+三按钮底栏）；training-summary（新页，六边形评分+四项数据+心率Canvas图+AI复盘→coach-chat+目标完成进度条）；training-records（新页，月历网格+绿环训练标记+月统计+日详情列表）；profile 训练日历区域点击跳转 training-records；训练链路：prep→session→summary(redirectTo)→再来一练(navigateBack×2)/查看记录 |
| 0.3.6 | 2026-06-22 | 表现层"AI"字样全清：training-prep"AI教练"→"教练"、training-session"AI教练提示"→"教练提示"、training-summary"AI复盘"→"训练复盘"、模式列表三处"AI"改为"智能/实时"；askCoach 云函数修复：超时从 30s 升至 60s、DeepSeek 请求超时降至 50s（解决函数被平台 kill 问题）、新增 HTTP 状态码检查与详细错误日志；curl 确认 API key 已失效（待换新 key） |
| 1.1.2 | 2026-06-22 | **审核合规 + 首页重设计**。合规：`coach-chat` 从 app.json 移除，所有入口（profile/index/training-summary）改为生成 H5 链接→剪贴板；`pages/index`（老约球广场）从 app.json 移除；废弃页面目录清除（feed/coach/coach-chat/index）；训练链路三页 🤖 emoji 替换为 🎾，注释中"AI"字样清理。首页：昵称后 👋→✎ 编辑图标（scaleX 镜像）；球员档案卡移除"查看详情 ›"；开始训练卡重设计为全宽深绿沉浸卡（运动员背景图 + 绿色径向光晕 + 实心绿圆箭头）；教练卡重设计为深蓝沉浸卡（🧠 + Beta 徽章 + 暗色圆箭头）；两卡改为同行并排；训练卡绿色突出描边，教练卡蓝紫弱化描边；教练卡标题"AI 教练"→"教练" |
| 1.1.3 | 2026-06-26 | **H5 端点迁移 + 登录页体验修复 + 鉴权拦截**。H5 COACH_API 从旧 tencentscf.com 迁移到 CloudBase HTTP 路由（`/coach`），统一走 h5AskCoach 云函数。登录页修复 5 项：① 昵称输入框焦点被立即销毁——onNickFocus 同步 setData 在 bindfocus 回调内触发 re-render 踢掉焦点，改为 onChooseAvatar 同帧设 focusNick:true、600ms 后定时复位；② `.content` 去掉 `overflow:hidden`+`height:100vh` 改为 `min-height:100vh`，修复键盘弹起后触摸区域与视觉位置错位；③ 返回按钮位置用 `getMenuButtonBoundingClientRect` 精确对齐胶囊垂直中心；④ `disableScroll:true` 禁止页面上下滑动；⑤ `wx.onKeyboardHeightChange` 实时将等量偏移加到返回键 top，抵消 webview 托起，键盘弹起时返回键视觉静止不动。底部隐私文案折行修复（`{{"\\n"}}` → `{{"\n"}}`）。训练日历入口增加未登录拦截：profile 和 training-summary 两处 `goTrainingRecords`/`goRecords` 点击时检查 `app.hasProfile()`，未登录弹 toast。 |

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
├── app.json                页面注册（无 TabBar，首页为 profile）
├── app.wxss                全局样式（空，各页面独立样式）
│
├── pages/
│   ├── index/              约球广场（二级页，从训练页进入）
│   ├── post/               发起球局
│   ├── profile/            首页（成长仪表盘，0.3.0 重设计为无 TabBar 入口页）
│   ├── setup/              创建 / 编辑球员档案（含 AI 画像生成）
│   ├── detail/             球局详情 + 打卡海报生成
│   ├── tennis-mode/        Tennis Mode 沉浸式打球中页面
│   ├── login/              微信登录页（首次使用采集头像/昵称）
│   ├── pub-profile/        他人公开主页
│   ├── game-report/        今日球报（Tennis Mode 结束后跳转）
│   ├── feed/               自由训练仪表盘（Keep 风格，三模式，二级页）
│   ├── training/           训练二级页（推荐计划 + 技术训练网格 + 实战入口，0.3.0 新增）
│   └── gear/               装备管理页（球拍/球鞋/运动设备）
│
└── cloudfunctions/
    ├── joinPost/           加入球局（含生命周期校验）
    ├── cancelJoin/         退出球局
    ├── cancelPost/         取消球局
    ├── getMyActivity/      获取我的球局记录（创建 + 参与）
    ├── getPlayer/          获取球员档案（支持按 nickname 查他人）
    ├── savePlayer/         保存 / 更新球员档案
    ├── saveGear/           保存装备数据（update players.gear 字段）
    ├── getOpenId/          获取 OpenID（发起球局时使用）
    ├── sendNotice/         发送订阅消息通知
    ├── getPublicProfile/   他人公开主页数据（stats 聚合）
    ├── generatePortrait/   AI 球员画像生成（DeepSeek API）
    └── askCoach/           AI 教练对话（DeepSeek API）
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

### `pages/login` — 微信登录（0.1.9 新增）

- 首次使用时由功能页触发，通过 `navigateTo` 跳转（非强制冷启动拦截）
- `open-type="chooseAvatar"` 整行按钮选取微信头像 → 上传至 Cloud Storage `avatars/`
- `type="nickname"` 输入框，顶部浮现"使用微信昵称"快捷键
- `wx.onNeedPrivacyAuthorization` + `open-type="agreePrivacyAuthorization"` 隐私授权弹窗
- 支持 `?return=<encodedUrl>` 参数，登录完后跳转原目标页
- 有页面栈时顶部显示「←」返回按钮

### `pages/profile` — 成长（暗色主题，0.1.5 重设计）

- **Hero 球员卡**：暗色渐变背景、新拟态双光晕、毛玻璃编辑按钮、Bio 引号斜体
- **统计面板**（新拟态）：打球时长 / 本月场次 / 连续天数
- **荧光绿 CTA**：约球按钮，`#B2FF33` 边框 + 发光阴影
- **本周节奏**：7 天圆形格（空心/渐变填充）+ 连续天数 streak tag
- **球搭子**：暗色卡片，点击跳公开主页，"再约"快捷发帖
- **训练记录**（原"比赛回忆"）：最近 6 场球局时间线，可点击跳详情
- Sheet 弹层（邀请、Day、留言）保持白色背景形成对比层次

### `pages/setup` — 球员档案编辑

- 4 步流程：头像昵称 → 水平问卷 → 风格偏好 → 完成建档
- 调用 `savePlayer` 云函数写入 `players` 集合（含 ntrpLevel / strengths / weaknesses / goals 等问卷字段）

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

`_id` 固定为用户 OpenID（两个写入函数均用 `doc(OPENID).set()`），权限：所有人可读，仅创建者可写。

字段分两组，分别由不同云函数写入：

**基础档案字段**（由 `savePlayer` 写入）

```javascript
{
  _id,              // OpenID（doc key）
  _openid,          // TCB 自动注入
  nickname,         // 昵称
  avatarUrl,        // 头像 Cloud Storage URL
  level,            // beginner / intermediate / advanced（社区显示用）
  playStyle,        // steady / aggressive / allround / defensive
  homeBase,         // 主场
  preferMatch,      // singles / doubles / any
  preferCourt,      // hard / clay / grass
  bio,              // 自我介绍
  updatedAt         // db.serverDate()
}
```

**挥拍统计字段**（由 `saveSwingStats` 写入，0.2.7 新增）

```javascript
{
  swingStats: {
    fhTotal: 5230,      // 正手累计挥拍次数
    bhTotal: 4180,      // 反手累计挥拍次数
    sessions: 12,       // 已上报训练次数
    lastSession: {
      fh: 380,          // 上次正手
      bh: 290,          // 上次反手
      date: serverDate  // 上次上报时间
    }
  }
}
```

**装备字段**（由 `saveGear` 写入，0.2.5 新增）

```javascript
{
  gear: {
    rackets: [{ id, brand, model, weight, tension, notes, isPrimary }],
    shoes:   [{ id, brand, model, notes, isPrimary }],
    devices: [{ id, type, label }]   // type: 'apple_watch'|'garmin'|'huawei'|'suunto'|'polar'|'other'
  }
}
```

**AI 画像字段**（由 `generatePortrait` 写入，已修复 set() 覆盖问题：写前 get() 合并，0.1.7）

```javascript
{
  // 建档问卷字段（同时保存，覆盖 savePlayer 中同名字段）
  nickname,
  avatarUrl,
  ntrpLevel,        // '1.5' | '2.0' | '2.5' | '3.0' | '3.5' | '4.0' | '4.5'
  rallyCount,       // 多拍能力描述，如 '5~10拍'
  strengths,        // string[]，最稳定技术，如 ['正手', '发球']
  weaknesses,       // string[]，主要问题，如 ['双反', '下网']
  goals,            // string[]，训练目标，如 ['稳定对拉', '发球提升']
  fitnessLevel,     // 体能状态描述
  injuries,         // string[]，伤病，如 ['膝盖不适']

  // DeepSeek 生成字段
  aiPersonality,        // 性格标签，如 '稳定型底线建立者'
  currentStage,         // 成长阶段，如 '稳定性建立期'
  aiStrengths,          // string[]，AI 分析的优势
  aiWeaknessSummary,    // 弱点总结（单条字符串）
  aiTrainingFocus,      // 当前训练重点，如 '提前引拍 + 小碎步启动'
  aiWeeklyPlan,         // 周训练计划，格式 '周二：XXX / 周四：YYY'
  techScores: {         // 五维技术评分（0~100）
    forehand,           // 正手
    backhand,           // 反手
    serve,              // 发球
    footwork,           // 步伐
    volley              // 截击
  },
  aiCoachNote,          // 教练点评（1~2句）
  portraitGeneratedAt   // 生成时间戳（ms）
}
```

> ✅ **0.1.7 已修复**：`generatePortrait` 写入前先 `get()` 已有文档，`Object.assign` 合并后再 `set()`，`_id/_openid` 写前 `delete`，不再覆盖 `savePlayer` 字段。

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
| `saveGear` | 装备页保存操作 | `doc(OPENID).update({ gear })` 仅更新 gear 字段，不影响其他档案字段（0.2.5 新增）|
| `saveSwingStats` | 自由训练结束上报 | 读取现有 `swingStats` 累加正反手次数后写回，`sessions+1`，更新 `lastSession`（0.2.7 新增）|
| `generatePortrait` | （暂停使用，0.1.8 移除入口）| 调用 DeepSeek API 生成 AI 球员画像，`doc(OPENID).set()` 写入 players；云函数保留供未来 H5 版本调用 |
| `askCoach` | （暂停使用，0.1.8 移除入口）| 将对话历史 + 球员画像上下文传给 DeepSeek，流式返回教练回复；云函数保留供未来 H5 版本调用 |

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

## 0.1.0 修复与迭代记录（2026-06-08）

### 首页（index）UI & 逻辑修复

| 文件 | 问题 | 修复 |
|------|------|------|
| `index.wxml` | Filter Tab（全部/新手友好/进阶局/竞技局）视觉上容易被误解为已禁用 | 整行加 `wx:if="{{false}}"` 隐藏，JS 逻辑保留 |
| `index.wxss` | Live Banner 上下无间距，与相邻元素视觉拥挤 | 加 `margin-top: 16rpx` / `margin-bottom: 16rpx` |
| `app.js` `computeTimeLabel` | in-progress 返回 `'已打 11 分钟'`，WXML 曾出现"已打 已打 11 分钟"双重拼接 | 改为只返回 `'11 分钟'`，WXML `lc-elapsed` 明确写 `已打 {{post.timeLabel}}`，前缀唯一化 |
| `app.js` `processPost` | 双打球局 `need=2`，显示"2/2 已满员"（应为至少 4 人） | `matchType === 'doubles' && need < 4` 时自动修正 `need = 4` |
| `app.js` `processPost` | in-progress 球局 `joined=0`，Live Card 显示"0/4 人" | `joined===0` 时 fallback 到 `joiners.length \|\| 1` |
| `app.js` `processPost` | `Object.assign({}, p)` 后 `result.joined/need` 仍是原始 DB 值，模板取不到修正后数据 | 显式写入 `result.joined = joined` / `result.need = need` |

### Tennis Mode（tennis-mode）修复

| 文件 | 问题 | 修复 |
|------|------|------|
| `tennis-mode.wxss` | 底部栏背景不够不透明，内容滚到底时时间轴点/线视觉穿透 | `background` 改 `rgba(9,22,16,0.96)`，加 `backdrop-filter: blur(12px)` + `box-shadow: 0 -20rpx 40rpx 8rpx #091610` |
| `tennis-mode.wxml` | scroll-end spacer 不足，全面屏下内容贴近底部栏 | `canControl` 时 spacer 高度 `220 → 280rpx` |
| `tennis-mode.wxss` | 深绿背景上辅助信息（"正在进行"、发起人姓名）颜色过暗，户外弱可读 | `.tm-status-txt` / `.tm-players-label` 透明度 `0.55/0.62 → 0.72` |
| `tennis-mode.js` `addMoment` | `loadMoments` 定时器与 `addMoment` 竞态，可能导致同条动态重复渲染 | DB 写入后检查 `alreadyIn`，已存在则不再 prepend |

### 动态页（feed）头像接入

| 文件 | 变更 |
|------|------|
| `feed.js` `loadFeed` | `rawMoments.map` 后，提取本页所有唯一 author，一次 `players.where({ nickname: _.in([...]) })` 批量拉取 avatarUrl，merge 回 items；失败静默降级 |
| `feed.wxml` `.fi-av` | 有 `avatarUrl` 时渲染 `<image class="fi-av-img" mode="aspectFill"/>`，否则继续显示彩色首字母 |
| `feed.wxss` | `.fi-av` 加 `overflow: hidden`；新增 `.fi-av-img { width:72rpx; height:72rpx }` |

> 评论区头像（comment sheet 内 `cmt-av`）暂未接入真实 avatarUrl，仍用彩色首字母。

---

## 0.1.1 迭代记录（2026-06-08）

### 发帖页定位优化

**问题**：原方案为手动输入球场名 + "定位"按钮获取用户当前坐标（`wx.getLocation`）。用户发帖时往往不在球场附近，导致坐标不准或根本无法使用定位功能。

**方案**：改用 `wx.chooseLocation`（高德地图选择器），用户可直接在地图上搜索任意球场名称并确认，locationName / locationAddress / locationLat / locationLng 四个字段一次性由地图返回，不依赖用户当前位置。

| 文件 | 变更 |
|------|------|
| `post.js` | 移除 `locationPinned` 字段、`onLocationInput`、`pinLocation`；新增 `chooseLocation`（直接调 `wx.chooseLocation`）和 `clearLocation`；fail 回调区分 cancel / 权限拒绝 / 其他三种情况分别处理 |
| `post.wxml` | "在哪打"区域替换为地图选择器卡片：空态（虚线，"点击选择球场"）/ 已选态（绿色边框，显示球场名 + 详细地址 + "换 ›"） |
| `post.wxss` | 移除 `.loc-input-row` / `.loc-pin-btn` 等旧样式；新增 `.loc-picker` / `.loc-picker-empty` / `.loc-picker-filled` 等选择器卡片样式 |

**数据兼容**：`posts` 集合字段结构不变（`locationName / locationAddress / locationLat / locationLng`），旧帖无坐标时距离不显示，向下兼容。

---

## 0.1.2 迭代记录（2026-06-08）

### 详情页球场导航

Hero 区球场名下新增"📍 查看位置 · 导航 ›"胶囊，仅当帖子有坐标（`locationLat/locationLng`）时显示。点击调用 `wx.openLocation` 打开微信内置地图，用户可选高德/百度/腾讯导航跳转。旧帖无坐标时胶囊不显示，向下兼容。

| 文件 | 变更 |
|------|------|
| `detail.wxml` | hero-location 下方新增 `.hero-nav-chip`，`wx:if="{{post.locationLat}}"` |
| `detail.js` | 新增 `openNavigation()`，调用 `wx.openLocation`，无坐标时 return |
| `detail.wxss` | 新增 `.hero-nav-chip` / `.hero-nav-txt` / `.hero-nav-arr` 样式 |

### 审核文案去社区化

微信审核将小程序判定为"社区"类目，该类目不对个人开发者开放。调整文案将定位从社区改为个人运动记录工具。

| 文件 | 改前 | 改后 |
|------|------|------|
| `app.json` TabBar | `动态` | `记录` |
| `feed.wxml` header 大标题 | `动态` | `运动记录` |
| `feed.wxml` header 副标题 | `TennisF 运动社区` | 删除 |
| `feed.wxml` 空态标题 | `还没有动态` | `还没有记录` |
| `feed.wxml` 列表底部 | `— 已加载全部动态 —` | `— 已加载全部 —` |

> 功能逻辑不变，仅文案调整。提审时需同步修改开发者平台小程序简介，类目建议选"体育 > 运动健身"。

---

## 0.1.3 迭代记录（2026-06-09）

### 审核驳回应对

微信二次驳回原因：小程序含用户自行生成内容的发布/分享/交流，属社交范畴，个人主体不可用。

**移除点赞 / 评论功能**

| 文件 | 变更 |
|------|------|
| `feed.js` | 删除 `likeItem`、`openCommentSheet`、`closeCommentSheet`、`loadComments`、`onCommentInput`、`submitComment`、`isSynthetic`；清理 `likedItems`、`commentSheetOpen` 等相关 data 字段 |
| `feed.wxml` | 移除三种卡片（photo/streak/achievement）的互动栏；删除评论 Sheet；图片/视频卡片保留"🎾 查看球局 ›"跳转链接 |
| `feed.wxss` | 移除 `.fi-actions`、`.fi-act*`、`.fi-actions-hl`、评论 Sheet 全部样式；新增 `.fi-post-link` 跳转链接样式 |

### 接口权限修复

| 问题 | 处理 |
|------|------|
| `wx.getLocation` 个人主体无申请权限 | 移除 index.js 中全部距离计算逻辑（`_fetchUserLocation`、`userLat/userLng`、`_haversineKm`、`_distanceText`） |
| `wx.chooseLocation` 未声明 | app.json 新增 `requiredPrivateInfos: ["chooseLocation"]`，`permission` desc 同步更新 |
| 隐私协议位置信息用途 | 填写："用于在发起球局时选择并记录球场位置，其他球友可据此导航前往球场" |

---

## 0.1.4 修复记录（2026-06-15）

### AI 云函数 Bug 修复

**generatePortrait：OPENID guard**

CLI 本地测试环境 `OPENID` 为 `undefined`，直接执行 DB 查询抛 `查询参数对象值不能均为undefined`。加 `if (OPENID)` guard，仅在真实用户环境执行 DB 写入。

**generatePortrait：DB ID 方案统一**

原实现用 `.add()` 自动生成 `_id`，而 `getPlayer` 用 `db.collection('players').doc(OPENID).get()` 查询（期望 `_id === OPENID`）。两者 ID 方案不匹配，导致重启后档案始终找不到。

| 修改 | 前 | 后 |
|------|----|----|
| `generatePortrait/index.js` | `.where({ _openid: OPENID }).add()/.update()` | `doc(OPENID).set({ data: playerData })` |

现在 `generatePortrait`、`savePlayer`、`getPlayer` 三个函数全部使用 `doc(OPENID)` 作为统一 key。

**全链路超时上调至 90s**

| 位置 | 前 | 后 |
|------|----|-----|
| `app.js` `wx.cloud.init({ timeout })` | 60000 | 90000 |
| `setup.js` / `coach-chat.js` 单次调用 `config: { timeout }` | 60000 | 90000 |
| `cloudbaserc.json` askCoach / generatePortrait 服务端 timeout | 60s | 90s |
| `generatePortrait/index.js` HTTPS 请求超时 | 50000 | 75000 |
| `askCoach/index.js` HTTPS 请求超时 | 50000 | 75000 |

---

## 0.1.5 迭代记录（2026-06-15）

### 成长页（profile）暗色主题完整重设计

**设计语言**

| Token | 值 | 用途 |
|-------|----|------|
| Page BG | `#121C17` | 页面底色 |
| Card BG | `#1A2820` | 卡片底色 |
| Neon Green | `#B2FF33` | 高亮色（CTA、雷达图、streak）|
| Brand Green | `#2BB673` | 辅助绿色 |

**新拟态统计面板**

```css
.stats-board {
  background: #1A2820;
  box-shadow: 8rpx 8rpx 22rpx rgba(0,0,0,0.55), -3rpx -3rpx 10rpx rgba(255,255,255,0.04);
}
```

**毛玻璃编辑按钮**

```css
.edit-btn-glass {
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
  border: 1rpx solid rgba(255,255,255,0.15);
}
```

**CTA 荧光绿发光按钮**

```css
.cta-glow-btn {
  border: 1.5rpx solid #B2FF33;
  box-shadow: 0 0 20rpx rgba(178,255,51,0.32);
}
```

**本周节奏升级**

- `.wd-off`：仅边框，空心圆
- `.wd-on`：渐变填充 + 绿色阴影
- streak tag：`background: linear-gradient(90deg, #FF6B2B, #FF3B3B)`

**Canvas 雷达图**

在 AI 技能分析卡内，`wx.createCanvasContext('radar', this)` 绘制五轴技能图：

- 5 轴：正手 / 反手 / 发球 / 步伐 / 截击
- 4 层同心多边形线框（透明度 0.15→0.05）
- 数据多边形：`rgba(178,255,51,0.18)` 填充 + `rgba(178,255,51,0.82)` 描边
- 数据点：`#B2FF33` 实心圆
- `onShow` 后 150ms 延迟触发（等 DOM ready）

**AI 技能分析卡结构**

```
AI 技能分析卡
├── 标题行：卡片标题 + personality chip
├── stage 文本
├── 教练点评气泡（coachNote）
├── 雷达图（canvas）
└── 训练重点 pill（trainingFocus）
```

**白色 Sheet 保留**：邀请 Sheet、Day Sheet、留言 Sheet 均保持白色背景，与深色页面形成对比层次。

---

## 0.1.6 迭代记录（2026-06-15）

### AI 教练个性化快速提问

**问题**：快速提问为静态题库，与用户实际情况无关。

**方案**：根据档案字段动态生成，优先级从高到低：

1. `aiTrainingFocus` → "怎么有针对性地练习「{focus}」？"
2. `weaknesses[]` → 每个短板对应 WEAKNESS_Q 中第一条
3. `goals[]` → 每个目标对应 GOAL_Q 中第一条
4. `ntrpLevel` → LEVEL_Q 对应的水平问题
5. `weaknesses[]` 每个短板第二条（补深度）
6. `goals[]` 每个目标第二条
7. GENERAL_Q 通用兜底

最终取 pool 前 8 题，显示时每次展示 4 题，"换一换"循环轮播。无档案时 fallback 至静态 FALLBACK_QUESTIONS。

### 删除 AI 教练"本周训练计划"模块

`coach.wxml` 完整删除本周训练计划 section（含 planDays 列表渲染）。`coach.js` 保留 `_parsePlan` 和 `planDays` 数据字段以备将来复用，前端不再展示。

### 删除成就系统

**影响面分析**：`feed.js` 已使用 `(cache.achievements || [])` 防守，空数组不影响动态 Feed 渲染。`activityCache` 保留 `achievements: []` 字段，向下兼容。

| 删除内容 | 位置 |
|---------|------|
| `ALL_ACHIEVEMENTS`、`ACHIEVEMENT_CHECKS` 常量 | `profile.js` |
| `achievements`、`pinnedAchievements`、`pinnedAchievList`、`earnedCount` data 字段 | `profile.js` |
| achievement 处理块（loadActivity 内） | `profile.js` |
| `onAchievTap`、`closeAchievSheet`、`togglePin` 方法 | `profile.js` |
| 成就卡片、成就 Sheet、Hero 置顶成就行 | `profile.wxml` |

### "比赛回忆"改名"训练记录"

`profile.wxml` 第 198 行，节标题文字从"比赛回忆"改为"训练记录"，其余逻辑不变。

---

## 0.1.8 迭代记录（2026-06-16）

### 移除所有 AI 功能（应对审核驳回）

**背景**：微信审核以「深度合成技术（AI 问答）」驳回，个人主体不开放该类目。产品策略调整为：小程序保留纯工具能力，AI 教练功能后续通过独立 H5 实现。

**移除内容**

| 文件 / 页面 | 变更 |
|------------|------|
| `app.json` | 删除 `pages/coach/coach`、`pages/coach-chat/coach-chat`；TabBar `AI教练` → `记录(feed)` |
| `pages/setup/setup` | 步骤从 5 步缩减至 4 步，删除第 5 步（AI 画像生成）；按钮文案 `生成 AI 画像 →` 改为 `完成建档 →`；`_generatePortrait` / `retryGenerate` 方法删除；`_saveAndFinish` 新增，直接调 `savePlayer` 保存全部问卷字段 |
| `pages/setup/setup.wxml` | 删除步骤说明中所有"AI"字样 |
| `pages/profile/profile` | 删除 `aiPortrait` 数据处理、`drawRadarChart` 方法；WXML 删除 AI 技能分析卡（雷达图、personality chip、教练点评气泡、训练重点 pill）|
| `cloudfunctions/savePlayer` | 扩展接收问卷字段：ntrpLevel / rallyCount / strengths / weaknesses / goals / fitnessLevel / injuries（原 generatePortrait 负责保存，现由 savePlayer 兜底）|

云函数 `generatePortrait` / `askCoach` 保留代码，供未来 H5 版本调用。

---

## 0.1.9 迭代记录（2026-06-16）

### 微信登录页（pages/login）

新增专属登录页，替代原有 `setup` 建档流程中的头像/昵称采集。

**交互设计**

- 整行按钮（头像圆圈 + "使用你的微信头像 →" 文字）使用 `open-type="chooseAvatar"`，点击任意位置均触发头像选择器
- `type="nickname"` 输入框，微信键盘顶部出现「使用微信昵称」快捷键，一键填入
- 隐私授权弹窗（底部 Sheet）：`open-type="agreePrivacyAuthorization"` 同意按钮 + 拒绝按钮，对应 `wx.onNeedPrivacyAuthorization` 回调

**隐私合规**

| 项 | 说明 |
|----|------|
| `wx.onNeedPrivacyAuthorization` | `app.js` onLaunch 注册，`_privacyResolve` / `_onPrivacyNeeded` 存 globalData |
| 隐私弹窗 | login 页 `onLoad` 挂载回调，弹窗有 `open-type="agreePrivacyAuthorization"` 按钮 |
| MP 后台配置 | 用户隐私保护指引新增：用户选择头像、用户昵称、相册写入（用途：保存球局分享海报至手机相册）|

### 游客模式

**app.js 变更**

| 前 | 后 |
|----|----|
| `onLaunch` 检测无昵称 → `wx.reLaunch` 到 login | 无强制跳转，游客直接进首页 |
| `requireProfile()` 弹 Modal → 跳 setup | `requireAuth(returnUrl)` 直接 `navigateTo` login 页，带 `?return=` 参数 |
| `app.json` 第一页为 `pages/login/login` | 第一页改为 `pages/index/index` |

**功能页鉴权**

| 功能 | 触发方式 |
|------|---------|
| 组局 | `index.js` 调 `requireProfile()`（内部已改为跳 login）|
| 加入球局 | `detail.js` 昵称为空时弹 `showNicknameSheet`（sheet 含头像/昵称采集）|
| 发布动态 | `post.js` onLoad/onShow 预填；无昵称时 step1 顶部采集区引导填入 |

**login 页登录后跳转**

```javascript
// confirm() 成功后：
if (this._returnUrl) {
  wx.redirectTo({ url: this._returnUrl })   // 有来源页 → 跳回目标
} else {
  wx.switchTab({ url: '/pages/index/index' }) // 直接进入 → 跳首页
}
```

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
- [x] 首页 Filter Tab 隐藏、Live Banner 间距、"已打"双重拼接、双打人数、0人兜底（0.1.0）
- [x] Tennis Mode 底部栏穿透修复、辅助文字对比度提升、动态重复渲染竞态修复（0.1.0）
- [x] 动态页发布者头像接入 players 集合，批量查询 avatarUrl（0.1.0）
- [x] 发帖页定位改为 wx.chooseLocation 地图选择器，去掉手动输入+获取当前位置方案（0.1.1）
- [x] 详情页 Hero 区新增"查看位置 · 导航"胶囊，调用 wx.openLocation，有坐标时显示（0.1.2）
- [x] feed 页文案去社区化："TennisF 运动社区"副标题删除，"动态"统一改为"记录"（0.1.2）
- [x] feed 页移除点赞/评论功能，改为"查看球局"跳转链接（0.1.3）
- [x] index.js 移除 wx.getLocation 距离计算（个人主体无权限），清理相关状态和工具函数（0.1.3）
- [x] app.json 新增 requiredPrivateInfos: chooseLocation；permission desc 更新（0.1.3）
- [x] generatePortrait OPENID guard + DB ID 方案统一为 doc(OPENID).set()，修复重启后档案消失（0.1.4）
- [x] 全链路超时统一上调至 90s（client global / per-call / server-side / HTTPS req）（0.1.4）
- [x] 成长页暗色主题完整重设计：新拟态、毛玻璃、Canvas 雷达图、荧光绿 CTA（0.1.5）
- [x] AI 教练快速提问改为基于用户档案个性化生成，"换一换"循环轮播（0.1.6）
- [x] 删除 AI 教练本周训练计划模块（0.1.6）
- [x] 删除成就系统（profile 完整清理，feed.js 向下兼容）（0.1.6）
- [x] "比赛回忆"→"训练记录"（0.1.6）
- [x] `generatePortrait` 用 `set()` 全量覆盖 players 文档，会抹掉 `savePlayer` 字段；修复：写入前 `get()` 已有文档，`Object.assign` 合并后再 `set()`，TCB 内部字段（`_id/_openid`）写前 `delete`（0.1.7）
- [x] 移除所有 AI 功能（coach / coach-chat 页面，setup AI 画像步骤，profile 雷达图）；云函数保留供未来 H5 调用（0.1.8）
- [x] feed 页图片 500 错误：binderror 降级处理，头像失败显示首字母色块，动态图片失败从列表移除（0.1.8）
- [x] post 页 step1 新增微信信息采集区（头像 + 昵称）；detail 页游客点「上车」弹昵称采集 Sheet（0.1.8）
- [x] 新增 login 页（微信头像 + 昵称，隐私授权弹窗）；游客模式冷启动直接进首页；requireAuth 功能入口按需触发（0.1.9）
- [x] MP 后台隐私保护指引新增：用户头像、用户昵称、相册写入（保存球局海报）（0.1.9）
- [x] pub-profile 移除荣誉勋章模块（WXML/JS/WXSS 全清）（0.2.4）
- [x] feed 页重构为 Keep 风格沉浸式行动仪表盘：暗色全屏、网球场底纹、三模式 Tab、GO 按钮呼吸动效（0.2.4）
- [x] 自由训练：页内计时器（绿点呼吸 + 大字倒计时 + 结束 toast）（0.2.4）
- [x] 计分比赛：post.js 加 autoTennisMode 参数，建局后直跳 tennis-mode（0.2.4）
- [x] Tab Bar 深色化（`#0D1F16`，荧光绿选中色）（0.2.4）
- [x] 装备模块：gear 页（球拍/球鞋/运动设备增删改）+ saveGear 云函数（0.2.5）
- [x] post 页补隐私授权弹窗，修复 chooseLocation 真机无反馈（_onPrivacyNeeded 回调未挂载）（0.2.6）
- [x] Tab Bar 重命名：训练→约球、记录→训练（0.2.6）
- [x] 成长页"训练记录"改为"挥拍记录"，含正反手统计 + 比例条（0.2.7）
- [x] 自由训练结束后弹挥拍数据上报 sheet + saveSwingStats 云函数（0.2.7）
- [ ] `moments`/`avatars` 云存储安全规则：需控制台配置允许已登录用户上传（见下方说明）
- [ ] 球搭子"约球"按钮目前仅跳转发帖页 + 预填备注，未来可做好友内消息通知闭环
- [ ] H5 AI 教练：独立域名 + server，调用现有 askCoach / generatePortrait 云函数
- [ ] 运动设备数据同步：Phase 2 通过 Apple Health / Garmin Connect 导出数据，对接 AI 教练分析

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
