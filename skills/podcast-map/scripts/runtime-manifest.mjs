import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function filesUnder(root) {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if ([".DS_Store", ".git"].includes(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else files.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }
  walk(root);
  return files.sort();
}

export function createSkillDigest(root = skillRoot) {
  const hash = crypto.createHash("sha256");
  for (const relative of filesUnder(root)) {
    hash.update(relative);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(root, relative)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function createRuntimeManifest(root = skillRoot) {
  return {
    schema_version: 1,
    skill: "podcast-map",
    version: fs.readFileSync(path.join(root, "VERSION"), "utf8").trim(),
    digest: createSkillDigest(root),
    generated_at: new Date().toISOString(),
  };
}

export function compareSkillTrees(canonicalRoot, installedRoot) {
  const canonicalFiles = filesUnder(canonicalRoot);
  const installedFiles = filesUnder(installedRoot);
  const canonicalSet = new Set(canonicalFiles);
  const installedSet = new Set(installedFiles);
  const missing = canonicalFiles.filter((file) => !installedSet.has(file));
  const extra = installedFiles.filter((file) => !canonicalSet.has(file));
  const changed = canonicalFiles.filter((file) => installedSet.has(file) &&
    !fs.readFileSync(path.join(canonicalRoot, file)).equals(fs.readFileSync(path.join(installedRoot, file))));
  return {
    canonicalDigest: createSkillDigest(canonicalRoot),
    installedDigest: createSkillDigest(installedRoot),
    missing,
    extra,
    changed,
  };
}
