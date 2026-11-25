import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // DB tests share one database; run files one at a time.
    fileParallelism: false,
    // Playwright specs live in e2e/ and run with `pnpm e2e`.
    exclude: ["**/node_modules/**", "e2e/**"],
  },
});
