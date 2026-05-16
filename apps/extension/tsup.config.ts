import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "background/index": "src/background/index.ts",
    "content/index": "src/content/index.ts",
    "inpage/index": "src/inpage/index.ts",
    "popup/index": "src/popup/index.ts",
    "options/index": "src/options/index.ts",
  },
  bundle: true,
  clean: true,
  format: ["iife"],
  minify: false,
  outDir: "dist",
  outExtension() {
    return {
      js: ".js",
    };
  },
  platform: "browser",
  sourcemap: false,
  splitting: false,
  target: "es2022",
});
