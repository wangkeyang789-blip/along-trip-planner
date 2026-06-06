# 同路 Along · 项目上下文

更新：2026-06-06（第4版 — 三阶段流水线 + UI精简 + 地图升级）

---

## 一句话目标

多人在线协作旅行规划工具：用户通过语音/文字讨论旅行计划，AI 实时生成路线方案，高德地图展示可视化结果。

---

## 架构概览

```
用户语音 → Web Speech / TRTC 转写
    → room-store 内存房间（conversation.recentTurns）
    → 协调者客户端定时触发
    → POST /api/ai/plan { scope: "compress"|"summary"|"route" }
    → 百炼模型池轮换（按 scope 优选 + 额度耗尽降级）
    → POI 验证环（高德搜索确认坐标）
    → 前端渲染地图 + 三方案选择器
```

---

## 本次更新（第4版）已完成改动

### 新文件
| 文件 | 用途 |
|------|------|
| `src/lib/server/poi-validator.ts` | 服务端 POI 验证环：调高德搜索验证 AI 输出的每个地点，搜不到用推荐替代，两次都搜不到标 `not_found` |
| `src/lib/server/conversation-preprocessor.ts` | 对话预处理：POI 归一化（"长城"→"八达岭长城"）、偏好聚类、去重、冲突检测 |
| `src/components/ai-confirm-card.tsx` | 可交互确认卡：AI 理解摘要 + ✓确认 / ✗修改按钮，确认结果回写 conversation |
| `src/app/share/[code]/page.tsx` | 分享只读页面：展示选中路线的静态快照，无需进房间 |

### 核心改动
| 文件 | 改动 |
|------|------|
| `src/app/api/ai/plan/route.ts` | Prompt 中文化 + 硬约束（真实POI/30km限制/3-6地点）+ 反面示例 + few-shot；动态主题替代硬编码方案名；summary/compress/route 三 scope |
| `src/lib/server/dashscope.ts` | 按 scope 优选模型（compress→flash, summary→turbo, route→max/plus）；`isQuotaExhaustedError` 检测额度耗尽自动跳下一模型；模型池去重 |
| `src/components/room-workspace.tsx` | 冷启动5秒AI开场气泡；新语音到达即时反馈"已收到新对话，正在分析…"；协作摘要改用 AiConfirmCard；路线tabs在右侧；分享/复制按钮；去重"后台收集中"文字 |
| `src/components/map-canvas.tsx` | 标准/卫星双模式（去掉交通）；`setMapStyle` 正确切换；`fitView` 仅waypoint数量变化时触发（不再和用户缩放打架）；路线线条按地图模式适配（标准紫半透 / 卫星金黄高对比）；3D建筑+POI标注 |
| `src/app/globals.css` | 新增 ~400 行专业级样式：ConfirmCard、Route Actions、Map Canvas、Route Sidebar、Sidebar Polish、Map Detail Panel |
| `src/lib/room-contracts.ts` | ConversationSnapshot、RouteVariantSnapshot、RouteSegmentSnapshot 等合约 |
| `src/hooks/use-route-variant-routing.ts` | 按选中方案逐段调高德路径规划 API，填充距离/时间/费用/polyline |

### 时间间隔
- Summary：每 10 秒检查（有新对话才触发）
- Route：每 30 秒检查（有新对话才触发）
- Compress：在 summary 之前自动触发

---

## UI 布局

```
┌─ Header ───────────────────────────────────────┐
│ Logo · 房间名 · 成员头像 · 分享按钮              │
├──────────┬─────────────────────┬───────────────┤
│ 左侧栏    │  地图画布            │ 路线侧栏       │
│ 300px    │  flex: 1            │ 280px         │
│          │                     │               │
│ 语音转写  │  标准/卫星切换        │ 3个方案选择    │
│ AI确认卡  │  路线 polyline       │ 路线段详情     │
│ 房间成员  │  POI 标记点           │ 复制/分享按钮  │
├──────────┴─────────────────────┴───────────────┤
│ Footer · 协作同步中 · N人在线 · 房间码 · 麦克风  │
└────────────────────────────────────────────────┘
```

---

## 模型池策略

| Scope | 优先级 |
|-------|--------|
| compress | qwen-flash → qwen-turbo → 全部 |
| summary | qwen-turbo → qwen-plus → qwen-flash → 全部 |
| route | qwen-max → qwen-plus → qwen-turbo → qwen-flash → glm-4.5-air → 全部 |

额度耗尽（429/402/insufficient_quota）自动跳过，不中断。

---

## 地图配置

- 标准模式：`TileLayer({ lang: 'zh_cn' })` + `setFeatures(["bg","road","building","point"])` + `mapStyle: normal`
- 卫星模式：`TileLayer.Satellite()`
- 路线线条：标准=紫色半透(strokeOpacity 0.45) / 卫星=金黄(strokeColor #FFD54F, opacity 0.75)
- `fitView` 仅 waypoint 数量变化时触发，不干扰用户手动缩放

---

## 环境配置 (.env.local)

```env
AMAP_WEB_SERVICE_KEY=<高德 Web 服务 Key>
NEXT_PUBLIC_AMAP_JS_KEY=<高德 JS API Key>
NEXT_PUBLIC_AMAP_SECURITY_JS_CODE=<高德安全密钥>
TRTC_SDK_APP_ID=<TRTC SDK App ID>
TRTC_SECRET_KEY=<TRTC Secret Key>
DASHSCOPE_API_KEY=<百炼 API Key>
DASHSCOPE_MODELS=qwen-flash,qwen-turbo,qwen-plus
```

---

## 启动命令

```powershell
$bundledNode = 'C:\Users\14478\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Start-Process -WindowStyle Hidden -FilePath $bundledNode -ArgumentList "node_modules\next\dist\bin\next dev . -p 3000" -WorkingDirectory "C:\Users\14478\Documents\黑客松"
```

## TypeScript 验证

```powershell
& $bundledNode node_modules/typescript/bin/tsc --noEmit --skipLibCheck
# 当前状态：0 errors ✓
```

---

## 已知问题

1. TRTC 内部警告（不影响核心流程）
2. 浏览器扩展导致 hydration 不匹配（已 suppressHydrationWarning）
3. Room 数据存进程内存，重启清空
4. share 页面依赖房间 API（同进程内可用）

---

## 待改进

1. 持久化存储（数据库/文件）
2. 移动端适配
3. 高德路书导出（分享给朋友导航）
4. 自定义地图样式编辑器集成