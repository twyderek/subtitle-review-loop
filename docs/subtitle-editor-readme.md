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
