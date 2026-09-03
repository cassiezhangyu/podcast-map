# Excalidraw 实现与成品验证

内容形式由 [editorial-planning.md](editorial-planning.md) 决定；白底、颜色和系列规范由 [house-style.md](house-style.md) 决定。本文件只约束实现。

## 低层复用

每套冻结画布、字体层级、线感、间距、导航和来源样式。可复用文字测量、断行、形状、箭头端点、配色角色和导出；不让整页组件预先决定所有内容的模块数量与路径。

相同对照任务可以共享矩阵结构；不同任务不能只换函数名、标题或颜色冒充新设计。

## 配色接入

正文与封面都先读包根目录的 `palette.json`，再调用：

```js
import { createPalette } from "./palette.mjs";
const C = createPalette(paletteData);
// 正文用 C.ink；关键关系用 C.primary；需区分的角色用 C.contrast。
// 从 skill/scripts 复制 palette.mjs 到构建目录，不依赖机器绝对路径。
```

不设置红绿兜底。导出前检查完整的最终选用场景列表，排除落选实验稿：

```sh
node <skill>/scripts/audit_palette.mjs <包>/palette.json <最终场景1.excalidraw> <最终场景2.excalidraw>
```

它只检查声明、基础对比度和场景实际用色。嵌入图片、封面栅格、透明叠加和语义是否恰当仍需最终图审查，不得称为全套颜色视觉验收。

## 几何与正文

1200 × 1600 页面可从主标题 56–68 px、分区 30–38 px、正文 28 px、辅助 22–24 px、来源 16–18 px 起步。按真实内容和手机预览校准，已批准字号优先保留；22 px 是正文风险线，不是默认目标。

- 测量真实字体后断行，先改写和重排，不以缩字掩盖容量问题。
- 非矩形使用真实内切安全区；漏斗符号随截面收窄，不能越线。
- 连接线不穿字；并列不要用方向箭头暗示因果。
- 不制造无依据的精确数字、比例或科学外观；必要时注明定性示意。
- 图形价值可为形态说明、关系追踪或减少比较成本，不要求每页有复杂主图。

## 输出与检查

可编辑场景与 PNG 同次导出、一一配对，保留生成源。扫描所有受影响页，不只看被批注的一处。

先看最终 contact sheet 的入口、疏密与系列感，再看原尺寸及 360–430 CSS px 手机图的断行、层级、颜色、净空与顺序。灰度预览可辅助检查层级，但不强制先产黑白稿，更不能替代最终配色验收。

问题按 [production-protocol.md](production-protocol.md) 分级；质量判断按 [quality-gates.md](quality-gates.md)。不增加图形数量、占满率或布局种数配额。

需要风格线索时才读 [style-library.md](style-library.md)，它不能覆盖白底、系列封面与 Excalidraw 约束。
