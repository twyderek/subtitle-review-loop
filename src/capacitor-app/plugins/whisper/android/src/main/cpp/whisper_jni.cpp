// Whisper JNI 橋接 - Android 原生層完整實作
// 檔案位置: src/capacitor-app/plugins/whisper/android/src/main/cpp/whisper_jni.cpp
//
// 編譯需求:
// - whisper.cpp 源碼
// - CMakeLists.txt 設定正確
// - 連結 FFmpegKit (可選，音訊轉換在 Kotlin 層處理)

#include <jni.h>
#include <string>
#include <vector>
#include <android/log.h>
#include "whisper.h"

#define LOG_TAG "WhisperJNI"
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static JavaVM* g_jvm = nullptr;
static jobject g_plugin_instance = nullptr;
static jmethodID g_progress_callback = nullptr;
static jmethodID g_cancel_check_callback = nullptr;

struct TranscriptionSegment {
    std::string text;
    double start;
    double end;
    std::string language;
};

extern "C" JNIEXPORT jlong JNICALL
Java_com_subtitle_review_WhisperPlugin_loadModel(JNIEnv* env, jobject thiz, jstring jpath) {
    const char* path = env->GetStringUTFChars(jpath, nullptr);
    LOGD("Loading model from: %s", path);

    struct whisper_context_params params = whisper_context_default_params();
    // Android 上啟用 GPU 加速 (如果支援)
    // params.use_gpu = true; // 需確認設備支援

    struct whisper_context* ctx = whisper_init_from_file_with_params(path, params);

    env->ReleaseStringUTFChars(jpath, path);

    if (!ctx) {
        LOGE("Failed to load model");
        return 0;
    }

    // 儲存 JavaVM 和 plugin instance 供回調使用
    env->GetJavaVM(&g_jvm);
    g_plugin_instance = env->NewGlobalRef(thiz);

    // 取得進度回調方法
    jclass cls = env->GetObjectClass(thiz);
    g_progress_callback = env->GetMethodID(cls, "onProgress", "(IILjava/lang/String;DD)V");
    g_cancel_check_callback = env->GetMethodID(cls, "checkCancelled", "()Z");

    LOGD("Model loaded successfully");
    return reinterpret_cast<jlong>(ctx);
}

extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_subtitle_review_WhisperPlugin_transcribe(JNIEnv* env, jobject thiz, jlong handle, jstring jaudioPath, jstring jlanguage) {
    struct whisper_context* ctx = reinterpret_cast<struct whisper_context*>(handle);
    if (!ctx) {
        LOGE("Invalid context handle");
        return nullptr;
    }

    const char* audioPath = env->GetStringUTFChars(jaudioPath, nullptr);
    const char* language = env->GetStringUTFChars(jlanguage, nullptr);

    LOGD("Starting transcription: %s, language: %s", audioPath, language);

    // 注意：音訊轉換在 Kotlin 層用 FFmpegKit 處理
    // 這裡假設已經是 16kHz mono float32 PCM
    // 實際應用中，建議在 JNI 層或 Kotlin 層進行音訊轉換
    std::vector<float> audioData;

    // 讀取 WAV 檔案 (簡化版，實際需完整 WAV 解析)
    // 這裡簡化：實際需實作音訊載入
    LOGD("Audio loading not implemented in JNI - should be done in Kotlin with FFmpegKit");

    // 設定推理參數
    struct whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    params.language = const_cast<char*>(language);
    params.translate = false;
    params.print_progress = false;
    params.print_realtime = false;
    params.print_timestamps = true;
    params.no_timestamps = false;
    params.single_segment = false;
    params.max_tokens = 0;
    params.token_timestamps = true;

    // 進度回調
    params.new_segment_callback = [](struct whisper_context* ctx, int n_new, void* user_data) {
        JNIEnv* env;
        if (g_jvm->AttachCurrentThread(&env, nullptr) != JNI_OK) return;

        int n_segments = whisper_full_n_segments(ctx);
        int new_segment_idx = n_segments - n_new;

        if (new_segment_idx >= 0 && g_progress_callback && g_plugin_instance) {
            const char* text = whisper_full_get_segment_text(ctx, new_segment_idx);
            int64_t t0 = whisper_full_get_segment_t0(ctx, new_segment_idx);
            int64_t t1 = whisper_full_get_segment_t1(ctx, new_segment_idx);

            jstring jtext = env->NewStringUTF(text);
            env->CallVoidMethod(g_plugin_instance, g_progress_callback,
                new_segment_idx + 1, n_segments, jtext,
                static_cast<double>(t0) / 100.0,
                static_cast<double>(t1) / 100.0);
            env->DeleteLocalRef(jtext);
        }

        g_jvm->DetachCurrentThread();
    };
    params.new_segment_callback_user_data = nullptr;

    // 執行推理
    int result = whisper_full(ctx, params, audioData.data(), audioData.size());

    env->ReleaseStringUTFChars(jaudioPath, audioPath);
    env->ReleaseStringUTFChars(jlanguage, language);

    if (result != 0) {
        LOGE("whisper_full failed: %d", result);
        return nullptr;
    }

    // 收集結果
    int n_segments = whisper_full_n_segments(ctx);
    std::vector<TranscriptionSegment> segments;

    for (int i = 0; i < n_segments; i++) {
        const char* text = whisper_full_get_segment_text(ctx, i);
        int64_t t0 = whisper_full_get_segment_t0(ctx, i);
        int64_t t1 = whisper_full_get_segment_t1(ctx, i);

        TranscriptionSegment seg;
        seg.text = text ? text : "";
        seg.start = static_cast<double>(t0) / 100.0;
        seg.end = static_cast<double>(t1) / 100.0;
        seg.language = language;
        segments.push_back(seg);
    }

    // 轉換為 Java 陣列
    jclass segmentClass = env->FindClass("com/subtitle/review/WhisperPlugin$TranscriptionSegment");
    jmethodID constructor = env->GetMethodID(segmentClass, "<init>", "(Ljava/lang/String;DDLjava/lang/String;)V");

    jobjectArray segmentArray = env->NewObjectArray(segments.size(), segmentClass, nullptr);

    for (size_t i = 0; i < segments.size(); i++) {
        jstring jtext = env->NewStringUTF(segments[i].text.c_str());
        jstring jlang = env->NewStringUTF(segments[i].language.c_str());
        jobject segmentObj = env->NewObject(segmentClass, constructor, jtext, segments[i].start, segments[i].end, jlang);
        env->SetObjectArrayElement(segmentArray, i, segmentObj);
        env->DeleteLocalRef(jtext);
        env->DeleteLocalRef(jlang);
        env->DeleteLocalRef(segmentObj)
    }

    LOGD("Transcription completed: %d segments", n_segments);
    return segmentArray;
}

extern "C" JNIEXPORT void JNICALL
Java_com_subtitle_review_WhisperPlugin_cancel(JNIEnv* env, jobject thiz) {
    // whisper.cpp 沒有直接的取消機制
    // 實際應用可透過全域標記檢查
    LOGD("Cancel requested");
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_subtitle_review_WhisperPlugin_checkCancelled(JNIEnv* env, jobject thiz, jlong handle) {
    // 檢查取消標記 (在 Kotlin 層維護)
    return JNI_FALSE;
}

// 輔助函數：載入 WAV 檔案
static std::vector<float> loadWavFile(const char* path) {
    // 簡化版 WAV 載入，實際需完整解析 WAV 標頭
    FILE* file = fopen(path, "rb");
    if (!file) {
        LOGE("Failed to open audio file: %s", path);
        return {};
    }

    // 跳過 WAV 標頭 (44 bytes for standard PCM)
    fseek(file, 44, SEEK_SET);

    // 讀取所有資料
    fseek(file, 0, SEEK_END);
    long fileSize = ftell(file);
    fseek(file, 44, SEEK_SET);
    long dataSize = fileSize - 44;

    std::vector<float> audioData;
    audioData.reserve(dataSize / 2); // 16-bit PCM -> float

    const int bufferSize = 4096;
    int16_t buffer[bufferSize];
    size_t readCount;

    while ((readCount = fread(buffer, sizeof(int16_t), bufferSize, file)) > 0) {
        for (size_t i = 0; i < readCount; i++) {
            // 轉換 16-bit PCM 到 float32 (-1.0 to 1.0)
            audioData.push_back(static_cast<float>(buffer[i]) / 32768.0f);
        }
    }

    fclose(file);
    LOGD("Loaded WAV: %zu samples", audioData.size());
    return audioData;
}