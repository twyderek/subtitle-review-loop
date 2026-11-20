# CMakeLists.txt for Android Whisper JNI (完整版)
# 檔案位置: src/capacitor-app/plugins/whisper/android/src/main/cpp/CMakeLists.txt

cmake_minimum_required(VERSION 3.18.2)
project("whisper_jni" LANGUAGES C CXX)

# 設定 C++ 標準
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# 包含目錄
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../../../../whisper.cpp/include
)

# 尋找 whisper.cpp 庫
# 從預建的 jniLibs 複製或編譯 whisper.cpp
set(WHISPER_LIB_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../android/whisper-install-${ANDROID_ABI})

# 建立 JNI 共享庫
add_library(whisper_jni SHARED whisper_jni.cpp)

# 連結 whisper 庫
# target_link_libraries(whisper_jni PRIVATE whisper)
target_link_libraries(whisper_jni PRIVATE log)

# 設定輸出名稱
set_target_properties(whisper_jni PROPERTIES OUTPUT_NAME "whisper_jni")

# 編譯選項
target_compile_options(whisper_jni PRIVATE
    -Wall
    -Wextra
    -Wno-unused-parameter
    -DANDROID
)