#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const packageRoot = path.resolve(args.shift() || process.cwd());
let outputPath = path.join(packageRoot, "baseline-manifest.json");
const includes = [];

while (args.length) {
  const flag = args.shift();
  if (flag === "--output") outputPath = path.resolve(args.shift() || "");
  else if (flag === "--include") includes.push(args.shift() || "");
  else throw new Error(`未知参数：${flag}`);
}

function withinRoot(candidate) {
  const relative = path.relative(packageRoot, candidate);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function collectFiles(target) {
  const absolute = path.resolve(packageRoot, target);
  if (!withinRoot(absolute) || !fs.existsSync(absolute)) throw new Error(`无效或不存在的冻结目标：${target}`);
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(absolute, entry.name);
    if (entry.isDirectory()) return collectFiles(path.relative(packageRoot, child));
    return entry.isFile() ? [child] : [];
  });
}

const defaultExtensions = new Set([".png", ".svg", ".excalidraw"]);
const roots = includes.length ? includes : fs.readdirSync(packageRoot).filter((name) => name !== "baseline-manifest.json");
const files = [...new Set(roots.flatMap(collectFiles))]
  .filter((file) => includes.length || defaultExtensions.has(path.extname(file).toLowerCase()))
  .filter((file) => path.resolve(file) !== path.resolve(outputPath))
  .sort();

if (files.length === 0) throw new Error("没有找到可冻结文件；使用 --include 指定文件或目录。");

const entries = files.map((file) => ({
  path: path.relative(packageRoot, file).split(path.sep).join("/"),
  bytes: fs.statSync(file).size,
  sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
}));

const manifest = {
  schemaVersion: 1,
  purpose: "冻结已批准资产；后续返修只能改 revision-scope.yaml 明确允许的文件。",
  packageName: path.basename(packageRoot),
  createdAt: new Date().toISOString(),
  files: entries,
};

fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, frozenFiles: entries.length }, null, 2));
