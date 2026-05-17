/**
 * Test helpers. Load WAV as Float32Array for feed() tests.
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const FIXTURES_DIR = join(__dirname, "fixtures");

/**
 * Load WAV as float32 samples in [-1, 1], matching sonnetics-core integration test.
 * Assumes 16-bit PCM mono/stereo.
 */
export async function loadWavAsFloats(filePath: string): Promise<Float32Array> {
  const buf = await readFile(filePath);
  const dataView = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  // Skip RIFF header (4 + 4), read fmt chunk to find data
  let offset = 12;
  let dataOffset = 0;
  let dataSize = 0;

  while (offset + 8 <= buf.length) {
    const chunkId = String.fromCharCode(...Array.from(new Uint8Array(buf.subarray(offset, offset + 4))));
    const chunkSize = dataView.getUint32(offset + 4, true);
    if (chunkId === "data") {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize;
  }

  if (dataOffset === 0) throw new Error("No data chunk in WAV");

  const samples = new Float32Array(dataSize / 2); // 16-bit = 2 bytes per sample
  for (let i = 0; i < samples.length; i++) {
    const s16 = dataView.getInt16(dataOffset + i * 2, true);
    samples[i] = s16 / 32768;
  }
  return samples;
}
