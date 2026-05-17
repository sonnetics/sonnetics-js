/**
 * Tests for Wakeword.create() validation and errors.
 */

import { describe, expect, it } from "vitest";
import { Wakeword } from "@sonnetics/js";

describe("Wakeword.create", () => {
  it("throws when neither modelId nor path provided", async () => {
    await expect(
      Wakeword.create({} as { modelId?: string; path?: string })
    ).rejects.toThrow("Provide modelId or path");
  });

  it("throws when path does not end with .tar.gz", async () => {
    await expect(Wakeword.create({ path: "/tmp/model.zip" })).rejects.toThrow(
      "path must point to a .tar.gz file"
    );
  });
});
