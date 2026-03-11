/**
 * Wake word detector. Captures audio via AudioWorklet, runs inference, triggers onDetect.
 * Supports start()/stop() for mic capture and feed() for manual audio.
 */

import { init, type WasmWakeEngine } from "@sonnetics/core";
import {
  loadModelPackFromPath,
  loadModelPackFromPathOrId,
  loadModelPackFromId,
  type ModelFiles,
} from "./model-loader.js";

export interface DetectorOptions {
  /** Model ID (UUID). Fetches from https://cdn.sonnetics.com/models/sonnetics-model-{id}.tar.gz */
  wakewordId?: string;
  /** Path to local .tar.gz model file. Node.js only. Must end with .tar.gz. */
  wakeWordPath?: string;
  /** Detection threshold 0–1. Default 0.25. */
  threshold?: number;
  /** Samples per chunk (per channel). Affects onAudioChunk callback rate. Default 2048. */
  chunkSize?: number;
}

/** Root-mean-square of audio samples. Use with onAudioChunk for level meters. */
export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    sum += x * x;
  }
  return Math.sqrt(sum / samples.length);
}

export interface DetectEvent {
  /** Detected phrase (e.g. "wake" for binary, or phrase from manifest labels). */
  phrase: string;
  audio: {
    /** Sample rate in Hz (e.g. 16000, 44100). */
    sampleRate: number;
    /** Number of channels (1 = mono, 2 = stereo). Chunks are interleaved [L,R,L,R,...]. */
    channels: number;
    /** Async iterable of original interleaved audio chunks (f32). */
    read(seconds: number): AsyncIterable<Float32Array>;
  };
}

const DEFAULT_THRESHOLD = 0.25;
const DEFAULT_CHUNK_SIZE = 2048;

/** Ensure plain object for WASM boundary (avoids "files must be an object" from IndexedDB/structured clone). */
function toPlainObject(files: ModelFiles): Record<string, ArrayBuffer> {
  return Object.fromEntries(Object.entries(files));
}

/**
 * Create a detector. Provide wakewordId or wakeWordPath.
 */
export async function createDetector(
  options: DetectorOptions
): Promise<WakeWordDetector> {
  const {
    wakewordId,
    wakeWordPath,
    threshold = DEFAULT_THRESHOLD,
    chunkSize = DEFAULT_CHUNK_SIZE,
  } = options;

  let files: ModelFiles;
  if (wakewordId) {
    files = await loadModelPackFromId(wakewordId);
  } else if (wakeWordPath) {
    if (!wakeWordPath.endsWith(".tar.gz")) {
      throw new Error("wakeWordPath must be a path to a .tar.gz file");
    }
    files = await loadModelPackFromPath(wakeWordPath);
  } else {
    throw new Error("Provide wakewordId or wakeWordPath");
  }

  return new WakeWordDetector(files, threshold, chunkSize);
}

export interface WakewordCreateOptions {
  /** Detection threshold 0–1. Default 0.25. */
  threshold?: number;
  /** Samples per chunk (per channel). Default 2048. */
  chunkSize?: number;
}

/**
 * Wakeword: simple factory for creating a detector from path or model ID.
 *
 * @example
 * const detector = await Wakeword.create("path/to/model.tar.gz");
 * const detector = await Wakeword.create("550e8400-e29b-41d4-a716-446655440000");
 */
export const Wakeword = {
  async create(
    pathOrModelId: string,
    options?: WakewordCreateOptions
  ): Promise<WakeWordDetector> {
    const files = await loadModelPackFromPathOrId(pathOrModelId);
    return new WakeWordDetector(
      files,
      options?.threshold ?? DEFAULT_THRESHOLD,
      options?.chunkSize ?? DEFAULT_CHUNK_SIZE
    );
  },
};

interface DetectSession {
  buffer: Float32Array[];
  streamConsumers: Set<() => void>;
  closed: boolean;
  hasConsumer: boolean;
}

function createSession(): DetectSession {
  return {
    buffer: [],
    streamConsumers: new Set(),
    closed: false,
    hasConsumer: false,
  };
}

function closeSession(session: DetectSession): void {
  session.closed = true;
  session.streamConsumers.forEach((resume) => resume());
  session.streamConsumers.clear();
}

export class WakeWordDetector {
  private files: ModelFiles;
  private threshold: number;
  private chunkSize: number;
  private engine: WasmWakeEngine | null = null;
  private onDetectCallback: ((ev: DetectEvent) => void | Promise<void>) | null =
    null;
  private onAudioChunkCallback: ((chunk: Float32Array) => void) | null = null;
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private activeSession: DetectSession | null = null;
  private buffer: Float32Array | null = null;
  private bufferLen = 0;
  private channels = 1;
  private stopped = false;
  private sampleRate: number = 16000; // set when start() or feed() first runs

  constructor(files: ModelFiles, threshold: number, chunkSize: number = DEFAULT_CHUNK_SIZE) {
    this.files = files;
    if (threshold < 0 || threshold > 1) {
      throw new Error("threshold must be between 0 and 1");
    }
    if (chunkSize <= 0 || !Number.isInteger(chunkSize)) {
      throw new Error("chunkSize must be a positive integer");
    }
    this.threshold = threshold;
    this.chunkSize = chunkSize;
  }

  /**
   * Register callback for wake detection. Call start() to begin capturing.
   */
  onDetect(callback: (ev: DetectEvent) => void | Promise<void>): void {
    this.onDetectCallback = callback;
  }

  /**
   * Register callback for raw audio chunks. Fired on each chunk when using start() or feed().
   * Use with rms() for level meters: onAudioChunk((chunk) => setLevel(rms(chunk))).
   */
  onAudioChunk(callback: (chunk: Float32Array) => void): void {
    this.onAudioChunkCallback = callback;
  }

  /**
   * Start capturing and listening. Requires user gesture (e.g. click) for getUserMedia.
   * Pass pre-created context/stream to avoid autoplay - create them on click before loading the model.
   */
  async start(
    existingContext?: AudioContext,
    existingStream?: MediaStream
  ): Promise<void> {
    this.stopped = false;
    if (existingContext && existingStream) {
      this.context = existingContext;
      this.stream = existingStream;
    } else {
      this.context = new AudioContext();
      if (this.context.state === "suspended") {
        await this.context.resume();
      }
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.sampleRate = this.context.sampleRate;

    const source = this.context.createMediaStreamSource(this.stream);
    const processor = await this.createProcessor();

    source.connect(processor);
    processor.connect(this.context.destination);

    processor.port.onmessage = (e: MessageEvent<{ channels?: number; data?: Float32Array; debug?: boolean }>) => {
      if (this.stopped) return;
      if (e.data.debug) return;
      const { channels, data } = e.data;
      if (!data) return;

      if (!this.engine) {
        this.channels = channels;
        this.engine = init(toPlainObject(this.files), this.sampleRate, channels);
        this.buffer = new Float32Array(this.chunkSize * channels);
      }

      const chunkSamples = this.chunkSize * this.channels;
      for (let i = 0; i < data.length; i++) {
        this.buffer![this.bufferLen++] = data[i];
        if (this.bufferLen >= chunkSamples) {
          const chunk = this.buffer!.slice(0, chunkSamples);
          if (this.onAudioChunkCallback) {
            this.onAudioChunkCallback(chunk);
          }
          const phrase = this.engine!.detect(chunk, this.threshold);
          if (phrase !== null && phrase !== undefined && this.onDetectCallback) {
            if (this.activeSession) closeSession(this.activeSession);
            const session = createSession();
            this.activeSession = session;
            const ev = this.createDetectEvent(session, phrase);
            Promise.resolve(this.onDetectCallback(ev)).catch(console.error);
          } else if (
            this.activeSession &&
            this.activeSession.hasConsumer &&
            !this.activeSession.closed
          ) {
            this.activeSession.buffer.push(chunk.slice());
            this.activeSession.streamConsumers.forEach((resume) => resume());
            this.activeSession.streamConsumers.clear();
          }
          this.bufferLen = 0;
        }
      }
    };
  }


  /**
   * Manually feed audio samples (f32, interleaved). Runs detection; returns the detected phrase or null.
   * Downmixing is done by the Rust engine. Use when handling audio yourself instead of start().
   */
  feed(audio: Float32Array, sampleRate: number, channels: number = 1): string | null {
    this.ensureEngine(sampleRate, channels);
    const chunkSamples = this.chunkSize * channels;
    for (let i = 0; i + chunkSamples <= audio.length; i += chunkSamples) {
      const chunk = audio.subarray(i, i + chunkSamples);
      this.onAudioChunkCallback?.(chunk);
      const phrase = this.engine!.detect(chunk, this.threshold);
      if (phrase !== null && phrase !== undefined) return phrase;
    }
    return null;
  }

  private ensureEngine(sampleRate: number, channels: number): void {
    if (!this.engine) {
      this.sampleRate = sampleRate;
      this.channels = channels;
      this.engine = init(toPlainObject(this.files), sampleRate, channels);
    }
  }

  /**
   * Stop capturing and release resources.
   */
  stop(): void {
    this.stopped = true;
    if (this.activeSession) {
      closeSession(this.activeSession);
      this.activeSession = null;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.context?.close();
    this.context = null;
  }

  private createDetectEvent(session: DetectSession, phrase: string): DetectEvent {
    const self = this;
    return {
      phrase,
      audio: {
        sampleRate: self.sampleRate,
        channels: self.channels,
        read(seconds: number): AsyncIterable<Float32Array> {
          const size = Math.floor(seconds * self.sampleRate * self.channels);
          return {
            async *[Symbol.asyncIterator]() {
              try {
                session.hasConsumer = true;
                const buf: number[] = [];
                const flush = (): Float32Array | null => {
                  if (buf.length >= size) {
                    const chunk = new Float32Array(size);
                    for (let i = 0; i < size; i++) chunk[i] = buf.shift()!;
                    return chunk;
                  }
                  return null;
                };
                while (!self.stopped && !session.closed) {
                  let got = false;
                  while (session.buffer.length > 0) {
                    const arr = session.buffer.shift()!;
                    for (let i = 0; i < arr.length; i++) buf.push(arr[i]);
                    got = true;
                    let c: Float32Array | null;
                    while ((c = flush()) !== null) yield c;
                  }
                  if (!got) {
                    await new Promise<void>((resolve) => {
                      session.streamConsumers.add(resolve);
                    });
                  }
                }
                // drain remainder
                while (buf.length >= size) {
                  const chunk = new Float32Array(size);
                  for (let i = 0; i < size; i++) chunk[i] = buf.shift()!;
                  yield chunk;
                }
              } finally {
                session.closed = true;
                if (self.activeSession === session) self.activeSession = null;
                session.streamConsumers.forEach((resume) => resume());
                session.streamConsumers.clear();
              }
            },
          };
        },
      },
    };
  }

  private async createProcessor(): Promise<AudioWorkletNode> {
    const workletCode = `
      class WakeCaptureProcessor extends AudioWorkletProcessor {
        process(inputs, outputs, params) {
          const input = inputs[0];
          let channels = 0, frameCount = 0;
          if (input && input.length > 0 && input[0] && input[0].length > 0) {
            channels = input.length;
            frameCount = input[0].length;
            const interleaved = new Float32Array(channels * frameCount);
            for (let i = 0; i < frameCount; i++) {
              for (let ch = 0; ch < channels; ch++) {
                interleaved[i * channels + ch] = input[ch][i];
              }
            }
            this.port.postMessage({ channels, data: interleaved }, [interleaved.buffer]);
          }
          if (this._debugCount == null) this._debugCount = 0;
          if (this._debugCount++ < 5) {
            this.port.postMessage({
              debug: true,
              hasInput: !!input,
              inputLength: input?.length ?? -1,
              ch0Length: input?.[0]?.length ?? -1,
              frameCount,
              channels
            });
          }
          return true;
        }
      }
      registerProcessor('wake-capture', WakeCaptureProcessor);
    `;
    const blob = new Blob([workletCode], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    try {
      await this.context!.audioWorklet.addModule(url);
      return new AudioWorkletNode(this.context!, "wake-capture");
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
