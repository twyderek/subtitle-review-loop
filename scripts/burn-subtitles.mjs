import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const rawArgs = process.argv.slice(2);
const sampleIndex = rawArgs.indexOf("--sample");
const sampleMode = sampleIndex !== -1;

if (sampleMode) {
  rawArgs.splice(sampleIndex, 1);
}

const [videoArg, subtitleArg, outputArg] = rawArgs;

const videoPath = path.resolve(videoArg || "workspace/media.mp4");
const subtitlePath = path.resolve(subtitleArg || "workspace/media.rule-cleaned.srt");
const outputPath = path.resolve(
  outputArg ||
    (sampleMode
      ? "workspace/media_subtitled_sample_20s.mp4"
      : "workspace/media_subtitled.mp4"),
);

const style = [
  "FontName=Microsoft JhengHei",
  "FontSize=14",
  "Bold=1",
  "PrimaryColour=&H00FFFFFF",
  "OutlineColour=&H00000000",
  "BorderStyle=1",
  "Outline=1",
  "Shadow=0",
  "Alignment=2",
  "MarginV=22",
].join(",");

function escapeForFfmpegSubtitles(filePath) {
  return filePath
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, "$1\\:")
    .replace(/'/g, "\\'");
}

const subtitleFilter = [
  `subtitles='${escapeForFfmpegSubtitles(subtitlePath)}'`,
  "charenc=UTF-8",
  `force_style='${style}'`,
].join(":");

const args = [
  "-y",
  ...(sampleMode ? ["-ss", "00:00:10", "-t", "20"] : []),
  "-i",
  videoPath,
  "-vf",
  subtitleFilter,
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  "-crf",
  "22",
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  sampleMode ? "aac" : "copy",
  ...(sampleMode ? ["-b:a", "128k"] : []),
  "-movflags",
  "+faststart",
  outputPath,
];

console.log(
  sampleMode
    ? "Burning 20-second subtitle sample with safe teaching-video style..."
    : "Burning subtitles with safe teaching-video style...",
);
console.log(`Video: ${videoPath}`);
console.log(`SRT: ${subtitlePath}`);
console.log(`Output: ${outputPath}`);

const ffmpeg = spawn("ffmpeg", args, { stdio: "inherit" });
ffmpeg.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
