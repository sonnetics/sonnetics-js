import { init, type WasmWakeEngine } from "@sonnetics/core";
import {
  loadModelPackFromId,
  loadModelPackFromPath,
  type ModelFiles,
} from "./model-loader.js";

// ─── Public types ────────────────────────────────────────────────────────────

export interface DetectEvent {
  /** Detected phrase (e.g. "wake" for binary, or a label from the model manifest). */
  phrase: string;
  audio: {
    /** Sample rate in Hz (e.g. 16000, 44100). */
    sampleRate: number;
    /** Number of channels (1 = mono, 2 = stereo). Chunks are interleaved [L,R,L,R,...]. */
    channels: number;
    /** Yields fixed-size windows of the original audio following detection. */
    read(seconds: number): AsyncIterable<Float32Array>;
  };
}

// ─── Wakeword factory ────────────────────────────────────────────────────────

type WakewordParams =
  | { modelId: string; path?: never; threshold?: number; chunkSize?: number }
  | { path: string; modelId?: never; threshold?: number; chunkSize?: number };

/**
 * Factory for creating a {@link WakeWordDetector}.
 *
 * @example
 * const detector = await Wakeword.create({ modelId: "550e8400-e29b-41d4-a716-446655440000" });
 * const detector = await Wakeword.create({ path: "/path/to/model.tar.gz" });
 */
export const Wakeword = {
  async create({
    modelId,
    path,
    threshold = DEFAULT_THRESHOLD,
    chunkSize = DEFAULT_CHUNK_SIZE,
  }: WakewordParams): Promise<WakeWordDetector> {
    let files: ModelFiles;
    if (modelId) {
      files = await loadModelPackFromId(modelId);
    } else if (path) {
      if (!path.endsWith(".tar.gz")) {
        throw new Error("path must point to a .tar.gz file");
      }
      files = await loadModelPackFromPath(path);
    } else {
      throw new Error("Provide modelId or path");
    }
    return new WakeWordDetector(files, threshold, chunkSize);
  },
};

// ─── Internal ────────────────────────────────────────────────────────────────

const DEFAULT_THRESHOLD = 0.25;
const DEFAULT_CHUNK_SIZE = 2048;

/** Strip proxy/structured-clone wrappers before crossing the WASM boundary. */
function toPlainObject(files: ModelFiles): Record<string, ArrayBuffer> {
  return Object.fromEntries(Object.entries(files));
}

interface AudioSession {
  buffer: Float32Array[];
  consumers: Set<() => void>;
  closed: boolean;
  hasConsumer: boolean;
}

function createAudioSession(): AudioSession {
  return { buffer: [], consumers: new Set(), closed: false, hasConsumer: false };
}

function closeAudioSession(session: AudioSession): void {
  session.closed = true;
  session.consumers.forEach((resume) => resume());
  session.consumers.clear();
}

// ─── WakeWordDetector ────────────────────────────────────────────────────────

export class WakeWordDetector {
  private readonly files: ModelFiles;
  private readonly threshold: number;
  private readonly chunkSize: number;

  private engine: WasmWakeEngine | null = null;
  private onDetectCallback: ((ev: DetectEvent) => void | Promise<void>) | null = null;
  private onAudioChunkCallback: ((chunk: Float32Array) => void) | null = null;

  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private activeSession: AudioSession | null = null;

  private buffer: Float32Array | null = null;
  private bufferLen = 0;
  private channels = 1;
  private sampleRate = 0;
  private stopped = false;

  constructor(
    files: ModelFiles,
    threshold: number,
    chunkSize: number = DEFAULT_CHUNK_SIZE
  ) {
    if (threshold < 0 || threshold > 1) {
      throw new Error("threshold must be between 0 and 1");
    }
    if (chunkSize <= 0 || !Number.isInteger(chunkSize)) {
      throw new Error("chunkSize must be a positive integer");
    }
    this.files = files;
    this.threshold = threshold;
    this.chunkSize = chunkSize;
  }

  /** Register a callback invoked when the wake word is detected. */
  onDetect(callback: (ev: DetectEvent) => void | Promise<void>): void {
    this.onDetectCallback = callback;
  }

  /**
   * Register a callback invoked for every audio chunk processed.
   * Fired whether using {@link start} or {@link feed}.
   */
  onAudioChunk(callback: (chunk: Float32Array) => void): void {
    this.onAudioChunkCallback = callback;
  }

  /**
   * Start mic capture via AudioWorklet and begin detection.
   *
   * Requires a user gesture (e.g. a button click) for `getUserMedia`.
   * Pass a pre-created `AudioContext` and `MediaStream` to avoid autoplay
   * restrictions — create them on the click event before awaiting model load.
   */
  async start(context?: AudioContext, stream?: MediaStream): Promise<void> {
    this.stopped = false;

    if (context && stream) {
      this.context = context;
      this.stream = stream;
    } else {
      this.context = new AudioContext();
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

    processor.port.onmessage = (
      e: MessageEvent<{ channels?: number; data?: Float32Array }>
    ) => {
      if (this.stopped) return;
      const { channels = 1, data } = e.data;
      if (!data) return;
      this.processChunk(data, this.sampleRate, channels);
    };
  }

  /**
   * Feed audio samples manually (f32, interleaved). Returns the detected phrase or `null`.
   *
   * Use this instead of {@link start} when managing your own audio pipeline (e.g. Node.js).
   * Downmixing is handled by the engine.
   */
  feed(audio: Float32Array, sampleRate: number, channels = 1): string | null {
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

  /** Stop mic capture and release all resources. */
  stop(): void {
    this.stopped = true;
    if (this.activeSession) {
      closeAudioSession(this.activeSession);
      this.activeSession = null;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.context?.close();
    this.context = null;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private ensureEngine(sampleRate: number, channels: number): void {
    if (!this.engine) {
      this.sampleRate = sampleRate;
      this.channels = channels;
      this.engine = init(toPlainObject(this.files), sampleRate, channels);
    }
  }

  private processChunk(data: Float32Array, sampleRate: number, channels: number): void {
    if (!this.engine) {
      this.channels = channels;
      this.engine = init(toPlainObject(this.files), sampleRate, channels);
      this.buffer = new Float32Array(this.chunkSize * channels);
    }

    const chunkSamples = this.chunkSize * this.channels;
    for (let i = 0; i < data.length; i++) {
      this.buffer![this.bufferLen++] = data[i];
      if (this.bufferLen >= chunkSamples) {
        const chunk = this.buffer!.slice(0, chunkSamples);
        this.onAudioChunkCallback?.(chunk);

        const phrase = this.engine!.detect(chunk, this.threshold);
        if (phrase !== null && phrase !== undefined) {
          if (this.activeSession) closeAudioSession(this.activeSession);
          const session = createAudioSession();
          this.activeSession = session;
          const ev = this.buildDetectEvent(session, phrase);
          Promise.resolve(this.onDetectCallback?.(ev)).catch(console.error);
        } else if (
          this.activeSession?.hasConsumer &&
          !this.activeSession.closed
        ) {
          this.activeSession.buffer.push(chunk.slice());
          this.activeSession.consumers.forEach((resume) => resume());
          this.activeSession.consumers.clear();
        }

        this.bufferLen = 0;
      }
    }
  }

  private buildDetectEvent(session: AudioSession, phrase: string): DetectEvent {
    const { sampleRate, channels, chunkSize, threshold } = this;
    const engine = this.engine!;
    const stopped = () => this.stopped;
    const clearActive = () => {
      if (this.activeSession === session) this.activeSession = null;
    };

    return {
      phrase,
      audio: {
        sampleRate,
        channels,
        read(seconds: number): AsyncIterable<Float32Array> {
          const windowSize = Math.floor(seconds * sampleRate * channels);
          return {
            async *[Symbol.asyncIterator]() {
              try {
                session.hasConsumer = true;
                const buf: number[] = [];

                const flush = (): Float32Array | null => {
                  if (buf.length < windowSize) return null;
                  const out = new Float32Array(windowSize);
                  for (let i = 0; i < windowSize; i++) out[i] = buf.shift()!;
                  return out;
                };

                while (!stopped() && !session.closed) {
                  let received = false;
                  while (session.buffer.length > 0) {
                    const arr = session.buffer.shift()!;
                    for (let i = 0; i < arr.length; i++) buf.push(arr[i]);
                    received = true;
                    let chunk: Float32Array | null;
                    while ((chunk = flush()) !== null) yield chunk;
                  }
                  if (!received) {
                    await new Promise<void>((resolve) => {
                      session.consumers.add(resolve);
                    });
                  }
                }

                // Drain any remaining buffered audio.
                let chunk: Float32Array | null;
                while ((chunk = flush()) !== null) yield chunk;
              } finally {
                session.closed = true;
                clearActive();
                session.consumers.forEach((resume) => resume());
                session.consumers.clear();
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
        process(inputs) {
          const input = inputs[0];
          if (!input?.length || !input[0]?.length) return true;
          const channels = input.length;
          const frameCount = input[0].length;
          const interleaved = new Float32Array(channels * frameCount);
          for (let i = 0; i < frameCount; i++) {
            for (let ch = 0; ch < channels; ch++) {
              interleaved[i * channels + ch] = input[ch][i];
            }
          }
          this.port.postMessage({ channels, data: interleaved }, [interleaved.buffer]);
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
