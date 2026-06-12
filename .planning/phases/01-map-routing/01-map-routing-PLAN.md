---
phase: "01"
plan: "map-routing"
type: auto
autonomous: true
wave: 1
depends_on: []
---

# Phase 01 Plan map-routing: 增强地图与路径规划功能

## Objective
改进 "Along 同路" 旅行规划应用的地图加载体验、路径规划展示链路，并完善 AMap Key 配置指引，确保在无 Key 时优雅降级到 SVG fallback 地图。

## Context
- `src/components/map-canvas.tsx` — 地图组件（AMap JS API + SVG fallback）
- `src/components/trip-recorder.tsx` — 行程记录器，传递 routePolylines 给 MapCanvas
- `src/hooks/use-route-variant-routing.ts` — 路径规划 Hook
- `src/app/api/amap/route/route.ts` — 路径规划 API
- `src/app/globals.css` — 地图相关样式
- `.env.local` — AMap Key 配置

## Tasks

### Task 1: 改进 map-canvas.tsx 加载体验
**Type:** auto
- 当 `jsKey` 为空时，在 fallback 地图上叠加配置指引提示
- `loading` 状态显示 spinner 而非空白
- `error` 状态显示友好错误信息和重试按钮
- 确保 satellite 模式切换时 polyline 颜色正确

### Task 2: 验证并修复 routePolylines 展示链路
**Type:** auto
- 检查 `trip-recorder.tsx` 中 `routePolylines` 的计算和传递
- 确保 `MapCanvas` 的 `useEffect` 正确绘制 polyline
- 验证 polyline 坐标格式 `[lng, lat]`

### Task 3: 改进行程单路线展示
**Type:** auto
- 确保每个 segment 显示交通方式、距离、时间
- 如果 `routeStatus === "partial"`，显示部分路线可用提示

### Task 4: 准备 AMap Key 配置指引
**Type:** auto
- 在 `.env.local` 中添加 Key 获取注释说明
- 在 fallback 界面上添加文字提示

### Task 5: 验证
**Type:** auto
- 确认 SVG fallback 地图正常显示
- 确认提示文字清晰可见
- TypeScript 编译通过
- 截图验证效果

## Verification
- [ ] map-canvas.tsx 在无 Key 时显示配置指引
- [ ] loading 状态有 spinner
- [ ] error 状态有重试按钮
- [ ] routePolylines 正确传递给 MapCanvas
- [ ] 行程单显示 segment 交通方式/距离/时间
- [ ] partial 路线状态有提示
- [ ] TypeScript 编译通过
- [ ] 截图验证 fallback 地图效果

## Output
- 修改文件：`src/components/map-canvas.tsx`, `src/components/trip-recorder.tsx`, `.env.local`
- 可能修改：`src/app/globals.css`
