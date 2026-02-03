import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["lib/__tests__/**/*.integration.test.ts"],
    testTimeout: 30000, // DB operations can be slow on Neon
  },
});
