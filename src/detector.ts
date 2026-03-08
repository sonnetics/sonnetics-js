/**
 * Wake word detector. Captures audio via AudioWorklet, runs inference, triggers onDetect.
 * Supports start()/stop() for mic capture and feed() for manual audio.
 */

import { init, type WasmWakeEngine } from "sonnetics-core";
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

/**
 * Create a detector. Provide wakewordId or wakeWordPath.
 */
export async function createDetector(
  options: DetectorOptions
): Promise<WakeWordDetector> {
  const { wakewordId, wakeWordPath, threshold = DEFAULT_THRESHOLD } = options;

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

  return new WakeWordDetector(files, threshold);
}

export interface WakewordCreateOptions {
  /** Detection threshold 0–1. Default 0.25. */
  threshold?: number;
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
      options?.threshold ?? DEFAULT_THRESHOLD
    );
  },
};

const CHUNK_SIZE = 2048;

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
  private engine: WasmWakeEngine | null = null;
  private onDetectCallback: ((ev: DetectEvent) => void | Promise<void>) | null =
    null;
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private activeSession: DetectSession | null = null;
  private buffer: Float32Array | null = null;
  private bufferLen = 0;
  private channels = 1;
  private stopped = false;
  private sampleRate: number = 16000; // set when start() or feed() first runs

  constructor(files: ModelFiles, threshold: number) {
    this.files = files;
    if (threshold < 0 || threshold > 1) {
      throw new Error("threshold must be between 0 and 1");
    }
    this.threshold = threshold;
  }

  /**
   * Register callback for wake detection. Call start() to begin capturing.
   */
  onDetect(callback: (ev: DetectEvent) => void | Promise<void>): void {
    this.onDetectCallback = callback;
  }

  /**
   * Start capturing and listening. Requires user gesture (e.g. click) for getUserMedia.
   */
  async start(): Promise<void> {
    this.stopped = false;
    this.context = new AudioContext();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.sampleRate = this.context.sampleRate;

    const source = this.context.createMediaStreamSource(this.stream);
    const processor = await this.createProcessor();

    source.connect(processor);
    processor.connect(this.context.destination);

    processor.port.onmessage = (e: MessageEvent<{ channels: number; data: Float32Array }>) => {
      if (this.stopped) return;
      const { channels, data } = e.data;

      if (!this.engine) {
        this.channels = channels;
        this.engine = init(this.files, this.sampleRate, channels);
        this.buffer = new Float32Array(CHUNK_SIZE * channels);
      }

      const chunkSamples = CHUNK_SIZE * this.channels;
      for (let i = 0; i < data.length; i++) {
        this.buffer![this.bufferLen++] = data[i];
        if (this.bufferLen >= chunkSamples) {
          const chunk = this.buffer!.slice(0, chunkSamples);
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
    const chunkSamples = CHUNK_SIZE * channels;
    for (let i = 0; i + chunkSamples <= audio.length; i += chunkSamples) {
      const chunk = audio.subarray(i, i + chunkSamples);
      const phrase = this.engine!.detect(chunk, this.threshold);
      if (phrase !== null && phrase !== undefined) return phrase;
    }
    return null;
  }

  private ensureEngine(sampleRate: number, channels: number): void {
    if (!this.engine) {
      this.sampleRate = sampleRate;
      this.channels = channels;
      this.engine = init(this.files, sampleRate, channels);
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
          if (input.length > 0 && input[0].length > 0) {
            const channels = input[0].length;
            const frameCount = input[0][0].length;
            const interleaved = new Float32Array(channels * frameCount);
            for (let i = 0; i < frameCount; i++) {
              for (let ch = 0; ch < channels; ch++) {
                interleaved[i * channels + ch] = input[0][ch][i];
              }
            }
            this.port.postMessage({ channels, data: interleaved }, [interleaved.buffer]);
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
