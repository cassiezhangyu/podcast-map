# 跨 Agent 安装与能力边界

本 skill 采用开放的 Agent Skills 文件夹结构：以带有 `name`、`description` 元数据的 `SKILL.md` 为入口，并通过相对路径加载参考资料、脚本、模板、资产与示例。核心方法不绑定某一个特定宿主。

## 推荐安装

推荐使用：

```sh
npx skills add cassiezhangyu/podcast-map --skill podcast-map -g -a AGENT -y
```

`AGENT` 使用安装器可识别的宿主标识，例如 `codex`、`claude-code`、`cursor`、`gemini-cli`、`github-copilot` 或 `opencode`。安装成功只证明文件已进入目标目录，不代表宿主具备完整执行能力。若一个仓库以后包含多个 skill，仍可按名字只安装本项。

使用支持 `gh skill` 的 GitHub CLI 时，也可通过其预览功能安装：

```sh
gh skill install cassiezhangyu/podcast-map podcast-map --agent AGENT --scope user
```

## 可移植的是方法，不是宿主能力

跨平台应分成三层理解：

1. **格式层**：宿主能发现并读取 `SKILL.md` 及相对资源；这是基础兼容。
2. **工具层**：宿主是否具备网页访问、音频下载、终端、Node.js、Sharp、中文字体和可视化检查能力；这决定能执行到哪一步。
3. **结果层**：即使脚本运行成功，内容理解、视觉秩序和发布质量仍需按本 skill 的人工门禁验收。

因此，不承诺“任何 Coding Agent 安装后都能生成完全相同图片”。在工具不足的宿主中，应保留已确认来源与内容模型，至少交付可靠理解稿，并明确列出尚未完成的转写、渲染或视觉检查；不得静默输出较低质量替代品。

## 平台适配原则

- 核心方法只写在 `SKILL.md` 和 `references/`，不复制多份平台专用提示词。
- 平台元数据放入独立可选目录；当前 `agents/openai.yaml` 只负责 OpenAI 侧展示，不改变核心行为。
- 脚本不写用户名绝对路径；第三方依赖通过环境变量或项目依赖取得。
- 新增宿主时先验证发现、相对链接、脚本权限和最小示例，再声明兼容；不因“能安装”就声称完整视觉链路通过。
