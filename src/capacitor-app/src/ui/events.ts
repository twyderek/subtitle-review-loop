// UI 事件處理模組
import { AppState, Stage } from '../state.js';
import { NativeBridge, FilePickerResult } from '../native-bridge.js';
import { APP_CONFIG, validateVideoFile, validateSubtitleFile } from '../core/config.js';
import { SrtCue, parseSrt, buildSrt, formatSrtTime, cleanSubtitleText, hasRuleWarning } from '../core/srt-parser.js';
import { BurnSettings, buildFfmpegStyle } from '../core/burn-settings.js';
import { SubtitleProject, createEmptyProject, RecentProject } from '../core/project-schema.js';
import {
  updateCueList, updateStats, updateActiveCueDisplay, updateBurnPreview,
  showToast, removeToast, showModal, hideModal, showLoading, hideLoading,
  setStatusText, updateClock, setVideoLoaded, updateProviderSelection,
  updateAiFields, renderApp
} from './render.js';
import { StateActions } from '../state.js';
import { ProjectService, FileService, TranscriptionService, FFmpegService, AIService, HapticsService, ShareService } from '../services/index.js';

let nativeBridge: NativeBridge;
let unsubscribeTranscriptionProgress: (() => void) | null = null;

export function setupEventListeners(state: AppState, bridge: NativeBridge): void {
  nativeBridge = bridge;

  // Header 事件
  setupHeaderEvents(state);

  // 階段切換
  setupStageTabs(state);

  // 影片播放控制
  setupVideoControls(state);

  // 校稿面板事件
  setupProofreadEvents(state);

  // 燒錄面板事件
  setupBurnEvents(state);

  // Modal 事件
  setupModalEvents(state);

  // Toast 事件
  setupToastEvents(state);

  // 全域鍵盤快捷鍵
  setupKeyboardShortcuts(state);

  // App 狀態變化
  window.addEventListener('app-state-change', (e: Event) => {
    const ce = e as CustomEvent;
    if (!ce.detail.isActive) {
      // App 進入背景，儲存專案
      if (state.project) {
        saveCurrentProject(state).catch(console.error);
      }
    }
  });

  // API Keys 載入完成
  window.addEventListener('api-keys-loaded', (e: Event) => {
    const ce = e as CustomEvent;
    StateActions.setApiKeys(state, ce.detail);
    updateAiFields(state);
  });

  // 最近專案載入完成
  window.addEventListener('recent-projects-loaded', (e: Event) => {
    const ce = e as CustomEvent;
    StateActions.setRecentProjects(state, ce.detail);
  });

  console.log('[Events] Event listeners setup complete');
}

function setupHeaderEvents(state: AppState): void {
  // 返回按鈕
  const backBtn = document.getElementById('backBtn');
  backBtn?.addEventListener('click', () => {
    handleBackNavigation(state);
  });

  // 新建專案按鈕
  const newProjectBtn = document.getElementById('newProjectBtn');
  newProjectBtn?.addEventListener('click', () => {
    handleNewProject(state);
  });

  // 影片檔案選擇
  const videoFileInput = document.getElementById('videoFileInput') as HTMLInputElement;
  videoFileInput?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      await handleVideoFileSelect(state, file);
    }
    // 重置 input 值以便重複選擇同一檔案
    if (videoFileInput) videoFileInput.value = '';
  });

  // 字幕檔案選擇
  const srtFileInput = document.getElementById('srtFileInput') as HTMLInputElement;
  srtFileInput?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      await handleSrtFileSelect(state, file);
    }
    if (srtFileInput) srtFileInput.value = '';
  });

  // Logo/標題點擊回歡迎頁
  const headerTitle = document.querySelector('.header-title');
  headerTitle?.addEventListener('click', () => {
    if (state.stage !== 'welcome') {
      StateActions.setStage(state, 'welcome');
      renderApp(state);
    }
  });
}

function handleBackNavigation(state: AppState): void {
  switch (state.stage) {
    case 'proofread':
    case 'burn':
      // 有專案時回歡迎頁，詢問是否儲存
      if (state.project) {
        showConfirmModal(state, '返回歡迎頁', '是否儲存目前專案再返回？', async () => {
          await saveCurrentProject(state);
          StateActions.setStage(state, 'welcome');
          renderApp(state);
        }, () => {
          StateActions.setStage(state, 'welcome');
          renderApp(state);
        });
      } else {
        StateActions.setStage(state, 'welcome');
        renderApp(state);
      }
      break;
    case 'settings':
    case 'project-list':
      StateActions.setStage(state, state.previousStage || 'welcome');
      renderApp(state);
      break;
    default:
      StateActions.setStage(state, 'welcome');
      renderApp(state);
  }
}

function setupStageTabs(state: AppState): void {
  const tabs = document.querySelectorAll('[data-stage]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const stage = tab.getAttribute('data-stage') as Stage;
      if (stage && stage !== state.stage) {
        StateActions.setStage(state, stage);
        HapticsService.selectionChanged();
        renderApp(state);
      }
    });
  });
}

function setupVideoControls(state: AppState): void {
  const video = document.getElementById('videoPlayer') as HTMLVideoElement;
  if (!video) return;

  // 載入影片
  if (state.videoUri) {
    video.src = state.videoUri;
    video.load();
  }

  video.addEventListener('loadedmetadata', () => {
    setStatusText(`影片載入完成：${Math.floor(video.duration / 60)}:${String(Math.floor(video.duration % 60)).padStart(2, '0')}`);
    updateClock(0);
  });

  video.addEventListener('timeupdate', () => {
    updateClock(video.currentTime);
    // 更新當前字幕
    const newIndex = state.cues.findIndex(cue => video.currentTime >= cue.start && video.currentTime <= cue.end);
    if (newIndex !== state.activeCueIndex && newIndex >= 0) {
      StateActions.setActiveCue(state, newIndex);
      updateActiveCueDisplay(state);
    }
  });

  video.addEventListener('play', () => {
    const playBtn = document.getElementById('btnPlayPause');
    if (playBtn) playBtn.textContent = '⏸ 暫停';
  });

  video.addEventListener('pause', () => {
    const playBtn = document.getElementById('btnPlayPause');
    if (playBtn) playBtn.textContent = '▶ 播放';
  });

  video.addEventListener('error', () => {
    StateActions.showToast(state, 'error', '影片播放失敗，請檢查檔案格式');
  });

  // 播放/暫停
  const playPauseBtn = document.getElementById('btnPlayPause');
  playPauseBtn?.addEventListener('click', () => {
    if (video.paused) video.play(); else video.pause();
  });

  // 快退 10 秒
  const back10Btn = document.getElementById('btnBack10');
  back10Btn?.addEventListener('click', () => {
    video.currentTime = Math.max(0, video.currentTime - 10);
  });

  // 快進 10 秒
  const forward10Btn = document.getElementById('btnForward10');
  forward10Btn?.addEventListener('click', () => {
    video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
  });

  // 循環當前字幕
  const loopBtn = document.getElementById('btnLoopCue');
  loopBtn?.addEventListener('click', () => {
    const cue = state.cues[state.activeCueIndex];
    if (cue) {
      video.currentTime = cue.start;
      video.play();
      // 設定循環邏輯 (簡化版)
      const handleTimeUpdate = () => {
        if (video.currentTime >= cue.end) {
          video.currentTime = cue.start;
        }
      };
      video.addEventListener('timeupdate', handleTimeUpdate, { once: false });
      loopBtn.classList.toggle('primary');
    }
  });
}

function setupProofreadEvents(state: AppState): void {
  // 搜尋輸入
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.trim();
    StateActions.setSearchQuery(state, query);
    updateCueList(state);
  });

  // 時間調整秒數
  const timeAdjustInput = document.getElementById('timeAdjustSeconds') as HTMLInputElement;
  let timeAdjustValue = 0.5;
  timeAdjustInput?.addEventListener('change', (e) => {
    timeAdjustValue = Math.max(0.1, Number((e.target as HTMLInputElement).value) || 0.5);
  });

  // 全片縮短
  const shortenAllBtn = document.getElementById('btnShortenAll');
  shortenAllBtn?.addEventListener('click', () => {
    adjustAllCueDurations(state, -timeAdjustValue);
    HapticsService.impact('light');
  });

  // 全片延長
  const extendAllBtn = document.getElementById('btnExtendAll');
  extendAllBtn?.addEventListener('click', () => {
    adjustAllCueDurations(state, timeAdjustValue);
    HapticsService.impact('light');
  });

  // 另存 SRT
  const saveSrtBtn = document.getElementById('btnSaveSrt');
  saveSrtBtn?.addEventListener('click', () => handleSaveSrt(state));

  // 儲存專案
  const saveProjectBtn = document.getElementById('btnSaveProject');
  saveProjectBtn?.addEventListener('click', () => handleSaveProject(state));

  // 字幕列表事件委派
  const cueList = document.getElementById('cueList');
  cueList?.addEventListener('click', (e) => handleCueListClick(e, state));
  cueList?.addEventListener('input', (e) => handleCueTextInput(e, state));
  cueList?.addEventListener('change', (e) => handleCueDurationChange(e, state));
}

function setupBurnEvents(state: AppState): void {
  // 燒錄設定變更
  const settingIds = ['fontFamily', 'fontSize', 'fontColor', 'outlineColor', 'outlineWidth', 'subtitlePosition', 'marginV', 'bold'];
  settingIds.forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('input', () => {
      const value = (el as HTMLInputElement | HTMLSelectElement).value;
      const numValue = ['fontSize', 'outlineWidth', 'marginV'].includes(id) ? Number(value) : value;
      StateActions.updateBurnSettings(state, { [id]: numValue } as Partial<BurnSettings>);
      updateBurnPreview(state);
    });
  });

  // Provider 選擇
  const providerGrid = document.getElementById('providerGrid');
  providerGrid?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.name === 'aiProvider') {
      StateActions.setProvider(state, target.value);
      updateProviderSelection(state);
      updateAiFields(state);
      HapticsService.selectionChanged();
    }
  });

  // AI 模型選擇
  const modelSelect = document.getElementById('aiModel') as HTMLSelectElement;
  modelSelect?.addEventListener('change', (e) => {
    state.selectedModel = (e.target as HTMLSelectElement).value;
  });

  // API Key 輸入
  const apiKeyInput = document.getElementById('aiApiKey') as HTMLInputElement;
  apiKeyInput?.addEventListener('blur', async () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      try {
        await AIService.saveApiKey(state.selectedProvider, key);
        StateActions.setApiKeys(state, { ...state.apiKeys, [state.selectedProvider]: true });
        updateAiFields(state);
        StateActions.showToast(state, 'success', 'API Key 已儲存');
        HapticsService.impact('light');
      } catch (error) {
        StateActions.showToast(state, 'error', `儲存失敗：${error}`);
      }
    }
  });

  // 產生預覽
  const sampleBtn = document.getElementById('btnGenerateSample');
  sampleBtn?.addEventListener('click', () => handleGenerateSample(state));

  // 燒錄完整影片
  const burnBtn = document.getElementById('btnBurnFull');
  burnBtn?.addEventListener('click', () => handleBurnFull(state));

  // 匯出校稻包
  const exportBtn = document.getElementById('btnExportPackage');
  exportBtn?.addEventListener('click', () => handleExportPackage(state));
}

function setupModalEvents(state: AppState): void {
  const overlay = document.getElementById('modalOverlay');
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      StateActions.hideModal(state);
      renderApp(state);
    }
  });

  const closeBtn = document.getElementById('modalClose');
  closeBtn?.addEventListener('click', () => {
    StateActions.hideModal(state);
    renderApp(state);
  });

  const footer = document.getElementById('modalFooter');
  footer?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-modal-action]');
    if (btn) {
      const actionLabel = btn.getAttribute('data-modal-action');
      const modal = state.modalStack[state.modalStack.length - 1];
      const action = modal?.actions?.find(a => a.label === actionLabel);
      if (action) {
        action.action();
        if (modal.closable !== false) {
          StateActions.hideModal(state);
          renderApp(state);
        }
      }
    }
  });
}

function setupToastEvents(state: AppState): void {
  const container = document.getElementById('toastContainer');
  container?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-toast-close]');
    if (btn) {
      const toastId = btn.getAttribute('data-toast-close');
      if (toastId) removeToast(toastId);
    }
  });
}

function setupKeyboardShortcuts(state: AppState): void {
  document.addEventListener('keydown', (e) => {
    // 輸入框聚焦時不處理快捷鍵
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
      return;
    }

    const video = document.getElementById('videoPlayer') as HTMLVideoElement;

    switch (e.key) {
      case ' ': // 空白鍵播放/暫停
        e.preventDefault();
        if (video) video.paused ? video.play() : video.pause();
        break;
      case 'ArrowLeft': // 左鍵快退
        if (e.altKey) {
          e.preventDefault();
          if (video) video.currentTime = Math.max(0, video.currentTime - 5);
        }
        break;
      case 'ArrowRight': // 右鍵快進
        if (e.altKey) {
          e.preventDefault();
          if (video) video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 5);
        }
        break;
      case 'ArrowUp': // 上鍵上一字幕
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (state.activeCueIndex > 0) {
            StateActions.setActiveCue(state, state.activeCueIndex - 1);
            updateActiveCueDisplay(state);
            if (video && state.cues[state.activeCueIndex]) {
              video.currentTime = state.cues[state.activeCueIndex].start;
            }
          }
        }
        break;
      case 'ArrowDown': // 下鍵下一字幕
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (state.activeCueIndex < state.cues.length - 1) {
            StateActions.setActiveCue(state, state.activeCueIndex + 1);
            updateActiveCueDisplay(state);
            if (video && state.cues[state.activeCueIndex]) {
              video.currentTime = state.cues[state.activeCueIndex].start;
            }
          }
        }
        break;
      case 's': // Ctrl+S 儲存專案
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleSaveProject(state);
        }
        break;
      case 'Escape': // ESC 關閉 Modal
        if (state.modalStack.length > 0) {
          StateActions.hideModal(state);
          renderApp(state);
        }
        break;
    }
  });
}

// ========== 事件處理函數 ==========

async function handleCueListClick(e: MouseEvent, state: AppState): Promise<void> {
  const target = e.target as HTMLElement;
  const cueEl = target.closest('.cue') as HTMLElement;
  if (!cueEl) return;

  const index = Number(cueEl.dataset.index);
  if (isNaN(index)) return;

  const action = target.dataset.action;
  const video = document.getElementById('videoPlayer') as HTMLVideoElement;

  switch (action) {
    case 'shorten':
      adjustCueDuration(state, index, -0.5);
      HapticsService.impact('light');
      break;
    case 'extend':
      adjustCueDuration(state, index, 0.5);
      HapticsService.impact('light');
      break;
    case 'jump':
      if (video && state.cues[index]) {
        video.currentTime = state.cues[index].start;
        video.play();
      }
      StateActions.setActiveCue(state, index);
      updateActiveCueDisplay(state);
      HapticsService.selectionChanged();
      break;
  }
}

function handleCueTextInput(e: Event, state: AppState): void {
  const target = e.target as HTMLTextAreaElement;
  const index = Number(target.dataset.cueIndex);
  if (isNaN(index)) return;

  const newText = target.value;
  StateActions.updateCueText(state, index, newText);
  updateStats(state);
  updateActiveCueDisplay(state);
  updateBurnPreview(state);
}

function handleCueDurationChange(e: Event, state: AppState): void {
  const target = e.target as HTMLInputElement;
  if (!target.classList.contains('duration-input')) return;

  const cueEl = target.closest('.cue') as HTMLElement;
  if (!cueEl) return;

  const index = Number(cueEl.dataset.index);
  const duration = Number(target.value);
  if (isNaN(index) || !Number.isFinite(duration)) return;

  const success = setCueDurationSafe(state, index, duration);
  if (success) {
    updateCueList(state);
    updateActiveCueDisplay(state);
    updateBurnPreview(state);
    HapticsService.impact('light');
  } else {
    // 恢復原值
    updateCueList(state);
  }
}

function setCueDurationSafe(state: AppState, index: number, duration: number): boolean {
  const cue = state.cues[index];
  if (!cue) return false;

  const minDuration = 0.1;
  const nextCue = state.cues[index + 1];
  let maxDuration = Infinity;

  if (nextCue) {
    maxDuration = Math.max(minDuration, nextCue.start - cue.start - 0.001);
  } else if (state.videoInfo?.duration) {
    maxDuration = Math.max(minDuration, state.videoInfo.duration - cue.start);
  }

  const clampedDuration = Math.min(Math.max(duration, minDuration), maxDuration);
  cue.end = cue.start + clampedDuration;
  cue.startRaw = formatSrtTime(cue.start);
  cue.endRaw = formatSrtTime(cue.end);
  state.changedCueIndices.add(index);

  if (state.project) {
    state.project.review.changedCueIndices = [...state.changedCueIndices];
  }

  return true;
}

function adjustCueDuration(state: AppState, index: number, delta: number): void {
  const cue = state.cues[index];
  if (!cue) return;

  const newDuration = Math.max(0.1, cue.end - cue.start + delta);
  setCueDurationSafe(state, index, newDuration);
  updateCueList(state);
  updateActiveCueDisplay(state);
  updateBurnPreview(state);
}

function adjustAllCueDurations(state: AppState, delta: number): void {
  state.cues.forEach((_, index) => {
    adjustCueDuration(state, index, delta);
  });
  StateActions.showToast(state, 'info', `已將全片每句字幕${delta > 0 ? '延長' : '縮短'} ${Math.abs(delta)} 秒`);
}

async function handleSaveSrt(state: AppState): Promise<void> {
  if (state.cues.length === 0) {
    StateActions.showToast(state, 'warning', '沒有字幕可儲存');
    return;
  }

  try {
    const srtContent = buildSrt(state.cues);
    const fileName = state.project?.video.name?.replace(/\.[^.]+$/, '') || 'subtitle';
    const uri = await FileService.writeText(`${await FileService.getAppDataDir()}/${fileName}.edited.srt`, srtContent);
    await ShareService.shareFile(uri, '匯出 SRT 字幕');
    StateActions.showToast(state, 'success', 'SRT 已匯出');
    HapticsService.impact('medium');
  } catch (error) {
    StateActions.showToast(state, 'error', `匯出失敗：${error}`);
  }
}

async function handleSaveProject(state: AppState): Promise<void> {
  if (!state.project && !state.videoUri) {
    StateActions.showToast(state, 'warning', '沒有可儲存的專案');
    return;
  }

  try {
    showLoading('儲存專案中...');

    const project: SubtitleProject = state.project || createEmptyProject();
    project.video.name = project.video.name || '未命名影片';
    project.video.uri = state.videoUri || '';
    project.video.duration = state.videoInfo?.duration || 0;
    project.video.width = state.videoInfo?.width || 0;
    project.video.height = state.videoInfo?.height || 0;
    project.subtitle.cues = state.cues;
    project.subtitle.originalText = state.cues.map(c => c.originalText).join('\n');
    project.burnSettings = state.burnSettings;
    project.review.changedCueIndices = [...state.changedCueIndices];
    project.review.currentCueIndex = state.activeCueIndex;
    project.review.searchQuery = state.searchQuery;
    project.review.stage = state.stage === 'burn' ? 'burn' : 'proofread';
    project.metadata.platform = (await nativeBridge.getDeviceInfo()).platform;
    project.metadata.appVersion = '1.0.0';
    project.metadata.whisperModel = 'small';

    await ProjectService.save(project);
    StateActions.setProject(state, project);
    StateActions.addRecentProject(state, {
      id: `project_${project.video.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
      name: project.video.name,
      videoName: project.video.name,
      videoDuration: project.video.duration,
      subtitleCueCount: project.subtitle.cues.length,
      lastOpened: project.updatedAt,
      projectUri: `project_${project.video.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
    });

    hideLoading();
    StateActions.showToast(state, 'success', '專案已儲存');
    HapticsService.impact('medium');
  } catch (error) {
    hideLoading();
    StateActions.showToast(state, 'error', `儲存失敗：${error}`);
  }
}

async function handleGenerateSample(state: AppState): Promise<void> {
  if (!state.videoUri || state.cues.length === 0) {
    StateActions.showToast(state, 'warning', '請先載入影片並完成字幕校稿');
    return;
  }

  try {
    showLoading('產生 20 秒預覽中...');
    HapticsService.impact('medium');

    const appDir = await FileService.getAppDataDir();
    const subtitlePath = `${appDir}/temp_sample.srt`;
    const outputPath = `${appDir}/sample_output.mp4`;

    // 寫入暫存字幕
    await FileService.writeText(subtitlePath, buildSrt(state.cues));

    // 產生預覽
    const result = await FFmpegService.generateSample({
      videoPath: state.videoUri,
      subtitlePath,
      outputPath,
      settings: state.burnSettings,
      startTime: 10,
      duration: 20,
    });

    hideLoading();
    await ShareService.shareFile(result.outputPath, '20 秒預覽影片');
    StateActions.showToast(state, 'success', '預覽影片已產生');
  } catch (error) {
    hideLoading();
    StateActions.showToast(state, 'error', `產生預覽失敗：${error}`);
  }
}

async function handleBurnFull(state: AppState): Promise<void> {
  if (!state.videoUri || state.cues.length === 0) {
    StateActions.showToast(state, 'warning', '請先載入影片並完成字幕校稿');
    return;
  }

  // 確認對話框
  showConfirmModal(state, '燒錄完整影片', '這將處理完整影片，可能需要數分鐘時間。確定要繼續嗎？', async () => {
    try {
      showLoading('燒錄字幕中...這可能需要幾分鐘...');
      HapticsService.impact('heavy');

      const appDir = await FileService.getAppDataDir();
      const subtitlePath = `${appDir}/temp_burn.srt`;
      const outputPath = `${appDir}/output_${Date.now()}.mp4`;

      await FileService.writeText(subtitlePath, buildSrt(state.cues));

      if (!state.videoUri) {
        throw new Error('影片 URI 不存在');
      }

      const result = await FFmpegService.burnSubtitles({
        videoPath: state.videoUri,
        subtitlePath,
        outputPath,
        settings: state.burnSettings,
      });

      hideLoading();
      await ShareService.shareFile(result.outputPath, '燒錄完成影片');
      StateActions.showToast(state, 'success', '完整影片燒錄完成');
    } catch (error) {
      hideLoading();
      StateActions.showToast(state, 'error', `燒錄失敗：${error}`);
    }
  });
}

async function handleExportPackage(state: AppState): Promise<void> {
  if (!state.project) {
    StateActions.showToast(state, 'warning', '請先儲存專案');
    return;
  }

  try {
    showLoading('準備匯出校稿包...');

    const appDir = await FileService.getAppDataDir();
    const packageDir = `${appDir}/export_${Date.now()}`;

    // 建立匯出目錄結構
    await FileService.writeText(`${packageDir}/media.edited.srt`, buildSrt(state.cues));

    const burnStyle = buildFfmpegStyle(state.burnSettings);
    await FileService.writeText(`${packageDir}/burn-settings.ffmpeg-style.txt`, burnStyle);

    const manifest = {
      savedAt: new Date().toISOString(),
      projectVersion: state.project.version,
      video: {
        name: state.project.video.name,
        duration: state.project.video.duration,
        originalUri: state.project.video.uri,
      },
      subtitle: {
        cueCount: state.cues.length,
        changedCount: state.changedCueIndices.size,
        editedSrtUri: 'media.edited.srt',
      },
      burnSettings: state.burnSettings,
      ffmpegStyle: burnStyle,
    };
    await FileService.writeText(`${packageDir}/export-manifest.json`, JSON.stringify(manifest, null, 2));

    // 建立 ZIP 或直接分享資料夾
    await ShareService.shareFile(packageDir, '校稿包');
    hideLoading();
    StateActions.showToast(state, 'success', '校稿包已匯出');
  } catch (error) {
    hideLoading();
    StateActions.showToast(state, 'error', `匯出失敗：${error}`);
  }
}

// ========== 歡迎頁/專案載入邏輯 ==========

export async function handleNewProject(state: AppState): Promise<void> {
  try {
    showLoading('選擇影片中...');
    const videoResult = await FileService.pickVideo();
    hideLoading();

    if (!videoResult) return;

    // 驗證影片
    const validation = validateVideoFile({ size: videoResult.size, name: videoResult.name } as File);
    if (!validation.valid) {
      StateActions.showToast(state, 'error', validation.error || '影片驗證失敗');
      return;
    }

    // 驗證長度
    const durationCheck = await FFmpegService.validateDuration(videoResult!.uri);
    if (!durationCheck.valid) {
      StateActions.showToast(state, 'error', durationCheck.error || '影片長度驗證失敗');
      return;
    }

    // 複製到應用沙盒
    const videoUri = await FileService.copyToSandbox(videoResult!.uri, `video_${Date.now()}.mp4`);

    // 詢問是否有既有字幕
    showConfirmModal(state, '載入字幕', '是否要載入既有的 SRT 字幕檔？', async () => {
      const srtResult = await FileService.pickSubtitle();
      if (srtResult) {
        const srtValidation = validateSubtitleFile({ size: srtResult.size, name: srtResult.name } as File);
        if (!srtValidation.valid) {
          StateActions.showToast(state, 'error', srtValidation.error || '字幕驗證失敗');
          return;
        }
        const srtText = await FileService.readText(srtResult.uri);
        const cues = parseSrt(srtText);
        initializeProject(state, videoUri, videoResult!, durationCheck.duration, cues, srtResult.name);
      } else {
        // 無既有字幕，進行語音轉錄
        initializeProject(state, videoUri, videoResult!, durationCheck.duration, [], '');
        await startTranscription(state, videoUri);
      }
    }, () => {
      // 直接進行語音轉錄
      initializeProject(state, videoUri, videoResult!, durationCheck.duration, [], '');
      startTranscription(state, videoUri);
    });

  } catch (error) {
    hideLoading();
    StateActions.showToast(state, 'error', `建立專案失敗：${error}`);
  }
}

export async function handleOpenProject(state: AppState): Promise<void> {
  // 顯示專案列表模態框
  const projects = await ProjectService.list();
  if (projects.length === 0) {
    StateActions.showToast(state, 'info', '沒有儲存的專案');
    return;
  }

  const content = projects.map(({ key, project }) => `
    <div class="project-item" data-key="${key}" style="padding:16px;border:1px solid var(--line);border-radius:var(--radius);margin-bottom:8px;cursor:pointer;">
      <strong>${project.video.name}</strong>
      <div style="color:var(--muted);font-size:13px;margin-top:4px;">
        ${Math.floor(project.video.duration/60)}:${String(Math.floor(project.video.duration%60)).padStart(2,'0')} · ${project.subtitle.cues.length} 句字幕 · ${new Date(project.updatedAt).toLocaleString()}
      </div>
    </div>
  `).join('');

  showModal(state, {
    id: 'project-list-modal',
    title: '開啟專案',
    content: `<div style="max-height:60vh;overflow:auto;">${content}</div>`,
    actions: [{ label: '取消', variant: 'secondary', action: () => StateActions.hideModal(state) }],
  });

  // 綁定點擊事件
  setTimeout(() => {
    document.querySelectorAll('.project-item').forEach(item => {
      const element = item as HTMLElement;
      element.addEventListener('click', async () => {
        const key = element.dataset.key!;
        StateActions.hideModal(state);
        await loadProject(state, key);
      });
    });
  }, 0);
}

async function loadProject(state: AppState, key: string): Promise<void> {
  try {
    showLoading('載入專案中...');
    const project = await ProjectService.load(key);
    hideLoading();

    if (!project) {
      StateActions.showToast(state, 'error', '專案載入失敗');
      return;
    }

    // 驗證影片檔案是否存在
    // 這裡簡化處理，實際需檢查檔案是否存在

    StateActions.setProject(state, project);
    StateActions.setStage(state, project.review.stage === 'burn' ? 'burn' : 'proofread');
    renderApp(state);
    StateActions.showToast(state, 'success', `已載入：${project.video.name}`);

    // 載入影片到播放器
    const video = document.getElementById('videoPlayer') as HTMLVideoElement;
    if (video && project.video.uri) {
      video.src = project.video.uri;
      video.load();
    }
  } catch (error) {
    hideLoading();
    StateActions.showToast(state, 'error', `載入失敗：${error}`);
  }
}

function initializeProject(
  state: AppState,
  videoUri: string,
  videoResult: FilePickerResult,
  duration: number,
  cues: SrtCue[],
  subtitleName: string
): void {
  const project = createEmptyProject();
  project.video.name = videoResult.name;
  project.video.size = videoResult.size;
  project.video.duration = duration;
  project.video.uri = videoUri;
  project.video.mimeType = videoResult.mimeType;
  project.subtitle.name = subtitleName || videoResult.name.replace(/\.[^.]+$/, '') + '.srt';
  project.subtitle.cues = cues;
  project.subtitle.originalText = cues.map(c => c.text).join('\n');

  StateActions.setProject(state, project);
  StateActions.setStage(state, cues.length > 0 ? 'proofread' : 'welcome');
  renderApp(state);

  // 載入影片
  const video = document.getElementById('videoPlayer') as HTMLVideoElement;
  if (video) {
    video.src = videoUri;
    video.load();
    setVideoLoaded(state, true);
  }
}

async function startTranscription(state: AppState, videoUri: string): Promise<void> {
  try {
    StateActions.setTranscriptionStatus(state, 'loading-model');
    showLoading('載入 Whisper Small 模型中...');

    // 載入模型 (固定 small)
    await TranscriptionService.loadModel('small');

    StateActions.setTranscriptionStatus(state, 'transcribing');
    showLoading('語音轉錄中...這可能需要幾分鐘...');

    // 訂閱進度
    unsubscribeTranscriptionProgress = TranscriptionService.onProgress((progress) => {
      StateActions.setTranscriptionProgress(state, progress);
      // 更新 UI 進度
      const msg = `轉錄中... ${progress.current}/${progress.total}`;
      const overlayMsg = document.getElementById('loadingMessage');
      if (overlayMsg) overlayMsg.textContent = msg;
    });

    const result = await TranscriptionService.transcribe(videoUri, 'zh');

    if (unsubscribeTranscriptionProgress) {
      unsubscribeTranscriptionProgress();
      unsubscribeTranscriptionProgress = null;
    }

    hideLoading();
    StateActions.setTranscriptionResult(state, result);
    StateActions.setStage(state, 'proofread');
    renderApp(state);
    StateActions.showToast(state, 'success', `轉錄完成：${result.segments.length} 句字幕`);
    HapticsService.impact('heavy');

  } catch (error) {
    if (unsubscribeTranscriptionProgress) {
      unsubscribeTranscriptionProgress();
      unsubscribeTranscriptionProgress = null;
    }
    hideLoading();
    StateActions.setTranscriptionError(state, String(error));
    StateActions.showToast(state, 'error', `轉錄失敗：${error}`);
  }
}

// ========== 輔助函數 ==========

function showConfirmModal(
  state: AppState,
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void {
  StateActions.showModal(state, {
    id: `confirm-${Date.now()}`,
    title,
    content: `<p style="margin-bottom:16px;">${message}</p>`,
    actions: [
      { label: '取消', variant: 'secondary', action: () => { onCancel?.(); StateActions.hideModal(state); } },
      { label: '確定', variant: 'primary', action: () => { onConfirm(); StateActions.hideModal(state); } },
    ],
  });
  renderApp(state);
}

async function handleVideoFileSelect(state: AppState, file: File): Promise<void> {
  try {
    // 驗證影片
    const validation = validateVideoFile({ size: file.size, name: file.name } as File);
    if (!validation.valid) {
      StateActions.showToast(state, 'error', validation.error || '影片驗證失敗');
      return;
    }

    // 建立物件 URL 用於預覽
    const previewUri = URL.createObjectURL(file);

    // 驗證長度 (mock 模式下固定返回 120 秒)
    const durationCheck = await FFmpegService.validateDuration(previewUri);
    if (!durationCheck.valid) {
      StateActions.showToast(state, 'error', durationCheck.error || '影片長度驗證失敗');
      return;
    }

    // 複製到應用沙盒
    const videoUri = await FileService.copyToSandbox(URL.createObjectURL(file), `video_${Date.now()}.mp4`);

    // 詢問是否有既有字幕
    showConfirmModal(state, '載入字幕', '是否要載入既有的 SRT 字幕檔？', async () => {
      const srtFileInput = document.getElementById('srtFileInput') as HTMLInputElement;
      srtFileInput?.click();
    }, () => {
      // 無既有字幕，進行語音轉錄
      initializeProject(state, videoUri, { name: file.name, size: file.size, uri: videoUri, mimeType: file.type }, durationCheck.duration, [], '');
      startTranscription(state, videoUri);
    });

  } catch (error) {
    StateActions.showToast(state, 'error', `載入影片失敗：${error}`);
  }
}

async function handleSrtFileSelect(state: AppState, file: File): Promise<void> {
  try {
    const validation = validateSubtitleFile({ size: file.size, name: file.name } as File);
    if (!validation.valid) {
      StateActions.showToast(state, 'error', validation.error || '字幕驗證失敗');
      return;
    }
    const srtText = await file.text();
    const cues = parseSrt(srtText);
    initializeProject(state, state.videoUri || '', { name: file.name, size: file.size, uri: '', mimeType: file.type }, state.videoInfo?.duration || 0, cues, file.name);
  } catch (error) {
    StateActions.showToast(state, 'error', `載入字幕失敗：${error}`);
  }
}

async function saveCurrentProject(state: AppState): Promise<void> {
  if (state.project) {
    await handleSaveProject(state);
  }
}