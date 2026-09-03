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
const text = (id, x, y, width, height, value, customData = {}) => ({
  id, type: "text", x, y, width, height, text: value, fontSize: 24, customData,
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

fs.rmSync(tempRoot, { recursive: true, force: true });
console.log("audit regression fixtures passed: overlap, later connector, occlusion, explicit container");
