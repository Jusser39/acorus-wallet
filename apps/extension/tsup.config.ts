import path from "node:path";
import { defineConfig } from "tsup";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  entry: {
    "background/index": "src/background/index.ts",
    "content/index": "src/content/index.ts",
    "inpage/index": "src/inpage/index.ts",
    "popup/index": "src/popup/index.tsx",
    "options/index": "src/options/index.tsx",
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
  esbuildOptions(options) {
    options.define = {
      ...(options.define ?? {}),
      "import.meta.env.VITE_ONEINCH_API_KEY": JSON.stringify(process.env.VITE_ONEINCH_API_KEY || ""),
      "import.meta.env.VITE_ETHERSCAN_API_KEY": JSON.stringify(process.env.VITE_ETHERSCAN_API_KEY || ""),
    };
    options.inject = [
      ...(options.inject ?? []),
      path.resolve(__dirname, "src/shared/node-compat-inject.ts"),
    ];
    options.alias = {
      ...(options.alias ?? {}),
      "@acorus/shared": path.resolve(
        __dirname,
        "../../packages/shared/src/index.ts",
      ),
      "@acorus/wallet-core": path.resolve(
        __dirname,
        "../../packages/wallet-core/src/index.ts",
      ),
    };
  },
});
