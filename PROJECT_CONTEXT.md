# Along 同路项目上下文压缩文档

## 项目目标

Along 是一个多人协作 AI 旅行规划 Demo 网站。用户创建房间后，通过链接或二维码邀请朋友加入；多人自然语音讨论旅行想法，AI 在后台低打扰倾听、整理共识、生成建议，并把路线和地点在地图上实时更新。

核心产品原则：

- 不展示逐字语音转写，只显示“AI 正在倾听 / 正在整理”等轻量状态。
- AI 提示要克制，不打断讨论，必要时用旁边的小选择卡引导。
- 页面风格是简约、艺术、浅色、低对比度，参考用户给的路线规划 UI 图。
- 地点、图片、营业时间、路线、交通等事实信息只使用真实 API 返回，不自建虚拟数据。
- Demo 以低成本为优先，不上大型数据库；当前房间状态使用 Next.js 服务进程内存保存。

## 当前技术栈

- Next.js 15 App Router
- React 19
- TypeScript
- CSS 自定义视觉系统
- lucide-react 图标
- react-qr-code 二维码
- @amap/amap-jsapi-loader 高德 JS API
- trtc-sdk-v5 腾讯云 TRTC Web SDK

本地路径：

`C:\Users\14478\Documents\黑客松`

本地运行：

```bash
pnpm dev
```

主要页面：

- `/` 首页
- `/join/:code` 加入页
- `/room/:code` 协作工作台

## 已完成内容

### 产品 UI

- 首页高质量视觉与产品预览。
- 加入页，输入称呼后加入房间。
- 房间页三栏布局：协作摘要、地图、AI 建议/地点详情。
- 分享弹窗，支持复制链接、系统分享、微信扫码。
- 最终方案弹窗，展示当前路线、成员、地点列表。
- 响应式布局，窄屏会隐藏部分桌面侧栏按钮。

### 房间协作

- `POST /api/rooms` 创建房间。
- `GET /api/rooms/:code` 获取房间快照。
- `POST /api/rooms/:code/join` 加入房间。
- `POST /api/rooms/:code/heartbeat` 成员在线、静音、发言状态心跳。
- `PATCH /api/rooms/:code/state` 同步当前路线、地点、选择。
- `useRoomSession` 负责本地 memberId、localStorage、轮询、心跳、静音状态。

注意：房间数据目前在服务进程内存中，重启 dev server 会清空。Demo 足够，正式上线建议换 Redis/Supabase/数据库。

### 高德接入

已完成服务端代理：

- `GET /api/amap/status`
- `GET /api/amap/search`
- `GET /api/amap/detail`
- `GET /api/amap/weather`
- `POST /api/amap/route`

已完成前端：

- `useAmapData` 会检查高德 Web Service Key。
- 有 Key 时请求 POI、图片字段、天气、路线。
- `MapCanvas` 有高德 JS Key 和坐标时会加载真实高德底图。
- 没有 Key 时保持艺术化预览地图，并明确显示“待配置”。

### TRTC 接入

已完成：

- `POST /api/trtc/usersig` 后端签发 UserSig。
- `useTrtcVoice` 使用 `trtc-sdk-v5` 进入字符串房间。
- 支持加入语音、断开语音、静音/开麦。
- 已接入 `RealtimeTranscriber` 插件入口，可通过 env 开启。

当前策略：

- 没有 TRTC Key 时，按钮只切换本地静音 UI 并提示“配置 TRTC 后启用真实语音”。
- 默认不展示逐字转写，符合低打扰原则。

### 百炼/Qwen AI 接入

已完成：

- `POST /api/ai/plan`
- 使用 DashScope OpenAI 兼容接口。
- 要求模型只输出 JSON。
- 严格提示：不得虚构地点图片、营业时间、评分、排队、交通等事实。
- AI 规划会接收当前路线、偏好、高德上下文。

### 集成状态

已完成：

- `GET /api/integrations/status`

用于统一检查：

- 高德 Web Service
- 高德 JS API
- TRTC
- DashScope/百炼

## 需要用户授权/配置的 API Key

`.env.example` 已列出：

```env
AMAP_WEB_SERVICE_KEY=
NEXT_PUBLIC_AMAP_JS_KEY=
NEXT_PUBLIC_AMAP_SECURITY_JS_CODE=

TRTC_SDK_APP_ID=
TRTC_SECRET_KEY=
NEXT_PUBLIC_TRTC_REALTIME_TRANSCRIBER=false

DASHSCOPE_API_KEY=
DASHSCOPE_MODEL=qwen-flash

MAX_ROOM_PARTICIPANTS=10
```

用户需要操作：

1. 高德开放平台
   - Web 服务 Key：`AMAP_WEB_SERVICE_KEY`
   - JS API Key：`NEXT_PUBLIC_AMAP_JS_KEY`
   - JS API 安全密钥：`NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`
   - 允许域名加入 `localhost` 和未来线上域名

2. 腾讯云 TRTC
   - 创建 TRTC 应用
   - 获取 `SDKAppID` 和 `SecretKey`
   - 填 `TRTC_SDK_APP_ID`、`TRTC_SECRET_KEY`
   - 如要启用实时转写，设 `NEXT_PUBLIC_TRTC_REALTIME_TRANSCRIBER=true`

3. 阿里云百炼
   - 获取 DashScope/百炼 API Key
   - 填 `DASHSCOPE_API_KEY`

配置后重启 dev server。

## 最近正在处理的问题

用户反馈“很多按钮点了没有反应”。

已处理方向：

- 给房间页大部分看起来可点的按钮增加动作或轻提示。
- 地图模式、缩放、定位已有反馈。
- 顶部通知、标题、头像已有反馈。
- 偏好调整、AI 更多、地点详情、保留当前路线已有反馈。
- 底部麦克风、语音、更多、离开已有反馈。
- 最终方案里的查看地点、分享当前方案已有动作。
- 加入页“检查设备”已接麦克风权限检测。
- 首页产品预览里的“少走一点 / 保留经典”会创建房间。

最新状态：

- `tsc --noEmit` 已通过。
- `git diff --check` 已通过。
- 最近一次完整 `next build` 在按钮最终小修前通过；最后修了“分享当前方案”状态切换顺序后还没有再次跑 build。

待继续验证：

- 刷新页面后重新点击“查看方案 -> 分享当前方案”，确认分享弹窗打开。
- 再跑一次 `next build`。
- 浏览器验收桌面宽屏和窄屏两种布局。

## 重要文件

- `src/components/room-workspace.tsx` 房间工作台主界面
- `src/components/map-canvas.tsx` 地图预览/高德底图
- `src/components/home-screen.tsx` 首页
- `src/components/join-screen.tsx` 加入页
- `src/components/share-dialog.tsx` 分享弹窗
- `src/hooks/use-room-session.ts` 房间 session、心跳、同步
- `src/hooks/use-amap-data.ts` 高德数据拉取
- `src/hooks/use-trtc-voice.ts` TRTC 语音
- `src/lib/server/room-store.ts` 内存房间服务
- `src/lib/server/amap.ts` 高德服务端代理
- `src/lib/server/trtc.ts` TRTC UserSig
- `src/lib/server/dashscope.ts` 百炼/Qwen 请求
- `src/app/api/integrations/status/route.ts` 集成状态

## 继续开发建议

优先级建议：

1. 完成按钮验收，把所有明显可点元素都处理成动作、提示或 disabled。
2. 用户填入高德 Key 后先联调高德 POI、图片、天气、路线。
3. 用户填入 TRTC Key 后联调真实多人语音。
4. 用户填入 DashScope Key 后联调 AI 规划 JSON 输出。
5. 若 Demo 要更稳，下一步把房间内存状态换成 Redis/Supabase。

## 当前注意事项

- PowerShell 默认输出中文可能乱码，文件实际是 UTF-8，浏览器显示正常。
- 使用 `apply_patch` 编辑文件，不要用 shell 重写文件。
- 项目当前 git 状态是未初始化提交的大量未跟踪文件。
- 不要编造大众点评/美团数据；项目已放弃这些授权路径。
- 高德可能能返回图片字段，但是否有图取决于 POI 实际返回。
