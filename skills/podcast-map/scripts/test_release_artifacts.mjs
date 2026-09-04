#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRuntimeManifest } from "./runtime-manifest.mjs";

const png = process.argv[2];
if (!png) throw new Error("需要一张真实 1200×1600 PNG 作为隔离文件检查夹具");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-selection-test-"));
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const checker = fileURLToPath(new URL("./check_release_artifacts.mjs", import.meta.url));
fs.mkdirSync(path.join(root, "series"));
fs.mkdirSync(path.join(root, "editable"));
fs.copyFileSync(png, path.join(root, "contact-sheet.png"));
for (const name of ["source-verification", "source-coverage-audit", "content-model", "overview-proof", "page-plan",
  "composition-candidates", "style-direction", "visual-red-team", "quality-audit", "knowledge", "xiaohongshu-note"])
  fs.writeFileSync(path.join(root, name + ".md"), "隔离检查夹具，不是发布材料");
for (const name of ["baseline-manifest", "mechanical-audit"])
  fs.writeFileSync(path.join(root, name + ".json"), "{}");
fs.writeFileSync(path.join(root, "skill-runtime.json"), JSON.stringify(createRuntimeManifest()));
const validContract = 'contract_version: 2\nbackground: "#FFFFFF"\ntop_right_progress: true\ndivider_count: 1\npalette_file: "palette.json"\npreset_id: "editorial-excalidraw-v1"\nconstraint_scope:\n  - applies_to: ["overview"]\n    lifetime: "series"\n    authority: "user-confirmed"\n    status: "confirmed"\n';
fs.writeFileSync(path.join(root, "visual-contract.yaml"), validContract);
const palette = {
  source_id: "隔离测试",
  roles: { paper: "#FFFFFF", ink: "#243047", muted: "#626772", line: "#B2B7BF",
    primary: "#365EA8", contrast: "#9A571A", primarySoft: "#EFF3FA", contrastSoft: "#FBF3E9" },
  meanings: { primary: "关系", contrast: "约束" }, cover_accent: "primary",
  selection: { recent_sources: [], reason: "无历史，隔离测试" }
};
fs.writeFileSync(path.join(root, "palette.json"), JSON.stringify(palette));
const scene = { appState: { viewBackgroundColor: "#ffffff" },
  elements: [{ id: "正文", type: "text", text: "检查", strokeColor: "#243047" }] };
const entries = [["cover", "cover.png", "cover-source.json"],
  ["overview", "infographic.png", "editable/infographic.excalidraw"],
  ["01", "series/01.png", "editable/01.excalidraw"]];
for (const [, image, editable] of entries) {
  fs.copyFileSync(png, path.join(root, image));
  fs.writeFileSync(path.join(root, editable), JSON.stringify(scene));
}
const selected = entries.map(([page_id, png, editable]) => ({
  page_id, version: "隔离夹具", png, editable, status: "approved",
  decision_basis: "仅用于检查字段；不代表实际批准",
  sha256: { png: hash(path.join(root, png)), editable: hash(path.join(root, editable)) }
}));
let count = 0;
function run(name, change, assertion) {
  const pages = structuredClone(selected);
  change(pages);
  fs.writeFileSync(path.join(root, "release-manifest.json"), JSON.stringify({
    package_status: "VISUAL_REVIEW_PASSED",
    selected_pages: pages,
  }));
  const result = spawnSync(process.execPath, [checker, root], { encoding: "utf8" });
  const report = JSON.parse(result.stdout);
  assertion(report);
  count++;
  console.log("通过：" + name);
}
try {
  run("实际文件与哈希匹配", () => {}, r => assert.equal(r.failureCount, 0));
  run("错误哈希拦截", p => p[1].sha256.png = "错误", r => assert.ok(r.failures.some(x => x.includes("哈希不符"))));
  run("缺失选用文件拦截", p => p[1].png = "missing.png", r => assert.ok(r.failures.some(x => x.includes("不存在"))));
  run("重复页面标识拦截", p => p[1].page_id = "01", r => assert.ok(r.failures.some(x => x.includes("重复"))));
  run("选择状态不能省略", p => p[1].status = "", r => assert.ok(r.failures.some(x => x.includes("状态"))));
  run("暂选不冒充用户批准", p => p[1].status = "provisional", r => assert.ok(r.warnings.some(x => x.includes("尚无用户批准"))));
  {
    const pages = structuredClone(selected);
    pages[1].status = "provisional";
    fs.writeFileSync(path.join(root, "release-manifest.json"), JSON.stringify({ package_status: "RELEASED", selected_pages: pages }));
    const result = spawnSync(process.execPath, [checker, root, "--release"], { encoding: "utf8" });
    const report = JSON.parse(result.stdout);
    assert.ok(report.failures.some(x => x.includes("正式发布仍有 provisional")));
    count++;
    console.log("通过：正式发布拦截暂选页面");
  }
  run("范围外路径拦截", p => p[1].png = "../outside.png", r => assert.ok(r.failures.some(x => x.includes("相对路径"))));
  run("缺页拦截", p => p.pop(), r => assert.ok(r.failures.some(x => x.includes("页数不一致"))));
  fs.copyFileSync(path.join(root, "infographic.png"), path.join(root, "selected-overview.png"));
  fs.appendFileSync(path.join(root, "infographic.png"), Buffer.from("模拟导出了未选用的另一版本"));
  run("最终 PNG 不是选中版本时拦截", p => p[1].png = "selected-overview.png",
    r => assert.ok(r.failures.some(x => x.includes("不在选用版本"))));
  fs.copyFileSync(png, path.join(root, "infographic.png"));
  fs.writeFileSync(path.join(root, "editable/01.excalidraw"),
    JSON.stringify({ ...scene, elements: [{ ...scene.elements[0], strokeColor: "#ff0000" }] }));
  run("实际用色不符不能靠声明通过", p => p[2].sha256.editable = hash(path.join(root, p[2].editable)),
    r => assert.ok(r.failures.some(x => x.includes("文字色"))));
  fs.writeFileSync(path.join(root, "editable/01.excalidraw"), JSON.stringify(scene));
  fs.writeFileSync(path.join(root, "visual-contract.yaml"), validContract.replace('    authority: "user-confirmed"\n', ''));
  run("新版合同缺少作用范围依据时拦截", p => p[2].sha256.editable = hash(path.join(root, p[2].editable)),
    r => assert.ok(r.failures.some(x => x.includes("constraint_scope 缺少 authority"))));
  console.log("完成 " + count + " 项文件选择回归；不证明成品视觉质量。");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
