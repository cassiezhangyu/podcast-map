#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createPalette, auditScenePalette } from "./palette.mjs";
import { auditCover, COVER_SYSTEM } from "./cover-system.mjs";

const packageRoot = path.resolve(process.argv[2] || process.cwd());
const failures = [];
const warnings = [];

function exists(relativePath) {
  return fs.existsSync(path.join(packageRoot, relativePath));
}

function pngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

for (const relativePath of [
  "source-verification.md",
  "content-model.md",
  "visual-contract.yaml",
  "overview-proof.md",
  "page-plan.md",
  "composition-candidates.md",
  "style-direction.md",
  "baseline-manifest.json",
  "mechanical-audit.json",
  "visual-red-team.md",
  "quality-audit.md",
  "knowledge.md",
  "cover.png",
  "infographic.png",
  "contact-sheet.png",
  "xiaohongshu-note.md",
  "editable/infographic.excalidraw",
]) {
  if (!exists(relativePath)) failures.push(`缺少 ${relativePath}`);
}

if (exists("visual-contract.yaml")) {
  const contract = fs.readFileSync(path.join(packageRoot, "visual-contract.yaml"), "utf8");
  const contractVersion = Number(contract.match(/^\s*contract_version:\s*(\d+)\s*$/mu)?.[1] || 1);
  if (!/^\s*background:\s*["']?#FFFFFF["']?\s*$/imu.test(contract)) failures.push("visual-contract.yaml 未锁定纯白底 #FFFFFF");
  if (!/^\s*top_right_progress:\s*true\s*$/imu.test(contract)) failures.push("visual-contract.yaml 未启用页眉右上阅读进度");
  if (!/^\s*divider_count:\s*1\s*$/imu.test(contract)) failures.push("visual-contract.yaml 未锁定单线页脚");
  if (/^\s*palette_file:/mu.test(contract)) {
    for (const file of ["palette.json", "release-manifest.json"])
      if (!exists(file)) failures.push("新版合同缺少 " + file);
  }
  if (contractVersion >= 2) {
    if (!/^\s*preset_id:\s*["']?[^\s"']+["']?\s*$/mu.test(contract)) failures.push("新版视觉合同缺少 preset_id");
    for (const field of ["applies_to", "lifetime", "authority", "status"])
      if (!new RegExp(`^\\s*(?:-\\s*)?${field}:`, "mu").test(contract)) failures.push("新版视觉合同的 constraint_scope 缺少 " + field);
  } else warnings.push("旧视觉合同没有作用范围字段；不追溯阻断，但不能据此证明反馈范围已明确");
  const coverSystem = contract.match(/^\s*cover_system:\s*["']?([^\s"']+)["']?\s*$/mu)?.[1];
  if (coverSystem === COVER_SYSTEM) failures.push(...(await auditCover(packageRoot)).errors);
  else if (coverSystem) failures.push("未知封面系统：" + coverSystem);
  else warnings.push("旧合同未接入固定封面检查；不能将此结果作为封面合规证明");
}

for (const relativePath of ["cover.png", "infographic.png"]) {
  if (!exists(relativePath)) continue;
  const dimensions = pngDimensions(path.join(packageRoot, relativePath));
  if (!dimensions) failures.push(`${relativePath} 不是可识别的 PNG`);
  else if (dimensions.width !== 1200 || dimensions.height !== 1600) {
    failures.push(`${relativePath} 尺寸为 ${dimensions.width}×${dimensions.height}，预期 1200×1600`);
  }
}

const seriesDir = path.join(packageRoot, "series");
const editableDir = path.join(packageRoot, "editable");
const seriesFiles = exists("series")
  ? fs.readdirSync(seriesDir).filter((name) => /^\d{2}\.png$/u.test(name)).sort()
  : [];

if (seriesFiles.length === 0) failures.push("series/ 中没有按两位序号命名的深读页 PNG");

for (const pngName of seriesFiles) {
  const baseName = path.basename(pngName, ".png");
  const editableName = `${baseName}.excalidraw`;
  if (!exists(path.join("editable", editableName))) failures.push(`${pngName} 缺少 editable/${editableName}`);

  const dimensions = pngDimensions(path.join(seriesDir, pngName));
  if (!dimensions) failures.push(`series/${pngName} 不是可识别的 PNG`);
  else if (dimensions.width !== 1200 || dimensions.height !== 1600) {
    failures.push(`series/${pngName} 尺寸为 ${dimensions.width}×${dimensions.height}，预期 1200×1600`);
  }
}

if (exists("editable")) {
  const orphanScenes = fs.readdirSync(editableDir)
    .filter((name) => /^\d{2}\.excalidraw$/u.test(name))
    .filter((name) => !seriesFiles.includes(`${path.basename(name, ".excalidraw")}.png`));
  for (const name of orphanScenes) warnings.push(`editable/${name} 没有对应的 series PNG`);
}

if (exists("release-manifest.json")) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "release-manifest.json"), "utf8"));
    const selected = manifest.selected_pages;
    const isNew = exists("palette.json");
    if (!Array.isArray(selected) || !selected.length) {
      if (isNew) failures.push("新版发布清单缺少 selected_pages");
      else warnings.push("旧版清单没有逐页选择记录；未校验选择哈希");
    } else {
      const ids = new Set(), selectedHashes = new Set();
      const palette = isNew ? JSON.parse(fs.readFileSync(path.join(packageRoot, "palette.json"), "utf8")) : null;
      if (palette) createPalette(palette);
      for (const item of selected) {
        if (!item.page_id || ids.has(item.page_id)) failures.push("选用列表 page_id 缺失或重复");
        ids.add(item.page_id);
        if (!["approved", "provisional"].includes(item.status) || !item.decision_basis?.trim())
          failures.push("选择状态或依据缺失：" + item.page_id);
        if (item.status === "provisional") warnings.push("尚无用户批准：" + item.page_id);
        for (const field of ["png", "editable"]) {
          const relative = item[field];
          if (typeof relative !== "string" || path.isAbsolute(relative) || relative.split(/[\\/]/u).includes("..")) {
            failures.push("选用文件必须为包内相对路径：" + item.page_id + "/" + field); continue;
          }
          const file = path.join(packageRoot, relative);
          if (!fs.existsSync(file)) { failures.push("选用文件不存在：" + relative); continue; }
          const hash = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
          if (hash !== item.sha256?.[field]) failures.push("选用文件哈希不符：" + relative);
          if (field === "png") selectedHashes.add(hash);
          if (palette && field === "editable" && file.endsWith(".excalidraw")) {
            const result = auditScenePalette(JSON.parse(fs.readFileSync(file, "utf8")), palette);
            failures.push(...result.errors.map(e => relative + ": " + e));
            warnings.push(...result.warnings.map(e => relative + ": " + e));
          }
        }
      }
      const published = ["cover.png", "infographic.png", ...seriesFiles.map(f => "series/" + f)];
      if (selected.length !== published.length) failures.push("选用数量与最终发布页数不一致");
      for (const file of published.filter(exists)) {
        const hash = crypto.createHash("sha256").update(fs.readFileSync(path.join(packageRoot, file))).digest("hex");
        if (!selectedHashes.has(hash)) failures.push("最终发布文件不在选用版本中：" + file);
      }
    }
  } catch (error) { failures.push("选择或配色校验失败：" + error.message); }
}

const report = {
  scope: "artifact-contract-dimensions-selection-and-palette",
  interpretation: "检查工件、尺寸与配对；新版清单另查逐页选择哈希和场景配色。不能验证用户批准真实性、contact sheet 像素内容或视觉质量；provisional 仍需用户审阅。",
  packageRoot,
  seriesPages: seriesFiles.length,
  failureCount: failures.length,
  warningCount: warnings.length,
  failures,
  warnings,
};

console.log(JSON.stringify(report, null, 2));
process.exit(failures.length === 0 ? 0 : 1);
