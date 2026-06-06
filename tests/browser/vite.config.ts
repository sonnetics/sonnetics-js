import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    root: resolve(__dirname),
    base: "/dist-browser-test/",
    build: {
        outDir: resolve(__dirname, "../../dist-browser-test"),
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, "feed.html"),
        },
    },
    resolve: {
        alias: {
            "@sonnetics/js": resolve(__dirname, "../../src/index.ts"),
            "@sonnetics/core": resolve(
                __dirname,
                "../../node_modules/@sonnetics/core/sonnetics_core.js",
            ),
        },
    },
});
