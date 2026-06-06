# @sonnetics/js

Wake-word detection for JavaScript and TypeScript.

```ts
const detector = await Detector.create({ modelId: "your-model-id" });

detector.onDetect(() => console.log("Wake word detected!"));

await detector.start(); // begins mic capture
```

## Install

```bash
npm install @sonnetics/js
```

## Quick start

```ts
import { Detector } from "@sonnetics/js";

const detector = await Detector.create({ modelId: "your-model-id" });

detector.onDetect(() => {
  console.log("Wake word detected!");
  detector.stop();
});

// Call start() inside a click handler — mic access requires a user gesture
document.getElementById("btn").addEventListener("click", () => {
  detector.start();
});
```

## Framework setup

The WASM core needs a small one-line config in bundled environments.

### Vite · React · SvelteKit · Nuxt · Remix

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ["@sonnetics/core"],
  },
});
```

### Next.js

```js
// next.config.js
const nextConfig = {
  webpack(config) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;
```

## API

### `Detector.create(params)`

Loads the model and returns a `WakeWordDetector`. Accepts one of:

| Param | Type | Description |
|---|---|---|
| `modelId` | `string` | Model ID from the Sonnetics dashboard |
| `url` | `string` | HTTPS URL to a `.tar.gz` model pack (e.g. presigned S3 URL) |
| `path` | `string` | Local `.tar.gz` file path (Node.js only) |

Optional: `threshold` (default `0.25`) and `chunkSize` (default `2048`).

### `detector.onDetect(callback)`

Registers a callback fired on each detection. The callback receives a `DetectEvent`:

```ts
detector.onDetect((ev) => {
  console.log(ev.phrase);             // detected phrase label

  // Stream audio captured after the wake word:
  for await (const chunk of ev.audio.read(0.5)) {
    // Float32Array of 0.5s of audio — send to speech-to-text, etc.
  }
});
```

### `detector.start()`

Starts microphone capture via AudioWorklet. Browser only — must be called inside a user gesture (click, keydown, etc.). Returns a `Promise<void>` that resolves once the mic is open.

### `detector.stop()`

Stops capture and releases the microphone and AudioContext.

### `detector.feed(audio, sampleRate, channels?)`

Manually feed audio samples (`Float32Array`, interleaved). Returns the detected phrase or `null`. Use this instead of `start()` when managing your own audio pipeline (e.g. Node.js).

```ts
const phrase = detector.feed(samples, 16000, 1);
if (phrase) console.log("Detected:", phrase);
```

## Demo

A runnable browser demo lives in [`examples/demo/`](./examples/demo). No install required:

```bash
cd examples/demo
npx serve .
```

## Documentation

[sonnetics.com/documentation/javascript](https://sonnetics.com/documentation/javascript)
