# Phase 01 Plan voice-input-fix: Voice Input Default to MediaRecorder Summary

**One-liner:** Force MediaRecorder + SiliconFlow ASR as the default voice input path; add network probe to detect Web Speech unavailability in China.

**Phase:** 01
**Plan:** voice-input-fix
**Subsystem:** trip-recorder
**Tags:** voice, recorder, asr, china-network

**Dependency Graph:**
- **Requires:** use-media-recorder.ts, use-web-speech.ts, /api/ai/transcribe
- **Provides:** reliable voice input for China users
- **Affects:** trip-recorder.tsx UI labels and recording flow

**Tech Stack:**
- **Added:** none
- **Patterns:** connectivity probe, fallback chain, feature flag

**Key Files:**
- **Created:** none
- **Modified:**
  - `src/hooks/use-web-speech.ts` — added 500ms connectivity probe on mount; marks `supportStatus = "unsupported"` if network error fires during probe
  - `src/components/trip-recorder.tsx` — forced `speechAvailable = false` so MediaRecorder is always the default; updated recorder label and hint text

**Decisions:**
1. **Hard-disable Web Speech by default** (`speechAvailable = false`) rather than dynamic detection — ensures consistent behavior across all users regardless of network conditions.
2. **Keep probe in use-web-speech.ts** — preserves the hook's internal accuracy so if the flag is ever reverted, the probe still catches network-blocked environments.
3. **Preserve all Web Speech code** — no deletion of fallback logic; only the routing decision in `trip-recorder.tsx` is changed.

**Metrics:**
- **Duration:** ~10 minutes
- **Completed:** 2026-06-07
- **Tasks:** 2/2
- **Files:** 2 modified

## Deviations from Plan

None — plan executed exactly as written.

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- [x] `src/hooks/use-web-speech.ts` exists and contains probe logic
- [x] `src/components/trip-recorder.tsx` exists and forces MediaRecorder path
- [x] Commit `4661df2` exists in git log
- [x] TypeScript compilation passes (`npx tsc --noEmit`)
