import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    pool: "threads",
    fileParallelism: false,
    isolate: false,
    maxWorkers: 1,
    setupFiles: ["./vitest.setup.ts"],
    environmentOptions: {
      jsdom: {
        url: "http://localhost:3000",
      },
    },
  },
});
