# 同路 Along

多人语音协作旅行规划 Demo。朋友在房间内自然讨论，AI 静默整理共识、推动关键选择，并把讨论逐步转化为地图路线。

## 当前状态

已完成一个可跑的产品 Demo：

- 首页、邀请加入页和多人协作工作台
- 创建房间、复制链接、微信扫码加入、成员心跳与静音状态
- 房间内路线选择、地图选点、方向选择实时同步
- 高德 Web Service 数据代理与高德 JS API 2.0 真实底图接入
- TRTC Web SDK v5 语音进房、UserSig 签发与可选实时转写插件
- 百炼/Qwen OpenAI 兼容接口用于结构化规划 Agent
- 外部 key 未配置时明确返回“待配置”，不使用虚拟地点事实

当前为了低成本和开发速度，房间状态保存在 Next.js 服务进程内存里；重启 dev server 后房间会清空。Demo、小型路演和黑客松足够，正式上线再换 Redis/Supabase/数据库。

## 本地运行

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:3000`。

## 环境变量

复制 `.env.example` 为 `.env.local`，按需配置：

- `AMAP_WEB_SERVICE_KEY`：高德 Web 服务 Key，用于 POI、图片字段、天气和路线
- `NEXT_PUBLIC_AMAP_JS_KEY`：后续接高德 JS 地图时使用
- `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`：高德 JS API 安全密钥
- `TRTC_SDK_APP_ID`、`TRTC_SECRET_KEY`：腾讯云实时音视频房间与 UserSig
- `NEXT_PUBLIC_TRTC_REALTIME_TRANSCRIBER`：是否启动 TRTC 实时转写插件，默认 `false`
- `DASHSCOPE_API_KEY`：百炼/Qwen 规划与 Paraformer ASR
- `MAX_ROOM_PARTICIPANTS`：房间人数上限，默认 10

配置后访问 `GET /api/integrations/status` 可检查全部服务是否就绪。

## 主要路由

- `/`：产品首页
- `/join/:code`：邀请加入页
- `/room/:code`：协作工作台

## 服务接口

- `POST /api/rooms`：创建房间
- `GET /api/rooms/:code`：读取房间快照
- `POST /api/rooms/:code/join`：加入房间
- `POST /api/rooms/:code/heartbeat`：成员在线、静音、发言状态心跳
- `PATCH /api/rooms/:code/state`：同步当前路线、地点和选择
- `POST /api/trtc/usersig`：配置 TRTC 后签发 UserSig
- `GET /api/amap/status`：高德配置状态
- `GET /api/amap/search`、`GET /api/amap/detail`、`GET /api/amap/weather`、`POST /api/amap/route`：高德数据代理
- `POST /api/ai/plan`：配置百炼后生成结构化规划建议
- `GET /api/asr/status`：ASR 配置状态
- `GET /api/integrations/status`：所有外部集成配置状态
