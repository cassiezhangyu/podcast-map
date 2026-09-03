# 可移植与开源准备

仅在迁移、分享、发布 GitHub 或排查他人环境时读取。它不参与每次内容生成。

## 公开分发边界

- 公开版本不包含用户名绝对路径、Cookie、令牌、私有链接、原始会话日志或本机缓存路径；运行依赖通过环境变量、项目依赖或文档说明取得。
- 不默认公开原始音频、完整转写、节目图片、商业字体或用户批注。示例只使用自有、获许可或可再分发素材；只提供方法不等于取得素材授权。
- 代码、skill 指令、提示词、模板和原创文档采用 MIT License；`assets/benchmarks` 中的基准图片不自动适用 MIT，具体范围以 `ASSET_LICENSES.md` 为准。
- README 面向使用者，SKILL.md 面向模型；README 不复制全部内部规则。保持相对链接可用，示例不依赖当前机器。

## 仓库与安装契约

- 发布仓库使用 `skills/podcast-map/SKILL.md` 作为稳定发现路径。skill 文件夹名与 frontmatter 的 `name` 保持一致。
- `SKILL.md`、`references/`、`scripts/`、`templates/`、`assets/` 和 `examples/` 一起进入版本；不能只上传主提示词，否则门禁、固定封面与检查器都会丢失。
- `agents/openai.yaml` 是 OpenAI 宿主的可选展示适配，不是核心方法入口。其他 Agent 不读取它也不影响 `SKILL.md` 被发现。
- 安装文档优先给出 `npx skills add cassiezhangyu/podcast-map --skill podcast-map -g -a AGENT -y`；使用支持 `gh skill` 的 GitHub CLI 时，也可通过其预览功能运行 `gh skill install cassiezhangyu/podcast-map podcast-map --agent AGENT --scope user`。由安装器处理宿主目录差异，不要求使用者手动复制到平台专用路径；Fork 发布时同步替换仓库所有者。
- 跨 Agent 兼容指“技能格式和方法可被支持 Agent Skills 的宿主读取”，不等于所有宿主都自带相同工具。执行依赖和降级行为在 [cross-agent-installation.md](cross-agent-installation.md) 说明。

## 环境自检

在 skill 根目录运行：

```sh
node scripts/doctor.mjs --mode understanding
node scripts/doctor.mjs --mode visual
node scripts/doctor.mjs --mode open-source
```

`understanding` 只检查理解流程的基础结构；`visual` 另检查 Sharp 与中文字体；`open-source` 扫描活跃文本中的本机绝对路径和常见凭证形态。转写工具按实际输入和环境选择，不由 doctor 自动安装或下载。失败时只补缺失依赖，不静默切换低质量转写或字体。

## 可复现与中断恢复

最小示例位于 `examples/minimal-podcast-transcript/`，不访问网络、不使用第三方受版权保护内容，先演示“转写稿核验—内容底账—理解稿”。视觉交付另需项目提供渲染入口和可用中文字体；本 skill 提供规则、检查器和封面组件，不假装包含所有宿主应用或转写模型。

真实任务中保留 source-verification.md、content-model.md 和工件哈希。中断恢复先读取这些状态，只有输入或内容判断改变才重做受影响环节；不因换机器反复下载、转写或重建已经核验的内容。

## 版本发布检查

1. 运行 `node scripts/doctor.mjs --mode open-source`、可用的 Agent Skills 结构校验器，以及环境、配色、封面、发布工件和几何审计回归；需要 Sharp 或真实 PNG 夹具的测试必须显式提供依赖；
2. 从干净目录按 README 执行最小示例，确认没有工作区隐式依赖；
3. 检查 README、示例、许可证、素材归属和预期输出边界；
4. 明确哪些能力依赖特定宿主工具、浏览器、转写模型或外部渲染环境；
5. 发布版本号或标签，记录可复现测试环境；不把历史作品目录、个人证据底账或私有素材一起提交。
