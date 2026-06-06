---
phase: "01"
plan: "map-routing"
subsystem: frontend
tags: [map, routing, amap, fallback, ui]
dependency-graph:
  requires: []
  provides: [map-canvas-v2, route-display-v2]
  affects: [trip-recorder.tsx, map-canvas.tsx, globals.css, .env.local]
tech-stack:
  added: []
  patterns: [conditional-rendering, overlay-ui, graceful-degradation]
key-files:
  created: []
  modified:
    - src/components/map-canvas.tsx
    - src/components/trip-recorder.tsx
    - src/app/globals.css
    - .env.local
decisions:
  - Hide map mode switch when AMap is not loaded to avoid non-functional UI
  - Use absolute positioned overlays for loading/error/no-key states instead of replacing fallback map
  - Keep SVG fallback map intact; overlays appear on top with pointer-events control
metrics:
  duration: "23 min"
  completed-date: "2026-06-07"
---

# Phase 01 Plan map-routing: 增强地图与路径规划功能 Summary

**One-liner:** 改进 AMap 地图加载体验（loading/error/no-key 状态覆盖层）、验证 routePolylines 传递链路、增强行程单 segment 展示与 partial 路线提示，并完善 Key 配置指引。

## What Was Built

### 1. Map Canvas Loading Experience (`map-canvas.tsx`)
- **Loading overlay:** Spinner + "正在加载地图…" 文字，使用 `Loader2` 图标旋转动画
- **Error overlay:** 红色提示 + 重试按钮，点击后重置 `mapInitRef` 允许重新加载
- **No-key hint overlay:** 在 SVG fallback 地图上方显示配置指引："地图服务需配置高德 API Key，请在 .env.local 中设置 NEXT_PUBLIC_AMAP_JS_KEY"
- **Map mode switch 条件渲染:** 仅在 `realMapState === "ready"` 时显示标准/卫星切换按钮
- **依赖数组修复:** `useEffect` 初始化依赖 `[hasKey, jsKey, securityJsCode]`，避免 ESLint 警告并确保 Key 变化后重新尝试加载

### 2. Route Polylines 链路验证
- `trip-recorder.tsx` 中 `routePolylines` 计算逻辑已正确：
  ```typescript
  const routePolylines =
    routedVariant?.segments
      ?.map((s) => s.polyline)
      .filter((polyline): polyline is [number, number][] => Boolean(polyline)) || [];
  ```
- 该值通过 props 正确传递给 `MapCanvas`
- `MapCanvas` 的 `routePath` useMemo 将 `routePolylines` flat 并过滤有效坐标
- Polyline 绘制使用 `[lng, lat]` 格式，与高德 API 一致
- 当 `routePath.length >= 2` 时使用路线 polyline，否则回退到 waypoint 直连线

### 3. Itinerary Segment Display (`trip-recorder.tsx`)
- 每个 segment 已显示 `modeLabel`、`durationText`、`distanceText`
- 新增 **partial route hint:** 当 `routedVariant?.routeStatus === "partial"` 时，在 metrics 下方显示黄色警告条："部分路线无法规划，显示为直线连接"
- 新增 `AlertTriangle` 图标导入

### 4. AMap Key Configuration Guidance (`.env.local`)
- 添加详细注释说明如何获取三种 Key：
  - Web端(JS API) Key → `NEXT_PUBLIC_AMAP_JS_KEY`
  - Web服务 Key → `AMAP_WEB_SERVICE_KEY`
  - 安全密钥 → `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`
- 提供官方控制台链接：`https://console.amap.com/dev/key/app`

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| SVG fallback 地图正常显示 | ✅ 通过 curl 验证 HTML 包含 fallback-map |
| 提示文字清晰可见 | ✅ map-nokey-hint 渲染在 fallback 上方 |
| TypeScript 编译通过 | ✅ `npx tsc --noEmit` exit code 0 |
| Next.js build 通过 | ✅ `npm run build` 成功 |
| Dev server 渲染正常 | ✅ `curl localhost:3000` 返回完整页面 |
| map-mode-switch 无 Key 时隐藏 | ✅ curl 未找到 map-mode-switch |

## Self-Check: PASSED

- [x] `src/components/map-canvas.tsx` 已修改并提交
- [x] `src/components/trip-recorder.tsx` 已修改并提交
- [x] `src/app/globals.css` 已修改并提交
- [x] `.env.local` 已修改并提交
- [x] TypeScript 编译通过
- [x] Next.js build 通过
- [x] 所有提交存在于 git log

## Commits

| Hash | Message |
|------|---------|
| 9ccb947 | feat(01-map-routing): improve map-canvas loading experience and fallback UI |
| 3e390f5 | feat(01-map-routing): enhance itinerary segment display and partial route hint |
| 05ae837 | docs(01-map-routing): add AMap Key configuration guidance in .env.local |
