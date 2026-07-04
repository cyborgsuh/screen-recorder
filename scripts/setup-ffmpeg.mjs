// Places a static ffmpeg into src-tauri/binaries/ under the name Tauri's sidecar
// bundling expects (ffmpeg-<host-triple>[.exe]). Runs automatically on
// `npm install` (postinstall). Idempotent — skips if the binary is already there.
//
// ponytail: ffmpeg-static hosts + downloads the binary, so it never lives in git
// (src-tauri/binaries/ is .gitignored). Swap for a pinned direct download only if
// ffmpeg-static's build ever stops matching the args in src-tauri/src/mux.rs.

import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, existsSync, chmodSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function hostTriple() {
  try {
    const out = execSync("rustc -Vv", { encoding: "utf8" });
    return out.match(/host:\s*(\S+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

const triple = hostTriple();
if (!triple) {
  console.warn(
    "[ffmpeg] rustc not found — skipping. Install Rust (https://rustup.rs), then: npm run setup:ffmpeg",
  );
  process.exit(0);
}

// ffmpeg-static's default export is the path to the downloaded binary.
let src;
try {
  src = createRequire(import.meta.url)("ffmpeg-static");
} catch {
  src = null;
}
if (!src || !existsSync(src)) {
  console.warn("[ffmpeg] ffmpeg-static binary not found — try reinstalling deps.");
  process.exit(0);
}

const ext = triple.includes("windows") ? ".exe" : "";
const destDir = join(root, "src-tauri", "binaries");
const dest = join(destDir, `ffmpeg-${triple}${ext}`);

mkdirSync(destDir, { recursive: true });
if (existsSync(dest) && statSync(dest).size > 0) {
  console.log("[ffmpeg] already present:", dest);
  process.exit(0);
}

copyFileSync(src, dest);
if (!ext) chmodSync(dest, 0o755);
console.log("[ffmpeg] installed →", dest);
