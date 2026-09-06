# 跨 Agent 转写运行时兼容

不同 Coding Agent 可能使用不同的 Python、虚拟环境、沙箱和缓存目录。“本机已安装”只有在当前 Agent 能访问并实际调用该解释器时才算可复用；模型权重缓存与 Python 包也必须分别核验。

## 固定顺序

在下载音频或安装任何依赖前，运行：

```sh
python <skill>/scripts/check_transcription_runtime.py --json
```

脚本只读探测，不联网、不安装、不修改缓存。优先级为 `PODCAST_MAP_PYTHON` 指定的解释器、当前 Agent 的 `sys.executable`、当前项目下的虚拟环境，再到工作区可发现的其他虚拟环境。macOS/Linux 检查 `.venv/bin/python` 和 `.venv-transcribe/bin/python`；Windows 检查 `.venv/Scripts/python.exe` 和 `.venv-transcribe/Scripts/python.exe`。

对候选解释器实际执行 `import mlx_whisper`、`import mlx`、`import faster_whisper` 和 `import whisper`，不得只根据 `pip list` 或模型目录判断可用。MLX 是 Apple 平台路线；Windows 不应尝试安装或调用 MLX。模型缓存按 `HF_HOME`、`HUGGINGFACE_HUB_CACHE` 及常见 Hugging Face 缓存位置检查；找不到缓存不等于可以立即下载。

## 决策

- 找到可用解释器、目标模型缓存和音频工具：复用，并在 `source-verification.md` 记录路径、版本和探测时间。
- 找到可用解释器但当前解释器不可用：切换到已验证的绝对路径，不在当前环境重复安装。
- macOS 优先使用已验证的 MLX 路线；Windows 优先复用已存在且用户允许使用的 `faster-whisper` 或 `openai-whisper`，不能把它们当作 MLX 的无提示替代。Windows 音频工具检查 `ffmpeg`/`ffprobe`，macOS 可在缺少 `ffmpeg` 时尝试系统 `afconvert`/`afinfo`。
- 只有音频转换缺少 `ffmpeg` 时，在 macOS 优先尝试系统 `afconvert`；仍需保留 `afinfo` 的时长核验。
- 缺少 Python 包、模型或必要工具时，输出明确的 `DEPENDENCY_BLOCKED`，说明缺什么、检查过哪些候选以及会产生什么下载或安装动作。未经用户授权，不执行 `pip install`、模型下载或付费服务调用。
- 若没有 MLX，但发现现成的其他 ASR 后端，输出 `ALTERNATIVE_AVAILABLE`，列出后端和模型来源，等待用户或上层任务明确选择后再使用。
- 不得因为当前 Agent 隔离了宿主机缓存，就宣称本机没有依赖；应记录“当前运行时不可访问”。不得静默改用 CPU、小模型或其他后端。

不同 Agent 接手时先读 `source-verification.md`，再重新执行只读探测；不要重复安装已验证的依赖。
