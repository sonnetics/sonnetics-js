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
  Wakeword,
  type WakewordCreateOptions,
  type WakeWordDetector,
} from "./detector.js";

export {
  loadModelPack,
  loadModelPackFromPath,
  loadModelPackFromId,
  loadModelPackFromPathOrId,
  type ModelFiles,
} from "./model-loader.js";
export { init } from "sonnetics-core";
export type { WasmWakeEngine } from "sonnetics-core";
