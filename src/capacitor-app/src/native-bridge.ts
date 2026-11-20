// 原生橋接 - Capacitor 插件介面
import { Capacitor, Plugins, PluginListenerHandle } from '@capacitor/core';
import { APP_CONFIG, validateVideoDuration } from './core/config.js';
import { BurnSettings } from './core/burn-settings.js';
import { SubtitleProject } from './core/project-schema.js';

// 檢查是否在原生環境
const isNative = Capacitor.isNativePlatform();

// 安全取得插件
const PluginsSafe = isNative ? Plugins : {};
const {
  Whisper,
  FFmpeg,
  FileSystemExt,
  Filesystem,
  Share,
  Haptics,
  App,
  Preferences,
  Clipboard,
  Device,
  Network,
} = PluginsSafe;

// 類型定義
export interface TranscriptionSegment {
  id: number;
  text: string;
  start: number;
  end: number;
}

export interface TranscriptionResult {
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  format: string;
}

export interface FilePickerResult {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface ModelInfo {
  name: string;
  label: string;
  size: number;
  installed: boolean;
}

export class NativeBridge {
  private initialized = false;
  private listeners: PluginListenerHandle[] = [];
  private platform: 'ios' | 'android' | 'web' = 'web';
  private mockMode = !isNative;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.platform = Capacitor.getPlatform() as any;
    console.log(`[NativeBridge] Initializing on ${this.platform} (mockMode: ${this.mockMode})`);

    if (!this.mockMode) {
      // 註冊 App 狀態監聽
      const appStateListener = await App.addListener('appStateChange', (state: { isActive: boolean }) => {
        this.handleAppStateChange(state);
      });
      this.listeners.push(appStateListener);

      // 註冊網路狀態監聽
      try {
        const networkListener = await Network.addListener('networkStatusChange', (status: { connected: boolean; connectionType: string }) => {
          this.handleNetworkChange(status);
        });
        this.listeners.push(networkListener);
      } catch {
        // Network plugin may not be available
      }
    } else {
      console.log('[NativeBridge] Web mock mode - skipping native listeners');
    }

    this.initialized = true;
  }

  private handleAppStateChange(state: { isActive: boolean }) {
    console.log(`[NativeBridge] App state: ${state.isActive ? 'active' : 'background'}`);
    window.dispatchEvent(new CustomEvent('app-state-change', { detail: state }));
  }

  private handleNetworkChange(status: { connected: boolean; connectionType: string }) {
    console.log(`[NativeBridge] Network: ${status.connected ? 'connected' : 'disconnected'} (${status.connectionType})`);
    window.dispatchEvent(new CustomEvent('network-change', { detail: status }));
  }

  // ========== Whisper 語音轉錄 ==========

  /** 載入 Whisper 模型 (固定使用 small) */
  async loadWhisperModel(model: 'tiny' | 'base' | 'small' = 'small'): Promise<{ success: boolean }> {
    if (this.mockMode) return { success: true };
    if (!this.checkPlugin('Whisper')) throw new Error('Whisper 插件不可用');
    console.log(`[NativeBridge] Loading Whisper model: ${model}`);
    return Whisper.loadModel({ model });
  }

  /** 檢查模型是否已安裝 */
  async checkWhisperModel(model: 'tiny' | 'base' | 'small' = 'small'): Promise<{ installed: boolean }> {
    if (this.mockMode) return { installed: true };
    if (!this.checkPlugin('Whisper')) return { installed: false };
    return Whisper.checkModel({ model });
  }

  /** 語音轉錄 - 含 30 分鐘限制驗證 */
  async transcribe(audioPath: string, language: string = 'zh'): Promise<TranscriptionResult> {
    if (this.mockMode) return this.mockTranscribe(audioPath, language);
    if (!this.checkPlugin('Whisper')) throw new Error('Whisper 插件不可用');

    // 先驗證影片長度 (原生層也會驗證，這裡雙重保險)
    const videoInfo = await this.getVideoInfo(audioPath);
    const validation = validateVideoDuration(videoInfo.duration);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    console.log(`[NativeBridge] Starting transcription: ${audioPath}`);
    const result = await Whisper.transcribe({
      audioPath,
      language,
      model: APP_CONFIG.WHISPER_MODEL,
    });

    return {
      segments: result.segments.map((s: any, i: number) => ({
        id: i + 1,
        text: s.text.trim(),
        start: s.start,
        end: s.end,
      })),
      language: result.language || language,
      duration: videoInfo.duration,
    };
  }

  /** 取消轉錄 */
  async cancelTranscription(): Promise<void> {
    if (this.mockMode) return;
    if (!this.checkPlugin('Whisper')) return;
    return Whisper.cancel();
  }

  /** 取得轉錄進度 (透過事件監聽) */
  onTranscriptionProgress(callback: (progress: { current: number; total: number; text: string }) => void): () => void {
    if (this.mockMode) return () => {};
    if (!this.checkPlugin('Whisper')) return () => {};

    const listener = Whisper.addListener('progress', (data: any) => {
      callback({
        current: data.current || 0,
        total: data.total || 0,
        text: data.text || '',
      });
    });
    this.listeners.push(listener);

    return () => {
      listener.remove();
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  // ========== FFmpeg 影片處理 ==========

  /** 取得影片資訊 (含長度驗證) */
  async getVideoInfo(videoPath: string): Promise<VideoInfo> {
    if (this.mockMode) return this.mockGetVideoInfo(videoPath);
    if (!this.checkPlugin('FFmpeg')) throw new Error('FFmpeg 插件不可用');
    const result = await FFmpeg.getVideoInfo({ path: videoPath });
    return {
      duration: result.duration || 0,
      width: result.width || 0,
      height: result.height || 0,
      codec: result.codec || '',
      bitrate: result.bitrate || 0,
      format: result.format || '',
    };
  }

  /** 驗證影片長度 (30 分鐘限制) */
  async validateVideoDuration(videoPath: string): Promise<{ valid: boolean; error?: string; duration: number }> {
    const info = await this.getVideoInfo(videoPath);
    const validation = validateVideoDuration(info.duration);
    return { ...validation, duration: info.duration };
  }

  /** 燒錄字幕到影片 */
  async burnSubtitles(params: {
    videoPath: string;
    subtitlePath: string;
    outputPath: string;
    settings: BurnSettings;
  }): Promise<{ outputPath: string }> {
    if (this.mockMode) return this.mockBurnSubtitles();
    if (!this.checkPlugin('FFmpeg')) throw new Error('FFmpeg 插件不可用');

    // 驗證長度
    const validation = await this.validateVideoDuration(params.videoPath);
    if (!validation.valid) throw new Error(validation.error);

    console.log(`[NativeBridge] Burning subtitles: ${params.videoPath}`);
    return FFmpeg.burnSubtitles({
      videoPath: params.videoPath,
      subtitlePath: params.subtitlePath,
      outputPath: params.outputPath,
      settings: params.settings,
    });
  }

  /** 產生預覽短片 (20 秒) */
  async generateSample(params: {
    videoPath: string;
    subtitlePath: string;
    outputPath: string;
    settings: BurnSettings;
    startTime?: number;
    duration?: number;
  }): Promise<{ outputPath: string }> {
    if (this.mockMode) return this.mockGenerateSample();
    if (!this.checkPlugin('FFmpeg')) throw new Error('FFmpeg 插件不可用');

    return FFmpeg.generateSample({
      videoPath: params.videoPath,
      subtitlePath: params.subtitlePath,
      outputPath: params.outputPath,
      settings: params.settings,
      startTime: params.startTime || 10,
      duration: params.duration || 20,
    });
  }

  /** 執行自訂 FFmpeg 指令 */
  async executeFFmpeg(command: string): Promise<{ output: string; exitCode: number }> {
    if (this.mockMode) return this.mockExecuteFFmpeg();
    if (!this.checkPlugin('FFmpeg')) throw new Error('FFmpeg 插件不可用');
    return FFmpeg.execute({ command });
  }

  // ========== 檔案系統 ==========

  /** 選擇影片檔案 */
  async pickVideo(): Promise<FilePickerResult | null> {
    if (this.mockMode) return this.mockPickVideo();
    if (!this.checkPlugin('FileSystemExt')) throw new Error('檔案系統擴充插件不可用');
    const result = await FileSystemExt.pickVideo();
    return result?.uri ? result : null;
  }

  /** 選擇字幕檔案 */
  async pickSubtitle(): Promise<FilePickerResult | null> {
    if (this.mockMode) return this.mockPickSubtitle();
    if (!this.checkPlugin('FileSystemExt')) throw new Error('檔案系統擴充插件不可用');
    const result = await FileSystemExt.pickSubtitle();
    return result?.uri ? result : null;
  }

  /** 選擇資料夾 */
  async pickFolder(): Promise<{ uri: string } | null> {
    if (this.mockMode) return this.mockPickFolder();
    if (!this.checkPlugin('FileSystemExt')) throw new Error('檔案系統擴充插件不可用');
    return FileSystemExt.pickFolder();
  }

  /** 讀取檔案內容 */
  async readFile(uri: string): Promise<string> {
    if (this.mockMode) return this.mockReadFile(uri);
    const result = await Filesystem.readFile({ path: uri, encoding: 'utf-8' });
    return result.data as string;
  }

  /** 寫入檔案 */
  async writeFile(uri: string, data: string, recursive = true): Promise<void> {
    if (this.mockMode) return this.mockWriteFile(uri, data);
    await Filesystem.writeFile({ path: uri, data, recursive, encoding: 'utf-8' });
  }

  /** 寫入二進位檔案 */
  async writeBinaryFile(uri: string, data: string, recursive = true): Promise<void> {
    if (this.mockMode) return this.mockWriteBinaryFile(uri, data);
    await Filesystem.writeFile({ path: uri, data, recursive, encoding: 'base64' });
  }

  /** 讀取二進位檔案 */
  async readBinaryFile(uri: string): Promise<string> {
    if (this.mockMode) return this.mockReadBinaryFile(uri);
    const result = await Filesystem.readFile({ path: uri, encoding: 'base64' });
    return result.data as string;
  }

  /** 刪除檔案 */
  async deleteFile(uri: string): Promise<void> {
    if (this.mockMode) return this.mockDeleteFile(uri);
    await Filesystem.deleteFile({ path: uri });
  }

  /** 列出目錄內容 */
  async listFiles(directory: string): Promise<{ files: string[] }> {
    if (this.mockMode) return this.mockListFiles(directory);
    return Filesystem.readdir({ path: directory });
  }

  /** 取得應用程式文件目錄 */
  async getAppDataDir(): Promise<string> {
    if (this.mockMode) return this.mockGetAppDataDir();
    const result = await Filesystem.getUri({ directory: 'DATA' });
    return result.uri;
  }

  /** 取得外部儲存目錄 (Android) 或文件目錄 */
  async getExternalDir(): Promise<string> {
    if (this.mockMode) return this.mockGetExternalDir();
    const result = await Filesystem.getUri({ directory: 'DOCUMENTS' });
    return result.uri;
  }

  /** 複製檔案到應用沙盒 */
  async copyToAppSandbox(sourceUri: string, targetName: string): Promise<string> {
    if (this.mockMode) return this.mockCopyToAppSandbox(sourceUri, targetName);
    const data = await this.readBinaryFile(sourceUri);
    const appDir = await this.getAppDataDir();
    const targetUri = `${appDir}/${targetName}`;
    await this.writeBinaryFile(targetUri, data);
    return targetUri;
  }

  // ========== 專案持久化 ==========

  /** 儲存專案 */
  async saveProject(project: SubtitleProject): Promise<void> {
    if (this.mockMode) return this.mockSaveProject(project);
    project.updatedAt = new Date().toISOString();
    const key = `project_${project.video.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    await Preferences.set({ key, value: JSON.stringify(project) });
  }

  /** 載入專案 */
  async loadProject(key: string): Promise<SubtitleProject | null> {
    if (this.mockMode) return this.mockLoadProject(key);
    const result = await Preferences.get({ key });
    if (!result.value) return null;
    try {
      return JSON.parse(result.value) as SubtitleProject;
    } catch {
      return null;
    }
  }

  /** 列出所有專案 */
  async listProjects(): Promise<{ key: string; project: SubtitleProject }[]> {
    if (this.mockMode) return this.mockListProjects();
    const keys = await Preferences.keys();
    const projectKeys = keys.filter((k: string) => k.startsWith('project_'));
    const projects = await Promise.all(
      projectKeys.map(async (key: string) => {
        const project = await this.loadProject(key);
        return project ? { key, project } : null;
      })
    );
    return projects.filter((p): p is { key: string; project: SubtitleProject } => p !== null);
  }

  /** 刪除專案 */
  async deleteProject(key: string): Promise<void> {
    if (this.mockMode) return this.mockDeleteProject(key);
    await Preferences.remove({ key });
  }

  // ========== 設定管理 ==========

  async getSettings(): Promise<Record<string, any>> {
    if (this.mockMode) return this.mockGetSettings();
    const result = await Preferences.get({ key: APP_CONFIG.STORAGE_KEYS.SETTINGS });
    return result.value ? JSON.parse(result.value) : {};
  }

  async saveSettings(settings: Record<string, any>): Promise<void> {
    if (this.mockMode) return this.mockSaveSettings(settings);
    await Preferences.set({ key: APP_CONFIG.STORAGE_KEYS.SETTINGS, value: JSON.stringify(settings) });
  }

  // ========== AI API Keys (安全儲存) ==========

  async saveApiKey(provider: string, apiKey: string): Promise<void> {
    if (this.mockMode) return this.mockSaveApiKey(provider, apiKey);
    const keys = await this.getApiKeys();
    // 只存雜湊，不存明文
    keys[provider] = this.hashApiKey(apiKey);
    await Preferences.set({ key: APP_CONFIG.STORAGE_KEYS.AI_KEYS, value: JSON.stringify(keys) });
  }

  async getApiKeys(): Promise<Record<string, string>> {
    if (this.mockMode) return this.mockGetApiKeys();
    const result = await Preferences.get({ key: APP_CONFIG.STORAGE_KEYS.AI_KEYS });
    return result.value ? JSON.parse(result.value) : {};
  }

  async hasApiKey(provider: string): Promise<boolean> {
    if (this.mockMode) return this.mockHasApiKey(provider);
    const keys = await this.getApiKeys();
    return !!keys[provider];
  }

  async clearApiKey(provider: string): Promise<void> {
    if (this.mockMode) return this.mockClearApiKey(provider);
    const keys = await this.getApiKeys();
    delete keys[provider];
    await Preferences.set({ key: APP_CONFIG.STORAGE_KEYS.AI_KEYS, value: JSON.stringify(keys) });
  }

  private hashApiKey(key: string): string {
    // 簡單雜湊，實際應用建議用更安全的方式
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  }

  // ========== 分享與匯出 ==========

  /** 分享檔案 */
  async shareFile(filePath: string, title: string = '匯出檔案'): Promise<void> {
    if (this.mockMode) return this.mockShareFile(filePath, title);
    await Share.share({ title, url: filePath, dialogTitle: title });
  }

  /** 分享文字 */
  async shareText(text: string, title: string = '分享'): Promise<void> {
    if (this.mockMode) return this.mockShareText(text, title);
    await Share.share({ title, text, dialogTitle: title });
  }

  // ========== 觸覺回饋 ==========

  async vibrate(): Promise<void> {
    if (this.mockMode) return this.mockVibrate();
    await Haptics.vibrate();
  }

  async impact(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
    if (this.mockMode) return this.mockImpact();
    await Haptics.impact({ style });
  }

  async selectionStart(): Promise<void> {
    if (this.mockMode) return Promise.resolve();
    await Haptics.selectionStart();
  }

  async selectionChanged(): Promise<void> {
    if (this.mockMode) return Promise.resolve();
    await Haptics.selectionChanged();
  }

  async selectionEnd(): Promise<void> {
    if (this.mockMode) return Promise.resolve();
    await Haptics.selectionEnd();
  }

  // ========== 裝置資訊 ==========

  async getDeviceInfo(): Promise<{
    platform: string;
    model: string;
    osVersion: string;
    appVersion: string;
    isNative: boolean;
  }> {
    if (this.mockMode) return this.mockGetDeviceInfo();
    const info = await Device.getInfo();
    return {
      platform: info.platform,
      model: info.model,
      osVersion: info.osVersion,
      appVersion: info.appVersion,
      isNative: this.platform !== 'web',
    };
  }

  // ========== 剪貼簿 ==========

  async copyToClipboard(text: string): Promise<void> {
    if (this.mockMode) return this.mockCopyToClipboard(text);
    await Clipboard.write({ string: text });
  }

  async readFromClipboard(): Promise<string> {
    if (this.mockMode) return this.mockReadFromClipboard();
    return Clipboard.read();
  }

  // ========== 工具方法 ==========

  private checkPlugin(name: string): boolean {
    if (this.mockMode) {
      console.warn(`[NativeBridge] Plugin ${name} not available in web mock mode`);
      return false;
    }
    // @ts-ignore
    return !!PluginsSafe[name];
  }

  // ========== Mock 模式實作 (Web 環境) ==========

  private mockTranscribe(audioPath: string, language: string): Promise<TranscriptionResult> {
    return new Promise((resolve) => {
      console.log(`[Mock] Transcribing: ${audioPath}`);
      setTimeout(() => {
        resolve({
          segments: [
            { id: 1, text: '[Mock] 歡迎使用字幕校對工具', start: 0, end: 3 },
            { id: 2, text: '[Mock] 這是模擬的轉錄結果', start: 3, end: 6 },
            { id: 3, text: '[Mock] 實際使用需在 iOS/Android 真機', start: 6, end: 10 },
          ],
          language: language,
          duration: 10,
        });
      }, 1000);
    });
  }

  private mockGetVideoInfo(videoPath: string): Promise<VideoInfo> {
    return Promise.resolve({
      duration: 120,
      width: 1920,
      height: 1080,
      codec: 'h264',
      bitrate: 5000000,
      format: 'mp4',
    });
  }

  private mockBurnSubtitles(): Promise<{ outputPath: string }> {
    return Promise.resolve({ outputPath: '/mock/output.mp4' });
  }

  private mockGenerateSample(): Promise<{ outputPath: string }> {
    return Promise.resolve({ outputPath: '/mock/sample.mp4' });
  }

  private mockExecuteFFmpeg(): Promise<{ output: string; exitCode: number }> {
    return Promise.resolve({ output: '[Mock] FFmpeg executed', exitCode: 0 });
  }

  private mockPickVideo(): Promise<FilePickerResult | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          resolve({
            uri: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            mimeType: file.type,
          });
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }

  private mockPickSubtitle(): Promise<FilePickerResult | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.srt,text/plain';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          resolve({
            uri: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            mimeType: file.type,
          });
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }

  private mockPickFolder(): Promise<{ uri: string } | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      input.onchange = () => {
        if (input.files && input.files.length > 0) {
          const file = input.files[0];
          resolve({ uri: URL.createObjectURL(file) });
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }

  private mockReadFile(uri: string): Promise<string> {
    return fetch(uri).then(r => r.text());
  }

  private mockWriteFile(uri: string, data: string): Promise<void> {
    console.log(`[Mock] Write file: ${uri} (${data.length} chars)`);
    return Promise.resolve();
  }

  private mockWriteBinaryFile(uri: string, data: string): Promise<void> {
    console.log(`[Mock] Write binary file: ${uri} (${data.length} bytes base64)`);
    return Promise.resolve();
  }

  private mockReadBinaryFile(uri: string): Promise<string> {
    return fetch(uri).then(r => r.blob()).then(b => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(b);
      });
    });
  }

  private mockDeleteFile(uri: string): Promise<void> {
    console.log(`[Mock] Delete file: ${uri}`);
    return Promise.resolve();
  }

  private mockListFiles(directory: string): Promise<{ files: string[] }> {
    return Promise.resolve({ files: [] });
  }

  private mockGetAppDataDir(): Promise<string> {
    return Promise.resolve('mock://app-data');
  }

  private mockGetExternalDir(): Promise<string> {
    return Promise.resolve('mock://external');
  }

  private mockCopyToAppSandbox(sourceUri: string, targetName: string): Promise<string> {
    return Promise.resolve(`mock://app-data/${targetName}`);
  }

  private mockSaveProject(project: SubtitleProject): Promise<void> {
    console.log(`[Mock] Save project: ${project.video.name}`);
    localStorage.setItem(`project_${project.video.name}`, JSON.stringify(project));
    return Promise.resolve();
  }

  private mockLoadProject(key: string): Promise<SubtitleProject | null> {
    const data = localStorage.getItem(key);
    return Promise.resolve(data ? JSON.parse(data) : null);
  }

  private mockListProjects(): Promise<{ key: string; project: SubtitleProject }[]> {
    const projects: { key: string; project: SubtitleProject }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('project_')) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            projects.push({ key, project: JSON.parse(data) });
          } catch {}
        }
      }
    }
    return Promise.resolve(projects);
  }

  private mockDeleteProject(key: string): Promise<void> {
    localStorage.removeItem(key);
    return Promise.resolve();
  }

  private mockGetSettings(): Promise<Record<string, any>> {
    const data = localStorage.getItem('settings');
    return Promise.resolve(data ? JSON.parse(data) : {});
  }

  private mockSaveSettings(settings: Record<string, any>): Promise<void> {
    localStorage.setItem('settings', JSON.stringify(settings));
    return Promise.resolve();
  }

  private mockSaveApiKey(provider: string, apiKey: string): Promise<void> {
    const keys = JSON.parse(localStorage.getItem('ai_keys') || '{}');
    keys[provider] = apiKey;
    localStorage.setItem('ai_keys', JSON.stringify(keys));
    return Promise.resolve();
  }

  private mockGetApiKeys(): Promise<Record<string, string>> {
    const data = localStorage.getItem('ai_keys');
    return Promise.resolve(data ? JSON.parse(data) : {});
  }

  private mockHasApiKey(provider: string): Promise<boolean> {
    const keys = JSON.parse(localStorage.getItem('ai_keys') || '{}');
    return Promise.resolve(!!keys[provider]);
  }

  private mockClearApiKey(provider: string): Promise<void> {
    const keys = JSON.parse(localStorage.getItem('ai_keys') || '{}');
    delete keys[provider];
    localStorage.setItem('ai_keys', JSON.stringify(keys));
    return Promise.resolve();
  }

  private mockShareFile(filePath: string, title: string): Promise<void> {
    if (navigator.share) {
      return navigator.share({ title, url: filePath });
    }
    console.log(`[Mock] Share file: ${filePath}`);
    return Promise.resolve();
  }

  private mockShareText(text: string, title: string): Promise<void> {
    if (navigator.share) {
      return navigator.share({ title, text });
    }
    console.log(`[Mock] Share text: ${text}`);
    return Promise.resolve();
  }

  private mockVibrate(): Promise<void> {
    if ('vibrate' in navigator) navigator.vibrate(50);
    return Promise.resolve();
  }

  private mockImpact(): Promise<void> {
    return Promise.resolve();
  }

  private mockGetDeviceInfo(): Promise<{
    platform: string;
    model: string;
    osVersion: string;
    appVersion: string;
    isNative: boolean;
  }> {
    return Promise.resolve({
      platform: 'web',
      model: navigator.userAgent,
      osVersion: navigator.platform,
      appVersion: '1.0.0-web',
      isNative: false,
    });
  }

  private mockCopyToClipboard(text: string): Promise<void> {
    return navigator.clipboard.writeText(text);
  }

  private mockReadFromClipboard(): Promise<string> {
    return navigator.clipboard.readText();
  }
}

// 單例實例
let nativeBridgeInstance: NativeBridge | null = null;

export function getNativeBridge(): NativeBridge {
  if (!nativeBridgeInstance) {
    nativeBridgeInstance = new NativeBridge();
  }
  return nativeBridgeInstance;
}