#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const auditScript = path.join(path.dirname(new URL(import.meta.url).pathname), "audit_excalidraw_package.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-audit-"));

const rect = (id, x, y, width, height, backgroundColor = "#ffffff", customData = {}) => ({
  id, type: "rectangle", x, y, width, height, strokeColor: "#222222", backgroundColor,
  strokeWidth: 2, roughness: 0, customData,
});
const text = (id, x, y, width, height, value, customData = {}, options = {}) => ({
  id, type: "text", x, y, width, height, text: value, fontSize: 24, customData, ...options,
});
const line = (id, x, y, points) => ({
  id, type: "line", x, y, width: 200, height: 0, points, strokeColor: "#222222", strokeWidth: 3,
});
const canvas = rect("canvas", 0, 0, 1200, 1600);

function runCase(name, elements) {
  const root = path.join(tempRoot, name);
  const editable = path.join(root, "editable");
  fs.mkdirSync(editable, { recursive: true });
  fs.writeFileSync(path.join(editable, "01.excalidraw"), JSON.stringify({
    type: "excalidraw", version: 2, appState: { viewBackgroundColor: "#ffffff" }, elements,
  }));
  const result = spawnSync(process.execPath, [auditScript, root], { encoding: "utf8" });
  return JSON.parse(result.stdout);
}

const overlap = runCase("overlap", [
  canvas,
  text("a", 100, 200, 180, 40, "第一段文字"),
  text("b", 150, 215, 180, 40, "第二段文字"),
  text("page", 1100, 1520, 30, 24, "01", { knowledgeRole: "navigation" }),
]);
if (!overlap.critical.some((item) => item.includes("text overlap"))) throw new Error("未检出真实文字重叠");

const laterConnector = runCase("later-connector", [
  canvas,
  text("body", 200, 300, 220, 50, "连接线覆盖文字"),
  line("late", 150, 325, [[0, 0], [350, 0]]),
  text("page", 1100, 1520, 30, 24, "01", { knowledgeRole: "navigation" }),
]);
if (!laterConnector.critical.some((item) => item.includes("later-drawn connector"))) throw new Error("未检出后绘制线路覆盖文字");

const occludedConnector = runCase("occluded-connector", [
  canvas,
  line("early", 150, 325, [[0, 0], [350, 0]]),
  rect("node", 180, 280, 280, 100, "#ffffff"),
  text("body", 210, 305, 220, 50, "节点遮住后方线路"),
  text("page", 1100, 1520, 30, 24, "01", { knowledgeRole: "navigation" }),
]);
if (occludedConnector.critical.some((item) => item.includes("connector"))) throw new Error("把被不透明节点遮挡的线路误报为 critical");

const explicitContainer = runCase("explicit-container", [
  canvas,
  rect("container", 100, 300, 180, 100, "#ffffff", { knowledgeContainerId: "summary" }),
  text("body", 120, 320, 260, 60, "显式容器越界", { knowledgeContainerId: "summary", knowledgeTextKind: "container-body" }),
  text("page", 1100, 1520, 30, 24, "01", { knowledgeRole: "navigation" }),
]);
if (!explicitContainer.critical.some((item) => item.includes("exceeds assigned rectangle"))) throw new Error("未检出显式容器文字越界");

const implicitContainer = runCase("implicit-container", [
  canvas,
  rect("container", 100, 300, 180, 100),
  text("body", 120, 320, 260, 60, "未标注容器但真实越界"),
  text("page", 1100, 1520, 30, 24, "01", { knowledgeRole: "navigation" }),
]);
if (!implicitContainer.critical.some((item) => item.includes("exceeds inferred rectangle"))) throw new Error("未检出未标注容器中的真实越界");

const implicitSafe = runCase("implicit-safe", [
  canvas,
  rect("container", 100, 300, 280, 100),
  text("body", 120, 320, 220, 50, "未标注但完整位于容器内"),
  text("page", 1100, 1520, 30, 24, "01", { knowledgeRole: "navigation" }),
]);
if (implicitSafe.critical.some((item) => item.includes("exceeds inferred rectangle"))) throw new Error("把完整位于隐式容器内的文字误报为越界");

const flatHierarchy = runCase("flat-hierarchy", [
  canvas,
  rect("container", 100, 300, 500, 220, "#ffffff", { knowledgeContainerId: "module" }),
  text("title", 130, 330, 300, 40, "模块标题", { knowledgeContainerId: "module", knowledgeTextKind: "container-title" }, { fontSize: 28, textAlign: "left" }),
  text("body", 130, 390, 400, 80, "连续正文第一行\n连续正文第二行", { knowledgeContainerId: "module", knowledgeTextKind: "container-body" }, { fontSize: 28, textAlign: "left" }),
  text("page", 1100, 1520, 30, 24, "01", { knowledgeRole: "navigation" }),
]);
if (!flatHierarchy.critical.some((item) => item.includes("lacks title hierarchy"))) throw new Error("未检出容器标题与正文同级");

const centeredBody = runCase("centered-body", [
  canvas,
  rect("container", 100, 300, 500, 220, "#ffffff", { knowledgeContainerId: "module" }),
  text("title", 130, 330, 300, 40, "模块标题", { knowledgeContainerId: "module", knowledgeTextKind: "container-title" }, { fontSize: 32, textAlign: "left" }),
  text("body", 130, 390, 400, 80, "连续正文第一行\n短句", { knowledgeContainerId: "module", knowledgeTextKind: "container-body" }, { fontSize: 28, textAlign: "center" }),
  text("page", 1100, 1520, 30, 24, "01", { knowledgeRole: "navigation" }),
]);
if (!centeredBody.critical.some((item) => item.includes("centered multi-line body"))) throw new Error("未检出多行矩形正文居中");

const intentionalCenteredLabel = runCase("intentional-centered-label", [
  canvas,
  rect("container", 100, 300, 500, 220, "#ffffff", { knowledgeContainerId: "module" }),
  text("title", 130, 330, 300, 40, "模块标题", { knowledgeContainerId: "module", knowledgeTextKind: "container-title" }, { fontSize: 32, textAlign: "left" }),
  text("body", 130, 390, 400, 80, "对称图形标签\n第二行", { knowledgeContainerId: "module", knowledgeTextKind: "container-body", allowCenteredBody: true }, { fontSize: 28, textAlign: "center" }),
  text("page", 1100, 1520, 30, 24, "01", { knowledgeRole: "navigation" }),
]);
if (intentionalCenteredLabel.critical.some((item) => item.includes("centered multi-line body"))) throw new Error("没有尊重显式居中例外");

fs.rmSync(tempRoot, { recursive: true, force: true });
console.log("audit regression fixtures passed: overlap, connectors, containers, hierarchy and alignment");
