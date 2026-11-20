# Final Render Report

## Output

- Final video: `video/project-intro/09_export/project-intro-4k60-h265.mp4`
- Duration: `330.35s`
- Resolution: `3840 × 2160`
- FPS: `60`
- Video codec: `HEVC / H.265`
- Pixel format: `yuv420p10le`
- Audio codec: `AAC`
- Editable subtitles: `video/project-intro/07_subtitles/narration.srt`
- Web subtitles: `video/project-intro/07_subtitles/narration.vtt`
- Transcript: `video/project-intro/07_subtitles/transcript.txt`

## Render Notes

- VoxCPM was used to generate 14 narration segments.
- The provided lecturer photo was used to generate a Pixar-style lecturer asset; the final video uses that Pixar-style lecturer image in the opening scene.
- Narration was padded with silence to match the storyboard timing and exported as WAV, MP3, and FLAC.
- HyperFrames lint passed with zero errors, but full 4K HTML rendering exceeded the local timeout.
- The pipeline automatically switched to the FFmpeg renderer, producing a reproducible 4K 60FPS H.265 slideshow-style project intro video.
- The provided lecturer photo is preserved as a local-only reference asset and is intentionally ignored by Git.

## QA Checks

- Content matches the project README, technical docs, scripts, and runbook.
- Subtitle text is visible and placed in a safe lower area.
- Output is 16:9, 4K UHD, 60FPS, and 10-bit H.265.
- Audio stream exists and is mixed with low-volume BGM.
- Separate SRT, VTT, transcript, narration index, and project source files are available for editing.

## Known Limitation

- The final file is a high-quality FFmpeg-rendered slideshow version, not the full animated HyperFrames version, because the local machine could not complete the 5.5-minute 4K HTML render within the execution timeout.
