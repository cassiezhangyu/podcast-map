#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const packageRoot = path.resolve(args.shift() || process.cwd());
let manifestPath = path.join(packageRoot, "baseline-manifest.json");
const allowed = new Set();

while (args.length) {
  const flag = args.shift();
  if (flag === "--manifest") manifestPath = path.resolve(args.shift() || "");
  else if (flag === "--allow") allowed.add((args.shift() || "").replaceAll("\\", "/"));
  else throw new Error(`未知参数：${flag}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files)) throw new Error("不支持的 baseline manifest。");

const changed = [];
const missing = [];
const unchanged = [];
const authorizedChanged = [];
const authorizedMissing = [];

for (const entry of manifest.files) {
  const absolute = path.resolve(packageRoot, entry.path);
  const relative = path.relative(packageRoot, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`manifest 含越界路径：${entry.path}`);
  if (!fs.existsSync(absolute)) {
    if (allowed.has(entry.path)) authorizedMissing.push(entry.path);
    else missing.push(entry.path);
    continue;
  }
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
  if (sha256 === entry.sha256) unchanged.push(entry.path);
  else if (allowed.has(entry.path)) authorizedChanged.push(entry.path);
  else changed.push(entry.path);
}

const report = {
  scope: "frozen-assets-only",
  interpretation: "PASS 只证明未获准修改的冻结资产与基线一致，不证明内容或视觉质量。",
  frozenFiles: manifest.files.length,
  unchangedFiles: unchanged.length,
  allowedChanges: [...allowed],
  authorizedChanged,
  authorizedMissing,
  changed,
  missing,
  pass: changed.length === 0 && missing.length === 0,
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
