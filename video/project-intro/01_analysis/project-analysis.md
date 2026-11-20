# 專案分析報告：Subtitle Review Loop for Codex

## 專案定位

Subtitle Review Loop for Codex 是一套面向教學影片、課程錄影與螢幕操作示範的字幕品質工作流。它不是單純的字幕編輯器，而是一個把自動轉錄、規則清理、人工校稿、燒錄預覽與正式輸出串起來的 human-in-the-loop pipeline。

## 背景與問題

- 教學影片常由 ASR 產生初稿，但專有名詞、平台名稱、英文縮寫與口語停頓容易出錯。
- Windows 環境常見 UTF-8 與 CP950 顯示問題，容易誤判字幕檔是否損壞。
- 字幕若直接燒錄，可能遮住教學平台按鈕、選單、簡報或操作重點。
- 不同課程有不同術語與清理規則，因此規則不能硬寫在通用提示詞中。

## 解決方案

專案將字幕製作拆成兩個品質閘門：

1. 第一階段：字幕校稿。使用者提供影片、草稿字幕與 rule 檔，在瀏覽器中逐句檢閱與修正。
2. 第二階段：燒錄預覽。使用者確認字幕內容後，再調整字型、大小、位置、顏色與外框，輸出燒錄設定與樣片。

## 核心特色

- 本機瀏覽器字幕編輯器，可邊看影片邊修 SRT cue。
- Node.js 本機服務支援 MP4 Range Request，適合長影片預覽。
- 使用者自訂 rule 檔，不將口語刪除或術語替換規則寫死。
- FFmpeg 燒字幕腳本讀取 `burn-settings.json`，保持樣式一致。
- 支援 Windows 一鍵啟動與可攜 ZIP 工具包。
- 文件化常見錯誤，包含 Windows UTF-8、Whisper CP950、字幕遮擋與 hard link。

## 技術架構

- Frontend：單頁 HTML/CSS/JavaScript 字幕校稿與燒錄預覽介面。
- Backend：Node.js ESM 本機 HTTP server，提供靜態檔案、影片 range 與 review package 儲存 API。
- Processing：`apply_subtitle_rules.mjs` 處理 SRT 規則清理與報告。
- Rendering：`burn-subtitles.mjs` 封裝 FFmpeg subtitles filter 與 Windows path escaping。
- Packaging：`build-portable-toolkit.mjs` 產生可攜式字幕校對工具包。
- Documentation：Markdown、DOCX、Excalidraw 與工作流 prompt。

## 資料流

```text
input video + draft SRT + rule file
  -> subtitle cleanup
  -> browser review stage 1
  -> corrected SRT
  -> browser preview stage 2
  -> burn-settings.json
  -> FFmpeg sample
  -> QA approval
  -> final burned video
```

## 專案優勢

- 隱私友善：影片與字幕可全程留在本機。
- 可重現：規則、設定、manifest 與輸出步驟都可保存。
- 適合教學影片：先樣片再全片，降低字幕遮擋風險。
- 人機分工清楚：AI 做初稿與機械檢查，人做語意與畫面判斷。

## 未來 Roadmap

- 閱讀速度與每行字數警示。
- cue 重疊與過短停留時間視覺化。
- 雙語字幕與術語表自動比對。
- 一鍵生成樣片截圖與 QA 報告。
- 更完整的可攜工具包設定精靈。
