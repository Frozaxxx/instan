import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import esbuild from "esbuild";

const rootDir = process.cwd();
const outputDir = resolve(rootDir, "frontend", "assets");
const entryPoint = resolve(rootDir, "frontend", "src", "main.jsx");

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

await esbuild.build({
  entryPoints: [entryPoint],
  bundle: true,
  outfile: resolve(outputDir, "app.js"),
  format: "esm",
  jsx: "automatic",
  loader: {
    ".js": "jsx",
    ".jsx": "jsx",
    ".gif": "file",
    ".jfif": "file",
    ".jpg": "file",
    ".jpeg": "file",
    ".png": "file",
    ".webp": "file",
  },
  platform: "browser",
  sourcemap: true,
  target: ["es2022"],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
});
