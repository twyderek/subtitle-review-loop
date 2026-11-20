// 主應用程式進入點
import './styles.css';
import { NativeBridge } from './native-bridge.js';
import { AppState, createAppState } from './state.js';
import { renderApp } from './ui/render.js';
import { setupEventListeners } from './ui/events.js';
import { initializeServices } from './services/index.js';

// 全域狀態
let appState: AppState;
let nativeBridge: NativeBridge;

async function bootstrap() {
  try {
    // 初始化原生橋接
    nativeBridge = new NativeBridge();
    await nativeBridge.initialize();

    // 初始化服務 (儲存、偏好設定等)
    await initializeServices(nativeBridge);

    // 建立應用狀態
    appState = createAppState(nativeBridge);

    // 掛載 UI
    renderApp(appState);

    // 綁定事件
    setupEventListeners(appState, nativeBridge);

    // 標記載入完成
    document.body.classList.add('app-ready');

    console.log('[App] Bootstrap complete');
  } catch (error) {
    console.error('[App] Bootstrap failed:', error);
    showFatalError(error instanceof Error ? error.message : '應用程式啟動失敗');
  }
}

function showFatalError(message: string) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div class="fatal-error">
        <h2>啟動失敗</h2>
        <p>${escapeHtml(message)}</p>
        <button onclick="location.reload()">重試</button>
      </div>
    `;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}

// 啟動應用
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// 開發模式下暴露給 console 除錯
if (import.meta.env.DEV) {
  (window as any).__APP_STATE__ = () => appState;
  (window as any).__NATIVE_BRIDGE__ = () => nativeBridge;
}