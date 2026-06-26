# Subtitle Review Loop

A reusable workflow for creating, reviewing, cleaning, and exporting video
subtitles with a human-in-the-loop quality gate.

This project is designed for teaching videos, course recordings, tutorials, and
screen-recorded lessons where ASR output needs human correction before final
delivery.

## What It Includes

- Browser subtitle editor with video preview
- SRT cue editing and search
- Jump-to-cue playback controls
- Rule-based subtitle cleanup script
- Local server with MP4 range request support
- Reusable video subtitle workflow documentation
- Copyable project prompt for Codex or ChatGPT

## What It Does Not Include

This repository intentionally does not include source videos, burned videos, or
real course transcript files. Put your own media and subtitle files in a local
`workspace/` folder.

## Quick Start

```powershell
npm install
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

## Recommended Workflow

1. Inspect the video and create a draft SRT.
2. Ask the user for reference materials and a rule file.
3. Generate a correction review before final output.
4. Apply only the user-provided subtitle rules.
5. Review the subtitles in the browser editor.
6. Export the final SRT.
7. Optionally burn the final subtitles into a new MP4 with ffmpeg.
8. Verify subtitle timing, wording, and video output.

## Important Principle

Do not hard-code subtitle cleanup rules into the reusable prompt. Rules should
come from the user or project owner. If no rule file is provided, perform only
neutral mechanical checks such as SRT parsing, empty cue detection, timecode
overlap detection, cue length warnings, and encoding checks.

## Docs

- [Complete Workflow](docs/VIDEO-SUBTITLE-WORKFLOW.md)
- [Reusable Loop Prompt](docs/VIDEO-FACTORY-LOOP-PROMPT.md)
- [Editor Notes](docs/subtitle-editor-readme.md)

## Local Files To Ignore

The `.gitignore` excludes generated media, subtitle outputs, and local
workspace files by default. This keeps private video material out of GitHub.
