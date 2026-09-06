#!/usr/bin/env python3
"""Read-only discovery of reusable podcast transcription runtimes."""

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

MODEL = "mlx-community/whisper-large-v3-turbo"


def probe_python(path):
    code = (
        "import importlib.util,json,sys; "
        "print(json.dumps({'version':sys.version.split()[0], 'modules': "
        "{m: bool(importlib.util.find_spec(m)) for m in ('mlx_whisper','mlx','faster_whisper','whisper')}}))"
    )
    try:
        result = subprocess.run([str(path), "-c", code], capture_output=True, text=True, timeout=15)
        data = json.loads(result.stdout.strip()) if result.returncode == 0 else {}
        return {"path": str(path), "reachable": result.returncode == 0, **data}
    except (OSError, subprocess.SubprocessError, json.JSONDecodeError) as exc:
        return {"path": str(path), "reachable": False, "error": str(exc)}


def candidates():
    values = []
    if os.environ.get("PODCAST_MAP_PYTHON"):
        values.append(Path(os.environ["PODCAST_MAP_PYTHON"]).expanduser())
    values.append(Path(sys.executable))
    current = Path.cwd()
    for base in [current, *list(current.parents)[:3]]:
        if os.name == "nt":
            values.extend((base / ".venv" / "Scripts" / "python.exe", base / ".venv-transcribe" / "Scripts" / "python.exe"))
        else:
            values.extend((base / ".venv" / "bin" / "python", base / ".venv-transcribe" / "bin" / "python"))
    seen = set()
    for value in values:
        # Keep the lexical venv path: resolving a symlink can erase its site-packages.
        key = os.path.abspath(str(value))
        if key not in seen:
            seen.add(key)
            yield Path(key)


def model_cache_paths():
    roots = []
    for key in ("HUGGINGFACE_HUB_CACHE", "HF_HOME"):
        if os.environ.get(key):
            roots.append(Path(os.environ[key]).expanduser())
    roots.extend([Path.home() / ".cache" / "huggingface" / "hub", Path.home() / ".cache" / "huggingface"])
    marker = "models--mlx-community--whisper-large-v3-turbo"
    paths = []
    for root in roots:
        for candidate in (root / marker, root / "hub" / marker):
            if candidate.exists():
                paths.append(str(candidate))
    return sorted(set(paths))


def tool(name):
    path = shutil.which(name)
    return {"name": name, "available": bool(path), "path": path}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="输出 JSON")
    parser.parse_args()
    interpreters = [probe_python(path) for path in candidates()]
    selected = next((item for item in interpreters if item.get("reachable") and item.get("modules", {}).get("mlx_whisper") and item.get("modules", {}).get("mlx")), None)
    alternatives = [
        item for item in interpreters
        if item.get("reachable") and any(item.get("modules", {}).get(name) for name in ("faster_whisper", "whisper"))
    ]
    tools = [tool(name) for name in ("ffmpeg", "ffprobe", "afconvert", "afinfo")]
    model_paths = model_cache_paths()
    missing = []
    if not selected and not alternatives:
        missing.append("可用的语音转写 Python 后端（MLX、faster-whisper 或 openai-whisper）")
    if not model_paths and selected:
        missing.append(MODEL + " 模型缓存")
    audio_ready = tools[0]["available"] or tools[2]["available"]
    if not audio_ready:
        missing.append("ffmpeg 或 afconvert")
    status = "READY" if not missing and selected else "ALTERNATIVE_AVAILABLE" if not missing and alternatives else "DEPENDENCY_BLOCKED"
    backend = "mlx" if selected else "faster-whisper/openai-whisper" if alternatives else None
    print(json.dumps({
        "schema_version": 1,
        "status": status,
        "model": MODEL,
        "selected_backend": backend,
        "selected_python": selected,
        "alternative_pythons": alternatives,
        "interpreters": interpreters,
        "model_cache": {"present": bool(model_paths), "paths": model_paths},
        "audio_tools": tools,
        "missing": missing,
        "network_or_install_performed": False,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
