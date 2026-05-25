import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@acorus/shared": resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@acorus/wallet-core": resolve(__dirname, "../../packages/wallet-core/src/index.ts"),
    },
  },
});
