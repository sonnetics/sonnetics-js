/**
 * Tests that start() throws a clear error when called in Node.js.
 */

import { describe, expect, it, beforeAll } from "vitest";
import { Wakeword } from "@sonnetics/js";

describe("start() in Node.js", () => {
  let detector: Awaited<ReturnType<typeof Wakeword.create>>;

  beforeAll(async () => {
    detector = await Wakeword.create({ modelId: "sonnetics-model-efea8354-3f81-4c61-9d50-7452cb901620" });
  });

  it("throws clear error when start() is called", async () => {
    await expect(detector.start()).rejects.toThrow(
      "detector.start() requires a browser environment (Web Audio API). Use detector.feed() in Node.js."
    );
  });
});
