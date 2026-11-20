#!/bin/bash
# Android Whisper.cpp 編譯腳本 (增強版)
# 用法: bash scripts/build-whisper-android.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CAPACITOR_DIR="$(dirname "$SCRIPT_DIR")"
WHISPER_CPP_DIR="$CAPACITOR_DIR/../../whisper.cpp"
ANDROID_ABIS=("arm64-v8a" "armeabi-v7a" "x86_64" "x86")
MIN_SDK=24

echo "=== Building Whisper.cpp for Android ==="
echo "Capacitor dir: $CAPACITOR_DIR"
echo "Whisper.cpp dir: $WHISPER_CPP_DIR"

# 檢查 NDK
if [ -z "$ANDROID_NDK_HOME" ] && [ -z "$ANDROID_NDK_ROOT" ]; then
    echo "ERROR: ANDROID_NDK_HOME or ANDROID_NDK_ROOT not set"
    echo "Please set ANDROID_NDK_HOME to your NDK path (e.g., ~/Library/Android/sdk/ndk/26.x.x)"
    exit 1
fi

NDK_PATH="${ANDROID_NDK_HOME:-$ANDROID_NDK_ROOT}"
echo "Using NDK: $NDK_PATH"

# 檢查 whisper.cpp
if [ ! -d "$WHISPER_CPP_DIR" ]; then
    echo "Cloning whisper.cpp as submodule..."
    git submodule add https://github.com/ggerganov/whisper.cpp.git "$WHISPER_CPP_DIR"
    cd "$WHISPER_CPP_DIR"
    git checkout v1.5.4
else
    echo "whisper.cpp found at $WHISPER_CPP_DIR"
fi

cd "$WHISPER_CPP_DIR"

# 下載 small 模型 (如果不存在)
MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"
MODEL_DEST="$CAPACITOR_DIR/android/app/src/main/assets/models/ggml-small.bin"
mkdir -p "$(dirname "$MODEL_DEST")"
if [ ! -f "$MODEL_DEST" ]; then
    echo "Downloading ggml-small.bin..."
    curl -L -o "$MODEL_DEST" "$MODEL_URL" || echo "Warning: Failed to download model, will need manual copy"
else
    echo "Model ggml-small.bin already exists"
fi

# 為每個 ABI 編譯
for ABI in "${ANDROID_ABIS[@]}"; do
    echo "Building for $ABI..."

    BUILD_DIR="$CAPACITOR_DIR/android/whisper-build-$ABI"
    INSTALL_DIR="$CAPACITOR_DIR/android/whisper-install-$ABI"

    mkdir -p "$BUILD_DIR"
    mkdir -p "$INSTALL_DIR"

    # 設定工具鏈
    TOOLCHAIN="$NDK_PATH/build/cmake/android.toolchain.cmake"

    if [ ! -f "$TOOLCHAIN" ]; then
        echo "ERROR: Android toolchain not found at $TOOLCHAIN"
        exit 1
    fi

    cmake -B "$BUILD_DIR" -S . \
        -DCMAKE_TOOLCHAIN_FILE="$TOOLCHAIN" \
        -DANDROID_ABI="$ABI" \
        -DANDROID_PLATFORM="android-$MIN_SDK" \
        -DCMAKE_BUILD_TYPE=Release \
        -DWHISPER_BUILD_TESTS=OFF \
        -DWHISPER_BUILD_EXAMPLES=OFF \
        -DBUILD_SHARED_LIBS=ON \
        -DCMAKE_INSTALL_PREFIX="$INSTALL_DIR" \
        -DWHISPER_BUILD_SDL2=OFF \
        -DGGML_OPENMP=OFF \
        -DGGML_OPENBLAS=OFF \
        -DGGML_METAL=OFF \
        -DGGML_METAL_EMBED_LIBRARY=OFF \
        -DGGML_CUDA=OFF \
        -DGGML_VULKAN=OFF

    cmake --build "$BUILD_DIR" --config Release --target whisper -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
    cmake --install "$BUILD_DIR" --config Release

    # 複製到 Android 專案
    ANDROID_JNI_DIR="$CAPACITOR_DIR/android/app/src/main/jniLibs/$ABI"
    mkdir -p "$ANDROID_JNI_DIR"

    cp "$INSTALL_DIR/lib/libwhisper.so" "$ANDROID_JNI_DIR/"

    echo "  -> Copied libwhisper.so to $ANDROID_JNI_DIR/"
done

# 複製 headers
HEADERS_DIR="$CAPACITOR_DIR/android/app/src/main/cpp/include"
mkdir -p "$HEADERS_DIR"
cp -R "$CAPACITOR_DIR/android/whisper-install-arm64-v8a/include/"* "$HEADERS_DIR/"

echo "=== Android Whisper.cpp build complete ==="
echo "Libraries installed to android/app/src/main/jniLibs/"
echo "Headers installed to android/app/src/main/cpp/include/"
echo "Model installed to android/app/src/main/assets/models/ggml-small.bin"