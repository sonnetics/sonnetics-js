/**
 * sonnetics-js: Wake-word detection for JavaScript and TypeScript.
 *
 * High-level API with internal audio capture (AudioWorklet), model loading from
 * URL or path, and caching (IndexedDB on web, filesystem on Node).
 */

export {
  type DetectEvent,
  Wakeword,
  type WakeWordDetector,
} from "./detector.js";
