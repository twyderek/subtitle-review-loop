# 字幕校對工具 - 原生 App 版本 (iOS / Android)

> **短影音專用 · 完全離線 · Whisper Small 模型 · 三大 AI Provider**

---

## 🎯 專案定位

| 項目 | 規範 |
|------|------|
| **目標平台** | iOS (iPad/iPhone) + Android |
| **影片長度** | **硬性限制 30 分鐘** (1800 秒) |
| **ASR 引擎** | **僅 Whisper.cpp** (移除 Breeze) |
| **Whisper 模型** | **固定 Small** (內建 ggml-small.bin) |
| **AI Provider** | **僅三家**：OpenAI (ChatGPT) + Google Gemini + Nvidia NIM |
| **架構** | Capacitor + 原生插件 (Whisper.cpp / FFmpegKit) |
| **離線優先** | 核心功能完全本地執行 |

---

## 📁 專案結構

```
subtitle-review-loop/
├── src/
│   ├── capacitor-app/              # Capacitor 原生 App 專案
│   │   ├── src/
│   │   │   ├── core/               # 共用核心邏輯 (TS)
│   │   │   │   ├── config.ts       # 常數與驗證 (30min限制、3 providers)
│   │   │   │   ├── srt-parser.ts   # SRT 解析/建構
│   │   │   │   ├── term-rules.ts   # 字幕清理規則
│   │   │   │   ├── burn-settings.ts # 燒錄設定/FFmpeg 樣式
│   │   │   │   └── project-schema.ts # 專案資料結構
│   │   │   ├── ui/
│   │   │   │   ├── render.ts       # UI 渲染 (觸控優化)
│   │   │   │   └── events.ts       # 事件處理
│   │   │   ├── services/           # 服務層 (原生橋接封裝)
│   │   │   ├── native-bridge.ts    # Capacitor 插件介面
│   │   │   ├── state.ts            # 應用狀態管理
│   │   │   ├── main.ts             # 進入點
│   │   │   ├── styles.css          # 樣式 (Mobile First)
│   │   │   └── index.html
│   │   ├── plugins/
│   │   │   ├── whisper/            # Whisper 原生插件
│   │   │   │   ├── ios/WhisperPlugin.swift
│   │   │   │   └── android/WhisperPlugin.kt + JNI
│   │   │   └── ffmpeg/             # FFmpegKit 橋接
│   │   ├── scripts/
│   │   │   ├── build-all.mjs       # 統一建置腳本
│   │   │   ├── build-whisper-ios.sh
│   │   │   └── build-whisper-android.sh
│   │   ├── capacitor.config.ts
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── subtitle-editor.html        # 原 Web 版 (保留參考)
├── .github/workflows/
│   └── build-native-app.yml        # CI/CD (iOS + Android)
└── package.json                    # 根專案 (原有工具)
```

---

## 🚀 快速開始

### 前置需求

- **Node.js** >= 20
- **iOS 建置**: macOS + Xcode 15+ + CocoaPods
- **Android 建置**: JDK 17 + Android SDK + NDK r26d
- **Whisper.cpp**: 需編譯原生庫 (見下方)

### 安裝與建置

```bash
# 1. 進入 Capacitor 專案
cd src/capacitor-app

# 2. 安裝依賴
npm ci

# 3. 編譯 Whisper 原生庫 (需先完成，見下方)
# iOS (僅 macOS):
npm run whisper:build:ios

# Android (需 NDK):
npm run whisper:build:android

# 4. 建置前端 + Capacitor Sync
npm run build
npx cap sync

# 5. 開啟原生 IDE 進行建置/測試
# iOS:
npm run cap:open:ios
# Android:
npm run cap:open:android
```

---

## 🔨 Whisper.cpp 原生庫編譯 (關鍵步驟)

### iOS (macOS)

```bash
cd src/capacitor-app
chmod +x scripts/build-whisper-ios.sh
./scripts/build-whisper-ios.sh
```

**輸出**: `ios/App/Plugins/Whisper/Frameworks/libwhisper.a` + headers

**需求**:
- Xcode Command Line Tools
- CMake 3.18+
- git submodule: `git submodule add https://github.com/ggerganov/whisper.cpp.git ../../whisper.cpp`

### Android (Linux/macOS/Windows)

```bash
cd src/capacitor-app

# 設定 NDK 路徑
export ANDROID_NDK_HOME=~/Library/Android/sdk/ndk/26.x.x  # 或您的 NDK 路徑

chmod +x scripts/build-whisper-android.sh
./scripts/build-whisper-android.sh
```

**輸出**: `android/app/src/main/jniLibs/{arm64-v8a,armeabi-v7a,x86_64,x86}/libwhisper.so`

**需求**:
- Android NDK r26d
- CMake 3.18+ (Android SDK 自帶)
- git submodule: 同上

---

## 📱 核心功能流程

```
┌─────────────────────────────────────────────────────────────┐
│ 歡迎頁                                                         │
│ ├── 新建專案 → 選擇影片 (驗證 ≤30min)                         │
│ │   ├── 有字幕? → 載入 SRT → 進入校稿階段                     │
│ │   └── 無字幕? → Whisper Small 離線轉錄 → 進入校稿階段       │
│ └── 開啟專案 → 從本地儲存載入                                   │
├─────────────────────────────────────────────────────────────┤
│ 階段 1：字幕校稿                                              │
│ ├── 影片播放 + 字幕列表同步                                    │
│ ├── 搜尋/過濾字幕                                              │
│ ├── 單句/全片 時間微調                                        │
│ ├── 文字編輯 (即時標記變更)                                   │
│ ├── 內建規則檢查 (口語助詞、全形標點、術語標準化)             │
│ ├── 一鍵套用清理規則                                          │
│ └── 另存 SRT / 儲存專案                                       │
├─────────────────────────────────────────────────────────────┤
│ 階段 2：燒錄預覽                                              │
│ ├── 字型/大小/顏色/外框/位置/粗體 即時預覽                    │
│ ├── AI 文字優化 (OpenAI/Gemini/Nvidia - 可選)                │
│ ├── 產生 20 秒預覽影片                                        │
│ ├── 燒錄完整影片 (原生 FFmpegKit)                             │
│ └── 匯出校稿包 (SRT + 設定 + FFmpeg 指令 + Manifest)         │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ 關鍵設定常數

```typescript
// src/capacitor-app/src/core/config.ts

export const APP_CONFIG = {
  // 30 分鐘硬性限制 (前端+原生雙重驗證)
  MAX_VIDEO_DURATION_SECONDS: 1800,
  MAX_FILE_SIZE_MB: 500,

  // 僅 Whisper，固定 Small
  ASR_ENGINE: 'whisper-cpp',
  WHISPER_MODEL: 'small',  // 內建 ggml-small.bin (466 MB)

  // 僅三家 AI Provider
  SUPPORTED_PROVIDERS: ['openai', 'gemini', 'nvidia'],

  PROVIDER_CONFIG: {
    openai: { baseUrl: 'https://api.openai.com/v1', ... },
    gemini: { baseUrl: 'https://generativelanguage.googleapis.com', ... },
    nvidia: { baseUrl: 'https://integrate.api.nvidia.com/v1', customBaseUrl: true, ... },
  },
};
```

---

## 🏗️ CI/CD 自動建置

`.github/workflows/build-native-app.yml` 提供完整自動化：

| 觸發條件 | 動作 |
|---------|------|
| Push to main/native-app-short-video | 建置前端 + Android AAB/APK |
| Push tag `v*` | 額外建置 iOS IPA + 建立 GitHub Release |
| 手動觸發 | 可選擇平台 (all/ios/android) |

**建置產物**:
- Android: `app-release.aab` (Play Store) + `app-release.apk` (測試)
- iOS: `App.ipa` (TestFlight / App Store)

---

## 📦 發布清單

### iOS (App Store)
- [ ] Xcode 專案設定: Bundle ID、版本號、建置號
- [ ] App Icons (所有尺寸) + Launch Screen
- [ ] Info.plist 權限說明 (相機、相簿、檔案存取、麥克風)
- [ ] 隱私權政策網址
- [ ] App Store 截圖 (iPhone 6.7"/6.5", iPad 12.9"/11")
- [ ] 年齡分級 (4+)
- [ ] TestFlight 內測 → 正式提交

### Android (Play Store)
- [ ] 簽名設定 (keystore、key alias、密碼)
- [ ] App Icons (mipmap 所有密度) + Adaptive Icon
- [ ] AndroidManifest 權限 (READ_MEDIA_VIDEO、POST_NOTIFICATIONS 等)
- [ ] Play Console: 內測 → 封閉測試 → 開放測試 → 正式發布
- [ ] 定向發布國家/地區
- [ ] 資料安全聲明

---

## 🔧 開發指南

### 觸控優化原則
- 最小觸控目標: **48×48 dp** (CSS `--touch-target`)
- 避免 hover 依賴，使用 `touch-action: manipulation`
- iOS 安全區域: `env(safe-area-inset-*)`
- 虛擬鍵盤彈出不遮擋輸入框

### 狀態管理
- 單向資料流: `StateActions` 更新 → `renderApp()` 重渲染
- 原生橋接: `NativeBridge` 封裝所有 Capacitor 插件呼叫
- 服務層: `services/index.ts` 提供高階 API

### 新增功能流程
1. 核心邏輯加入 `src/core/`
2. UI 元件加入 `ui/render.ts` + 事件加入 `ui/events.ts`
3. 原生功能需新增 Capacitor 插件 (iOS Swift + Android Kotlin + JNI)
4. 更新 `capacitor.config.ts` 註冊插件

---

## 🐛 常見問題

| 問題 | 解決方案 |
|------|---------|
| `npx cap sync` 失敗 | 確認 `dist/` 存在 (先 `npm run build`)，檢查 `capacitor.config.ts` webDir |
| iOS 建置找不到 `libwhisper.a` | 執行 `npm run whisper:build:ios`，確認 Framework Search Paths |
| Android 建置找不到 `libwhisper.so` | 執行 `npm run whisper:build:android`，確認 `jniLibs` 目錄結構 |
| Whisper 轉錄速度慢 | 確認使用 `small` 模型、4 執行緒、釋放記憶體 |
| 影片無法播放 | 確認格式支援 (mp4/mov/m4v/webm)、檢查 `video.playsinline` |
| 儲存專案失敗 | 檢查 Preferences 儲存配額、檔案 URI 是否有效 |

---

## 📄 授權

MIT License - 詳見 [LICENSE](../../LICENSE)

---

## 🙋 專案狀態

> **分支**: `native-app-short-video`  
> **基於**: `subtitle-review-loop` 根專案獨立開發，不影響既有 Electron/Web 版本  
> **模型策略**: 固定 Whisper Small (ggml-small.bin 內建)  
> **目標**: iOS App Store + Google Play Store 上架