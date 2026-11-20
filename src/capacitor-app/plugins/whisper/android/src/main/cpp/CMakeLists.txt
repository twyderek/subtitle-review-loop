# CMakeLists.txt for Android Whisper JNI
# 檔案位置: src/capacitor-app/plugins/whisper/android/src/main/cpp/CMakeLists.txt

cmake_minimum_required(VERSION 3.18.2)
project("whisper_jni" LANGUAGES C CXX)

# 設定 C++ 標準
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 包含目錄
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../../../../whisper.cpp/include
)

# 尋找 whisper.cpp 庫
# 假設 whisper.cpp 已編譯為 static library
set(WHISPER_LIB_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../../whisper.cpp/build-android-${ANDROID_ABI})

# 如果 whisper.cpp 尚未編譯，這裡可以加入編譯步驟
# 簡化版：直接編譯 whisper.cpp 來源 (需下載 whisper.cpp 源碼)

# 加入 whisper.cpp 來源 (建議使用 git submodule)
# add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../../../whisper.cpp)

# 建立 JNI 共享庫
add_library(whisper_jni SHARED whisper_jni.cpp)

# 連結 whisper 庫
# target_link_libraries(whisper_jni PRIVATE whisper)
target_link_libraries(whisper_jni PRIVATE log)

# 設定輸出名稱
set_target_properties(whisper_jni PROPERTIES OUTPUT_NAME "whisper_jni")