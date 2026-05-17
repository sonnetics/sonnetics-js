import { defineConfig } from "vite";
import { resolve } from "node:path";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  root: resolve(__dirname),
  base: "/dist-browser-test/",
  plugins: [wasm(), topLevelAwait()],
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
    },
  },
});
