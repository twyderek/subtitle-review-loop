#!/bin/bash
# iOS Whisper.cpp 編譯腳本
# 用法: bash scripts/build-whisper-ios.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CAPACITOR_DIR="$(dirname "$SCRIPT_DIR")"
WHISPER_CPP_DIR="$CAPACITOR_DIR/../../whisper.cpp"
BUILD_DIR="$CAPACITOR_DIR/ios/WhisperBuild"
INSTALL_DIR="$CAPACITOR_DIR/ios/WhisperInstall"

echo "=== Building Whisper.cpp for iOS ==="
echo "Capacitor dir: $CAPACITOR_DIR"
echo "Whisper.cpp dir: $WHISPER_CPP_DIR"

# 檢查 whisper.cpp 是否存在 (作為 submodule)
if [ ! -d "$WHISPER_CPP_DIR" ]; then
    echo "Cloning whisper.cpp as submodule..."
    git submodule add https://github.com/ggerganov/whisper.cpp.git "$WHISPER_CPP_DIR"
    cd "$WHISPER_CPP_DIR"
    git checkout v1.5.4  # 或最新穩定版
else
    echo "whisper.cpp found at $WHISPER_CPP_DIR"
fi

# 建立建置目錄
mkdir -p "$BUILD_DIR"
mkdir -p "$INSTALL_DIR/lib"
mkdir -p "$INSTALL_DIR/include"

# 編譯選項
IOS_SDK=$(xcrun --sdk iphoneos --show-sdk-path)
IOS_SIM_SDK=$(xcrun --sdk iphonesimulator --show-sdk-path)
ARCHS="arm64 x86_64"  # 真機 + 模擬器
MIN_IOS_VERSION="15.0"

cd "$WHISPER_CPP_DIR"

# 為每個架構編譯
for ARCH in $ARCHS; do
    if [ "$ARCH" = "arm64" ]; then
        SDK=$IOS_SDK
        HOST="aarch64-apple-darwin"
    else
        SDK=$IOS_SIM_SDK
        HOST="x86_64-apple-darwin"
    fi

    BUILD_ARCH_DIR="$BUILD_DIR/$ARCH"
    mkdir -p "$BUILD_ARCH_DIR"

    echo "Building for $ARCH..."

    cmake -B "$BUILD_ARCH_DIR" -S . \
        -DCMAKE_OSX_ARCHITECTURES="$ARCH" \
        -DCMAKE_OSX_SYSROOT="$SDK" \
        -DCMAKE_OSX_DEPLOYMENT_TARGET="$MIN_IOS_VERSION" \
        -DCMAKE_BUILD_TYPE=Release \
        -DWHISPER_BUILD_TESTS=OFF \
        -DWHISPER_BUILD_EXAMPLES=OFF \
        -DBUILD_SHARED_LIBS=OFF \
        -DCMAKE_INSTALL_PREFIX="$INSTALL_DIR/$ARCH"

    cmake --build "$BUILD_ARCH_DIR" --config Release --target whisper
    cmake --install "$BUILD_ARCH_DIR" --config Release
done

# 建立 Universal Library (lipo)
echo "Creating universal library..."
lipo -create \
    "$INSTALL_DIR/arm64/lib/libwhisper.a" \
    "$INSTALL_DIR/x86_64/lib/libwhisper.a" \
    -output "$INSTALL_DIR/lib/libwhisper.a"

# 複製 headers
cp -R "$INSTALL_DIR/arm64/include/"* "$INSTALL_DIR/include/"

# 複製到 Capacitor iOS 專案
IOS_PLUGIN_DIR="$CAPACITOR_DIR/ios/App/Plugins/Whisper"
mkdir -p "$IOS_PLUGIN_DIR/Frameworks"

cp "$INSTALL_DIR/lib/libwhisper.a" "$IOS_PLUGIN_DIR/Frameworks/"
cp -R "$INSTALL_DIR/include/"* "$IOS_PLUGIN_DIR/Frameworks/"

echo "=== iOS Whisper.cpp build complete ==="
echo "Library: $IOS_PLUGIN_DIR/Frameworks/libwhisper.a"
echo "Headers: $IOS_PLUGIN_DIR/Frameworks/"

# 驗證
lipo -info "$IOS_PLUGIN_DIR/Frameworks/libwhisper.a"