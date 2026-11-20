// 字幕清理規則 - 從現有 subtitle-editor.html 移植
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

export const FILLER_PATTERN = /(呃|啊|嗯|那個|就是|然後|這個|你知道吧|對吧)/;
export const FILLER_PATTERN_GLOBAL = /(呃|啊|嗯|那個|就是|然後|這個|你知道吧|對吧)/g;

export const DISALLOWED_PUNCTUATION_PATTERN = /[，。、：；「」『』（）()［］\[\]《》〈〉“”"']/;
export const DISALLOWED_PUNCTUATION_PATTERN_GLOBAL = /[，。、：；「」『』（）()［］\[\]《》〈〉“”"']/g;

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

export interface RuleWarning {
  type: 'filler' | 'punctuation' | 'terminology';
  message: string;
}

export function getRuleWarnings(text: string): RuleWarning[] {
  const warnings: RuleWarning[] = [];
  if (FILLER_PATTERN.test(text)) {
    warnings.push({ type: 'filler', message: '包含口語助詞 (呃、啊、嗯等)' });
  }
  if (DISALLOWED_PUNCTUATION_PATTERN.test(text)) {
    warnings.push({ type: 'punctuation', message: '包含全形標點符號' });
  }
  if (/\b(whisper|openai|api|ai|moodle|token|default|lms|evercam|kmplus)\b/i.test(text)) {
    warnings.push({ type: 'terminology', message: '包含需標準化的專有名詞' });
  }
  return warnings;
}