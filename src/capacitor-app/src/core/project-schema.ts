// 專案資料結構
import { SrtCue } from './srt-parser.js';
import { BurnSettings } from './burn-settings.js';

export interface SubtitleProject {
  version: number;
  createdAt: string;
  updatedAt: string;
  video: {
    name: string;
    size: number;
    duration: number;
    width: number;
    height: number;
    mimeType: string;
    // 本地檔案 URI (capacitor filesystem)
    uri: string;
  };
  subtitle: {
    name: string;
    cues: SrtCue[];
    originalText: string;
  };
  burnSettings: BurnSettings;
  review: {
    changedCueIndices: number[];
    currentCueIndex: number;
    searchQuery: string;
    stage: 'proofread' | 'burn';
  };
  ai?: {
    provider: string;
    model: string;
    apiKeyHash: string; // 不存明文
  };
  metadata: {
    appVersion: string;
    whisperModel: string;
    platform: string;
  };
}

export const PROJECT_VERSION = 1;

export function createEmptyProject(): SubtitleProject {
  const now = new Date().toISOString();
  return {
    version: PROJECT_VERSION,
    createdAt: now,
    updatedAt: now,
    video: {
      name: '',
      size: 0,
      duration: 0,
      width: 0,
      height: 0,
      mimeType: '',
      uri: '',
    },
    subtitle: {
      name: '',
      cues: [],
      originalText: '',
    },
    burnSettings: {
      fontFamily: 'Microsoft JhengHei',
      fontSize: 18,
      fontColor: '#ffffff',
      outlineColor: '#000000',
      outlineWidth: 2,
      position: 'bottom',
      marginV: 30,
      bold: true,
      alignment: 2,
    },
    review: {
      changedCueIndices: [],
      currentCueIndex: -1,
      searchQuery: '',
      stage: 'proofread',
    },
    metadata: {
      appVersion: '1.0.0',
      whisperModel: 'small',
      platform: 'unknown',
    },
  };
}

export function validateProject(data: unknown): data is SubtitleProject {
  if (!data || typeof data !== 'object') return false;
  const p = data as Record<string, unknown>;
  return (
    typeof p.version === 'number' &&
    typeof p.createdAt === 'string' &&
    typeof p.updatedAt === 'string' &&
    typeof p.video === 'object' &&
    typeof p.subtitle === 'object' &&
    typeof p.burnSettings === 'object' &&
    typeof p.review === 'object'
  );
}

export interface RecentProject {
  id: string;
  name: string;
  videoName: string;
  videoDuration: number;
  subtitleCueCount: number;
  lastOpened: string;
  thumbnailUri?: string;
  projectUri: string;
}

export interface ExportManifest {
  savedAt: string;
  projectVersion: number;
  video: {
    name: string;
    duration: number;
    originalUri: string;
  };
  subtitle: {
    cueCount: number;
    changedCount: number;
    editedSrtUri: string;
  };
  burnSettings: BurnSettings;
  ffmpegStyle: string;
  output: {
    subtitledVideoUri?: string;
    sampleVideoUri?: string;
  };
}