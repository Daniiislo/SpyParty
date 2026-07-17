import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // tsconfigPaths resolves the "@/" alias; react() transforms JSX/TSX (Babel,
  // no react-compiler — that is a production-only optimization).
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Exclude Next build output and node_modules from test discovery.
    exclude: ["node_modules/**", ".next/**"],
    // Inline next-intl so Vite (which honors package "exports") resolves its
    // internal `next/server` import — Node's externalized ESM resolver can't.
    server: { deps: { inline: ["next-intl"] } },
  },
});
