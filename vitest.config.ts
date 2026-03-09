import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: ["node_modules", ".next", "src/generated"],
    coverage: {
      provider: "v8",
      include: [
        "src/core/**",
        "src/lib/report/**",
        "src/services/**",
        "src/app/report/mapping/helpers.ts",
      ],
      exclude: [
        "src/generated/**",
        "**/*.test.ts",
        "**/*.spec.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
