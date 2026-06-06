/**
 * Tests for Detector.create() validation and errors.
 */

import { describe, expect, it } from "vitest";
import { Detector } from "@sonnetics/js";

describe("Detector.create", () => {
    it("throws when neither modelId nor path provided", async () => {
        await expect(
            Detector.create({} as { modelId?: string; path?: string }),
        ).rejects.toThrow("Provide modelId or path");
    });

    it("throws when path does not end with .tar.gz", async () => {
        await expect(
            Detector.create({ path: "/tmp/model.zip" }),
        ).rejects.toThrow("path must point to a .tar.gz file");
    });
});
