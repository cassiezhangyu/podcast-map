# 交付物与制作证据

## 制作证据

在知识包目录保留以下内部文件。它们用于追溯决策，不是质量通过证明：

```text
source/                 原始材料、转写稿或来源记录
source-verification.md  来源身份、音频/文本覆盖和异常记录
content-model.md        内容底账、分支与关系、来源锚点和理解检查记录
knowledge.md            页面规划前形成的独立可读解读母稿，非图片附属说明
visual-contract.yaml    本次必须遵守的白底、语义色、字体和页眉页脚合同
palette.json            正文与封面共读的颜色角色、含义与去重选色记录
release-manifest.json   最终逐页选用版本、文件、哈希与批准状态
overview-proof.md       总览闭卷复述和三个候选构图证明
page-plan.md            受众、发布取舍及每页贡献、表达类型和相邻关系
composition-candidates.md 总览及高风险页候选、取舍和淘汰理由
style-direction.md      来源专属视觉库存、视觉命题和明确拒绝的套路
revision-scope.yaml     返修范围、冻结资产和允许变化的文件
baseline-manifest.json  已批准资产的哈希基线
mechanical-audit.json   可确定的文件、几何和可读性事实
visual-red-team.md      只看最终 PNG、手机图和 contact sheet 的盲审
quality-audit.md        机械结果、成品观察、编辑判断与返工记录
```

`quality-audit.md` 必须区分三类结论：脚本直接测得的事实、从最终图片观察到的现象、编辑者作出的判断。不得用计划字段或自报布尔值倒填质量。

## 七类正式交付

以下是完整知识包；用户只要理解时交付来源说明、knowledge.md 与内容预检及未解问题，不强制补齐图片或视觉审计。

### 1. 编辑式社交封面

3:4 发布入口，使用准确原标题作为第一视觉。它与正文信息图区分，遵守 [cover-design.md](cover-design.md) 的固定几何与来源基线，不承担完整论证。

### 2. 独立高密度总览

只看这一张，读者应能复述中心问题、主要发现及关系、代表性锚点与重要分支、分歧和限制。总览不是组图目录、章节缩略图或等分卡片墙；不强行统一来源未解决的问题。

### 3. 深读组图

页数由内容增量决定，最多 15 页。每页只有一个主导问题或判断，并提供相邻页面没有的认知增量。不同内容可以采用机制图、比较、时间推进、人物场景、原声与批注并置或编辑叙述页，不强制每页使用流程图。

每张最终 PNG 必须有配套 `.excalidraw` 源文件。审图总览不能替代单页成品。

### 4. 综合审图总览

按封面、独立总览、深读页顺序，仅使用最终 PNG，各出现一次。保持原始比例、不裁切；任一单页变化后重新生成。

### 5. 结构化知识库文档

knowledge.md 在页面规划前按 [content-model.md](content-model.md) 形成，完整包交付时核对其与最终图文是否一致；不从图片反向拼接。它可以比发布图文更完整，保留必要分支、争议、解释和回看索引。母稿及证据底账不是默认可公开的仓库资产。

knowledge.md 是用户理解材料的主入口，不藏在画廊之后。完整知识包的网页或最终回复先呈现其“快速理解”内容、完整母稿入口和证据边界，再列视觉成品；封面是传播入口，不是知识入口。

### 6. 小红书伴读文案

`xiaohongshu-note.md` 包含建议标题、可直接发布正文与内部覆盖审计。公开正文应：

- 按受众和传播切口写成可独立阅读的短文，不出现页码、文件名或“第一张图”等导航语言；
- 提炼图组核心理解与必要条件，不机械逐图复述，也不要求每幅图占一段；
- 依据解读母稿与已核验来源，不引入母稿外未经核对的新主张、陌生案例或励志结论；
- 保持来源特有语言与句子节奏，避免公式化 AI 脚手架；
- 把字符数和段落—图片映射放在内部审计区，不混入公开正文。

平台限制无法实时核验时，采用保守长度并在内部记录“未核验”，不得宣称为官方上限。

### 7. 可编辑源文件

独立总览与每张深读页都保留可编辑 Excalidraw；封面若由其他排版工具制作，也要保留足以复现的源文件或参数记录。

## 推荐目录

```text
source/
source-verification.md
content-model.md
visual-contract.yaml
overview-proof.md
page-plan.md
composition-candidates.md
style-direction.md
revision-scope.yaml
baseline-manifest.json
mechanical-audit.json
visual-red-team.md
quality-audit.md
knowledge.md
cover.png
infographic.png
series/01.png ...
contact-sheet.png
editable/infographic.excalidraw
editable/01.excalidraw ...
xiaohongshu-note.md
```

使用来源相关且清楚的文件名，不包含凭证、Cookie 或私密配置。

## 发布顺序

先完成独立解读母稿及理解预检，再按 [production-protocol.md](production-protocol.md) 确定发布取舍、页面和风险小样，通过后扩展。按选用列表组装最终包，再完成机械检查、最终图审阅与母稿及来源对照。不默认从最新目录生成整套，不把生产者预检称为独立审查。

面向用户的交付顺序为：快速理解与完整母稿 → 核心关系/边界 → 视觉包 → 小红书发布文案 → 内部审计与可编辑源。可以用一个页面呈现，但不要让文件清单或审图画廊占据首屏。
