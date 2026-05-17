/**
 * Tests that start() throws a clear error when called in Node.js.
 */

import { describe, expect, it, beforeAll } from "vitest";
import { Wakeword } from "@sonnetics/js";
import { KNOWN_MODEL_ID } from "./helpers.js";

describe("start() in Node.js", () => {
  let detector: Awaited<ReturnType<typeof Wakeword.create>>;

  beforeAll(async () => {
    detector = await Wakeword.create({ modelId: KNOWN_MODEL_ID });
  });

  it("throws clear error when start() is called", async () => {
    await expect(detector.start()).rejects.toThrow(
      "detector.start() requires a browser environment (Web Audio API). Use detector.feed() in Node.js."
    );
  });
});
