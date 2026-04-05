# Claude Transcript Cleaner

A client-side web tool that cleans Claude Code exported chat transcripts. It filters out tool calls, system metadata, and non-conversational noise — keeping only the human-AI dialogue.

**[English](#features)** | **[中文](#功能特性)**

<p align="center">
  <img src="home.avif" alt="Claude Transcript Cleaner" width="680">
</p>

---

## Features

- **Smart Filtering** — Strips tool calls, system messages, and metadata blocks from JSONL transcripts; retains only `text`-type content
- **Zip Support** — Upload the original `.zip` export from Claude Code directly; the tool extracts and processes all sessions inside
- **Instant Preview** — View the cleaned conversation immediately in the browser before downloading
- **Batch Processing** — Upload multiple files at once; download all cleaned results as a single zip
- **Metadata Display** — Shows session title, model, creation time, turn count, and filtering statistics
- **i18n** — Built-in Chinese/English toggle (auto-detects browser language)
- **Privacy First** — Everything runs in your browser via JavaScript. No server, no uploads, no data leaves your machine

## Usage

1. Open `index.html` in any modern browser (or host it on any static file server / GitHub Pages)
2. Drag & drop `.zip` or `.jsonl` files onto the upload area
3. Review the preview and statistics
4. Click **Download** to save the cleaned `.txt` file

### File Format

This tool expects the export format from [Claude Code](https://docs.anthropic.com/en/docs/claude-code):

```
session_folder/
├── <uuid>.jsonl      # Chat log (one JSON object per line)
└── metadata.json     # Session metadata (title, model, timestamps, etc.)
```

Each line in the `.jsonl` file is a JSON object. The tool keeps only entries with a `message` field whose `content` contains `text`-type blocks.

## Tech Stack

- Pure HTML / CSS / JavaScript — no build step, no framework
- [JSZip](https://stuk.github.io/jszip/) (via CDN) for zip parsing and generation

## License

MIT

---

## 功能特性

- **智能过滤** — 自动剔除工具调用、系统消息等非对话内容，仅保留 `text` 类型的人机对话
- **Zip 直传** — 支持直接上传 Claude Code 导出的原始 `.zip` 压缩包，自动解压处理
- **即时预览** — 上传后立即在浏览器中预览清理结果
- **批量处理** — 支持多文件上传，可一键下载所有清理结果
- **元数据展示** — 显示会话标题、模型、创建时间、轮数和过滤统计
- **中英切换** — 内置中英文界面，自动检测浏览器语言
- **隐私安全** — 所有处理在浏览器本地完成，文件不会上传到任何服务器

## 使用方法

1. 用浏览器打开 `index.html`（或部署到任意静态服务器 / GitHub Pages）
2. 拖拽 `.zip` 或 `.jsonl` 文件到上传区域
3. 查看预览和统计信息
4. 点击 **下载** 保存清理后的 `.txt` 文件
