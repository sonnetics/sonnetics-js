import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { resolve } from "node:path";

export default defineConfig({
    plugins: [wasm(), topLevelAwait()],
    resolve: {
        alias: {
            "@sonnetics/core": resolve(
                __dirname,
                "node_modules/@sonnetics/core/sonnetics_core.js",
            ),
        },
    },
    optimizeDeps: {
        exclude: ["@sonnetics/core"],
    },
});
