#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

function countFiles(directory) {
  let total = 0;
  for (const name of readdirSync(directory)) {
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) total += countFiles(path);
    else total += 1;
  }
  return total;
}

const migrations = readdirSync(resolve(root, "migrations"))
  .filter((name) => /^\d+.*\.sql$/.test(name))
  .sort();

console.log(JSON.stringify({
  root,
  branch: git("branch", "--show-current"),
  commit: git("rev-parse", "HEAD"),
  workingTree: git("status", "--short"),
  scripts: packageJson.scripts,
  sourceFileCount: countFiles(resolve(root, "src")),
  migrations,
  entryPoints: [
    "src/game/App.tsx",
    "src/game/ui/Lobby.tsx",
    "src/game/ui/MesaLive.tsx",
    "src/game/engine/engine.ts",
    "src/game/live/step.ts",
    "src/lib/player.functions.ts",
    "src/lib/table.functions.ts",
  ],
}, null, 2));
