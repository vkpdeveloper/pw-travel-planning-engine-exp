import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: true,
    include: ["__tests__/**/*.{test,spec}.{ts,tsx}", "**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e", "tests-e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["lib/**/*.{ts,tsx}", "components/ui/**/*.{ts,tsx}", "app/api/**/*.ts"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "e2e/**",
        "**/*.d.ts",
        "**/*.config.*",
      ],
      thresholds: {
        // Pragmatic thresholds — see AGENTS.md
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 70,
        // Stricter per-file targets for lib/ and ui/ primitives.
        "lib/**/*.ts": { lines: 95, statements: 95, functions: 95, branches: 85 },
        "components/ui/**/*.tsx": { lines: 85, statements: 85, functions: 85, branches: 75 },
      },
    },
  },
});
