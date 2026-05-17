/**
 * Tests for WakeWordDetector.feed() with modelId and path parametrization.
 */

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, beforeAll } from "vitest";
import { Wakeword } from "@sonnetics/js";
import { CDN_URL, FIXTURES_DIR, KNOWN_MODEL_ID, loadWavAsFloats } from "./helpers.js";

describe.each([
  { source: "modelId" as const, label: "modelId" },
  { source: "path" as const, label: "path" },
])("feed ($label)", ({ source }) => {
  let detector: Awaited<ReturnType<typeof Wakeword.create>>;

  beforeAll(async () => {
    if (source === "modelId") {
      detector = await Wakeword.create({ modelId: KNOWN_MODEL_ID });
    } else {
      const dir = await mkdtemp(join(tmpdir(), "sonnetics-model-"));
      const modelPath = join(dir, "model.tar.gz");
      const resp = await fetch(CDN_URL);
      if (!resp.ok) throw new Error(`Failed to fetch model: ${resp.statusText}`);
      await writeFile(modelPath, Buffer.from(await resp.arrayBuffer()));
      detector = await Wakeword.create({ path: modelPath });
    }
  });

  it("detects wake word in positive.wav", async () => {
    const audio = await loadWavAsFloats(join(FIXTURES_DIR, "positive.wav"));
    const phrase = detector.feed(audio, 16000, 1);
    expect(phrase).not.toBeNull();
  });

  it("does not detect wake word in negative.wav", async () => {
    const audio = await loadWavAsFloats(join(FIXTURES_DIR, "negative.wav"));
    const phrase = detector.feed(audio, 16000, 1);
    expect(phrase).toBeNull();
  });
});
