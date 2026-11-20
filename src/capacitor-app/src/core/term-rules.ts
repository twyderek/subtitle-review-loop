// 字幕清理規則 - 從現有 subtitle-editor.html 移植
// 從 srt-parser.ts 匯入共用常數
import { FILLER_PATTERN, DISALLOWED_PUNCTUATION_PATTERN } from './srt-parser.js';

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