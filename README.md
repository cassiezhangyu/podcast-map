# Podcast Map｜播客知识图

把播客和长音频转化为可独立阅读的知识母稿、知识关系图、编辑式封面与小红书内容。

## 一条命令安装

发布到 GitHub 后，把 `OWNER` 换成实际账号，把 `AGENT` 换成目标 Coding Agent：

```sh
npx skills add OWNER/podcast-map --skill podcast-map -g -a AGENT -y
```

示例宿主标识包括 `codex`、`claude-code`、`cursor`、`gemini-cli`、`github-copilot` 和 `opencode`。

已经安装新版 GitHub CLI 时，也可使用：

```sh
gh skill install OWNER/podcast-map podcast-map --agent AGENT --scope user
```

完整说明见 [skill README](skills/podcast-map/README.md)。

## 仓库结构

```text
skills/
└── podcast-map/
    ├── SKILL.md
    ├── references/
    ├── scripts/
    ├── templates/
    ├── assets/
    └── examples/
```

skill 采用开放的 Agent Skills 文件夹格式。不同宿主的网络、终端、浏览器、字体和渲染能力并不相同；能安装不等于完整视觉链路已经可用。

## 发布前待办

- 由仓库作者选择代码许可证，并单独确认示例与基准图片的素材许可；
- 运行结构校验、全部测试和 open-source doctor；
- 从干净目录执行本地安装和最小播客转写示例；
- 创建版本标签，保留变更说明与已验证宿主清单。
