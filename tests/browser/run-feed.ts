/**
 * Runs in browser. Loads WAV fixtures, tests detection via feed(), exposes result for Playwright.
 */

import { Detector } from "@sonnetics/js";

const KNOWN_MODEL_ID = "sonnetics-model-a770c126-a4ff-4be4-b95e-7e104a01da73";

async function loadWavAsFloats(
    url: string,
): Promise<{ audio: Float32Array; sampleRate: number }> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    const ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
    )();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    await ctx.close();
    const ch0 = buffer.getChannelData(0);
    const channels = buffer.numberOfChannels;
    let audio: Float32Array;
    if (channels === 1) {
        audio = ch0;
    } else {
        audio = new Float32Array(buffer.length * channels);
        for (let i = 0; i < buffer.length; i++) {
            for (let c = 0; c < channels; c++) {
                audio[i * channels + c] = buffer.getChannelData(c)[i];
            }
        }
    }
    return { audio, sampleRate: buffer.sampleRate };
}

interface TestResult {
    ok: boolean;
    error?: string;
    test?: string;
}

async function main() {
    const results: TestResult[] = [];
    try {
        const { audio, sampleRate } = await loadWavAsFloats(
            "/tests/fixtures/positive.wav",
        );
        const detector = await Detector.create({ modelId: KNOWN_MODEL_ID });
        const phrase = detector.feed(audio, sampleRate, 1);
        results.push({
            ok: phrase !== null && phrase !== undefined,
            test: "positive",
        });
    } catch (e) {
        results.push({ ok: false, error: String(e), test: "positive" });
    }
    try {
        const { audio, sampleRate } = await loadWavAsFloats(
            "/tests/fixtures/negative.wav",
        );
        const detector = await Detector.create({ modelId: KNOWN_MODEL_ID });
        const phrase = detector.feed(audio, sampleRate, 1);
        results.push({
            ok: phrase === null || phrase === undefined,
            test: "negative",
        });
    } catch (e) {
        results.push({ ok: false, error: String(e), test: "negative" });
    }
    (
        window as unknown as { __browserTestResults: TestResult[] }
    ).__browserTestResults = results;
}

main();
