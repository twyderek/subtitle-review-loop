// SRT 字幕解析器 - 從現有 subtitle-editor.html 移植並 TypeScript 化
export interface SrtCue {
  id: number;
  startRaw: string;
  endRaw: string;
  start: number;
  end: number;
  originalStart: number;
  originalEnd: number;
  text: string;
  originalText: string;
}

export const FILLER_PATTERN = /(呃|啊|嗯|那個|就是|然後|這個|你知道吧|對吧)/;
export const FILLER_PATTERN_GLOBAL = /(呃|啊|嗯|那個|就是|然後|這個|你知道吧|對吧)/g;

export const DISALLOWED_PUNCTUATION_PATTERN = /[，。、：；「」『』（）()［］\[\]《》〈〉“”"']/;
export const DISALLOWED_PUNCTUATION_PATTERN_GLOBAL = /[，。、：；「」『』（）()［］\[\]《》〈〉“”"']/g;

export const TERM_RULES: [RegExp, string][] = [
  [/Whisper\s*Desktop/gi, 'WHISPERDESKTOP'],
  [/\bwhisper\b/gi, 'WHISPER'],
  [/\bEverkin\b/gi, 'EVERCAM'],
  [/\bEvercam\b/gi, 'EVERCAM'],
  [/\bopen\s*ai\b/gi, 'OPENAI'],
  [/\bgpt[-\s]?4\b/gi, 'GPT-4'],
  [/\bdall[-\s]?e\b/gi, 'DALL-E'],
  [/\btoken\b/gi, 'TOKEN'],
  [/\bdefault\b/gi, 'DEFAULT'],
  [/\blms\b/gi, 'LMS'],
  [/\bmoodle\b/gi, 'MOODLE'],
  [/\be3\b/gi, 'E3'],
  [/\bkm\s*plus\b/gi, 'KMPLUS'],
  [/\bai\b/gi, 'AI'],
  [/\bapi\b/gi, 'API'],
];

export function cleanSubtitleText(value: string): string {
  let text = value.trim();
  for (const [pattern, replacement] of TERM_RULES) {
    text = text.replace(pattern, replacement);
  }
  text = text.replace(FILLER_PATTERN_GLOBAL, '  ');
  text = text.replace(/所以呢/g, '所以');
  text = text.replace(DISALLOWED_PUNCTUATION_PATTERN_GLOBAL, '  ');
  text = text.replace(/\t/g, ' ').replace(/ {3,}/g, '  ').replace(/^ +| +$/g, '');
  return text;
}

export function hasRuleWarning(text: string): boolean {
  return FILLER_PATTERN.test(text) ||
    DISALLOWED_PUNCTUATION_PATTERN.test(text) ||
    /\b(whisper|openai|api|ai|moodle|token|default|lms|evercam|kmplus)\b/i.test(text);
}

export function parseSrt(text: string): SrtCue[] {
  return text.replace(/^﻿/, '')
    .trim()
    .split(/\r?\n\r?\n/)
    .map((block, index) => {
      const lines = block.split(/\r?\n/);
      const timingIndex = lines.findIndex((line) => line.includes('-->'));
      const timing = timingIndex >= 0 ? lines[timingIndex] : '';
      const match = timing.match(/^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      const textLines = timingIndex >= 0 ? lines.slice(timingIndex + 1) : lines.slice(2);
      return {
        id: index + 1,
        startRaw: match ? match[1] : '00:00:00,000',
        endRaw: match ? match[2] : '00:00:00,000',
        start: match ? parseTime(match[1]) : 0,
        end: match ? parseTime(match[2]) : 0,
        originalStart: match ? parseTime(match[1]) : 0,
        originalEnd: match ? parseTime(match[2]) : 0,
        text: textLines.join('\n').trim(),
        originalText: textLines.join('\n').trim(),
      };
    })
    .filter((cue) => cue.text || cue.end > cue.start);
}

export function buildSrt(cues: SrtCue[]): string {
  return cues.map((cue, index) => `${index + 1}\n${cue.startRaw} --> ${cue.endRaw}\n${cue.text.trim()}`).join('\n\n') + '\n';
}

export function parseTime(value: string): number {
  const [hh, mm, rest] = value.split(':');
  const [ss, ms] = rest.split(',');
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + Number(ms) / 1000;
}

export function formatSrtTime(seconds: number): string {
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalMs = Math.round(safeSeconds * 1000);
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const ss = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const mm = totalMinutes % 60;
  const hh = Math.floor(totalMinutes / 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function formatDuration(seconds: number): string {
  return Math.max(0, seconds).toFixed(1);
}

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds)) return '00:00';
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}

export function syncCueRaw(cue: SrtCue): void {
  cue.startRaw = formatSrtTime(cue.start);
  cue.endRaw = formatSrtTime(cue.end);
}

export function getCueEndLimit(cues: SrtCue[], index: number, videoDuration?: number): number {
  const nextCue = cues[index + 1];
  if (nextCue) return Math.max(cues[index].start + 0.1, nextCue.start - 0.001);
  const vd = videoDuration ?? 0;
  if (Number.isFinite(vd) && vd > 0) return vd;
  return Infinity;
}

export function setCueDuration(cues: SrtCue[], index: number, duration: number, options: { silent?: boolean; videoDuration?: number } = {}): boolean {
  const cue = cues[index];
  if (!cue || !Number.isFinite(duration)) return false;
  const minDuration = 0.1;
  const limit = getCueEndLimit(cues, index, options.videoDuration);
  const maxDuration = Number.isFinite(limit) ? Math.max(minDuration, limit - cue.start) : Infinity;
  const nextDuration = Math.min(Math.max(duration, minDuration), maxDuration);
  cue.end = cue.start + nextDuration;
  syncCueRaw(cue);
  return true;
}

export function adjustCueDuration(cues: SrtCue[], index: number, delta: number, videoDuration?: number): boolean {
  const cue = cues[index];
  if (!cue) return false;
  return setCueDuration(cues, index, cue.end - cue.start + delta, { videoDuration });
}

export function adjustAllCueDurations(cues: SrtCue[], delta: number, videoDuration?: number): void {
  cues.forEach((_, index) => {
    setCueDuration(cues, index, cues[index].end - cues[index].start + delta, { silent: true, videoDuration });
  });
}

export function hasOverlaps(cues: SrtCue[]): boolean {
  for (let i = 0; i < cues.length - 1; i++) {
    if (cues[i].end > cues[i + 1].start + 0.001) return true;
  }
  return false;
}

export function hasEmptyCues(cues: SrtCue[]): boolean {
  return cues.some(cue => !cue.text.trim());
}