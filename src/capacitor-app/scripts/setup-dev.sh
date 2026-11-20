#!/bin/bash
# 開發環境設置腳本
# 用法: bash scripts/setup-dev.sh

set -e

echo "=== 設置開發環境 ==="

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝，請先安裝 Node.js 20+"
    exit 1
fi
echo "✅ Node.js: $(node --version)"

# 檢查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安裝"
    exit 1
fi
echo "✅ npm: $(npm --version)"

# 安裝依賴
echo "📦 安裝 npm 依賴..."
cd "$(dirname "$0")/.."
npm ci

# 檢查 whisper.cpp submodule
if [ ! -d "../../whisper.cpp" ]; then
    echo "📥 初始化 whisper.cpp submodule..."
    cd ../..
    git submodule update --init --recursive
    cd src/capacitor-app
fi
echo "✅ whisper.cpp submodule 已就緒"

# 建置前端
echo "🔨 建置前端..."
npm run build

# Capacitor Sync
echo "🔄 Capacitor Sync..."
npx cap sync

echo ""
echo "=== 開發環境設置完成 ==="
echo ""
echo "下一步："
echo "  iOS (需 macOS):"
echo "    1. cd ios/App && pod install"
echo "    2. npm run cap:open:ios"
echo ""
echo "  Android:"
echo "    1. 設定 ANDROID_NDK_HOME"
echo "    2. npm run whisper:build:android"
echo "    3. npm run cap:open:android"
echo ""
echo "啟動開發伺服器: npm run dev"