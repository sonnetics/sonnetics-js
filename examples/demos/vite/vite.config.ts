import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    resolve: {
        alias: {
            "@sonnetics/core": resolve(
                __dirname,
                "node_modules/@sonnetics/core/sonnetics_core.js",
            ),
        },
    },
});
