// 應用狀態管理
import { NativeBridge } from './native-bridge.js';
import { SubtitleProject, RecentProject } from './core/project-schema.js';
import { SrtCue } from './core/srt-parser.js';
import { BurnSettings } from './core/burn-settings.js';
import { APP_CONFIG } from './core/config.js';

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

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface ModalConfig {
  id: string;
  title: string;
  content: string | HTMLElement;
  actions?: { label: string; action: () => void; variant?: 'primary' | 'secondary' | 'danger' }[];
  closable?: boolean;
}

export type Stage = 'welcome' | 'proofread' | 'burn' | 'settings' | 'project-list';
export type TranscriptionStatus = 'idle' | 'loading-model' | 'transcribing' | 'completed' | 'error';

export interface AppState {
  // 當前階段
  stage: Stage;
  previousStage: Stage;

  // 專案資料
  project: SubtitleProject | null;
  recentProjects: RecentProject[];

  // 影片資訊
  videoInfo: VideoInfo | null;
  videoUri: string | null;

  // 字幕資料
  cues: SrtCue[];
  activeCueIndex: number;
  changedCueIndices: Set<number>;
  searchQuery: string;

  // 轉錄狀態
  transcriptionStatus: TranscriptionStatus;
  transcriptionProgress: { current: number; total: number; text: string };
  transcriptionError: string | null;
  transcriptionResult: TranscriptionResult | null;

  // 燒錄設定
  burnSettings: BurnSettings;

  // AI 設定
  selectedProvider: string;
  selectedModel: string;
  apiKeys: Record<string, boolean>; // 是否已設定

  // UI 狀態
  isLoading: boolean;
  loadingMessage: string;
  toastQueue: ToastMessage[];
  modalStack: ModalConfig[];

  // 裝置資訊
  deviceInfo: { platform: string; isNative: boolean } | null;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface ModalConfig {
  id: string;
  title: string;
  content: string | HTMLElement;
  actions?: { label: string; action: () => void; variant?: 'primary' | 'secondary' | 'danger' }[];
  closable?: boolean;
}

export function createAppState(): AppState {
  return {
    stage: 'welcome',
    previousStage: 'welcome',
    project: null,
    recentProjects: [],
    videoInfo: null,
    videoUri: null,
    cues: [],
    activeCueIndex: -1,
    changedCueIndices: new Set(),
    searchQuery: '',
    transcriptionStatus: 'idle',
    transcriptionProgress: { current: 0, total: 0, text: '' },
    transcriptionError: null,
    transcriptionResult: null,
    burnSettings: { ...APP_CONFIG.DEFAULT_BURN_SETTINGS },
    selectedProvider: 'openai',
    selectedModel: '',
    apiKeys: {},
    isLoading: false,
    loadingMessage: '',
    toastQueue: [],
    modalStack: [],
    deviceInfo: null,
  };
}

// 狀態更新方法
export const StateActions = {
  // 階段切換
  setStage(state: AppState, stage: Stage) {
    state.previousStage = state.stage;
    state.stage = stage;
  },

  goBack(state: AppState) {
    const temp = state.stage;
    state.stage = state.previousStage;
    state.previousStage = temp;
  },

  // 專案管理
  setProject(state: AppState, project: SubtitleProject | null) {
    state.project = project;
    if (project) {
      state.cues = project.subtitle.cues;
      state.burnSettings = project.burnSettings;
      state.activeCueIndex = project.review.currentCueIndex;
      state.changedCueIndices = new Set(project.review.changedCueIndices);
      state.searchQuery = project.review.searchQuery;
      state.videoUri = project.video.uri;
      state.videoInfo = {
        duration: project.video.duration,
        width: project.video.width,
        height: project.video.height,
        codec: '',
        bitrate: 0,
        format: project.video.mimeType,
      };
    } else {
      StateActions.resetProject(state);
    }
  },

  resetProject(state: AppState) {
    state.project = null;
    state.cues = [];
    state.activeCueIndex = -1;
    state.changedCueIndices.clear();
    state.searchQuery = '';
    state.videoUri = null;
    state.videoInfo = null;
    state.transcriptionStatus = 'idle';
    state.transcriptionProgress = { current: 0, total: 0, text: '' };
    state.transcriptionError = null;
    state.transcriptionResult = null;
  },

  updateCueText(state: AppState, index: number, text: string) {
    if (state.cues[index]) {
      state.cues[index].text = text;
      state.changedCueIndices.add(index);
      if (state.project) {
        state.project.subtitle.cues = [...state.cues];
        state.project.review.changedCueIndices = [...state.changedCueIndices];
      }
    }
  },

  setActiveCue(state: AppState, index: number) {
    state.activeCueIndex = index;
    if (state.project) {
      state.project.review.currentCueIndex = index;
    }
  },

  setSearchQuery(state: AppState, query: string) {
    state.searchQuery = query;
    if (state.project) {
      state.project.review.searchQuery = query;
    }
  },

  // 轉錄狀態
  setTranscriptionStatus(state: AppState, status: TranscriptionStatus) {
    state.transcriptionStatus = status;
    if (status === 'transcribing') {
      state.transcriptionError = null;
      state.transcriptionProgress = { current: 0, total: 0, text: '' };
    }
  },

  setTranscriptionProgress(state: AppState, progress: { current: number; total: number; text: string }) {
    state.transcriptionProgress = progress;
  },

  setTranscriptionResult(state: AppState, result: TranscriptionResult) {
    state.transcriptionResult = result;
    state.transcriptionStatus = 'completed';

    // 將轉錄結果轉換為 cues
    state.cues = result.segments.map((seg, i) => ({
      id: i + 1,
      startRaw: formatSrtTime(seg.start),
      endRaw: formatSrtTime(seg.end),
      start: seg.start,
      end: seg.end,
      originalStart: seg.start,
      originalEnd: seg.end,
      text: seg.text,
      originalText: seg.text,
    }));

    if (state.project) {
      state.project.subtitle.cues = state.cues;
      state.project.subtitle.originalText = state.cues.map(c => c.text).join('\n');
    }
  },

  setTranscriptionError(state: AppState, error: string) {
    state.transcriptionError = error;
    state.transcriptionStatus = 'error';
  },

  // 燒錄設定
  updateBurnSettings(state: AppState, settings: Partial<BurnSettings>) {
    state.burnSettings = { ...state.burnSettings, ...settings };
    if (state.project) {
      state.project.burnSettings = state.burnSettings;
    }
  },

  // 最近專案
  setRecentProjects(state: AppState, projects: RecentProject[]) {
    state.recentProjects = projects;
  },

  addRecentProject(state: AppState, project: RecentProject) {
    state.recentProjects = [project, ...state.recentProjects.filter(p => p.id !== project.id)].slice(0, 10);
  },

  // Toast
  showToast(state: AppState, type: ToastMessage['type'], message: string, duration = 3000) {
    const toast: ToastMessage = {
      id: `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      message,
      duration,
    };
    state.toastQueue.push(toast);

    // 自動移除
    setTimeout(() => {
      const idx = state.toastQueue.findIndex(t => t.id === toast.id);
      if (idx >= 0) state.toastQueue.splice(idx, 1);
    }, duration);
  },

  removeToast(state: AppState, id: string) {
    const idx = state.toastQueue.findIndex(t => t.id === id);
    if (idx >= 0) state.toastQueue.splice(idx, 1);
  },

  // Modal
  showModal(state: AppState, modal: ModalConfig) {
    state.modalStack.push(modal);
  },

  hideModal(state: AppState, id?: string) {
    if (id) {
      const idx = state.modalStack.findIndex(m => m.id === id);
      if (idx >= 0) state.modalStack.splice(idx, 1);
    } else {
      state.modalStack.pop();
    }
  },

  // 裝置資訊
  setDeviceInfo(state: AppState, info: AppState['deviceInfo']) {
    state.deviceInfo = info;
  },

  // 選擇 Provider
  setProvider(state: AppState, provider: string, model?: string) {
    state.selectedProvider = provider;
    if (model) state.selectedModel = model;
  },

  // API Keys
  setApiKeys(state: AppState, keys: Record<string, boolean>) {
    state.apiKeys = keys;
  },
};

// 工具函數
function formatSrtTime(seconds: number): string {
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