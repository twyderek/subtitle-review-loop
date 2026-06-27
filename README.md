# Subtitle Review Loop for Codex

A reusable workflow for creating, reviewing, cleaning, and exporting video
subtitles with a human-in-the-loop quality gate.

This project is designed for teaching videos, course recordings, tutorials, and
screen-recorded lessons where ASR output needs human correction before final
delivery.

## Features

- Browser subtitle editor with video preview
- SRT cue editing, search, and jump-to-cue playback controls
- Rule-based subtitle cleanup script
- Local server with MP4 range request support
- One-click Windows launcher that starts the local server and opens the editor
- Human-in-the-loop subtitle correction workflow
- Reusable video subtitle workflow documentation
- Copyable project prompt for Codex or ChatGPT

## What This Repository Does Not Include

This repository intentionally does not include source videos, burned videos,
audio files, or real course transcript files. Put your own media and subtitle
files in a local `workspace/` folder.

## First-Time Setup

### Required Tools

Install these before running the project:

- Node.js 20 or later
- Git
- A modern browser, such as Chrome, Edge, Firefox, or Safari

### Optional Tools

Install these when you want automatic transcription or burned-in subtitle video
exports:

- FFmpeg, for extracting audio, checking media files, and burning subtitles
- Python 3.10 or later, if you want to run local Whisper transcription
- Whisper or another ASR tool, for generating draft SRT files

### Windows Installation Examples

Using `winget`:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install Gyan.FFmpeg
winget install Python.Python.3.12
```

Optional local Whisper install:

```powershell
python -m pip install --upgrade pip
python -m pip install -U openai-whisper
```

### macOS Installation Examples

Using Homebrew:

```bash
brew install node git ffmpeg python
python3 -m pip install -U openai-whisper
```

### Linux Installation Examples

Using Ubuntu or Debian:

```bash
sudo apt update
sudo apt install -y nodejs npm git ffmpeg python3 python3-pip
python3 -m pip install -U openai-whisper
```

## Quick Start

Clone the repository:

```bash
git clone https://github.com/twyderek/subtitle-review-loop.git
cd subtitle-review-loop
```

Install dependencies:

```bash
npm install
```

Start the local subtitle editor and open it automatically:

```bash
npm run open
```

Or start only the local subtitle editor server:

```bash
npm run start
```

Then open:

```text
http://127.0.0.1:8787/src/subtitle-editor.html
```

Default expected local files:

```text
workspace/media.mp4
workspace/media.rule-cleaned.srt
```

You can also open the HTML page and manually choose a video and SRT file.

## One-Click Windows Launcher

Windows users can double-click this file from the project folder:

```text
start-subtitle-editor.cmd
```

The launcher will:

1. Check whether `node` is available.
2. Start the local subtitle editor server.
3. Open the browser automatically.
4. Keep the server running while the command window stays open.

If Node.js is not installed, the launcher prints a suggested install command:

```powershell
winget install OpenJS.NodeJS.LTS
```

For macOS or Linux, use:

```bash
npm run open
```

## Example: Generate A Draft SRT

If you use local Whisper, put your video in `workspace/media.mp4`, then run:

```bash
whisper workspace/media.mp4 --language Chinese --task transcribe --output_format srt --output_dir workspace
```

Rename or copy the generated SRT to the editor's default filename if needed:

```bash
cp workspace/media.srt workspace/media.rule-cleaned.srt
```

On Windows PowerShell:

```powershell
Copy-Item workspace\media.srt workspace\media.rule-cleaned.srt
```

## Example: Apply Subtitle Rules

Prepare your editable SRT:

```text
workspace/media.srt
```

Run the cleanup script:

```bash
npm run clean:subtitles
```

Default outputs:

```text
workspace/media.rule-cleaned.srt
workspace/media.rule-cleaned-report.md
```

You can also pass custom paths:

```bash
node src/apply_subtitle_rules.mjs input.srt output.srt report.md
```

## Example: Burn Subtitles With FFmpeg

After confirming the corrected SRT, you can generate a burned-in subtitle video:

```bash
ffmpeg -y -i workspace/media.mp4 -vf "subtitles='workspace/media.rule-cleaned.srt':force_style='FontName=Microsoft JhengHei,FontSize=24,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=55'" -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a copy -movflags +faststart workspace/media_subtitled.mp4
```

## Recommended Workflow

1. Put the source video in `workspace/`.
2. Generate or provide a draft SRT.
3. Ask the user for glossary, spelling references, and a rule file.
4. Apply only the user-provided subtitle cleanup rules.
5. Review the subtitles in the browser editor while watching the video.
6. Export the corrected SRT.
7. Optionally burn the final subtitles into a new MP4 with FFmpeg.
8. Verify subtitle timing, wording, terminology, and video output.

## Important Principle

Do not hard-code subtitle cleanup rules into the reusable prompt. Rules should
come from the user or project owner. If no rule file is provided, perform only
neutral mechanical checks such as SRT parsing, empty cue detection, timecode
overlap detection, cue length warnings, and encoding checks.

## Documentation

- [Complete Workflow](docs/VIDEO-SUBTITLE-WORKFLOW.md)
- [Reusable Loop Prompt](docs/VIDEO-FACTORY-LOOP-PROMPT.md)
- [Editor Notes](docs/subtitle-editor-readme.md)

## Traditional Chinese Guide

### 專案用途

`Subtitle Review Loop` 是一套在Codex中專門提供給影片使用的
字幕工作流程。它的核心目標是：先自動產生草稿字幕，再讓使用者一邊看影片
一邊修正錯字、專有名詞與斷句，最後輸出可編輯字幕檔或燒字幕影片。

### 第一次使用需要安裝

必要工具：

- `Node.js 20+`：啟動本機字幕編輯器
- `Git`：下載與更新專案
- 瀏覽器：開啟線上字幕編輯頁面

選用工具：

- `FFmpeg`：燒字幕、轉檔、檢查影片資訊
- `Python 3.10+`：安裝本機語音辨識工具時使用
- `Whisper` 或其他 ASR 工具：自動轉錄影片並產生 SRT

Windows 可參考：

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install Gyan.FFmpeg
winget install Python.Python.3.12
python -m pip install -U openai-whisper
```

macOS 可參考：

```bash
brew install node git ffmpeg python
python3 -m pip install -U openai-whisper
```

Ubuntu/Debian 可參考：

```bash
sudo apt update
sudo apt install -y nodejs npm git ffmpeg python3 python3-pip
python3 -m pip install -U openai-whisper
```

### 使用步驟

下載專案：

```bash
git clone https://github.com/twyderek/subtitle-review-loop.git
cd subtitle-review-loop
```

安裝並自動開啟字幕編輯器：

```bash
npm install
npm run open
```

也可以只啟動本機服務，再手動開啟字幕編輯器：

```bash
npm run start
```

手動開啟網址：

```text
http://127.0.0.1:8787/src/subtitle-editor.html
```

建議將影片與字幕放在：

```text
workspace/media.mp4
workspace/media.rule-cleaned.srt
```

如果還沒有字幕，可以先用 Whisper 產生草稿：

```bash
whisper workspace/media.mp4 --language Chinese --task transcribe --output_format srt --output_dir workspace
```

### 建議的兩階段字幕流程

第一階段：收到影片時

- 請使用者提供專有名詞、講者姓名、課程名稱、平台名稱等對照資料
- 請使用者提供字幕清理規則檔
- 若沒有規則檔，只做格式檢查，不自行套用固定清理規則

第二階段：輸出前

- 先產生可檢查的字幕修正版與修正報告
- 讓使用者確認錯字、專有名詞與斷句
- 確認無誤後，再輸出正式 SRT 或燒字幕 MP4

### 本機字幕編輯器

啟動伺服器後，使用者可以在瀏覽器中：

- 載入影片與 SRT
- 點選字幕跳到對應時間
- 搜尋字幕文字
- 修改錯字、斷句與專有名詞
- 匯出修正後的 SRT

### Windows 雙擊啟動

Windows 使用者可以直接在專案資料夾中雙擊：

```text
start-subtitle-editor.cmd
```

它會自動檢查 `node`、啟動本機服務，並開啟字幕編輯器網頁。使用期間請保留
命令視窗開啟；關閉視窗後，本機字幕服務也會停止。

### 檔案安全提醒

請不要把原始影片、學生資料、課程逐字稿、實際字幕或燒字幕影片提交到
GitHub。專案已透過 `.gitignore` 排除常見媒體檔與字幕輸出，但上傳前仍建議
先檢查 `git status`。

## Local Files To Ignore

The `.gitignore` excludes generated media, subtitle outputs, and local workspace
files by default. This keeps private video material out of GitHub.
