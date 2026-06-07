import { defineConfig } from "tsup";
import { readFileSync } from "node:fs";

const coreVersion: string = JSON.parse(
    readFileSync("node_modules/@sonnetics/core/package.json", "utf-8"),
).version;

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    define: {
        __SONNETICS_CORE_VERSION__: JSON.stringify(coreVersion),
    },
});
