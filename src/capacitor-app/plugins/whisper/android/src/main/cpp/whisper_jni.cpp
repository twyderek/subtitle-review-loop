// Whisper JNI 橋接 - Android 原生層
// 檔案位置: src/capacitor-app/plugins/whisper/android/src/main/cpp/whisper_jni.cpp

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

    // 載入音訊檔案 (需要實作音訊解碼)
    // 這裡簡化：假設已經是 16kHz mono float32 PCM
    std::vector<float> audioData;
    // TODO: 實作音訊載入 - 可使用 FFmpegKit 或 Android MediaCodec

    // 設定推理參數
    struct whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    params.language = const_cast<char*>(language);
    params.translate = false;
    params.print_progress = false;
    params.print_realtime = false;
    params.print_timestamps = true;
    params.no_timestamps = false;

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
        env->DeleteLocalRef(segmentObj);
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