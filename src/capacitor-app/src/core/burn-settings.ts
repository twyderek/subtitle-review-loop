// 燒錄設定 - 從現有 subtitle-editor.html 移植
import { APP_CONFIG } from './config.js';

export interface BurnSettings {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  outlineColor: string;
  outlineWidth: number;
  position: 'top' | 'middle' | 'bottom';
  marginV: number;
  bold: boolean;
  alignment: number;
}

export const DEFAULT_BURN_SETTINGS: BurnSettings = {
  ...APP_CONFIG.DEFAULT_BURN_SETTINGS,
};

export function getAlignment(position: 'top' | 'middle' | 'bottom'): number {
  return position === 'top' ? 8 : position === 'middle' ? 5 : 2;
}

export function normalizeBurnSettings(settings: Partial<BurnSettings>): BurnSettings {
  const position = ['top', 'middle', 'bottom'].includes(settings.position || '') ? settings.position! : 'bottom';
  return {
    fontFamily: String(settings.fontFamily || DEFAULT_BURN_SETTINGS.fontFamily),
    fontSize: clampNumber(settings.fontSize, 8, 96, DEFAULT_BURN_SETTINGS.fontSize),
    fontColor: normalizeColor(settings.fontColor, DEFAULT_BURN_SETTINGS.fontColor),
    outlineColor: normalizeColor(settings.outlineColor, DEFAULT_BURN_SETTINGS.outlineColor),
    outlineWidth: clampNumber(settings.outlineWidth, 0, 8, DEFAULT_BURN_SETTINGS.outlineWidth),
    position,
    marginV: clampNumber(settings.marginV, 0, 300, DEFAULT_BURN_SETTINGS.marginV),
    bold: Boolean(settings.bold),
    alignment: getAlignment(position),
  };
}

export function buildFfmpegStyle(settings: BurnSettings): string {
  return [
    `FontName=${settings.fontFamily}`,
    `FontSize=${settings.fontSize}`,
    `Bold=${settings.bold ? 1 : 0}`,
    `PrimaryColour=${hexToAssColor(settings.fontColor)}`,
    `OutlineColour=${hexToAssColor(settings.outlineColor)}`,
    'BorderStyle=1',
    `Outline=${settings.outlineWidth}`,
    'Shadow=0',
    `Alignment=${settings.alignment}`,
    `MarginV=${settings.marginV}`,
  ].join(',');
}

function hexToAssColor(hex: string): string {
  const clean = normalizeColor(hex, '#ffffff').slice(1);
  const red = clean.slice(0, 2);
  const green = clean.slice(2, 4);
  const blue = clean.slice(4, 6);
  return `&H00${blue}${green}${red}`.toUpperCase();
}

function normalizeColor(value: string | undefined, fallback: string): string {
  const text = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toLowerCase() : fallback;
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export const FONT_FAMILIES = [
  'Microsoft JhengHei',
  'Noto Sans TC',
  'Arial',
  'DFKai-SB',
  'PingFang TC',
  'Helvetica',
  'Roboto',
] as const;

export const PRESET_POSITIONS = {
  top: { label: '頂部', alignment: 8 },
  middle: { label: '中間', alignment: 5 },
  bottom: { label: '底部', alignment: 2 },
} as const;