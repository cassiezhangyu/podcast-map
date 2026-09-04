#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { compareSkillTrees } from "./runtime-manifest.mjs";

const ownRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalRoot = path.resolve(process.argv[2] || ownRoot);
const installedRoot = path.resolve(process.argv[3] || canonicalRoot);
const result = compareSkillTrees(canonicalRoot, installedRoot);
const failureCount = result.missing.length + result.extra.length + result.changed.length;
console.log(JSON.stringify({ failureCount, ...result }, null, 2));
process.exitCode = failureCount ? 1 : 0;
