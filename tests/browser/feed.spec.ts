import { test, expect } from "@playwright/test";

test.describe("feed in browser", () => {
  test("detects positive.wav and does not detect negative.wav", async ({ page }) => {
    test.setTimeout(90000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      const t = msg.type();
      if (t === "error" || t === "warning") errors.push(`console.${t}: ${msg.text()}`);
    });
    page.on("requestfailed", (req) =>
      errors.push(`request failed: ${req.url()} - ${req.failure()?.errorText ?? "unknown"}`)
    );
    page.on("response", (res) => {
      if (res.status() >= 400) errors.push(`response ${res.status()}: ${res.url()}`);
    });

    await page.goto("http://localhost:3967/dist-browser-test/feed.html");
    await page
      .waitForFunction(
        () => (window as unknown as { __browserTestResults?: unknown[] }).__browserTestResults !== undefined,
        { timeout: 60000 }
      )
      .catch((e) => {
        throw new Error(`${e.message}${errors.length ? `\nBrowser errors:\n${errors.join("\n")}` : ""}`);
      });
    const results = await page.evaluate(
      () =>
        (window as unknown as { __browserTestResults: { ok: boolean; error?: string; test?: string }[] })
          .__browserTestResults
    );
    const positive = results.find((r) => r.test === "positive");
    const negative = results.find((r) => r.test === "negative");
    expect(positive, `Positive test failed: ${positive?.error ?? "unknown"}`).toBeDefined();
    expect(positive?.ok, `Expected detection for positive.wav: ${positive?.error ?? "none"}`).toBe(true);
    expect(negative, `Negative test failed: ${negative?.error ?? "unknown"}`).toBeDefined();
    expect(negative?.ok, `Expected no detection for negative.wav: ${negative?.error ?? "detected"}`).toBe(true);
  });
});
