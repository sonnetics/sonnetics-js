/**
 * Cache extracted model files. IndexedDB on web, filesystem on Node.
 */

const DB_NAME = "sonnetics-cache";
const DB_VERSION = 2;
const STORE_NAME = "models";

export type ModelFiles = Record<string, ArrayBuffer>;

function isNode(): boolean {
  return typeof process !== "undefined" && process.versions?.node != null;
}

/**
 * Get cached files by key. Returns null if not cached.
 */
export async function getCached(key: string): Promise<ModelFiles | null> {
  if (isNode()) {
    return getCachedNode(key);
  }
  return getCachedIndexedDB(key);
}

/**
 * Store files in cache.
 */
export async function setCached(key: string, files: ModelFiles): Promise<void> {
  if (isNode()) {
    await setCachedNode(key, files);
  } else {
    await setCachedIndexedDB(key, files);
  }
}

function getCachedIndexedDB(key: string): Promise<ModelFiles | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(key);
      getReq.onerror = () => reject(getReq.error);
      getReq.onsuccess = () => {
        db.close();
        resolve(getReq.result ?? null);
      };
    };
    request.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(STORE_NAME);
    };
  });
}

function setCachedIndexedDB(key: string, files: ModelFiles): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(files, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
    request.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(STORE_NAME);
    };
  });
}

async function getCachedNode(key: string): Promise<ModelFiles | null> {
  const { readdir, readFile, stat } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const dir = await getNodeCacheDir(key);
  try {
    const paths = await readdir(dir, { recursive: true });
    const files: ModelFiles = {};
    for (const p of paths) {
      const fullPath = join(dir, p);
      const s = await stat(fullPath);
      if (s.isFile()) {
        const buf = await readFile(fullPath);
        const relPath = p.replace(/\\/g, "/");
        files[relPath] = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      }
    }
    return Object.keys(files).length > 0 ? files : null;
  } catch {
    return null;
  }
}

async function setCachedNode(key: string, files: ModelFiles): Promise<void> {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const dir = await getNodeCacheDir(key);
  await mkdir(dir, { recursive: true });
  for (const [path, buf] of Object.entries(files)) {
    const fullPath = join(dir, path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, new Uint8Array(buf));
  }
}

async function getNodeCacheDir(key: string): Promise<string> {
  const { join } = await import("node:path");
  const { homedir, platform } = await import("node:os");
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256").update(key).digest("hex");
  const base =
    process.env.SONNETICS_CACHE_DIR ??
    (platform() === "win32"
      ? join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "sonnetics", "cache")
      : join(homedir(), ".cache", "sonnetics"));
  return join(base, hash);
}
