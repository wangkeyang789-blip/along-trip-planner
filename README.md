# 同路 Along

多人协作 AI 旅行规划 Demo。用户创建房间后邀请朋友加入，大家自然讨论旅行想法；页面用浏览器原生语音识别做实时转写，用房间心跳同步共识，用高德地图展示真实地图与地点数据，并用百炼/DashScope 生成低打扰 AI 规划提示。

## 本地运行

```bash
pnpm dev
```

打开 `http://127.0.0.1:3000`，从首页创建或进入房间；当前常用调试房间是 `http://127.0.0.1:3000/room/ALONG-2026`。

## 已接入的能力

- **高德地图**：真实底图、POI 搜索、地点详情、天气、路线接口。
- **浏览器语音转写**：使用 Web Speech API，本项目决定转文字继续走浏览器原生能力，不接云端 ASR。
- **TRTC 语音**：配置已就绪，但不再由麦克风按钮自动启动；兼容性不稳的浏览器会降级到浏览器转写。
- **AI 规划**：`POST /api/ai/plan` 调用百炼/DashScope，读取讨论转写、团队偏好和高德上下文，返回中文规划摘要。
- **房间同步**：内存房间服务、成员心跳、路线/地点选择、转写广播。

## 浏览器支持

| 浏览器 | 浏览器转写 | TRTC 语音 | 备注 |
|---|---|---|---|
| Edge / Chrome | ✅ 推荐 | ✅ 推荐 | 已用于本地自动化验证。 |
| 联想浏览器 / 360 类 Chromium | ⚠️ 可能网络错误或启动即停止 | ❌ 不稳定 | UI 会提示换 Edge/Chrome；转写不再触发 TRTC。 |
| 微信内置 / 受限 WebView | ❌ 不推荐 | ❌ 不推荐 | WebRTC 与 Web Speech 支持都不稳定。 |

## 环境变量

真实密钥只放在 `.env.local`，该文件已被 `.gitignore` 忽略，不要提交。

```env
AMAP_WEB_SERVICE_KEY=
NEXT_PUBLIC_AMAP_JS_KEY=
NEXT_PUBLIC_AMAP_SECURITY_JS_CODE=

TRTC_SDK_APP_ID=
TRTC_SECRET_KEY=
NEXT_PUBLIC_TRTC_REALTIME_TRANSCRIBER=false

DASHSCOPE_API_KEY=
DASHSCOPE_MODEL=qwen-flash
DASHSCOPE_MODELS=

MAX_ROOM_PARTICIPANTS=10
```

`DASHSCOPE_MODEL` 会作为首选模型；未配置 `DASHSCOPE_MODELS` 时，服务端会自动接入内置大语言模型池并在额度耗尽、模型不支持 JSON 输出或返回不可解析结果时轮换到下一个。若需要固定顺序，可用逗号或空格配置 `DASHSCOPE_MODELS=qwen-flash,qwen-turbo,qwen-plus`。

## 核心文件

| 文件 | 说明 |
|---|---|
| `src/components/room-workspace.tsx` | 房间工作台，包含语音转写、AI 提示、路线选择和地图交互。 |
| `src/hooks/use-web-speech.ts` | Web Speech API 封装，处理浏览器兼容、错误提示和无结果提示。 |
| `src/hooks/use-trtc-voice.ts` | TRTC Web SDK v5 语音逻辑与兼容性降级。 |
| `src/hooks/use-room-session.ts` | 房间加入、心跳、转写广播和规划状态同步。 |
| `src/components/map-canvas.tsx` | 高德地图画布和地点交互。 |
| `src/lib/server/dashscope.ts` | 百炼/DashScope OpenAI-compatible 请求封装。 |
| `src/app/api/ai/plan/route.ts` | AI 规划 API，包含返回结构规范化。 |
| `src/lib/server/trtc.ts` | TRTC UserSig 签发。 |
| `src/lib/server/room-store.ts` | 内存房间状态存储。 |

## 验证状态

- `tsc --noEmit`：通过。
- `next build`：通过。
- `GET /api/integrations/status`：在本机配置齐全时返回 `ready: true`。
- 页面实测：在 `http://127.0.0.1:3000/room/ALONG-2026` 点击右侧“地点集中”，会真实调用百炼并显示中文 AI 摘要。

## 注意事项

- 房间数据存在服务进程内存里，重启 dev server 会清空。
- 真实 API Key 不要写进文档或聊天；如果 Key 曾暴露，演示结束后建议在百炼控制台轮换。
- PowerShell 直接打印中文有时会出现乱码，调试中文响应建议用 Node 读取/请求。
