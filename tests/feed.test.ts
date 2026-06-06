/**
 * Tests for WakeWordDetector.feed() with modelId and path parametrization.
 */

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, beforeAll } from "vitest";
import { Detector } from "@sonnetics/js";
import { FIXTURES_DIR, loadWavAsFloats } from "./helpers.js";

const KNOWN_MODEL_ID = "sonnetics-model-a770c126-a4ff-4be4-b95e-7e104a01da73";
const CDN_URL = `https://cdn.sonnetics.com/models/${KNOWN_MODEL_ID}.tar.gz`;

describe.each([
    { source: "modelId" as const, label: "modelId" },
    { source: "path" as const, label: "path" },
])("feed ($label)", ({ source }) => {
    let detector: Awaited<ReturnType<typeof Detector.create>>;

    beforeAll(async () => {
        if (source === "modelId") {
            detector = await Detector.create({ modelId: KNOWN_MODEL_ID });
        } else {
            const dir = await mkdtemp(join(tmpdir(), "sonnetics-model-"));
            const modelPath = join(dir, "model.tar.gz");
            const resp = await fetch(CDN_URL);
            if (!resp.ok)
                throw new Error(`Failed to fetch model: ${resp.statusText}`);
            await writeFile(modelPath, Buffer.from(await resp.arrayBuffer()));
            detector = await Detector.create({ path: modelPath });
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
