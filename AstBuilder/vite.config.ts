import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mimeTypes: Record<string, string> = {
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ico": "image/x-icon",
};

/** Serve data/, images/, videos/ in dev without needing the Express server. */
function serveStaticDirs(dirs: string[]) {
  return {
    name: "serve-static-dirs",
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = (req.url || "").split("?")[0];
        for (const dir of dirs) {
          if (url.startsWith(`/${dir}/`)) {
            const filePath = resolve(__dirname, url.slice(1));
            if (fs.existsSync(filePath)) {
              const ext = filePath.substring(filePath.lastIndexOf("."));
              if (mimeTypes[ext]) res.setHeader("Content-Type", mimeTypes[ext]);
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  root: ".",
  publicDir: "public",              // <-- FIX
  plugins: [],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
  server: {
    port: 5179,
    host: "0.0.0.0",
    strictPort: true,
    fs: { allow: ["."] },
  },
});