// 服務初始化
import { NativeBridge } from '../native-bridge.js';
import { APP_CONFIG } from '../core/config.js';
import { getNativeBridge } from '../native-bridge.js';

let nativeBridgeInstance: NativeBridge | null = null;

export async function initializeServices(nativeBridge: NativeBridge): Promise<void> {
  nativeBridgeInstance = nativeBridge;

  // 載入裝置資訊
  try {
    const deviceInfo = await nativeBridge.getDeviceInfo();
    console.log('[Services] Device info:', deviceInfo);
  } catch (error) {
    console.warn('[Services] Failed to get device info:', error);
  }

  // 載入 API Key 狀態
  try {
    const keys = await nativeBridge.getApiKeys();
    const providerKeys: Record<string, boolean> = {};
    for (const provider of APP_CONFIG.SUPPORTED_PROVIDERS) {
      providerKeys[provider] = !!keys[provider];
    }
    // 觸發事件通知 UI 更新
    window.dispatchEvent(new CustomEvent('api-keys-loaded', { detail: providerKeys }));
  } catch (error) {
    console.warn('[Services] Failed to load API keys:', error);
  }

  // 載入最近專案
  try {
    const projects = await nativeBridge.listProjects();
    const recentProjects = projects.map(({ key, project }) => ({
      id: key,
      name: project.video.name || '未命名專案',
      videoName: project.video.name,
      videoDuration: project.video.duration,
      subtitleCueCount: project.subtitle.cues.length,
      lastOpened: project.updatedAt,
      projectUri: key,
    }));
    window.dispatchEvent(new CustomEvent('recent-projects-loaded', { detail: recentProjects }));
  } catch (error) {
    console.warn('[Services] Failed to load recent projects:', error);
  }

  console.log('[Services] Initialized');
}

export function getNativeBridgeInstance(): NativeBridge | null {
  return nativeBridgeInstance;
}

// 偏好設定服務
export const PreferencesService = {
  async get(key: string, defaultValue: any = null) {
    if (!nativeBridgeInstance) return defaultValue;
    try {
      const result = await nativeBridgeInstance['getSettings']?.() || {};
      return result[key] ?? defaultValue;
    } catch {
      return defaultValue;
    }
  },

  async set(key: string, value: any) {
    if (!nativeBridgeInstance) return;
    try {
      const settings = await nativeBridgeInstance['getSettings']?.() || {};
      settings[key] = value;
      await nativeBridgeInstance['saveSettings']?.(settings);
    } catch (error) {
      console.warn('[PreferencesService] Failed to save:', error);
    }
  },
};

// 專案服務
export const ProjectService = {
  async save(project: any) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.saveProject(project);
  },

  async load(key: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.loadProject(key);
  },

  async list() {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.listProjects();
  },

  async delete(key: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.deleteProject(key);
  },
};

// 檔案服務
export const FileService = {
  async pickVideo() {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.pickVideo();
  },

  async pickSubtitle() {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.pickSubtitle();
  },

  async pickFolder() {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.pickFolder();
  },

  async copyToSandbox(sourceUri: string, targetName: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.copyToAppSandbox(sourceUri, targetName);
  },

  async readText(uri: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.readFile(uri);
  },

  async writeText(uri: string, data: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.writeFile(uri, data);
  },

  async readBinary(uri: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.readBinaryFile(uri);
  },

  async writeBinary(uri: string, data: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.writeBinaryFile(uri, data);
  },

  async getAppDataDir() {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.getAppDataDir();
  },
};

// 轉錄服務
export const TranscriptionService = {
  async loadModel(model: 'tiny' | 'base' | 'small' = 'small') {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.loadWhisperModel(model);
  },

  async checkModel(model: 'tiny' | 'base' | 'small' = 'small') {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.checkWhisperModel(model);
  },

  async transcribe(audioPath: string, language: string = 'zh') {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.transcribe(audioPath, language);
  },

  async cancel() {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.cancelTranscription();
  },

  onProgress(callback: (progress: { current: number; total: number; text: string }) => void) {
    if (!nativeBridgeInstance) return () => {};
    return nativeBridgeInstance.onTranscriptionProgress(callback);
  },
};

// FFmpeg 服務
export const FFmpegService = {
  async getVideoInfo(videoPath: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.getVideoInfo(videoPath);
  },

  async validateDuration(videoPath: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.validateVideoDuration(videoPath);
  },

  async burnSubtitles(params: { videoPath: string; subtitlePath: string; outputPath: string; settings: any }) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.burnSubtitles(params);
  },

  async generateSample(params: { videoPath: string; subtitlePath: string; outputPath: string; settings: any; startTime?: number; duration?: number }) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.generateSample(params);
  },

  async execute(command: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.executeFFmpeg(command);
  },
};

// AI 服務
export const AIService = {
  async saveApiKey(provider: string, apiKey: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.saveApiKey(provider, apiKey);
  },

  async hasApiKey(provider: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.hasApiKey(provider);
  },

  async clearApiKey(provider: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.clearApiKey(provider);
  },

  async getApiKeys() {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.getApiKeys();
  },
};

// 分享服務
export const ShareService = {
  async shareFile(filePath: string, title?: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.shareFile(filePath, title);
  },

  async shareText(text: string, title?: string) {
    if (!nativeBridgeInstance) throw new Error('Native bridge not initialized');
    return nativeBridgeInstance.shareText(text, title);
  },
};

// 觸覺回饋服務
export const HapticsService = {
  vibrate() { return nativeBridgeInstance?.vibrate(); },
  impact(style: 'light' | 'medium' | 'heavy' = 'medium') { return nativeBridgeInstance?.impact(style); },
  selectionStart() { return nativeBridgeInstance?.selectionStart(); },
  selectionChanged() { return nativeBridgeInstance?.selectionChanged(); },
  selectionEnd() { return nativeBridgeInstance?.selectionEnd(); },
};