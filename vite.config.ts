// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";
import { demoMetadataDefines } from "./build/demo-metadata";

export default defineConfig({
  vite: {
    plugins: [
      {
        name: "connect-build-timestamp",
        config(config, env) {
          // A build timestamp, NOT a deploy timestamp. SHA is intentionally not
          // inferred from git HEAD or a main-branch lookup; absent CI SHA stays Unknown.
          const values = loadEnv(env.mode, config.envDir || process.cwd(), "VITE_");
          return {
            define: demoMetadataDefines(values, env.command, new Date().toISOString()),
          };
        },
      },
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
