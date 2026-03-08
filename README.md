# sonnetics-js

Wake-word inference for JavaScript and TypeScript. High-level API over [sonnetics-core](https://github.com/sonnetics/sonnetics-core).

## Installation

```bash
npm install sonnetics-js
```

Requires [sonnetics-core](https://www.npmjs.com/package/sonnetics-core) as a dependency (installed automatically).

## Usage

### `Wakeword.create(pathOrModelId)` — simplest API

```ts
import { Wakeword } from "sonnetics-js";

// From local path (Node.js) or from CDN by model ID
const detector = await Wakeword.create("path/to/model.tar.gz");
const detector = await Wakeword.create("550e8400-e29b-41d4-a716-446655440000");

detector.onDetect(async ({ audio }) => {
  for await (const chunk of audio.read(0.5)) {
    if (myLogic(chunk)) break;
  }
});
await detector.start();
```

When given a model ID (UUID), fetches from `https://cdn.sonnetics.com/models/sonnetics-model-{uuid}.tar.gz`. Extracted files are cached (IndexedDB on web, filesystem on Node).

### Mic capture with `start()` / `stop()`

```ts
import { createDetector } from "sonnetics-js";

const detector = await createDetector({
  wakewordId: "550e8400-e29b-41d4-a716-446655440000",
  threshold: 0.25,
});

detector.onDetect(async ({ phrase, audio }) => {
  console.log(`Detected: ${phrase}`);
  for await (const chunk of audio.read(0.5)) {
    if (myLogic(chunk)) detector.stop();
  }
});

await detector.start();   // begins listening
// ...
detector.stop();          // cleans up
```

### Manual audio with `feed()`

```ts
const detector = await Wakeword.create("550e8400-e29b-41d4-a716-446655440000", { threshold: 0.25 });
const phrase = detector.feed(audioSamples, sampleRate, channels);
if (phrase) console.log(`Detected: ${phrase}`);
```

### For lower-level access

Use [sonnetics-core](https://www.npmjs.com/package/sonnetics-core) directly for the raw WASM API.

## Local development

Before sonnetics-core is published, or to develop against a local build:

```bash
# Build sonnetics-core WASM package
cd sonnetics-core
rustup target add wasm32-unknown-unknown  # if needed
wasm-pack build --target bundler --out-dir pkg
cd pkg && npm link && cd ..

# Link in sonnetics-js and install other deps
cd sonnetics-js
npm link sonnetics-core
npm install
npm run build
```

Alternatively, use a file dependency: `"sonnetics-core": "file:../sonnetics-core/pkg"` in package.json.

## License

Apache-2.0
