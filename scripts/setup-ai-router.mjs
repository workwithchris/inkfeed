import { execSync } from "node:child_process";
import { existsSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEST_DIR = join(ROOT_DIR, "node_modules", "@ai-router");

// Find the ai-router checkout. Set AI_ROUTER_DIR to override; otherwise look
// in the common sibling locations so a plain `npm install` works on any machine.
const CANDIDATES = [
  process.env.AI_ROUTER_DIR,
  join(ROOT_DIR, "ai-router"),
  resolve(ROOT_DIR, "../ai-router"),
  resolve(ROOT_DIR, "../packages/ai-router"),
  resolve(ROOT_DIR, "../../packages/ai-router"),
].filter(Boolean);

const routerDir = CANDIDATES.find((dir) =>
  existsSync(join(dir, "packages", "core")),
);

if (!routerDir) {
  console.warn(
    "\n[setup-ai-router] ai-router checkout not found; skipping.\n" +
      "  Clone it beside this repo (e.g. ../ai-router) and re-run `npm install`,\n" +
      "  or set AI_ROUTER_DIR to its path.\n",
  );
  process.exit(0);
}

const coreDir = join(routerDir, "packages", "core");

if (!existsSync(join(coreDir, "dist"))) {
  console.log(`[setup-ai-router] Building ai-router core in ${routerDir}...`);
  execSync("npm install", { cwd: routerDir, stdio: "inherit" });
  execSync("npm run build", { cwd: routerDir, stdio: "inherit" });
}

console.log("[setup-ai-router] Copying @ai-router/core...");
rmSync(DEST_DIR, { recursive: true, force: true });
mkdirSync(DEST_DIR, { recursive: true });
cpSync(coreDir, join(DEST_DIR, "core"), { recursive: true });
console.log("[setup-ai-router] Done.");
