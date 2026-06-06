---
phase: "02"
plan: xfyun-asr
subsystem: asr
---

# Phase 02 Plan xfyun-asr: iFlytek Real-Time Speech Recognition Integration Summary

**One-liner:** Replace MediaRecorder + SiliconFlow ASR with iFlytek RTASR WebSocket streaming for real-time "speak-and-transcribe" UX.

## What Was Built

1. **Backend auth route** (`src/app/api/asr/xfyun-url/route.ts`)
   - Generates signed WebSocket URL using HmacSHA1(MD5(appid + ts), apiKey) per iFlytek spec.
   - Returns `{ url: "wss://rtasr.xfyun.cn/v1/ws?..." }`.
   - Returns 500 if `APPID` / `APIKey` missing.

2. **Frontend hook** (`src/hooks/use-xfyun-asr.ts`)
   - `useXfyunRealtimeASR()` exposing: `status`, `transcript`, `interimText`, `error`, `isRecording`, `start()`, `stop()`, `clear()`.
   - WebSocket lifecycle: fetch URL → connect → wait for `started` → begin `AudioContext` + `ScriptProcessorNode` capture.
   - Audio pipeline: `getUserMedia` → `MediaStreamSource` → `ScriptProcessorNode` (bufferSize 4096) → downsample to 16kHz → Float32 → Int16 PCM → binary WebSocket send.
   - Result parsing: handles `action=result` with `type=1` (interim) and `type=0` (final), extracting text from `cn.st.rt[].ws[].cw[].w`.
   - End-of-stream: sends `{ "end": true }` binary marker on `stop()`.
   - Cleanup: closes WebSocket, stops `ScriptProcessorNode`, closes `AudioContext`, releases microphone tracks on unmount / stop / clear.

3. **Component update** (`src/components/trip-recorder.tsx`)
   - Replaced `useMediaRecorder` with `useXfyunRealtimeASR`.
   - Recording button toggles `asr.start()` / `asr.stop()`.
   - Displays `interimText` live during recording.
   - On `status === "completed"`, appends `transcript` to `transcriptLog` and triggers `requestPlan()`.
   - Removed MediaRecorder auto-ASR `useEffect` and related UI (audio playback, transcribing spinner, transcribe error).
   - Preserved text-input fallback and all other features (AI planning, map, itinerary, city selector).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Variable used before declaration (TDZ)**
- **Found during:** TypeScript compilation
- **Issue:** `requestPlan` and `showNotice` were referenced in the ASR-completion `useEffect` before their `useCallback` declarations, causing TS2448/TS2454.
- **Fix:** Moved `showNotice` declaration above the effect; rewrote the completion handler to use `setTimeout` to defer `requestPlan` invocation, avoiding the circular dependency / TDZ issue.
- **Files modified:** `src/components/trip-recorder.tsx`
- **Commit:** 6c8cdf0

## Known Stubs

None — all data flows are wired end-to-end.

## Threat Flags

None — no new auth paths, network endpoints beyond the documented ASR auth route, or schema changes at trust boundaries.

## Key Decisions

1. **Deferred `requestPlan` in completion handler:** Used `setTimeout(..., 0)` instead of direct invocation to break the temporal dead zone dependency between the `useEffect` and the `useCallback` declared later in the same component. This is a safe pattern because React guarantees state updates are batched and the callback will execute after the current render cycle.

2. **Kept `use-web-speech.ts` and `use-media-recorder.ts` untouched:** Per constraint, both files remain in the repo as fallbacks but are no longer imported by `trip-recorder.tsx`.

3. **AudioContext sampleRate set to 16000:** Modern browsers support `AudioContext({ sampleRate: 16000 })`, which avoids the need for manual downsampling when the hardware sample rate matches. The `downsampleBuffer` helper is still present as a defensive fallback.

## Self-Check: PASSED

- [x] `src/app/api/asr/xfyun-url/route.ts` exists
- [x] `src/hooks/use-xfyun-asr.ts` exists
- [x] `src/components/trip-recorder.tsx` modified
- [x] TypeScript compilation passes (`npx tsc --noEmit`)
- [x] Commit `6c8cdf0` exists
