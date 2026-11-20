#!/bin/bash
# 模型檔案打包腳本 - 將 ggml-small.bin 複製到 iOS/Android 正確位置
# 用法: bash scripts/copy-models.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CAPACITOR_DIR="$(dirname "$SCRIPT_DIR")"
WHISPER_CPP_DIR="$CAPACITOR_DIR/../../whisper.cpp"

echo "=== Copying Whisper Models ==="

# 1. 下載模型 (如果不存在)
MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"
MODEL_LOCAL="$CAPACITOR_DIR/ggml-small.bin"

if [ ! -f "$MODEL_LOCAL" ]; then
    echo "Downloading ggml-small.bin..."
    curl -L -o "$MODEL_LOCAL" "$MODEL_URL" || {
        echo "Warning: Failed to download model. You'll need to manually copy ggml-small.bin"
    }
else
    echo "Model already exists at $MODEL_LOCAL"
fi

# 2. 複製到 iOS App Bundle
if [ -d "$CAPACITOR_DIR/ios/App/App" ]; then
    echo "Copying model to iOS App Bundle..."
    cp "$MODEL_LOCAL" "$CAPACITOR_DIR/ios/App/App/ggml-small.bin"
    echo "  -> Copied to ios/App/App/ggml-small.bin"
else
    echo "Warning: iOS App directory not found"
fi

# 3. 複製到 Android Assets
ANDROID_MODELS_DIR="$CAPACITOR_DIR/android/app/src/main/assets/models"
mkdir -p "$ANDROID_MODELS_DIR"
echo "Copying model to Android Assets..."
cp "$MODEL_LOCAL" "$ANDROID_MODELS_DIR/ggml-small.bin"
echo "  -> Copied to android/app/src/main/assets/models/ggml-small.bin"

# 4. 複製到 iOS 模擬器/真機測試目錄
IOS_MODELS_DIR="$CAPACITOR_DIR/ios/App/Plugins/Whisper/Frameworks/models"
mkdir -p "$IOS_MODELS_DIR"
cp "$MODEL_LOCAL" "$IOS_MODELS_DIR/ggml-small.bin"
echo "  -> Copied to ios/App/Plugins/Whisper/Frameworks/models/ggml-small.bin"

# 5. 驗證
echo ""
echo "=== Verification ==="
echo "iOS App Bundle: $(ls -lh "$CAPACITOR_DIR/ios/App/App/ggml-small.bin" 2>/dev/null || echo 'NOT FOUND')"
echo "Android Assets: $(ls -lh "$ANDROID_MODELS_DIR/ggml-small.bin" 2>/dev/null || echo 'NOT FOUND')"
echo "iOS Frameworks: $(ls -lh "$IOS_MODELS_DIR/ggml-small.bin" 2>/dev/null || echo 'NOT FOUND')"

echo ""
echo "=== Model copy complete ==="
echo "Model size: $(ls -lh "$MODEL_LOCAL" | awk '{print $5}')"