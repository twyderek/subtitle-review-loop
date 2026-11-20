# Subtitle Review Loop 技術展示文件

## 專案介紹

Subtitle Review Loop for Codex 是一套可重複使用的字幕檢閱與輸出流程，專為教學影片、課程錄影與螢幕操作影片設計。它將 AI 自動轉錄後最容易出錯的環節，轉成可檢查、可修正、可追蹤的本機工作流。

## 功能特色

- 影片與字幕同步檢閱。
- SRT cue 搜尋、跳轉、編輯與匯出。
- 依照使用者提供的 rule 檔進行字幕清理。
- 分成字幕校稿與燒錄預覽兩階段，降低一次輸出失敗成本。
- 儲存修正後字幕、燒錄設定、FFmpeg style 與 export manifest。
- 提供 Windows 一鍵啟動與可攜式工具包。

## 安裝流程

```powershell
git clone https://github.com/twyderek/subtitle-review-loop.git
cd subtitle-review-loop
npm install
npm run open
```

若要燒字幕，請安裝 FFmpeg：

```powershell
winget install Gyan.FFmpeg
```

## 使用方式

1. 將影片放入 `workspace/media.mp4`。
2. 將草稿字幕放入 `workspace/media.rule-cleaned.srt`。
3. 執行 `npm run open` 開啟本機字幕編輯器。
4. 第一階段完成字幕校稿。
5. 第二階段設定字幕樣式與位置。
6. 儲存 review package。
7. 先產生 20 秒樣片，再輸出完整影片。

## Demo 指令

```powershell
npm run sample:subtitles -- workspace/media.mp4 workspace/review-output/media.edited.srt workspace/review-output/media_subtitled_sample_20s.mp4 --settings workspace/review-output/burn-settings.json
npm run burn:subtitles -- workspace/media.mp4 workspace/review-output/media.edited.srt workspace/review-output/media_subtitled.mp4 --settings workspace/review-output/burn-settings.json
```

## Workflow

```mermaid
flowchart LR
  A[影片與草稿 SRT] --> B[Rule 清理]
  B --> C[第一階段：字幕校稿]
  C --> D[修正後 SRT]
  D --> E[第二階段：燒錄預覽]
  E --> F[burn-settings.json]
  F --> G[FFmpeg 樣片]
  G --> H[QA 確認]
  H --> I[正式輸出影片]
```

## FAQ

### 為什麼不直接燒字幕？

因為教學影片常有重要 UI 在畫面下方或中央。專案要求先產生樣片，確認字幕位置不影響觀看後，再輸出完整影片。

### 清理規則是否固定？

不是。規則應由使用者提供，例如術語表、口頭禪刪除規則與標點策略。若沒有 rule 檔，流程只做中性的格式與時間軸檢查。

### 可以離線使用嗎？

可以。核心校稿與燒字幕流程在本機執行。若使用 Whisper 或其他 ASR，取決於使用者選擇的模型與工具。

## Roadmap

- cue 閱讀速度警示。
- 樣片截圖自動比對。
- 多語字幕輸出。
- 術語表與專有名詞 QA。
- 更完整的部署與容器化選項。
