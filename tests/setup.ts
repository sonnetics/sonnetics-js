/**
 * Test setup: use temp dir for model cache so tests can write in CI/sandbox.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.SONNETICS_CACHE_DIR = mkdtempSync(join(tmpdir(), "sonnetics-cache-"));
