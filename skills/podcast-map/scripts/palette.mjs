// 同时供浏览器与 Node 渲染器使用；不提供默认配色。
const roleNames = ["paper", "ink", "muted", "line", "primary", "contrast", "primarySoft", "contrastSoft"];
const textRoles = ["ink", "muted", "primary", "contrast"];
const isHex = value => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const filled = value => typeof value === "string" && value.trim() && !/[<>]/.test(value);

export function contrastRatio(a, b) {
  if (!isHex(a) || !isHex(b)) throw new Error("对比度计算需要六位色值");
  const luminance = hex => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function createPalette(data) {
  const errors = [], roles = data?.roles || {};
  for (const key of roleNames) if (!isHex(roles[key])) errors.push("缺少六位色值：" + key);
  if (!filled(data?.source_id)) errors.push("缺少稳定来源标识");
  for (const key of ["primary", "contrast"])
    if (!filled(data?.meanings?.[key])) errors.push("缺少角色含义：" + key);
  if (!["primary", "contrast"].includes(data?.cover_accent)) errors.push("封面强调角色必须为 primary 或 contrast");
  if (!filled(data?.selection?.reason)) errors.push("缺少实际选色理由或历史限制");
  const recent = data?.selection?.recent_sources;
  if (!Array.isArray(recent)) errors.push("近期来源必须为数组");
  else {
    const seen = new Set();
    for (const item of recent) {
      if (!filled(item?.source_id) || !isHex(item?.primary) || !isHex(item?.contrast))
        errors.push("近期记录缺少来源或有效色值");
      if (item?.source_id === data?.source_id || seen.has(item?.source_id))
        errors.push("近期记录必须按不同来源去重，不能包含当前来源");
      seen.add(item?.source_id);
    }
  }
  if (errors.length) throw new Error(errors.join("；"));
  const C = Object.fromEntries(roleNames.map(key => [key, roles[key].toLowerCase()]));
  if (C.paper !== "#ffffff") errors.push("画布必须纯白");
  if (new Set([C.ink, C.primary, C.contrast]).size !== 3) errors.push("主强调和对照角色应有可区分色值");
  // 内部保守检查线：普通正文色对白底至少 4.5；不能替代最终图审阅。
  for (const key of textRoles)
    if (contrastRatio(C[key], C.paper) < 4.5) errors.push(key + " 对白底对比不足 4.5");
  for (const key of ["primarySoft", "contrastSoft"])
    if (contrastRatio(C.ink, C[key]) < 4.5) errors.push("正文对 " + key + " 对比不足 4.5");
  if (errors.length) throw new Error(errors.join("；"));
  return Object.freeze(C);
}

export function auditScenePalette(scene, data) {
  const C = createPalette(data), errors = [], warnings = [];
  const allColors = new Set(Object.values(C));
  const textColors = new Set(textRoles.map(k => C[k]));
  const elements = (scene.elements || []).filter(e => !e.isDeleted);
  if (scene.appState?.viewBackgroundColor?.toLowerCase() !== C.paper) errors.push("场景背景不是纯白");
  if (!elements.some(e => e.type === "text" && e.text?.trim())) errors.push("没有可检查的正文元素");
  for (const e of elements) {
    if (e.type === "image") { warnings.push(e.id + " 嵌入图片需目检"); continue; }
    const stroke = e.strokeColor?.toLowerCase();
    if (e.type === "text" && !textColors.has(stroke)) errors.push(e.id + " 文字色未使用声明的文字角色");
    for (const field of ["strokeColor", "backgroundColor"]) {
      const value = e[field]?.toLowerCase();
      if (value && value !== "transparent" && !allColors.has(value))
        errors.push(e.id + " " + field + " 不在声明配色中：" + value);
    }
    if (e.type === "rectangle" && e.x <= 0 && e.y <= 0 &&
        e.width >= 1200 && e.height >= 1600 &&
        e.backgroundColor !== "transparent" && e.backgroundColor?.toLowerCase() !== C.paper)
      errors.push(e.id + " 覆盖全页的矩形不是纯白");
    if (e.opacity !== undefined && e.opacity < 100) warnings.push(e.id + " 透明叠加需目检");
  }
  return { errors, warnings: [...new Set(warnings)] };
}
