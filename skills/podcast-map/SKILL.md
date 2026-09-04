---
name: podcast-map
description: "深入解读播客、长音频及其可靠转写稿，梳理概念、知识关系、分歧与边界，先形成独立可读的理解稿，再按需制作知识总览、Excalidraw 深读组图、编辑式封面与小红书文案。用于播客知识理解和再表达，不用于单纯逐字转写或装饰海报。"
---

# 播客知识图

第一目标是帮助用户真正理解节目，第二目标是将理解清楚、好看地传达给受众。先形成独立可读的解读，再做传播取舍和视觉表达。稳定的是来源、可读性和系列语言，不是页数、配色或整页模板。

## 先确定本次范围

- **新知识包**：按下列路线完整制作。
- **只理解内容**：用户明确只要解读时，交付来源核验、解读母稿及理解检查结果，不强制出图或要求绘图工具。仅给材料而未缩小范围时仍默认完整知识包。
- **定向返修**：读取现有来源、页面选择与视觉合同，只重做受影响环节；已验证模型和未受影响的批准稿不重建。
- **复盘或方案评估**：只检查和提出方案，不将评估授权当成改图或安装授权。
- **skill 迭代**：使用 [rule-regression.md](references/rule-regression.md) 的规则归并与验证方法，不追加个案禁令。

新知识包开始时运行 `node <skill>/scripts/write_runtime_manifest.mjs <知识包目录>`，把实际执行版本写入 `skill-runtime.json`。不得一边生成一边修改 skill；版本变化后必须开始新的候选批次。

## 不可漂移的质量底线

- 输入范围与缺失明确，结论、术语和锚点可追溯；Show Notes、时间轴和评论不能代替原音。不得因受限环境报错而静默更换转写模型或后端。
- 理解稿先于页面计划；保留重要分支、分歧和不确定性，不为一个传播切口制造虚假统一结论。
- 总览是独立高密度旗舰页，不能靠后页补核心结论。
- 页数服从必要内容、关系和手机容量；没有最低页数，深读最多 15 页。不把一个话题自动换成一页，也不强压独立机制来追求少页。
- 每页有解释、证据或具体处境支撑。矩阵、场景、机制图和编辑排版都可成立，由阅读任务选择；不为显得“有图”制造框线。
- 纯白画布、深色阅读骨架、克制且有含义的强调色；换知识包可换色，同套不随页换色。
- 保持 Excalidraw 手绘线感及对应可编辑源；封面遵守批准的系列骨架。
- 文字不重叠、不压线、不裁切，正常手机宽度可读；优先改写和重排，不以缩字解决容量。
- 用户选择优先于版本新旧；冻结批准资产。最终图片而非计划或自报字段决定视觉质量。

## 完整制作路线

### 1. 来源与内容

先读 [transcription.md](references/transcription.md)，核验节目身份、完整音轨、转写覆盖和关键术语。按 [content-model.md](references/content-model.md) 建立内容底账、来源覆盖审计与独立可读的 knowledge.md，解释概念、关系、主线和分支，区分来源主张、综合、延伸及待核验事实。再按 [reader-first-writing.md](references/reader-first-writing.md) 检查陌生读者能否脱离节目语境读懂。完成 [quality-gates.md](references/quality-gates.md) 的理解验收后才规划图片。正常阶段连续执行，不要求用户逐关签字。

### 2. 阅读任务与页面计划

读 [editorial-planning.md](references/editorial-planning.md)，在 page-plan.md 简记受众、传播切口和取舍。先确定读者需要比较、追踪、辨别还是理解处境，再选形式；题材约束忠实度，不直接决定布局。按 [density-and-visual-translation.md](references/density-and-visual-translation.md) 做知识单元聚合与真实合并测试。

总览另读 [overview-standard.md](references/overview-standard.md)，完成独立复述证明。候选与风险小样的范围统一按 [production-protocol.md](references/production-protocol.md)，不在不同文档重复规定数量。

### 3. 系列语言与结构小样

新包定方向时读 [benchmarks.md](references/benchmarks.md)，查看适用的真实正反成品，学习成功原因，不复制骨架、页数或色值。

按 [house-style.md](references/house-style.md) 建立视觉合同和唯一 `palette.json`。保留白底、字体与导航，选择适合内容且区别于近期不同来源的配色。用真实内容做风险小样，检查理解和容量后再扩展；不强制所有材料都出现人物插图或固定图形。

### 4. 制作与择优

按 [visual-system.md](references/visual-system.md) 实现 Excalidraw，按 [cover-design.md](references/cover-design.md) 制作封面。SVG、HTML 或 Canvas 可以作为渲染中间层，但不能替代逐页 `.excalidraw` 可编辑源。只有需要信息性插图时才读 [excalidraw-micro-illustrations.md](references/excalidraw-micro-illustrations.md)。

页面逐张择优，允许新版总览、旧版矩阵共同进入成品；选择记录及哈希按生产协议保存。新方案必须带来理解增量，不能仅以“更有图”替代清晰的批准稿。

### 5. 验收与交付

读 [quality-gates.md](references/quality-gates.md)、[release-contract.md](references/release-contract.md) 和 [deliverables.md](references/deliverables.md)。

- 检查最终场景、原尺寸 PNG、360–430 CSS px 手机预览和整套 contact sheet。
- 先运行 `audit_excalidraw_package.mjs`，再运行 `check_release_artifacts.mjs`；任一失败都不得描述为完成。带 `--release` 运行时，尚未批准的页面会阻断正式发布。
- 机器结果限于确实测量的尺寸、配对、几何、颜色等事实；意义、深度与秩序仍要看图和核对来源。
- 生产者自审标作预检；没有独立观察上下文，不声称独立红队或行为盲测通过。
- 来源缺失、小样不过关或最终图仍有阻断问题时报告缺口，不以文件齐全宣称发布完成。

默认交付：独立封面、高密度总览、动态深读组图、配套可编辑源、最终审图总览、知识库文档和可独立阅读的小红书伴读文案。
