#!/usr/bin/env node
// Cross-platform launcher for apps/backend's Django venv — `pnpm be:*`
// scripts call this instead of hardcoding a Windows-only ".venv\Scripts\
// python.exe" path, so the same package.json scripts work on the Linux CI/
// deploy host added in D-10.
//
// Usage: node scripts/backend.mjs <venv-executable> [...args]
//   node scripts/backend.mjs python manage.py runserver 8000
//   node scripts/backend.mjs ruff check .
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "apps",
  "backend",
);

const [exeName, ...args] = process.argv.slice(2);
if (!exeName) {
  console.error("[be] usage: node scripts/backend.mjs <venv-executable> [...args]");
  process.exit(1);
}

const venvBinDir = path.join(backendDir, ".venv", process.platform === "win32" ? "Scripts" : "bin");
const exe = path.join(venvBinDir, process.platform === "win32" ? `${exeName}.exe` : exeName);

if (!existsSync(exe)) {
  console.error(
    `[be] ${exe} not found — create the venv and install deps first:\n` +
      `  cd apps/backend && python -m venv .venv && ` +
      `${process.platform === "win32" ? ".venv\\Scripts\\pip" : ".venv/bin/pip"} install -r requirements.txt ruff`,
  );
  process.exit(1);
}

const result = spawnSync(exe, args, { cwd: backendDir, stdio: "inherit" });
process.exit(result.status ?? 1);
