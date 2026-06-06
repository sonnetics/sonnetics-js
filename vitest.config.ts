import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
    test: {
        dir: "./tests/node",
        exclude: ["**/node_modules/**", "**/dist/**"],
        environment: "node",
        setupFiles: ["./tests/node/setup.ts"],
        pool: "forks",
    },
    resolve: {
        alias: {
            "@sonnetics/js": resolve(__dirname, "src/index.ts"),
        },
    },
});
