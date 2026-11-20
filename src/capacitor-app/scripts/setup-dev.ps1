#!/usr/bin/env pwsh
# 開發環境設置腳本 (Windows PowerShell)
# 用法: .\scripts\setup-dev.ps1

param(
    [switch]$SkipPodInstall
)

Write-Host "=== 設置開發環境 ===" -ForegroundColor Cyan

# 檢查 Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js 未安裝，請先安裝 Node.js 20+" -ForegroundColor Red
    exit 1
}

# 檢查 npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm 未安裝" -ForegroundColor Red
    exit 1
}

# 安裝依賴
Write-Host "📦 安裝 npm 依賴..." -ForegroundColor Yellow
cd "$PSScriptRoot\.."
npm ci

# 檢查 whisper.cpp submodule
if (-not (Test-Path "..\..\whisper.cpp")) {
    Write-Host "📥 初始化 whisper.cpp submodule..." -ForegroundColor Yellow
    cd ..\..
    git submodule update --init --recursive
    cd src\capacitor-app
} else {
    Write-Host "✅ whisper.cpp submodule 已就緒" -ForegroundColor Green
}

# 建置前端
Write-Host "🔨 建置前端..." -ForegroundColor Yellow
npm run build

# Capacitor Sync
Write-Host "🔄 Capacitor Sync..." -ForegroundColor Yellow
npx cap sync

Write-Host ""
Write-Host "=== 開發環境設置完成 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "  iOS (需 macOS):" -ForegroundColor Gray
Write-Host "    1. cd ios\App && pod install" -ForegroundColor Gray
Write-Host "    2. npm run cap:open:ios" -ForegroundColor Gray
Write-Host ""
Write-Host "  Android:" -ForegroundColor Gray
Write-Host "    1. 設定 ANDROID_NDK_HOME (例如: `$env:ANDROID_NDK_HOME = '~\AppData\Local\Android\Sdk\ndk\26.1.10909125'`) " -ForegroundColor Gray
Write-Host "    2. npm run whisper:build:android" -ForegroundColor Gray
Write-Host "    3. npm run cap:open:android" -ForegroundColor Gray
Write-Host ""
Write-Host "啟動開發伺服器: npm run dev" -ForegroundColor Cyan