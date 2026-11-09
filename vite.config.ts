import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "deny-private-voice-files",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          let path: string;
          try {
            path = decodeURIComponent((req.url ?? "").split("?")[0]).replaceAll(
              "\\",
              "/",
            );
          } catch {
            res.statusCode = 400;
            res.end();
            return;
          }
          if (
            /(?:^|\/)(?:private|server|build)(?:\/|$)|(?:^|\/)\.env/.test(path)
          ) {
            res.statusCode = 403;
            res.end("Forbidden");
            return;
          }
          next();
        });
      },
    },
  ],
  server: {
    fs: { deny: ["**/.env*", "**/private/**", "**/server/**", "**/build/**"] },
    proxy: {
      "/api/voice": { target: "http://127.0.0.1:8787", changeOrigin: true },
    },
  },
  test: { include: ["src/**/*.test.ts"] },
});
