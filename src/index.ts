/**
 * sonnetics-js: Wake-word detection for JavaScript and TypeScript.
 *
 * High-level API with internal audio capture (AudioWorklet), model loading from
 * URL or path, and caching (IndexedDB on web, filesystem on Node).
 */

export {
    type DetectEvent,
    Detector,
    type WakeWordDetector,
    type DetectorParams,
} from "./detector.js";
export {
    loadModelPackFromId,
    loadModelPackFromPath,
    loadModelPackFromUrl,
    MODEL_ID_PREFIX,
    normalizeModelId,
    type ModelFiles,
} from "./model-loader.js";
