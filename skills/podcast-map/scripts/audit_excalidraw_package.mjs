#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const packageRoot = path.resolve(process.argv[2] || process.cwd());
const candidateDirs = [
  packageRoot,
  path.join(packageRoot, "editable"),
  path.join(packageRoot, "editable", "scenes"),
  path.join(packageRoot, "excalidraw"),
];
const editableDir = candidateDirs.find((candidate) =>
  fs.existsSync(candidate) && fs.statSync(candidate).isDirectory() &&
  fs.readdirSync(candidate).some((name) => name.endsWith(".excalidraw")));

if (!editableDir) {
  console.error(`No .excalidraw scene directory found under: ${packageRoot}`);
  process.exit(2);
}

const sceneFiles = fs.readdirSync(editableDir)
  .filter((name) => name.endsWith(".excalidraw"))
  .sort();

if (sceneFiles.length === 0) {
  console.error(`No .excalidraw scenes found in ${editableDir}`);
  process.exit(2);
}

const critical = [];
const warnings = [];

function bounds(element) {
  let minX = element.x ?? 0;
  let minY = element.y ?? 0;
  let maxX = minX + (element.width ?? 0);
  let maxY = minY + (element.height ?? 0);

  if (Array.isArray(element.points) && element.points.length > 0) {
    const xs = element.points.map(([x]) => (element.x ?? 0) + x);
    const ys = element.points.map(([, y]) => (element.y ?? 0) + y);
    minX = Math.min(...xs);
    minY = Math.min(...ys);
    maxX = Math.max(...xs);
    maxY = Math.max(...ys);
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function visualBounds(element) {
  const raw = bounds(element);
  const angle = Number(element.angle || 0);
  let rotated = raw;
  if (Math.abs(angle) > 0.0001) {
    const centerX = (raw.minX + raw.maxX) / 2;
    const centerY = (raw.minY + raw.maxY) / 2;
    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));
    const rotatedWidth = raw.width * cos + raw.height * sin;
    const rotatedHeight = raw.width * sin + raw.height * cos;
    rotated = {
      minX: centerX - rotatedWidth / 2,
      minY: centerY - rotatedHeight / 2,
      maxX: centerX + rotatedWidth / 2,
      maxY: centerY + rotatedHeight / 2,
      width: rotatedWidth,
      height: rotatedHeight,
    };
  }

  const hasVisibleStroke = !["text", "image"].includes(element.type) &&
    element.strokeColor !== "transparent";
  const strokeExpansion = hasVisibleStroke ? Number(element.strokeWidth || 1) / 2 : 0;
  const roughExpansion = hasVisibleStroke ? Number(element.roughness || 0) * 2 : 0;
  const expansion = strokeExpansion + roughExpansion;
  return {
    minX: rotated.minX - expansion,
    minY: rotated.minY - expansion,
    maxX: rotated.maxX + expansion,
    maxY: rotated.maxY + expansion,
    width: rotated.width + expansion * 2,
    height: rotated.height + expansion * 2,
  };
}

function overlapArea(a, b) {
  const width = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
  const height = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
  return width * height;
}

function contains(outer, inner) {
  return outer.minX <= inner.minX && outer.minY <= inner.minY &&
    outer.maxX >= inner.maxX && outer.maxY >= inner.maxY;
}

function pointInside(point, box) {
  return point.x >= box.minX && point.x <= box.maxX &&
    point.y >= box.minY && point.y <= box.maxY;
}

function pointInsideInsetShape(point, container, inset) {
  const box = container.box;
  const centerX = (box.minX + box.maxX) / 2;
  const centerY = (box.minY + box.maxY) / 2;
  const radiusX = box.width / 2 - inset;
  const radiusY = box.height / 2 - inset;
  if (radiusX <= 0 || radiusY <= 0) return false;
  const dx = Math.abs(point.x - centerX) / radiusX;
  const dy = Math.abs(point.y - centerY) / radiusY;
  if (container.element.type === "diamond") return dx + dy <= 1;
  if (container.element.type === "ellipse") return dx * dx + dy * dy <= 1;
  return pointInside(point, {
    minX: box.minX + inset,
    minY: box.minY + inset,
    maxX: box.maxX - inset,
    maxY: box.maxY - inset,
  });
}

function boxInsideInsetShape(box, container, inset) {
  return [
    { x: box.minX, y: box.minY },
    { x: box.maxX, y: box.minY },
    { x: box.minX, y: box.maxY },
    { x: box.maxX, y: box.maxY },
  ].every((point) => pointInsideInsetShape(point, container, inset));
}

function isOrphanLine(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  return /^[\p{Script=Han}\d]$/u.test(lines.at(-1));
}

function segmentIntersectsBox(start, end, box) {
  let low = 0;
  let high = 1;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const tests = [
    [-dx, start.x - box.minX],
    [dx, box.maxX - start.x],
    [-dy, start.y - box.minY],
    [dy, box.maxY - start.y],
  ];

  for (const [p, q] of tests) {
    if (p === 0 && q < 0) return false;
    if (p === 0) continue;
    const ratio = q / p;
    if (p < 0) low = Math.max(low, ratio);
    else high = Math.min(high, ratio);
    if (low > high) return false;
  }
  return true;
}

function hasOpaqueFill(element) {
  const color = element.backgroundColor;
  return ["rectangle", "ellipse", "diamond"].includes(element.type) &&
    color && color !== "transparent" && color !== "none";
}

for (const file of sceneFiles) {
  const filePath = path.join(editableDir, file);
  let scene;
  try {
    scene = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    critical.push(`${file}: invalid JSON (${error.message})`);
    continue;
  }

  const elements = (scene.elements || []).filter((element) => !element.isDeleted);
  const canvasBase = elements
    .filter((element) => element.type === "rectangle" && element.backgroundColor === "#ffffff")
    .map((element) => ({ element, box: bounds(element) }))
    .filter(({ box }) => box.minX <= 0 && box.minY <= 0 && box.width > 0 && box.height > 0)
    .sort((a, b) => (b.box.width * b.box.height) - (a.box.width * a.box.height))[0];

  if (scene.appState?.viewBackgroundColor !== "#ffffff") {
    critical.push(`${file}: viewBackgroundColor is not #ffffff`);
  }
  if (!canvasBase) {
    critical.push(`${file}: missing opaque white full-canvas base rectangle`);
  }

  if (canvasBase) {
    for (const element of elements) {
      if (element === canvasBase.element) continue;
      const box = visualBounds(element);
      if (box.minX < canvasBase.box.minX || box.minY < canvasBase.box.minY ||
          box.maxX > canvasBase.box.maxX || box.maxY > canvasBase.box.maxY) {
        critical.push(`${file}: ${element.id || element.type} visual stroke bounds exceed the canvas crop`);
      }
    }
  }

  const textElements = elements.filter((element) => element.type === "text");
  const shapeContainers = elements
    .filter((element) => ["rectangle", "ellipse", "diamond"].includes(element.type) && element !== canvasBase?.element)
    .map((element) => ({ element, box: bounds(element) }));

  if (canvasBase) {
    const minimumFrameInset = 32;
    for (const container of shapeContainers) {
      if (container.element.customData?.allowCanvasBleed === true) continue;
      const box = visualBounds(container.element);
      const frameClearance = Math.min(
        box.minX - canvasBase.box.minX,
        box.minY - canvasBase.box.minY,
        canvasBase.box.maxX - box.maxX,
        canvasBase.box.maxY - box.maxY,
      );
      if (frameClearance < minimumFrameInset) {
        warnings.push(`${file}: ${container.element.type} ${container.element.id || ""} 距画布边缘仅 ${Math.round(frameClearance)}px；请在最终 PNG 中确认不是意外贴边`);
      }
    }
  }
  const containersByKnowledgeId = new Map(
    shapeContainers
      .filter(({ element }) => element.customData?.knowledgeContainerId)
      .map((container) => [container.element.customData.knowledgeContainerId, container]),
  );
  const textGroupsByContainer = new Map();

  for (let index = 0; index < textElements.length; index += 1) {
    const first = textElements[index];
    const firstBox = bounds(first);
    for (let otherIndex = index + 1; otherIndex < textElements.length; otherIndex += 1) {
      const second = textElements[otherIndex];
      const area = overlapArea(firstBox, bounds(second));
      if (area > 4) {
        critical.push(`${file}: text overlap ${first.id || index} / ${second.id || otherIndex} (${Math.round(area)} px2)`);
      }
    }

    const knowledgeRole = first.customData?.knowledgeRole;
    if ((first.fontSize ?? 0) < 20 && firstBox.minY > 120 && firstBox.minY < 1450 &&
        !["navigation", "source", "footer"].includes(knowledgeRole)) {
      warnings.push(`${file}: text ${first.id || index} uses ${first.fontSize}px in the substantive content zone`);
    }

    const assignedContainerId = first.customData?.knowledgeContainerId;
    let container = assignedContainerId ? containersByKnowledgeId.get(assignedContainerId) : null;
    if (assignedContainerId && !container) {
      critical.push(`${file}: text ${first.id || index} references missing knowledge container ${assignedContainerId}`);
    }
    if (container) {
      const groupKey = container.element.id || container.element.customData?.knowledgeContainerId;
      if (!textGroupsByContainer.has(groupKey)) textGroupsByContainer.set(groupKey, { container, texts: [] });
      textGroupsByContainer.get(groupKey).texts.push({ element: first, box: firstBox });
      const clearances = [
        firstBox.minX - container.box.minX,
        firstBox.minY - container.box.minY,
        container.box.maxX - firstBox.maxX,
        container.box.maxY - firstBox.maxY,
      ];
      const inset = Math.min(...clearances);
      const requiredInset = container.element.type === "rectangle" ? 8 : 16;
      if (!contains(container.box, firstBox)) {
        critical.push(`${file}: text ${first.id || index} exceeds assigned ${container.element.type} ${container.element.id || assignedContainerId || ""} by ${Math.abs(Math.round(inset))}px`);
      } else if (inset < requiredInset) {
        warnings.push(`${file}: text ${first.id || index} 在 ${container.element.type} ${container.element.id || assignedContainerId || ""} 内边距仅 ${Math.round(inset)}px；请查看最终 PNG`);
      } else if (["ellipse", "diamond"].includes(container.element.type) &&
          !boxInsideInsetShape(firstBox, container, requiredInset)) {
        critical.push(`${file}: text ${first.id || index} leaves the ${container.element.type} inscribed safe area; bounding-box clearance is insufficient`);
      }
    }

    if (first.customData?.knowledgeTextKind === "container-body" && isOrphanLine(first.text)) {
      warnings.push(`${file}: container body text ${first.id || index} 疑似以单字孤行结尾`);
    }
  }

  for (const { container, texts } of textGroupsByContainer.values()) {
    if (container.element.type !== "rectangle" || container.box.height < 110) continue;
    const eligible = texts.filter(({ element }) =>
      !["navigation", "source", "footer"].includes(element.customData?.knowledgeRole));
    if (eligible.length < 2) continue;

    const explicitBody = eligible.filter(({ element }) => element.customData?.knowledgeTextKind === "container-body");
    const explicitTitles = eligible.filter(({ element }) => element.customData?.knowledgeTextKind === "container-title");
    const largestFont = Math.max(...eligible.map(({ element }) => Number(element.fontSize || 0)));
    const bodyTexts = explicitBody.length > 0
      ? explicitBody
      : eligible.filter(({ element }) => Number(element.fontSize || 0) <= largestFont - 2);
    if (bodyTexts.length === 0) continue;

    const bodyFont = Math.min(...bodyTexts.map(({ element }) => Number(element.fontSize || 0)));
    if (bodyFont < 22) {
      warnings.push(`${file}: container ${container.element.id || ""} 正文为 ${bodyFont}px，低于 22px 风险线；需在手机尺寸查看最终 PNG`);
    }


    if (explicitTitles.length > 0) {
      const smallestTitle = Math.min(...explicitTitles.map(({ element }) => Number(element.fontSize || 0)));
      const largestBody = Math.max(...bodyTexts.map(({ element }) => Number(element.fontSize || 0)));
      if (smallestTitle < largestBody) {
        critical.push(`${file}: container ${container.element.id || ""} reverses hierarchy; title ${smallestTitle}px is smaller than body ${largestBody}px`);
      }
    }

  }

  const connectors = elements.filter((element) =>
    ["arrow", "line"].includes(element.type) && Array.isArray(element.points) && element.points.length > 1);
  for (const connector of connectors) {
    const connectorIndex = elements.indexOf(connector);
    const points = connector.points.map(([x, y]) => ({
      x: (connector.x ?? 0) + x,
      y: (connector.y ?? 0) + y,
    }));
    for (const textElement of textElements) {
      const textIndex = elements.indexOf(textElement);
      const textBox = bounds(textElement);
      const actualTextBox = {
        minX: textBox.minX,
        minY: textBox.minY,
        maxX: textBox.maxX,
        maxY: textBox.maxY,
      };
      const paddedTextBox = {
        minX: textBox.minX - 12,
        minY: textBox.minY - 12,
        maxX: textBox.maxX + 12,
        maxY: textBox.maxY + 12,
      };
      let intersectsText = false;
      let intersectsSafetyBox = false;
      for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
        const start = points[pointIndex];
        const end = points[pointIndex + 1];
        if (segmentIntersectsBox(start, end, actualTextBox)) intersectsText = true;
        if (segmentIntersectsBox(start, end, paddedTextBox)) intersectsSafetyBox = true;
      }
      const occludedByLaterShape = shapeContainers.some(({ element, box }) => {
        const shapeIndex = elements.indexOf(element);
        return connectorIndex < shapeIndex && shapeIndex < textIndex &&
          hasOpaqueFill(element) && contains(box, actualTextBox);
      });
      if (occludedByLaterShape) continue;
      if (intersectsText && connectorIndex > textIndex) {
        critical.push(`${file}: later-drawn connector ${connector.id || connector.type} overlays text ${textElement.id || ""}`);
      } else if (intersectsText) {
        warnings.push(`${file}: earlier-drawn connector ${connector.id || connector.type} crosses text bounds ${textElement.id || ""}; inspect glyph-level visibility in final PNG`);
      } else if (intersectsSafetyBox) {
        warnings.push(`${file}: connector ${connector.id || connector.type} 距文字 ${textElement.id || ""} 少于 12px；请查看最终 PNG`);
      }
    }
  }


  if (/^\d{2}\.excalidraw$/u.test(file)) {
    const expectedPage = path.basename(file, ".excalidraw");
    const pageNumbers = textElements.filter((element) =>
      element.customData?.knowledgeRole === "navigation" && String(element.text || "").trim() === expectedPage);
    if (pageNumbers.length !== 1) {
      critical.push(`${file}: expected exactly one navigation page number ${expectedPage}; found ${pageNumbers.length}`);
    }
  }

  for (const { container, texts } of textGroupsByContainer.values()) {
    if (container.element.type !== "diamond") continue;
    const substantive = texts.filter(({ element }) =>
      !["navigation", "source", "footer"].includes(element.customData?.knowledgeRole));
    const totalLines = substantive.reduce((sum, { element }) =>
      sum + String(element.text || "").split(/\r?\n/).filter((line) => line.trim()).length, 0);
    if (totalLines > 2) {
      warnings.push(`${file}: diamond ${container.element.id || ""} 包含 ${totalLines} 行文字；请确认内切安全区和手机可读性`);
    }
  }
}

const report = {
  scope: "mechanical-only",
  interpretation: "PASS 仅表示可编辑场景未发现已编码的几何与可读性硬错误，不代表内容、视觉必要性、来源忠实度或整套节奏通过。",
  packageRoot,
  scenes: sceneFiles.length,
  criticalCount: critical.length,
  warningCount: warnings.length,
  critical,
  warnings,
};

console.log(JSON.stringify(report, null, 2));
process.exit(critical.length === 0 ? 0 : 1);
