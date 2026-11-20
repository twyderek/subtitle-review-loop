import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'video', 'project-intro');
const dirs = [
  '01_analysis',
  '02_docs',
  '03_script',
  '04_storyboard',
  '05_assets',
  '06_audio',
  '07_subtitles',
  '08_hyperframes',
  '09_export',
  '10_report',
];

for (const dir of dirs) {
  fs.mkdirSync(path.join(out, dir), { recursive: true });
}

const lecturerReference = 'D:\\S__14467076_0.jpg';
const generatedLecturerAvatar = 'C:\\Users\\derek\\.codex\\generated_images\\019f0297-93f7-7593-8c0f-a2fbd33db2e1\\ig_04d918913366124c016a427f7e193c8191b830ea14a39b1e9c.png';
const lecturerAsset = path.join(out, '05_assets', 'lecturer-reference.jpg');
const lecturerAvatarAsset = path.join(out, '05_assets', 'lecturer-pixar-avatar.png');
if (fs.existsSync(lecturerReference)) {
  fs.copyFileSync(lecturerReference, lecturerAsset);
}
if (fs.existsSync(generatedLecturerAvatar)) {
  fs.copyFileSync(generatedLecturerAvatar, lecturerAvatarAsset);
}
fs.mkdirSync(path.join(out, '08_hyperframes', 'assets'), { recursive: true });

const scenes = [
  {
    title: 'Opening Hook',
    duration: 18,
    narration: '如果你曾經把一支教學影片交給自動轉錄，最後卻花更多時間修錯字、調字幕位置、重燒影片，那這個專案就是為了解決這件事而生。',
    visual: '深色科技舞台中，一支影片被拆解成音訊、字幕、規則與檢閱節點，最後匯入發布軌道。',
  },
  {
    title: 'Project Background',
    duration: 22,
    narration: 'Subtitle Review Loop for Codex 是一套給教學影片與課程錄影使用的字幕檢閱工作流。它把自動轉錄、人工校稿、樣式設定與 FFmpeg 輸出串成可重複執行的流程。',
    visual: '產品名稱與四個核心節點：轉錄、校稿、預覽、輸出，以玻璃擬態卡片浮現。',
  },
  {
    title: 'Problem Statement',
    duration: 24,
    narration: '真正的痛點不是產生 SRT，而是 ASR 會誤判專有名詞，Windows 容易遇到編碼問題，字幕還可能遮住教學平台的按鈕與內容。',
    visual: '錯字、術語錯誤、CP950、字幕遮擋 UI 四個警示泡泡依序亮起。',
  },
  {
    title: 'Solution',
    duration: 24,
    narration: '這個專案採用人機協作。機器先處理格式、規則與初稿，人再透過瀏覽器逐句確認。只有完成檢閱後，才進入燒字幕與正式輸出。',
    visual: 'AI Agent 與 Reviewer 並排，資料流在兩者之間形成閉環。',
  },
  {
    title: 'Architecture',
    duration: 28,
    narration: '架構很輕量。前端是一個本機字幕編輯網頁，後端是 Node.js 靜態服務與儲存 API，影片輸出交給 FFmpeg，所有中間成果都保存在 workspace 與 review-output。',
    visual: '3D 架構圖：Browser Editor、Node Server、Workspace、FFmpeg Render、GitHub Docs。',
  },
  {
    title: 'Core Feature One',
    duration: 24,
    narration: '第一階段是字幕校稿。你可以一邊看影片，一邊搜尋 cue、跳轉時間軸、修正錯字，並把規則清理後的字幕變成可確認的正式版本。',
    visual: '字幕校稿介面示意，影片預覽左側，cue 清單右側，高亮目前播放句。',
  },
  {
    title: 'Core Feature Two',
    duration: 26,
    narration: '第二階段是燒錄預覽。系統會讓你調整字幕大小、位置、顏色、字型與外框，並把設定寫成 burn-settings.json，供後續 FFmpeg 使用。',
    visual: '樣式控制面板與影片預覽畫面，字幕從過大逐步縮小到安全位置。',
  },
  {
    title: 'Workflow',
    duration: 28,
    narration: '完整流程從影片與規則檔開始，產生草稿字幕後進入瀏覽器校稿，再輸出修正後 SRT、燒錄設定、manifest 與樣片，最後才產生正式影片。',
    visual: '橫向流程動畫：input video 到 final MP4，每個節點以發光線連接。',
  },
  {
    title: 'Demo',
    duration: 26,
    narration: '使用者只要執行 npm run open，或在 Windows 直接點擊啟動檔，就能開啟本機服務。可攜版工具包也保留 input 與 output 資料夾，適合交給其他電腦使用。',
    visual: '命令列、瀏覽器與 ZIP 工具包三個視窗以 Apple Keynote 方式切換。',
  },
  {
    title: 'Technical Highlights',
    duration: 28,
    narration: '專案特別處理了 Windows UTF-8、MP4 Range Request、大檔案 hard link、字幕樣片先驗證，以及規則檔由使用者定義，不把清理規則硬寫死。',
    visual: '五個技術亮點卡片依序翻轉：Encoding、Range、Hard Link、Sample QA、User Rules。',
  },
  {
    title: 'Quality Gate',
    duration: 22,
    narration: '每一次輸出前，都要檢查字幕同步、畫面遮擋、術語一致、檔案完整與 FFmpeg 參數。這不是一次性工具，而是一個品質閘門。',
    visual: '大型 QA Gate 門打開，勾選清單通過後進入 Export。',
  },
  {
    title: 'Roadmap',
    duration: 22,
    narration: '下一步可以加入閱讀速度警示、重疊 cue 視覺化、雙語字幕、術語表自動比對，以及更完整的一鍵樣片驗證流程。',
    visual: '未來路線圖沿著時間線展開，多個發光節點向前延伸。',
  },
  {
    title: 'Summary',
    duration: 22,
    narration: 'Subtitle Review Loop 的核心價值很簡單：讓 AI 負責重複工作，讓人負責判斷品質，最後產出可以放心發布的教學影片字幕。',
    visual: 'AI、Reviewer、Video 三個圖示收束成專案 Logo 風格字卡。',
  },
  {
    title: 'Ending',
    duration: 16,
    narration: '這是一個為真實教學現場打造的開源字幕流程。歡迎在 GitHub 使用、改造，或把它接進你的影片製作管線。',
    visual: 'GitHub repo、Documentation、Made with AI 與 QR code 占位淡入，畫面淡出。',
  },
];

const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function srtTime(seconds) {
  const ms = Math.round((seconds % 1) * 1000);
  const total = Math.floor(seconds);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function vttTime(seconds) {
  return srtTime(seconds).replace(',', '.');
}

function cueText(text) {
  return text.replace(/，|。|、|；|：/g, ' ').replace(/\s+/g, ' ').trim();
}

let cursor = 0;
const timedScenes = scenes.map((scene, index) => {
  const start = cursor;
  const end = cursor + scene.duration;
  cursor = end;
  return { ...scene, index: index + 1, start, end };
});

const analysis = `# 專案分析報告：Subtitle Review Loop for Codex

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
- FFmpeg 燒字幕腳本讀取 \`burn-settings.json\`，保持樣式一致。
- 支援 Windows 一鍵啟動與可攜 ZIP 工具包。
- 文件化常見錯誤，包含 Windows UTF-8、Whisper CP950、字幕遮擋與 hard link。

## 技術架構

- Frontend：單頁 HTML/CSS/JavaScript 字幕校稿與燒錄預覽介面。
- Backend：Node.js ESM 本機 HTTP server，提供靜態檔案、影片 range 與 review package 儲存 API。
- Processing：\`apply_subtitle_rules.mjs\` 處理 SRT 規則清理與報告。
- Rendering：\`burn-subtitles.mjs\` 封裝 FFmpeg subtitles filter 與 Windows path escaping。
- Packaging：\`build-portable-toolkit.mjs\` 產生可攜式字幕校對工具包。
- Documentation：Markdown、DOCX、Excalidraw 與工作流 prompt。

## 資料流

\`\`\`text
input video + draft SRT + rule file
  -> subtitle cleanup
  -> browser review stage 1
  -> corrected SRT
  -> browser preview stage 2
  -> burn-settings.json
  -> FFmpeg sample
  -> QA approval
  -> final burned video
\`\`\`

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
`;

const techDoc = `# Subtitle Review Loop 技術展示文件

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

\`\`\`powershell
git clone https://github.com/twyderek/subtitle-review-loop.git
cd subtitle-review-loop
npm install
npm run open
\`\`\`

若要燒字幕，請安裝 FFmpeg：

\`\`\`powershell
winget install Gyan.FFmpeg
\`\`\`

## 使用方式

1. 將影片放入 \`workspace/media.mp4\`。
2. 將草稿字幕放入 \`workspace/media.rule-cleaned.srt\`。
3. 執行 \`npm run open\` 開啟本機字幕編輯器。
4. 第一階段完成字幕校稿。
5. 第二階段設定字幕樣式與位置。
6. 儲存 review package。
7. 先產生 20 秒樣片，再輸出完整影片。

## Demo 指令

\`\`\`powershell
npm run sample:subtitles -- workspace/media.mp4 workspace/review-output/media.edited.srt workspace/review-output/media_subtitled_sample_20s.mp4 --settings workspace/review-output/burn-settings.json
npm run burn:subtitles -- workspace/media.mp4 workspace/review-output/media.edited.srt workspace/review-output/media_subtitled.mp4 --settings workspace/review-output/burn-settings.json
\`\`\`

## Workflow

\`\`\`mermaid
flowchart LR
  A[影片與草稿 SRT] --> B[Rule 清理]
  B --> C[第一階段：字幕校稿]
  C --> D[修正後 SRT]
  D --> E[第二階段：燒錄預覽]
  E --> F[burn-settings.json]
  F --> G[FFmpeg 樣片]
  G --> H[QA 確認]
  H --> I[正式輸出影片]
\`\`\`

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
`;

const script = `# 完整影片腳本

目標長度：約 ${Math.round(totalDuration / 60)} 分鐘  
語言：繁體中文  
語氣：科技發表會、專業但自然  
視覺方向：Pixar 3D 氛圍 + Apple Keynote 留白 + Google I/O 資料流動畫

${timedScenes.map((scene) => `## Scene ${scene.index}｜${scene.title}

**時間**：${srtTime(scene.start)} - ${srtTime(scene.end)}  
**旁白**：${scene.narration}  
**字幕**：${cueText(scene.narration)}
`).join('\n')}
`;

const storyboard = `# Storyboard：Project Intro Video

${timedScenes.map((scene) => `## Scene ${scene.index}｜${scene.title}

- **Duration**：${scene.duration}s
- **Camera Movement**：慢速 dolly-in，搭配局部 parallax 與玻璃卡片浮動。
- **Visual Description**：${scene.visual}
- **Animation**：場景進場使用柔和 blur reveal；關鍵節點以發光線條串接；文字採 stagger fade-up。
- **Narration**：${scene.narration}
- **Subtitle**：${cueText(scene.narration)}
- **Transition**：Apple Keynote 風格 smooth slide / cross dissolve。
- **BGM**：低音量輕科技 ambient pad。
- **SFX**：節點出現使用 subtle click；場景切換使用 soft whoosh。
`).join('\n')}
`;

const imagePrompts = `# GPT-image-2 / Pixar 3D 素材提示詞

本專案影片優先使用程式化 SVG、架構圖與 HyperFrames 動畫。若需要補充情境圖，可使用以下一致世界觀提示詞。

## 統一世界觀

Premium Pixar movie quality, modern AI subtitle factory, dark navy technology studio, soft cyan and warm amber accent lights, glassmorphism UI panels, global illumination, volumetric lighting, PBR materials, cinematic composition, high detail, realistic stylized rendering, depth of field, consistent color palette, Apple keynote minimalism, Google I/O data-flow aesthetics.

## Scene Prompts

${timedScenes.map((scene) => `### Scene ${scene.index}｜${scene.title}

${scene.visual}. Use the unified world prompt. No unreadable text except short English labels if needed. No real person identity unless a user-provided reference photo is available.
`).join('\n')}

## 虛擬講師限制

本次已提供人物照片，參考檔位於 \`05_assets/lecturer-reference.jpg\`。生成虛擬講師時，必須以此照片作為唯一身份依據，保持短黑髮、黑色圓框眼鏡、成熟男性臉型、膚色、五官比例與冷靜專業表情一致。
`;

const qa = `# QA Report：Project Intro Video

## 目前狀態

- 專案分析報告：已產生。
- 技術展示文件：已產生。
- 完整影片腳本：已產生。
- Storyboard：已產生。
- 字幕 SRT/VTT/逐字稿：已產生初版，時間軸依 scene duration 建立。
- HyperFrames 工程：已產生，可進行 lint、validate 與 render。
- VoxCPM：CLI 已安裝並可呼叫；若模型下載或推論失敗，流程可回退到 Windows SAPI TTS。
- 虛擬講師：已收到人物照片並保存為 \`05_assets/lecturer-reference.jpg\`；Pixar 3D 講師圖已由影像生成流程建立視覺方向，後續若需完全本地重渲染，可用 \`05_assets/gpt-image-prompts.md\` 重新生成。

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
`;

const srt = timedScenes.map((scene) => `${scene.index}
${srtTime(scene.start)} --> ${srtTime(scene.end)}
${cueText(scene.narration)}
`).join('\n');

const vtt = `WEBVTT\n\n${timedScenes.map((scene) => `${vttTime(scene.start)} --> ${vttTime(scene.end)}
${cueText(scene.narration)}
`).join('\n')}`;

const transcript = timedScenes.map((scene) => `${scene.index}. ${scene.narration}`).join('\n\n');

const segments = timedScenes.map((scene) => ({
  id: String(scene.index).padStart(2, '0'),
  title: scene.title,
  start: scene.start,
  end: scene.end,
  duration: scene.duration,
  text: scene.narration,
  subtitle: cueText(scene.narration),
}));

const workflowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="3840" height="2160" viewBox="0 0 3840 2160">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07111f"/><stop offset="1" stop-color="#111827"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <style>
      .title{font:700 96px "Microsoft JhengHei",Arial;fill:#eef6ff}
      .node{fill:#111c32;stroke:#64d8ff;stroke-width:4;rx:34;filter:url(#glow)}
      .label{font:700 44px "Microsoft JhengHei",Arial;fill:#eef6ff;text-anchor:middle}
      .sub{font:400 28px "Microsoft JhengHei",Arial;fill:#a9c2dc;text-anchor:middle}
      .line{stroke:#64d8ff;stroke-width:8;stroke-linecap:round;opacity:.8}
    </style>
  </defs>
  <rect width="3840" height="2160" fill="url(#bg)"/>
  <text x="1920" y="260" class="title" text-anchor="middle">Subtitle Review Loop Architecture</text>
  ${['Input Video','Rule Cleanup','Browser Review','Burn Settings','FFmpeg Sample','Final Export'].map((label, i) => {
    const x = 460 + i * 585;
    const y = 980 + (i % 2 === 0 ? -110 : 110);
    const nextX = 460 + (i + 1) * 585;
    const nextY = 980 + ((i + 1) % 2 === 0 ? -110 : 110);
    const line = i < 5 ? `<line x1="${x + 190}" y1="${y}" x2="${nextX - 190}" y2="${nextY}" class="line"/>` : '';
    return `${line}<rect x="${x - 220}" y="${y - 115}" width="440" height="230" class="node"/><text x="${x}" y="${y - 10}" class="label">${label}</text><text x="${x}" y="${y + 55}" class="sub">${i + 1}. quality gate</text>`;
  }).join('')}
  <text x="1920" y="1760" font-family="Microsoft JhengHei,Arial" font-size="48" fill="#9df27d" text-anchor="middle">AI handles repetition. Humans confirm quality.</text>
</svg>`;

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Subtitle Review Loop Project Intro</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #050816; font-family: Arial, system-ui, sans-serif; color: #edf6ff; overflow: hidden; }
    #root { position: relative; width: 3840px; height: 2160px; overflow: hidden; background: radial-gradient(circle at 20% 20%, rgba(100,216,255,.25), transparent 26%), radial-gradient(circle at 80% 10%, rgba(251,191,36,.16), transparent 24%), linear-gradient(135deg,#07111f,#101827 55%,#050816); }
    .scene { position: absolute; inset: 0; padding: 180px 240px; opacity: 0; transform: translateY(80px) scale(.985); }
    .scene.active { opacity: 1; }
    .kicker { color: #64d8ff; font-size: 42px; letter-spacing: .16em; text-transform: uppercase; font-weight: 700; }
    h1 { font-size: 156px; line-height: 1.04; margin: 36px 0; max-width: 2300px; letter-spacing: -0.06em; }
    h2 { font-size: 118px; line-height: 1.1; margin: 28px 0; max-width: 2200px; letter-spacing: -0.05em; }
    p { font-size: 54px; line-height: 1.45; max-width: 2050px; color: #c9d7ea; }
    .glass { background: rgba(17,28,50,.68); border: 1px solid rgba(170,220,255,.23); border-radius: 42px; box-shadow: 0 30px 90px rgba(0,0,0,.35), inset 0 1px rgba(255,255,255,.18); backdrop-filter: blur(18px); }
    .hero-grid { display: grid; grid-template-columns: 1.08fr .92fr; gap: 88px; align-items: center; height: 100%; }
    .panel { padding: 64px; }
    .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 34px; margin-top: 56px; }
    .card { padding: 42px; min-height: 210px; }
    .card strong { display:block; font-size: 48px; color: #f3fbff; margin-bottom: 18px; }
    .card span { font-size: 34px; line-height: 1.35; color: #a9c2dc; }
    .orb { position:absolute; width: 520px; height: 520px; border-radius:50%; background: radial-gradient(circle, rgba(100,216,255,.5), rgba(100,216,255,0) 68%); filter: blur(18px); right: 310px; top: 260px; }
    .device { width: 1380px; height: 840px; padding: 42px; border-radius: 58px; background: #0d1629; box-shadow: 0 60px 140px rgba(0,0,0,.52); border: 1px solid rgba(255,255,255,.18); transform: perspective(1600px) rotateY(-10deg) rotateX(4deg); }
    .screen { width: 100%; height: 100%; border-radius: 36px; background: linear-gradient(135deg, #121f38, #09101f); position: relative; overflow:hidden; }
    .screen:before { content:""; position:absolute; inset:40px; border-radius:28px; border:2px solid rgba(100,216,255,.2); }
    .cue { position:absolute; left: 90px; right:90px; bottom: 80px; padding: 28px 46px; border-radius: 22px; background: rgba(0,0,0,.48); text-align:center; font-size:42px; font-weight:800; text-shadow:0 4px 20px #000; }
    .timeline { display:flex; gap:22px; margin-top:54px; align-items:center; }
    .dot { width: 54px; height:54px; border-radius:50%; background:#64d8ff; box-shadow:0 0 34px #64d8ff; }
    .bar { flex:1; height:12px; border-radius:99px; background:linear-gradient(90deg,#64d8ff,#9df27d,#fbbf24); }
    .architecture { width: 100%; margin-top: 80px; display:grid; grid-template-columns: repeat(5, 1fr); gap: 28px; align-items:center; }
    .arch-node { padding: 42px 24px; text-align:center; border-radius:34px; background:rgba(17,28,50,.82); border:1px solid rgba(100,216,255,.35); font-size: 38px; font-weight: 800; min-height: 170px; display:flex; align-items:center; justify-content:center; }
    .caption { position:absolute; left: 420px; right:420px; bottom: 110px; min-height: 126px; padding: 28px 54px; text-align:center; font-size: 52px; line-height:1.32; font-weight: 850; color:white; text-shadow: 0 4px 8px #000, 0 0 22px #000; background: rgba(0,0,0,.22); border-radius: 28px; }
    .watermark { position:absolute; right: 96px; top: 78px; font-size: 34px; color:rgba(238,246,255,.5); }
    .repo { font-size: 64px; color:#9df27d; margin-top:32px; }
  </style>
</head>
<body>
<div id="root" data-composition-id="main" data-width="3840" data-height="2160" data-start="0" data-duration="${totalDuration}">
  <audio id="audio-narration" src="audio/narration.wav" data-start="0" data-duration="${totalDuration}" data-track-index="10" data-volume="1"></audio>
  <audio id="audio-bgm" src="audio/bgm.wav" data-start="0" data-duration="${totalDuration}" data-track-index="1" data-volume="0.18"></audio>
  <div class="watermark">Subtitle Review Loop for Codex</div>
  ${timedScenes.map((scene) => {
    const isHero = scene.index === 1;
    const title = scene.index === 1 ? 'AI 字幕品質工廠' : scene.title;
    const cards = [
      ['Human-in-the-loop', '先自動化，再人工確認'],
      ['Local-first', '影片與字幕留在本機'],
      ['FFmpeg-ready', '樣式設定可重複輸出'],
      ['Teaching video QA', '避免字幕遮擋重點畫面'],
    ];
    const visual = scene.index === 5
      ? `<div class="architecture">${['Browser Editor','Node Server','Workspace','FFmpeg','QA Export'].map((x) => `<div class="arch-node">${x}</div>`).join('')}</div>`
      : scene.index === 8
        ? `<img src="assets/workflow.svg" style="width:100%;max-height:980px;margin-top:64px;border-radius:42px;box-shadow:0 40px 120px rgba(0,0,0,.4)">`
        : scene.index === 1
          ? `<div class="device"><div class="screen"><img src="assets/lecturer-reference.jpg" style="position:absolute;right:80px;bottom:0;height:92%;border-radius:32px;filter:saturate(.9) contrast(1.05);opacity:.92"><div class="cue" style="left:70px;right:48%;bottom:90px">Pixar 講師身份參考</div></div></div>`
        : `<div class="device"><div class="screen"><div class="cue">${escapeHtml(cueText(scene.narration))}</div></div></div>`;
    return `<section id="scene-${scene.index}" class="clip scene" data-start="${scene.start}" data-duration="${scene.duration}">
      <div class="orb"></div>
      <div class="hero-grid">
        <div>
          <div class="kicker">Scene ${scene.index.toString().padStart(2, '0')} · ${escapeHtml(scene.title)}</div>
          ${isHero ? `<h1>${title}</h1>` : `<h2>${escapeHtml(title)}</h2>`}
          <p>${escapeHtml(scene.narration)}</p>
          ${scene.index === 14 ? `<div class="repo">github.com/twyderek/subtitle-review-loop</div>` : `<div class="timeline"><div class="dot"></div><div class="bar"></div></div>`}
        </div>
        <div class="panel glass">
          ${visual}
          ${scene.index === 2 ? `<div class="cards">${cards.map(([a,b]) => `<div class="card glass"><strong>${a}</strong><span>${b}</span></div>`).join('')}</div>` : ''}
        </div>
      </div>
    </section>`;
  }).join('\n')}
  ${timedScenes.map((scene) => `<div class="caption" data-caption-start="${scene.start}" data-caption-end="${scene.end}">${escapeHtml(scene.subtitle)}</div>`).join('\n')}
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script>
  const scenes = [...document.querySelectorAll('.scene')];
  const captions = [...document.querySelectorAll('.caption')];
  gsap.set(scenes[0], { opacity: 1, y: 0, scale: 1 });
  gsap.set(captions, { opacity: 0, y: 30 });
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  scenes.forEach((scene, index) => {
    const start = Number(scene.dataset.start);
    tl.to(scene, { opacity: 1, y: 0, scale: 1, duration: 1.1 }, start);
    tl.fromTo(scene.querySelectorAll('.kicker,h1,h2,p,.timeline,.device,.architecture,img,.cards,.repo'), { opacity: 0, y: 54, filter: 'blur(12px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.15, stagger: .08 }, start + .2);
    tl.to(scene.querySelector('.orb'), { x: -80, y: 40, scale: 1.15, duration: Number(scene.dataset.duration), ease: 'none' }, start);
    if (index < scenes.length - 1) tl.to(scene, { opacity: 0, y: -80, scale: 1.015, duration: .9, ease: 'power2.inOut' }, start + Number(scene.dataset.duration) - .9);
  });
  captions.forEach((caption) => {
    const start = Number(caption.dataset.captionStart);
    const end = Number(caption.dataset.captionEnd);
    tl.to(caption, { opacity: 1, y: 0, duration: .35 }, start + .3);
    tl.to(caption, { opacity: 0, y: -20, duration: .25 }, end - .35);
  });
  window.__timelines = window.__timelines || {};
  window.__timelines.main = tl;
</script>
</body>
</html>`;

write(path.join(out, '01_analysis', 'project-analysis.md'), analysis);
write(path.join(out, '02_docs', 'technical-showcase.md'), techDoc);
write(path.join(out, '03_script', 'video-script.md'), script);
write(path.join(out, '04_storyboard', 'storyboard.md'), storyboard);
write(path.join(out, '05_assets', 'gpt-image-prompts.md'), imagePrompts);
write(path.join(out, '05_assets', 'workflow.svg'), workflowSvg);
write(path.join(out, '08_hyperframes', 'assets', 'workflow.svg'), workflowSvg);
if (fs.existsSync(lecturerAsset)) {
  fs.copyFileSync(lecturerAsset, path.join(out, '08_hyperframes', 'assets', 'lecturer-reference.jpg'));
}
if (fs.existsSync(lecturerAvatarAsset)) {
  fs.copyFileSync(lecturerAvatarAsset, path.join(out, '08_hyperframes', 'assets', 'lecturer-pixar-avatar.png'));
}
write(path.join(out, '07_subtitles', 'narration.srt'), srt);
write(path.join(out, '07_subtitles', 'narration.vtt'), vtt);
write(path.join(out, '07_subtitles', 'transcript.txt'), transcript);
write(path.join(out, '06_audio', 'narration-segments.json'), JSON.stringify(segments, null, 2));
write(path.join(out, '08_hyperframes', 'index.html'), html);
write(path.join(out, '08_hyperframes', 'DESIGN.md'), `# DESIGN.md

## Visual Identity

- Resolution: 3840 × 2160, 16:9.
- Palette: deep navy #050816, panel #111C32, cyan #64D8FF, green #9DF27D, amber #FBBF24.
- Typography: Microsoft JhengHei / Noto Sans TC / Inter.
- Style: Pixar 3D atmosphere, Apple Keynote spacing, Google I/O data-flow animation, OpenAI product demo clarity.

## Motion Rules

- Use smooth slide and cross dissolve transitions.
- Keep text readable with large whitespace.
- Animate architecture and workflow with subtle glowing lines, floating cards, parallax orbs, and staggered entrances.
- Avoid over-decoration; every motion should clarify the project story.

## Asset Rules

- Prefer local project diagrams and generated SVG.
- Do not create identity-preserving avatar unless a user-provided person photo is available.
- Generated scene art must keep the same dark studio, cyan/amber lighting, glass UI, and premium technology mood.
`);
write(path.join(out, '10_report', 'qa-report.md'), qa);

console.log(`Generated project intro video scaffold at ${out}`);
console.log(`Target duration: ${totalDuration}s`);
