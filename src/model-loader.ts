/**
 * Load model pack from URL or path. Extracts tar.gz, caches files.
 * JS does not know what's inside; it just extracts and passes to Rust.
 */

import { decompressSync } from "fflate";
import { getCached, setCached } from "./cache.js";

export type ModelFiles = Record<string, ArrayBuffer>;

/** Minimal tar parser. Extracts files into a map of path -> Uint8Array. */
function parseTar(tar: Uint8Array): Record<string, Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  let offset = 0;

  while (offset + 512 <= tar.length) {
    const name = parseTarString(tar, offset, 100);
    if (!name) break;

    const sizeStr = parseTarString(tar, offset + 124, 12);
    const size = parseInt(sizeStr, 8) || 0;

    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (dataEnd <= tar.length && size > 0) {
      files[name] = tar.slice(dataStart, dataEnd);
    }

    offset = dataStart + ((size + 511) & ~511);
  }
  return files;
}

function parseTarString(arr: Uint8Array, start: number, len: number): string {
  let end = start;
  while (end < start + len && arr[end] !== 0) end++;
  return new TextDecoder().decode(arr.subarray(start, end));
}

/** Normalize tar path: strip leading ./ so keys match Rust expectations (manifest.json, models/layer1.onnx). */
function normalizePath(p: string): string {
  return p.startsWith("./") ? p.slice(2) : p;
}

function extractFromTarGz(tarGz: Uint8Array): ModelFiles {
  const tarBytes = decompressSync(tarGz);
  const tar = parseTar(tarBytes);
  const out: ModelFiles = {};
  for (const [path, data] of Object.entries(tar)) {
    const key = normalizePath(path);
    out[key] = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer;
  }
  return out;
}

/**
 * Load model pack from file path (Node.js only).
 */
export async function loadModelPackFromPath(path: string): Promise<ModelFiles> {
  const key = `file:${path}`;
  const cached = await getCached(key);
  if (cached) return cached;

  const { readFile } = await import("node:fs/promises");
  const tarGz = new Uint8Array(await readFile(path));
  const files = extractFromTarGz(tarGz);
  await setCached(key, files);
  return files;
}

const CDN_BASE = "https://cdn.sonnetics.com/models";

/**
 * Load model pack by model ID from CDN. Fetches sonnetics-model-{modelId}.tar.gz.
 */
export async function loadModelPackFromId(modelId: string): Promise<ModelFiles> {
  const url = `${CDN_BASE}/sonnetics-model-${modelId}.tar.gz`;
  const cached = await getCached(url);
  if (cached) {
    return Object.fromEntries(
      Object.entries(cached).map(([k, v]) => [normalizePath(k), v])
    ) as ModelFiles;
  }
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to fetch model: ${response.statusText}`);
  const tarGz = new Uint8Array(await response.arrayBuffer());
  const files = extractFromTarGz(tarGz);
  await setCached(url, files);
  return files;
}
