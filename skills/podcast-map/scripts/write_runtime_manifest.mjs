#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRuntimeManifest } from "./runtime-manifest.mjs";

const packageRoot = path.resolve(process.argv[2] || process.cwd());
fs.mkdirSync(packageRoot, { recursive: true });
const output = path.join(packageRoot, "skill-runtime.json");
fs.writeFileSync(output, JSON.stringify(createRuntimeManifest(), null, 2) + "\n");
console.log(output);
