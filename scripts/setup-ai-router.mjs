import { execSync } from "node:child_process";
import { existsSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AI_ROUTER_DIR = resolve(ROOT_DIR, "../../packages/ai-router");
const CORE_DIR = join(AI_ROUTER_DIR, "packages/core");
const DEST_DIR = join(ROOT_DIR, "node_modules/@ai-router");

const run = (cmd, cwd) => {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
};

if (!existsSync(join(CORE_DIR, "dist"))) {
  console.log("Building ai-router core...");
  run("npm install", AI_ROUTER_DIR);
  run("npm run build", AI_ROUTER_DIR);
}

console.log("Copying @ai-router/core...");
rmSync(DEST_DIR, { recursive: true, force: true });
mkdirSync(DEST_DIR, { recursive: true });
cpSync(CORE_DIR, join(DEST_DIR, "core"), { recursive: true });

console.log("Done.");