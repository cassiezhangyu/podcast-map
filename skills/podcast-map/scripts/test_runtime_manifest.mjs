#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { compareSkillTrees, createRuntimeManifest, skillRoot } from "./runtime-manifest.mjs";

const manifest = createRuntimeManifest();
assert.equal(manifest.skill, "podcast-map");
assert.equal(manifest.version, "1.1.1");
assert.match(manifest.digest, /^[a-f0-9]{64}$/u);

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "podcast-map-runtime-"));
fs.cpSync(skillRoot, temporaryRoot, { recursive: true });
let comparison = compareSkillTrees(skillRoot, temporaryRoot);
assert.equal(comparison.missing.length + comparison.extra.length + comparison.changed.length, 0);
fs.appendFileSync(path.join(temporaryRoot, "SKILL.md"), "\n");
comparison = compareSkillTrees(skillRoot, temporaryRoot);
assert.deepEqual(comparison.changed, ["SKILL.md"]);
console.log("runtime manifest tests passed");
