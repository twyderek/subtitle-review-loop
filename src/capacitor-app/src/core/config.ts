// 核心常數定義 - 短影音專用，Whisper small 模型
export const APP_CONFIG = Object.freeze({
  // 影片限制
  MAX_VIDEO_DURATION_SECONDS: 1800,  // 30 分鐘硬性限制
  MAX_VIDEO_DURATION_MS: 1800 * 1000,
  MAX_FILE_SIZE_MB: 500,
  MAX_FILE_SIZE_BYTES: 500 * 1024 * 1024,

  // 支援格式
  SUPPORTED_VIDEO_MIME: ['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm'] as const,
  SUPPORTED_VIDEO_EXT: ['.mp4', '.mov', '.m4v', '.webm'] as const,
  SUPPORTED_SUBTITLE_MIME: ['text/plain', 'application/x-subrip'] as const,
  SUPPORTED_SUBTITLE_EXT: ['.srt'] as const,

  // ASR 設定 - 僅 Whisper，固定 small 模型
  ASR_ENGINE: 'whisper-cpp' as const,
  WHISPER_MODEL: 'small' as const,
  WHISPER_MODELS: ['tiny', 'base', 'small'] as const,
  DEFAULT_WHISPER_MODEL: 'small' as const,

  // AI Provider - 僅三家
  SUPPORTED_PROVIDERS: ['openai', 'gemini', 'nvidia'] as const,

  // Provider 詳細設定
  PROVIDER_CONFIG: {
    openai: {
      id: 'openai',
      name: 'OpenAI (ChatGPT)',
      baseUrl: 'https://api.openai.com/v1',
      modelsEndpoint: '/models',
      chatEndpoint: '/chat/completions',
      authHeader: 'Authorization',
      authPrefix: 'Bearer ',
      capabilities: { jsonSchema: true, streaming: true, vision: true },
      defaultModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    },
    gemini: {
      id: 'gemini',
      name: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com',
      modelsEndpoint: '/v1beta/models',
      chatEndpoint: '/v1beta/openai/chat/completions',
      authHeader: 'x-goog-api-key',
      authPrefix: '',
      capabilities: { jsonSchema: false, streaming: true, vision: true },
      defaultModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
    },
    nvidia: {
      id: 'nvidia',
      name: 'Nvidia NIM',
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      modelsEndpoint: '/models',
      chatEndpoint: '/chat/completions',
      authHeader: 'Authorization',
      authPrefix: 'Bearer ',
      capabilities: { jsonSchema: true, streaming: true, vision: false },
      defaultModels: ['meta/llama-3.1-70b-instruct', 'meta/llama-3.1-8b-instruct', 'nvidia/nemotron-3-ultra'],
      customBaseUrl: true,
    },
  } as const,

  // 燒錄預設值
  DEFAULT_BURN_SETTINGS: {
    fontFamily: 'Microsoft JhengHei',
    fontSize: 18,
    fontColor: '#ffffff',
    outlineColor: '#000000',
    outlineWidth: 2,
    position: 'bottom' as const,
    marginV: 30,
    bold: true,
    alignment: 2,
  },

  // 專案設定
  PROJECT_FILE_EXT: '.srp',
  PROJECT_FILE_MIME: 'application/json',

  // 儲存鍵值
  STORAGE_KEYS: {
    SETTINGS: 'subtitle-review-settings',
    RECENT_PROJECTS: 'subtitle-review-recent-projects',
    WHISPER_MODEL_PATH: 'whisper-model-path',
    AI_KEYS: 'ai-keys',
  },

  // 效能設定
  PERFORMANCE: {
    WHISPER_THREADS: 4,
    FFMPEG_PRESET: 'veryfast',
    FFMPEG_CRF: 22,
    MAX_CONCURRENT_JOBS: 1,
  },
} as const);

export type ProviderId = typeof APP_CONFIG.SUPPORTED_PROVIDERS[number];
export type WhisperModel = typeof APP_CONFIG.WHISPER_MODELS[number];
export type VideoPosition = 'top' | 'middle' | 'bottom';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseUrl: string;
  modelsEndpoint: string;
  chatEndpoint: string;
  authHeader: string;
  authPrefix: string;
  capabilities: {
    jsonSchema: boolean;
    streaming: boolean;
    vision: boolean;
  };
  defaultModels: string[];
  customBaseUrl?: boolean;
}

export interface BurnSettings {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  outlineColor: string;
  outlineWidth: number;
  position: VideoPosition;
  marginV: number;
  bold: boolean;
  alignment: number;
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  format: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateVideoDuration(durationSeconds: number): ValidationResult {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { valid: false, error: '無法取得影片長度' };
  }
  if (durationSeconds > APP_CONFIG.MAX_VIDEO_DURATION_SECONDS) {
    const mins = Math.floor(APP_CONFIG.MAX_VIDEO_DURATION_SECONDS / 60);
    return {
      valid: false,
      error: `影片長度超過 ${mins} 分鐘限制 (短影音專用)，目前：${Math.round(durationSeconds / 60)} 分 ${Math.round(durationSeconds % 60)} 秒`
    };
  }
  return { valid: true };
}

export function validateFileSize(sizeBytes: number): ValidationResult {
  if (sizeBytes > APP_CONFIG.MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `檔案過大，限制 ${APP_CONFIG.MAX_FILE_SIZE_MB} MB，目前：${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
    };
  }
  return { valid: true };
}

export function validateVideoFile(file: File): ValidationResult {
  const sizeCheck = validateFileSize(file.size);
  if (!sizeCheck.valid) return sizeCheck;

  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!APP_CONFIG.SUPPORTED_VIDEO_EXT.includes(ext as any)) {
    return { valid: false, error: `不支援的影片格式：${ext}，支援：${APP_CONFIG.SUPPORTED_VIDEO_EXT.join(', ')}` };
  }
  return { valid: true };
}

export function validateSubtitleFile(file: File): ValidationResult {
  const sizeCheck = validateFileSize(file.size);
  if (!sizeCheck.valid) return sizeCheck;

  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!APP_CONFIG.SUPPORTED_SUBTITLE_EXT.includes(ext as any)) {
    return { valid: false, error: `不支援的字幕格式：${ext}，支援：${APP_CONFIG.SUPPORTED_SUBTITLE_EXT.join(', ')}` };
  }
  return { valid: true };
}