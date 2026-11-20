# Android 本地建置完整指引

## 📋 前置需求

| 工具 | 版本 | 下載連結 |
|------|------|----------|
| Android Studio | 2024.2.1+ | https://developer.android.com/studio |
| JDK | 17 (Temurin) | https://adoptium.net/temurin/releases/?version=17 |
| Android SDK | API 34 | Android Studio SDK Manager |
| NDK | r26d (26.1.10909125) | SDK Manager → NDK (Side by side) |
| CMake | 3.22.1+ | SDK Manager → CMake |
| Git | 2.40+ | https://git-scm.com |

---

## 🛠️ 安裝步驟

### 1. 安裝 Android Studio
```bash
# Windows: 執行安裝程式，選擇 Standard 安裝
# 首次啟動會下載 SDK Platform (API 34) + Build Tools
```

### 2. 安裝 NDK r26d
在 Android Studio 中：
1. `Tools` → `SDK Manager` → `SDK Tools` 分頁
2. 勾選 `Show Package Details`
3. 找到 `NDK (Side by side)` → 展開 → 勾選 `26.1.10909125` (r26d)
4. 同步勾選 `CMake` (3.22.1+) 和 `Android SDK Command-line Tools`
5. 點擊 Apply 安裝

### 3. 設定環境變數 (Windows PowerShell)
```powershell
# 設定永久環境變數 (需管理員權限)
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:USERPROFILE\AppData\Local\Android\Sdk", "User")
[Environment]::SetEnvironmentVariable("ANDROID_NDK_HOME", "$env:USERPROFILE\AppData\Local\Android\Sdk\ndk\26.1.10909125", "User")

# 將工具加入 PATH
$androidPath = "$env:USERPROFILE\AppData\Local\Android\Sdk"
[Environment]::SetEnvironmentVariable("PATH", 
    [Environment]::GetEnvironmentVariable("PATH", "User") + ";$androidPath\platform-tools;$androidPath\cmdline-tools\latest\bin;$androidPath\ndk\26.1.10909125", "User")

# 重啟終端機生效
```

### 4. 驗證安裝
```powershell
# 應該顯示版本資訊
adb version
ndk-build --version
cmake --version
java -version
```

---

## 📦 專案建置

### 1. 取得原始碼
```bash
git clone https://github.com/twyderek/subtitle-review-loop.git
cd subtitle-review-loop/src/capacitor-app
git checkout native-app-short-video
```

### 2. 安裝 Node.js 依賴
```bash
# 建議使用 Node.js 20+ (專案要求 >=20)
nvm install 22  # 或直接安裝 Node.js 22
npm ci
```

### 3. 建置前端
```bash
npm run build
# 輸出到 dist/
```

### 4. 複製 Whisper 模型
```bash
npm run models:copy
# 將 ggml-small.bin 複製到 android/app/src/main/assets/models/
```

### 5. 編譯 Whisper 原生庫
```bash
# 這步會編譯 whisper.cpp 為 4 個 ABI 的 .so 檔案
# 約需 10-20 分鐘
npm run whisper:build:android
```

### 6. Capacitor 同步
```bash
npx cap sync android
```

### 6. 開啟 Android Studio
```bash
npm run cap:open:android
```

---

## 🏗️ Android Studio 內建置

### 方式 A：Gradle 命令列建置 (快速驗證)
```bash
cd android
./gradlew clean assembleRelease bundleRelease --no-daemon -Dorg.gradle.jvmargs="-Xmx4g"

# 輸出位置：
# APK: app/build/outputs/apk/release/app-release.apk
# AAB: app/build/outputs/bundle/release/app-release.aab
```

### 方式 B：Android Studio UI 建置
1. `Build` → `Clean Project`
2. `Build` → `Rebuild Project`
3. `Build` → `Generate Signed Bundle / APK`
   - 選擇 `Android App Bundle` 或 `APK`
   - 建立/選擇 Keystore (發布需正式簽名)
   - 選擇 `release` 簽名

---

## 📱 測試安裝

### 連接實體裝置
```bash
# 開啟開發者選項 → USB 偵錯
adb devices  # 應顯示裝置序號

# 安裝 APK
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### 模擬器測試
```bash
# Android Studio → Device Manager → Create Device
# 建議：Pixel 7 Pro, API 34, ARM64
```

---

## 🔐 正式發布簽名

### 建立 Keystore
```bash
keytool -genkeypair -v \
  -keystore subtitle-review-release.keystore \
  -alias subtitle-review \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -storepass <password> -keypass <password>
```

### 設定簽名 (android/app/build.gradle)
```gradle
android {
    signingConfigs {
        release {
            storeFile file("subtitle-review-release.keystore")
            storePassword "<password>"
            keyAlias "subtitle-review"
            keyPassword "<password>"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## ❗ 常見問題

| 問題 | 解決方案 |
|------|----------|
| `ndk-build` 找不到 | 確認 `ANDROID_NDK_HOME` 指向 `ndk/26.1.10909125` |
| Gradle 記憶體不足 | 增加 `GRADLE_OPTS=-Xmx4g` 或修改 `gradle.properties`: `org.gradle.jvmargs=-Xmx4g` |
| NDK 版本不符 | 確認 `build.gradle` 中 `ndkVersion "26.1.10909125"` |
| Whisper 編譯失敗 | 確認 NDK r26d、CMake 3.22+、whisper.cpp submodule 已初始化 |
| `libwhisper.so` 找不到 | 執行 `npm run whisper:build:android` 再 `npx cap sync` |
| 安裝 APK 失敗 | 確認 `adb install -r` 強制重裝，或解除安裝舊版 |

---

## 📦 CI/CD 自動建置 (免本地環境)

專案已配置 GitHub Actions (`.github/workflows/build-native-app.yml`)：

```bash
# 推送 tag 自動建置並發布 Release
git tag v1.0.0
git push origin v1.0.0

# 或手動觸發
gh workflow run build-native-app.yml -f platform=android
```

**建置產物** (保留 30 天)：
- `app-release.aab` → Google Play Console 上傳
- `app-release.apk` → 直接安裝測試

---

## 📞 支援

- GitHub Issues: https://github.com/twyderek/subtitle-review-loop/issues
- Actions Logs: https://github.com/twyderek/subtitle-review-loop/actions