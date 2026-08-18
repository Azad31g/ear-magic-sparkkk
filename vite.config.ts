// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: [
        {
          // The published "exports" map resolves to the CJS build in the
          // production bundle, where `new UniversalProvider()` fails with
          // "default is not a constructor". Force the ESM build.
          find: /^@walletconnect\/universal-provider$/,
          replacement: fileURLToPath(
            new URL(
              "./node_modules/@walletconnect/universal-provider/dist/index.js",
              import.meta.url,
            ),
          ),
        },
      ],
    },
  },
});
