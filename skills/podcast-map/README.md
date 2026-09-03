# 播客知识图

把播客、长音频及其可靠转写稿先“二次咀嚼”为可独立阅读的理解稿，再按需制作知识总览、Excalidraw 深读组图、编辑式封面和小红书伴读文案。

## 设计目标

1. 先回答内容到底在讲什么，知识点之间是什么关系，哪里有分歧和边界；
2. 再把理解转译为高信息密度、可进入的社交内容；
3. 保留证据、可编辑源和审计边界，使过程可复查、可迭代。

只需要内容理解时，可以停在来源核验、content-model.md 与 knowledge.md，不需要绘图环境。默认视觉风格是作者的 `editorial-excalidraw-v1` 预设，理解方法与视觉预设相互独立。

## 安装与调用

本项目采用开放的 Agent Skills 目录格式，核心入口是 `SKILL.md`，不是 Codex 私有提示词。发布到 GitHub 后，最快的通用安装方式是：

```sh
npx skills add cassiezhangyu/podcast-map --skill podcast-map -g -a AGENT -y
```

把 `AGENT` 换成 `codex`、`claude-code`、`cursor`、`gemini-cli`、`github-copilot`、`opencode` 等受支持标识。命令负责放入各宿主正确目录；无需让使用者手工寻找专用安装目录。仓库发布结构应保持为 `skills/podcast-map/SKILL.md`。

已经安装新版 GitHub CLI 时，也可使用官方安装器：

```sh
gh skill install cassiezhangyu/podcast-map podcast-map --agent AGENT --scope user
```

安装格式可以跨平台，实际执行能力仍取决于宿主是否提供网络访问、终端、浏览器、Node.js、Sharp、中文字体和 Excalidraw 渲染环境。缺少视觉依赖时，skill 应继续完成来源核验与内容理解，并诚实报告视觉交付缺口。更多边界见 [跨 Agent 安装与能力](references/cross-agent-installation.md)。

在支持显式调用的宿主中，提供播客材料并调用 `$podcast-map`；也可用自然语言明确说“只理解内容”或要求完整知识视觉包。

开始前可运行：

```sh
node scripts/doctor.mjs --mode understanding
node scripts/doctor.mjs --mode visual
```

详细工作流由 [SKILL.md](SKILL.md) 定义；最小无网络示例见 [examples/minimal-podcast-transcript/request.md](examples/minimal-podcast-transcript/request.md)。

## 输出边界

- Show Notes、时间轴和评论不替代原音，转写稿需核验节目身份与音频覆盖；
- 理解稿先于页面规划，发布切口不能改写来源立场；
- 自动检查只能证明文件、尺寸、几何和部分配色事实，不能证明理解深度或审美通过；
- 用户未选择建立内容评测集时，生产者预检不冒充独立理解验证。

## 开源说明

提交 GitHub 前阅读 [可移植与开源准备](references/portability-and-open-source.md)。仓库不得包含凭证、私人会话、无授权音频、完整转写、节目图片或商业字体。代码、skill 指令、提示词、模板和原创文档采用 [MIT License](LICENSE)；基准图片不自动包含在 MIT 授权中，详见 [素材许可说明](ASSET_LICENSES.md)。
