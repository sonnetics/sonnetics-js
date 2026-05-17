/**
 * Tests for Wakeword.create() validation and errors.
 */

import { describe, expect, it } from "vitest";
import { Wakeword } from "@sonnetics/js";

describe("Wakeword.create", () => {
  it("throws when no model source provided", async () => {
    await expect(
      Wakeword.create({} as { modelId?: string; path?: string; url?: string })
    ).rejects.toThrow("Provide exactly one of modelId, path, or url");
  });

  it("throws when multiple model sources provided", async () => {
    await expect(
      Wakeword.create({
        modelId: "sonnetics-model-abc",
        url: "https://example.com/model.tar.gz",
      } as { modelId: string; url: string })
    ).rejects.toThrow("Provide exactly one of modelId, path, or url");
  });

  it("throws when path does not end with .tar.gz", async () => {
    await expect(Wakeword.create({ path: "/tmp/model.zip" })).rejects.toThrow(
      "path must point to a .tar.gz file"
    );
  });

  it("throws when url is not http(s)", async () => {
    await expect(Wakeword.create({ url: "file:///tmp/model.tar.gz" })).rejects.toThrow(
      "url must use http or https"
    );
  });

  it("throws when url is invalid", async () => {
    await expect(Wakeword.create({ url: "not-a-url" })).rejects.toThrow(
      "url must be a valid HTTP(S) URL"
    );
  });
});
