/**
 * sonnetics-js: Wake-word detection for JavaScript and TypeScript.
 *
 * High-level API with internal audio capture (AudioWorklet), model loading from
 * URL or path, and caching (IndexedDB on web, filesystem on Node).
 */

export {
  createDetector,
  type DetectEvent,
  type DetectorOptions,
  rms,
  Wakeword,
  type WakewordCreateOptions,
  type WakeWordDetector,
} from "./detector.js";

export type { WasmWakeEngine } from "@sonnetics/core";
