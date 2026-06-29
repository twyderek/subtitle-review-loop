# Subtitle Editor

Open the editor at:

```text
http://127.0.0.1:8787/src/subtitle-editor.html
```

Default assets:

- Video: `workspace/media.mp4`
- Subtitle: `workspace/media.rule-cleaned.srt`

Start the local server:

```powershell
npm run start
```

Start the local server and open the editor automatically:

```powershell
npm run open
```

On Windows, you can also double-click:

```text
start-subtitle-editor.cmd
```

Use the page to:

- watch the video while editing subtitle cues
- jump to any cue time
- search subtitle text
- apply the subtitle cleanup rules
- download or save an edited SRT

Chrome and Edge support direct saving through `Save SRT`. Other browsers can
use `Download SRT`.

After saving the reviewed SRT, render a short subtitle sample before creating
the full burned-subtitle video:

```powershell
npm run sample:subtitles -- workspace/media.mp4 workspace/media.rule-cleaned.srt workspace/media_subtitled_sample_20s.mp4
```

Only burn the full video after the sample confirms the subtitles are readable
and do not cover important UI content:

```powershell
npm run burn:subtitles -- workspace/media.mp4 workspace/media.rule-cleaned.srt workspace/media_subtitled.mp4
```

Troubleshooting notes are collected in:

```text
docs/RUNBOOK-ISSUES-AND-FIXES.md
```
