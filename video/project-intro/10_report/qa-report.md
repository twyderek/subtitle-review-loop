# QA Report：Project Intro Video

## 目前狀態

- 專案分析報告：已產生。
- 技術展示文件：已產生。
- 完整影片腳本：已產生。
- Storyboard：已產生。
- 字幕 SRT/VTT/逐字稿：已產生初版，時間軸依 scene duration 建立。
- HyperFrames 工程：已產生，可進行 lint、validate 與 render。
- VoxCPM：CLI 已安裝並可呼叫；若模型下載或推論失敗，流程可回退到 Windows SAPI TTS。
- 虛擬講師：已收到人物照片並保存為 `05_assets/lecturer-reference.jpg`；Pixar 3D 講師圖已由影像生成流程建立視覺方向，後續若需完全本地重渲染，可用 `05_assets/gpt-image-prompts.md` 重新生成。

## 品質檢查項目

- 內容與專案一致：待最終渲染後複核。
- 技術資訊正確：依 README、docs、scripts 與 runbook 整理。
- 視覺一致：採深藍、青色、琥珀色與玻璃擬態設計。
- 字幕同步：初版依 scene duration 對齊；若改用實際 TTS 長度，需重新產生 timing。
- 音訊：待 TTS 與 FFmpeg loudness 檢查。
- 輸出規格：目標為 4K UHD、16:9、60 FPS、H.265。

## 已知限制

1. VoxCPM 首次執行可能需要下載大型模型；若環境或時間不足，會使用本機 TTS 作為可重現 fallback。
2. HDR metadata 需依實際播放器與 FFmpeg 支援確認；本流程會優先產生 10-bit H.265 檔案。
