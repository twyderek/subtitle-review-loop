// Android Whisper 模型檔案放置說明
// 
// 執行 npm run whisper:build:android 後，會在以下目錄生成 libwhisper.so：
// - android/app/src/main/jniLibs/arm64-v8a/libwhisper.so
// - android/app/src/main/jniLibs/armeabi-v7a/libwhisper.so
// - android/app/src/main/jniLibs/x86_64/libwhisper.so
// - android/app/src/main/jniLibs/x86/libwhisper.so
//
// 模型檔案 (ggml-small.bin) 需放置在：
// - android/app/src/main/assets/models/ggml-small.bin
//
// 或者在應用首次啟動時從 assets 複製到 files 目錄

// 此檔案僅作為佔位，確保目錄存在