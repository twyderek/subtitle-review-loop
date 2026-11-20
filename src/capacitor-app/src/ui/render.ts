// UI 渲染模組
import { AppState, Stage, ModalConfig, ToastMessage } from '../state.js';
import { APP_CONFIG, ProviderConfig } from '../core/config.js';
import { SrtCue } from '../core/srt-parser.js';
import { formatClock, formatDuration, escapeHtml } from '../core/srt-parser.js';
import { FONT_FAMILIES, PRESET_POSITIONS } from '../core/burn-settings.js';

// 渲染主 App
export function renderApp(state: AppState): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="app">
      ${renderHeader(state)}
      <main class="workspace" id="workspace">
        ${renderViewer(state)}
        ${renderEditor(state)}
      </main>
      ${renderToastContainer()}
      ${renderModals(state)}
      ${renderLoadingOverlay()}
    </div>
  `;
}

function renderHeader(state: AppState): string {
  const stageLabels: Record<Stage, string> = {
    welcome: '歡迎',
    proofread: '階段 1：字幕校稿',
    burn: '階段 2：燒錄預覽',
    settings: '設定',
    'project-list': '專案列表',
  };

  return `
    <header class="header">
      <div class="header-title">
        <strong>字幕校對工具</strong>
        <span>短影音專用 · Whisper Small · 離線優先</span>
      </div>
      <div class="header-actions">
        ${state.stage !== 'welcome' && state.stage !== 'settings' && state.stage !== 'project-list' ? `
          <div class="stage-tabs" id="stageTabs">
            <button class="tab-btn ${state.stage === 'proofread' ? 'active' : ''}" data-stage="proofread">校稿</button>
            <button class="tab-btn ${state.stage === 'burn' ? 'active' : ''}" data-stage="burn">燒錄</button>
          </div>
        ` : ''}
        <div class="status" id="statusText">就緒</div>
        ${state.stage !== 'welcome' ? `
          <button class="btn ghost" id="backBtn" aria-label="返回">← 返回</button>
        ` : ''}
      </div>
    </header>
  `;
}

function renderViewer(state: AppState): string {
  const hasVideo = !!state.videoUri;
  const currentCue = state.cues[state.activeCueIndex];

  return `
    <section class="viewer">
      <div class="video-shell" id="videoShell">
        ${hasVideo ? `
          <video id="videoPlayer" playsinline webkit-playsinline></video>
          <div class="burn-overlay" id="burnOverlay">
            <div class="burn-caption" id="burnCaption">${escapeHtml(currentCue?.text || '字幕燒錄樣式預覽')}</div>
          </div>
        ` : `
          <div class="empty-state" id="emptyVideo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="2" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M8 5l8 4-8 4V5z"></path>
            </svg>
            <h3>尚未載入影片</h3>
            <p>點選上方按鈕選擇影片檔案</p>
          </div>
        `}
      </div>

      <div class="player-controls" id="playerControls" style="${hasVideo ? '' : 'display:none'}">
        <button class="btn" id="btnBack10" aria-label="快退 10 秒">⏪ -10s</button>
        <button class="btn primary" id="btnPlayPause" aria-label="播放/暫停">▶ 播放</button>
        <button class="btn" id="btnForward10" aria-label="快進 10 秒">+10s ⏩</button>
        <button class="btn" id="btnLoopCue" aria-label="循環當前字幕">🔁 循環</button>
      </div>

      <div class="stage-tabs" id="editorStageTabs">
        <button class="tab-btn ${state.stage === 'proofread' ? 'active' : ''}" data-stage="proofread">階段 1：字幕校稿</button>
        <button class="tab-btn ${state.stage === 'burn' ? 'active' : ''}" data-stage="burn">階段 2：燒錄預覽</button>
      </div>

      <div class="cue-preview">
        <header>
          <span id="currentMeta">${currentCue ? `#${currentCue.id} ${currentCue.startRaw} → ${currentCue.endRaw}` : '尚未選取字幕'}</span>
          <span id="currentRuleState" class="${currentCue && hasRuleWarning(currentCue.text) ? 'warn' : ''}">
            ${currentCue ? (hasRuleWarning(currentCue.text) ? '⚠ 待檢查' : '✓ 已校稿') : '等待載入'}
          </span>
        </header>
        <div class="current-text" id="currentText">${escapeHtml(currentCue?.text || '請載入影片與字幕')}</div>
      </div>
    </section>
  `;
}

function renderEditor(state: AppState): string {
  const filteredCues = state.searchQuery
    ? state.cues.filter((cue, i) => cue.text.toLowerCase().includes(state.searchQuery.toLowerCase()))
    : state.cues;

  return `
    <section class="editor">
      <div class="editor-head">
        <div class="metric"><span>字幕數</span><strong id="cueCount">${state.cues.length}</strong></div>
        <div class="metric"><span>已修改</span><strong id="changedCount">${state.changedCueIndices.size}</strong></div>
        <div class="metric"><span>待檢查</span><strong id="warningCount">${state.cues.filter(c => hasRuleWarning(c.text)).length}</strong></div>
        <div class="metric"><span>目前時間</span><strong id="clock">${formatClock(state.videoInfo?.duration ? 0 : 0)}</strong></div>
      </div>

      <div class="stage">
        ${renderProofreadPanel(state, filteredCues)}
        ${renderBurnPanel(state)}
      </div>
    </section>
  `;
}

function renderProofreadPanel(state: AppState, filteredCues: SrtCue[]): string {
  return `
    <section class="stage-panel ${state.stage === 'proofread' ? 'active' : ''}" id="proofreadPanel">
      <div class="tool-row">
        <input type="search" class="search-input" id="searchInput" placeholder="搜尋字幕文字..." value="${escapeHtml(state.searchQuery)}" aria-label="搜尋字幕">
        <div class="time-tools">
          <label for="timeAdjustSeconds">每句秒數</label>
          <input type="number" id="timeAdjustSeconds" min="0.1" max="10" step="0.1" value="0.5" aria-label="調整秒數">
          <button class="btn" id="btnShortenAll" aria-label="全片每句縮短">全片 -</button>
          <button class="btn" id="btnExtendAll" aria-label="全片每句延長">全片 +</button>
        </div>
        <button class="btn primary" id="btnSaveSrt">另存 SRT</button>
        <button class="btn success" id="btnSaveProject">儲存專案</button>
      </div>
      <div class="cue-list" id="cueList">
        ${filteredCues.length === 0 ? `
          <div class="empty-state" style="padding: 40px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <line x1="10" y1="9" x2="8" y2="9"></line>
            </svg>
            <h3>${state.cues.length === 0 ? '尚無字幕' : '搜尋無結果'}</h3>
            <p>${state.cues.length === 0 ? '請先載入影片並進行語音轉錄' : '嘗試其他關鍵字'}</p>
          </div>
        ` : filteredCues.map((cue, displayIndex) => renderCueItem(cue, displayIndex, state)).join('')}
      </div>
    </section>
  `;
}

function renderCueItem(cue: SrtCue, displayIndex: number, state: AppState): string {
  const isActive = state.activeCueIndex === state.cues.indexOf(cue);
  const isChanged = state.changedCueIndices.has(state.cues.indexOf(cue));
  const hasWarning = hasRuleWarning(cue.text);
  const originalIndex = state.cues.indexOf(cue);

  return `
    <article class="cue ${isActive ? 'active' : ''} ${isChanged ? 'changed' : ''}" data-index="${originalIndex}">
      <div class="cue-meta">
        <div class="cue-number">#${cue.id}</div>
        <div class="cue-time">${cue.startRaw}<br>${cue.endRaw}</div>
        <div class="cue-duration">
          <label>長度 (秒)</label>
          <input type="number" class="duration-input" min="0.1" step="0.1" value="${formatDuration(cue.end - cue.start)}" aria-label="字幕 ${cue.id} 長度">
        </div>
        <div class="cue-time-btns">
          <button class="btn" data-action="shorten" aria-label="縮短">−</button>
          <button class="btn" data-action="extend" aria-label="延長">+</button>
        </div>
        <button class="btn" data-action="jump" aria-label="跳轉到此字幕">跳轉</button>
        <span class="cue-status ${hasWarning ? 'warn' : ''}">${hasWarning ? '⚠ 待檢查' : '✓ OK'}</span>
      </div>
      <textarea aria-label="字幕 ${cue.id}" data-cue-index="${originalIndex}">${escapeHtml(cue.text)}</textarea>
    </article>
  `;
}

function renderBurnPanel(state: AppState): string {
  const s = state.burnSettings;

  return `
    <section class="stage-panel settings-panel ${state.stage === 'burn' ? 'active' : ''}" id="burnPanel">
      <div class="panel-head">
        <span>燒錄字幕樣式設定</span>
        <span>即時預覽僅用於確認視覺位置；正式輸出由原生 FFmpeg 產生</span>
      </div>
      <div class="settings-grid">
        <div class="field">
          <label for="fontFamily">字型</label>
          <select id="fontFamily">${FONT_FAMILIES.map(f => `<option ${s.fontFamily === f ? 'selected' : ''}>${f}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label for="fontSize">字體大小</label>
          <input type="number" id="fontSize" min="8" max="96" value="${s.fontSize}">
        </div>
        <div class="field">
          <label for="fontColor">文字顏色</label>
          <input type="color" id="fontColor" value="${s.fontColor}">
        </div>
        <div class="field">
          <label for="outlineColor">外框顏色</label>
          <input type="color" id="outlineColor" value="${s.outlineColor}">
        </div>
        <div class="field">
          <label for="outlineWidth">外框粗細</label>
          <input type="number" id="outlineWidth" min="0" max="8" step="0.5" value="${s.outlineWidth}">
        </div>
        <div class="field">
          <label for="subtitlePosition">字幕位置</label>
          <select id="subtitlePosition">
            ${Object.entries(PRESET_POSITIONS).map(([k, v]) => `<option value="${k}" ${s.position === k ? 'selected' : ''}>${v.label}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="marginV">垂直邊距</label>
          <input type="number" id="marginV" min="0" max="300" value="${s.marginV}">
        </div>
        <div class="field">
          <label for="bold">粗體</label>
          <select id="bold">
            <option value="true" ${s.bold ? 'selected' : ''}>啟用</option>
            <option value="false" ${!s.bold ? 'selected' : ''}>停用</option>
          </select>
        </div>

        <div class="field full setting-section">
          <div class="setting-section-title">AI 文字優化 (可選)</div>
          <div class="provider-grid" id="providerGrid">
            ${APP_CONFIG.SUPPORTED_PROVIDERS.map(providerId => {
              const pc = APP_CONFIG.PROVIDER_CONFIG[providerId];
              const isSelected = state.selectedProvider === providerId;
              return `
                <label class="provider-card ${isSelected ? 'selected' : ''}">
                  <input type="radio" name="aiProvider" value="${providerId}" ${isSelected ? 'checked' : ''}>
                  <div class="provider-icon">${getProviderIcon(providerId)}</div>
                  <div class="provider-name">${pc.name}</div>
                  <div class="provider-desc">${pc.capabilities.vision ? '支援視覺' : '純文字'}</div>
                </label>
              `;
            }).join('')}
          </div>
          <div class="field" style="margin-top: 12px;">
            <label for="aiModel">模型</label>
            <select id="aiModel" ${!state.apiKeys[state.selectedProvider] ? 'disabled' : ''}>
              ${(APP_CONFIG.PROVIDER_CONFIG as Record<string, ProviderConfig>)[state.selectedProvider]?.defaultModels?.map((m: string) => `<option value="${m}">${m}</option>`).join('') || ''}
            </select>
          </div>
          <div class="field full" style="margin-top: 8px;">
            <label for="aiApiKey">API Key</label>
            <input type="password" id="aiApiKey" placeholder="${state.apiKeys[state.selectedProvider] ? '已設定 (點擊更新)' : '輸入 API Key'}" autocomplete="off">
            <p class="hint">API Key 僅儲存在本地安全存儲，不會上傳。</p>
          </div>
        </div>

        <div class="field full setting-section">
          <div class="setting-section-title">匯出操作</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <button class="btn primary" id="btnGenerateSample">產生 20 秒預覽</button>
            <button class="btn success" id="btnBurnFull">燒錄完整影片</button>
            <button class="btn" id="btnExportPackage">匯出校稿包</button>
          </div>
        </div>

        <div class="field full">
          <label>建議 FFmpeg 指令</label>
          <div class="command-box" id="commandBox"></div>
        </div>
      </div>
    </section>
  `;
}

function getProviderIcon(providerId: string): string {
  const icons: Record<string, string> = {
    openai: '🤖',
    gemini: '✨',
    nvidia: '🟢',
  };
  return icons[providerId] || '🔧';
}

function hasRuleWarning(text: string): boolean {
  return /(呃|啊|嗯|那個|就是|然後|這個|你知道吧|對吧)/.test(text) ||
    /[，。、：；「」『』（）()［］\[\]《》〈〉“”"']/.test(text) ||
    /\b(whisper|openai|api|ai|moodle|token|default|lms|evercam|kmplus)\b/i.test(text);
}

function renderToastContainer(): string {
  return `<div class="toast-container" id="toastContainer"></div>`;
}

function renderModals(state: AppState): string {
  if (state.modalStack.length === 0) return '';
  const modal = state.modalStack[state.modalStack.length - 1];
  return `
    <div class="modal-overlay" id="modalOverlay" data-modal-id="${modal.id}">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <header class="modal-header">
          <h3 class="modal-title" id="modalTitle">${escapeHtml(modal.title)}</h3>
          ${modal.closable !== false ? '<button class="modal-close" id="modalClose" aria-label="關閉">&times;</button>' : ''}
        </header>
        <div class="modal-body" id="modalBody">${typeof modal.content === 'string' ? modal.content : ''}</div>
        <footer class="modal-footer" id="modalFooter">
          ${modal.actions?.map(a => `<button class="btn ${a.variant || 'secondary'}" data-modal-action="${a.label}">${a.label}</button>`).join('') || ''}
        </footer>
      </div>
    </div>
  `;
}

function renderLoadingOverlay(): string {
  return `
    <div class="loading-overlay" id="loadingOverlay" style="display:none;">
      <div class="spinner"></div>
      <p id="loadingMessage">處理中...</p>
    </div>
  `;
}

// 動態更新函數
export function updateCueList(state: AppState): void {
  const container = document.getElementById('cueList');
  if (!container) return;

  const filteredCues = state.searchQuery
    ? state.cues.filter(cue => cue.text.toLowerCase().includes(state.searchQuery.toLowerCase()))
    : state.cues;

  container.innerHTML = filteredCues.length === 0 ? `
    <div class="empty-state" style="padding: 40px;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <line x1="10" y1="9" x2="8" y2="9"></line>
      </svg>
      <h3>${state.cues.length === 0 ? '尚無字幕' : '搜尋無結果'}</h3>
      <p>${state.cues.length === 0 ? '請先載入影片並進行語音轉錄' : '嘗試其他關鍵字'}</p>
    </div>
  ` : filteredCues.map((cue, displayIndex) => renderCueItem(cue, displayIndex, state)).join('');

  // 更新統計
  updateStats(state);
}

export function updateStats(state: AppState): void {
  const cueCount = document.getElementById('cueCount');
  const changedCount = document.getElementById('changedCount');
  const warningCount = document.getElementById('warningCount');
  if (cueCount) cueCount.textContent = String(state.cues.length);
  if (changedCount) changedCount.textContent = String(state.changedCueIndices.size);
  if (warningCount) warningCount.textContent = String(state.cues.filter(c => hasRuleWarning(c.text)).length);
}

export function updateActiveCueDisplay(state: AppState): void {
  const currentText = document.getElementById('currentText');
  const currentMeta = document.getElementById('currentMeta');
  const currentRuleState = document.getElementById('currentRuleState');
  const burnCaption = document.getElementById('burnCaption');

  const cue = state.cues[state.activeCueIndex];
  if (cue) {
    if (currentText) currentText.textContent = cue.text || ' ';
    if (currentMeta) currentMeta.textContent = `#${cue.id} ${cue.startRaw} → ${cue.endRaw}`;
    const warning = hasRuleWarning(cue.text);
    if (currentRuleState) {
      currentRuleState.textContent = warning ? '⚠ 待檢查' : '✓ 已校稿';
      currentRuleState.className = warning ? 'warn' : '';
    }
  } else {
    if (currentText) currentText.textContent = '目前沒有對應字幕';
    if (currentMeta) currentMeta.textContent = '尚未選取字幕';
    if (currentRuleState) {
      currentRuleState.textContent = '等待播放';
      currentRuleState.className = '';
    }
  }

  if (burnCaption) {
    burnCaption.textContent = cue?.text || '字幕燒錄樣式預覽';
  }

  // 更新燒錄預覽樣式
  updateBurnPreview(state);
}

export function updateBurnPreview(state: AppState): void {
  const s = state.burnSettings;
  const burnCaption = document.getElementById('burnCaption');
  const burnOverlay = document.getElementById('burnOverlay');

  if (burnCaption) {
    burnCaption.style.fontFamily = `"${s.fontFamily}", sans-serif`;
    burnCaption.style.fontSize = `${s.fontSize}px`;
    burnCaption.style.fontWeight = s.bold ? '700' : '400';
    burnCaption.style.color = s.fontColor;
    burnCaption.style.webkitTextStroke = `${s.outlineWidth}px ${s.outlineColor}`;
  }

  if (burnOverlay) {
    if (s.position === 'top') {
      burnOverlay.style.top = `${s.marginV}px`;
      burnOverlay.style.bottom = '';
      burnOverlay.style.alignItems = 'flex-start';
      burnOverlay.style.height = '';
    } else if (s.position === 'middle') {
      burnOverlay.style.top = '0';
      burnOverlay.style.bottom = '0';
      burnOverlay.style.alignItems = 'center';
      burnOverlay.style.height = '100%';
    } else {
      burnOverlay.style.top = '';
      burnOverlay.style.bottom = `${s.marginV}px`;
      burnOverlay.style.alignItems = 'flex-end';
      burnOverlay.style.height = '';
    }
  }

  // 更新命令框
  updateCommandBox(state);
}

function updateCommandBox(state: AppState): void {
  const commandBox = document.getElementById('commandBox');
  if (!commandBox) return;

  import('../core/burn-settings.js').then(({ buildFfmpegStyle }) => {
    const style = buildFfmpegStyle(state.burnSettings);

    commandBox.textContent = [
      `# 產生 20 秒預覽`,
      `ffmpeg -y -ss 10 -t 20 -i input.mp4 -vf "subtitles='input.srt':force_style='${style}'" -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k output_sample.mp4`,
      ``,
      `# 燒錄完整影片`,
      `ffmpeg -y -i input.mp4 -vf "subtitles='input.srt':force_style='${style}'" -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k output.mp4`,
    ].join('\n');
  });
}

// Toast 顯示
export function showToast(state: AppState, toast: ToastMessage): void {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast ${toast.type}`;
  el.innerHTML = `
    <span>${escapeHtml(toast.message)}</span>
    <button class="btn ghost" style="min-height:28px;padding:0 8px;font-size:12px;" data-toast-close="${toast.id}">關閉</button>
  `;
  container.appendChild(el);

  if (toast.duration && toast.duration > 0) {
    setTimeout(() => el.remove(), toast.duration);
  }
}

export function removeToast(toastId: string): void {
  const el = document.querySelector(`[data-toast-close="${toastId}"]`)?.parentElement;
  el?.remove();
}

// Modal 顯示
export function showModal(state: AppState, modal: ModalConfig): void {
  renderApp(state); // 重新渲染會包含 modal
}

export function hideModal(state: AppState, modalId?: string): void {
  renderApp(state);
}

// Loading overlay
export function showLoading(message: string): void {
  const overlay = document.getElementById('loadingOverlay');
  const messageEl = document.getElementById('loadingMessage');
  if (overlay && messageEl) {
    messageEl.textContent = message;
    overlay.style.display = 'flex';
  }
}

export function hideLoading(): void {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

// 更新狀態文字
export function setStatusText(text: string): void {
  const el = document.getElementById('statusText');
  if (el) el.textContent = text;
}

// 更新時鐘
export function updateClock(seconds: number): void {
  const el = document.getElementById('clock');
  if (el) el.textContent = formatClock(seconds);
}

// 更新影片載入狀態
export function setVideoLoaded(state: AppState, loaded: boolean): void {
  const videoShell = document.getElementById('videoShell');
  const playerControls = document.getElementById('playerControls');
  const emptyVideo = document.getElementById('emptyVideo');

  if (videoShell && loaded && state.videoUri) {
    // 將在事件處理中設定 video src
  }
  if (playerControls) playerControls.style.display = loaded ? 'grid' : 'none';
  if (emptyVideo) emptyVideo.style.display = loaded ? 'none' : 'flex';
}

// Provider 卡片選中狀態
export function updateProviderSelection(state: AppState): void {
  document.querySelectorAll('.provider-card').forEach(card => {
    const input = card.querySelector('input[type="radio"]') as HTMLInputElement;
    if (input) {
      card.classList.toggle('selected', input.checked);
    }
  });
}

// 更新 AI 設定欄位狀態
export function updateAiFields(state: AppState): void {
  const modelSelect = document.getElementById('aiModel') as HTMLSelectElement;
  const apiKeyInput = document.getElementById('aiApiKey') as HTMLInputElement;

  if (modelSelect) {
    const providerConfig = (APP_CONFIG.PROVIDER_CONFIG as Record<string, ProviderConfig>)[state.selectedProvider];
    const currentValue = modelSelect.value;
    modelSelect.innerHTML = providerConfig.defaultModels.map((m: string) => `<option value="${m}" ${m === currentValue ? 'selected' : ''}>${m}</option>`).join('');
    modelSelect.disabled = !state.apiKeys[state.selectedProvider];
  }

  if (apiKeyInput) {
    apiKeyInput.placeholder = state.apiKeys[state.selectedProvider] ? '已設定 (點擊更新)' : '輸入 API Key';
    apiKeyInput.value = '';
  }
}