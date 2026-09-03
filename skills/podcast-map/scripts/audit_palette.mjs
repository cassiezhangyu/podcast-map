#!/usr/bin/env node
import fs from "node:fs";
import { createPalette, auditScenePalette } from "./palette.mjs";

const [paletteFile, ...sceneFiles] = process.argv.slice(2);
try {
  if (!paletteFile || !sceneFiles.length)
    throw new Error("用法：node audit_palette.mjs palette.json 最终场景.excalidraw [...]");
  const data = JSON.parse(fs.readFileSync(paletteFile, "utf8"));
  createPalette(data);
  const results = sceneFiles.map(file => ({
    file, ...auditScenePalette(JSON.parse(fs.readFileSync(file, "utf8")), data)
  }));
  const failures = results.reduce((sum, r) => sum + r.errors.length, 0);
  console.log(JSON.stringify({
    scope: "声明配色、基础对比度与传入场景用色",
    limitation: "不证明语义正确、配色新鲜、最终叠加可读或全套文件已全部传入；封面和图片需目检",
    failures, results
  }, null, 2));
  process.exitCode = failures ? 1 : 0;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
