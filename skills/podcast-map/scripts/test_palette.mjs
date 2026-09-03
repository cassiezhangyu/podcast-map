#!/usr/bin/env node
import assert from "node:assert/strict";
import { createPalette, contrastRatio, auditScenePalette } from "./palette.mjs";
const data = {
  source_id: "测试来源",
  roles: { paper: "#FFFFFF", ink: "#243047", muted: "#626772", line: "#B2B7BF",
    primary: "#365EA8", contrast: "#9A571A", primarySoft: "#EFF3FA", contrastSoft: "#FBF3E9" },
  meanings: { primary: "主关系", contrast: "约束条件" },
  cover_accent: "primary", selection: { recent_sources: [], reason: "隔离测试，无历史记录" }
};
const change = fn => { const p = structuredClone(data); fn(p); return p; };
let tests = 0;
function check(name, fn) { fn(); tests++; console.log("通过：" + name); }
check("有效配色且不修改输入", () => {
  assert.equal(createPalette(data).paper, "#ffffff"); assert.equal(data.roles.paper, "#FFFFFF");
});
check("对比度数值", () => assert.equal(contrastRatio("#000000", "#ffffff"), 21));
check("缺配色不回退", () => assert.throws(() => createPalette({})));
check("彩色画布拒绝", () => assert.throws(() => createPalette(change(p => p.roles.paper = "#fffaf0")), /纯白/));
check("低对比正文拒绝", () => assert.throws(() => createPalette(change(p => p.roles.primary = "#bbbbbb")), /对比不足/));
check("占位含义拒绝", () => assert.throws(() => createPalette(change(p => p.meanings.primary = "<待填>"))));
check("错误封面角色拒绝", () => assert.throws(() => createPalette(change(p => p.cover_accent = "muted"))));
check("同来源不同版本不能算两套", () => assert.throws(() => createPalette(change(p => {
  p.selection.recent_sources = [1, 2].map(version => ({ source_id: "相同来源", version, primary: "#365ea8", contrast: "#9a571a" }));
})), /去重/));
check("当前来源不能算近期另一套", () => assert.throws(() => createPalette(change(p => {
  p.selection.recent_sources = [{ source_id: p.source_id, primary: "#365ea8", contrast: "#9a571a" }];
})), /当前来源/));
const scene = { appState: { viewBackgroundColor: "#ffffff" }, elements: [
  { id: "正文", type: "text", text: "真实文字", strokeColor: "#243047", backgroundColor: "transparent", opacity: 100 }
] };
const mutateScene = fn => { const s = structuredClone(scene); fn(s); return auditScenePalette(s, data); };
check("实际场景通过", () => assert.deepEqual(auditScenePalette(scene, data).errors, []));
check("声明正确但实际红字越权", () => assert.ok(mutateScene(s => s.elements[0].strokeColor = "#ff0000").errors.length));
check("浅填充不能当文字色", () => assert.ok(mutateScene(s => s.elements[0].strokeColor = "#eff3fa").errors.length));
check("实际背景错误", () => assert.ok(mutateScene(s => s.appState.viewBackgroundColor = "#fffaf0").errors.length));
check("白背景被整页彩色矩形覆盖", () => assert.ok(mutateScene(s => s.elements.unshift({
  id: "底板", type: "rectangle", x: 0, y: 0, width: 1200, height: 1600, backgroundColor: "#eff3fa"
})).errors.length));
check("官方图片不要求改色", () => {
  const result = mutateScene(s => s.elements.push({ id: "官方图片", type: "image" }));
  assert.equal(result.errors.length, 0); assert.ok(result.warnings.length);
});
check("透明叠加不能伪称已核验", () => assert.ok(mutateScene(s => s.elements[0].opacity = 60).warnings.length));
check("空场景拒绝", () => assert.ok(mutateScene(s => s.elements = []).errors.length));
console.log("完成 " + tests + " 项配色回归；不代表视觉或行为盲测通过。");
