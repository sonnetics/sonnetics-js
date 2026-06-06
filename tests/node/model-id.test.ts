/**
 * Tests for model ID normalization and validation.
 */

import { describe, expect, it } from "vitest";
import { normalizeModelId, Detector } from "@sonnetics/js";

const UUID = "a770c126-a4ff-4be4-b95e-7e104a01da73";
const CANONICAL = `sonnetics-model-${UUID}`;

describe("normalizeModelId", () => {
    it("accepts canonical sonnetics-model-{uuid}", () => {
        expect(normalizeModelId(CANONICAL)).toBe(CANONICAL);
    });

    it("accepts bare UUID and prepends prefix", () => {
        expect(normalizeModelId(UUID)).toBe(CANONICAL);
    });

    it("normalizes uppercase UUID to lowercase", () => {
        expect(normalizeModelId(UUID.toUpperCase())).toBe(CANONICAL);
        expect(normalizeModelId(`sonnetics-model-${UUID.toUpperCase()}`)).toBe(
            CANONICAL,
        );
    });

    it("trims surrounding whitespace", () => {
        expect(normalizeModelId(`  ${UUID}  `)).toBe(CANONICAL);
    });

    it("throws for invalid UUID", () => {
        expect(() => normalizeModelId("not-a-uuid")).toThrow(
            "Invalid model ID 'not-a-uuid': expected a UUID or sonnetics-model-{uuid}",
        );
        expect(() => normalizeModelId("sonnetics-model-abc")).toThrow(
            "Invalid model ID 'sonnetics-model-abc': expected a UUID or sonnetics-model-{uuid}",
        );
    });
});

describe("Detector.create modelId validation", () => {
    it("throws before fetch when modelId is invalid", async () => {
        await expect(
            Detector.create({ modelId: "sonnetics-model-abc" }),
        ).rejects.toThrow(
            "Invalid model ID 'sonnetics-model-abc': expected a UUID or sonnetics-model-{uuid}",
        );
    });
});
