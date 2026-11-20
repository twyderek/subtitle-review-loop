// Whisper 原生插件 - Android Kotlin 完整實作
// 檔案位置: src/capacitor-app/plugins/whisper/android/src/main/java/com/subtitle/review/WhisperPlugin.kt
//
// 依賴: FFmpegKit (com.arthenica:ffmpeg-kit-full-gpl) 用於音訊轉換與影片時長檢測
// whisper.cpp JNI 透過 CMake 編譯為 libwhisper.so

package com.subtitle.review

import android.content.Context
import android.util.Log
import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.FFmpegKitConfig
import com.arthenica.ffmpegkit.FFprobeKit
import com.arthenica.ffmpegkit.MediaInformation
import com.arthenica.ffmpegkit.Session
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.NativePlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream

@CapacitorPlugin(name = "Whisper")
@NativePlugin()
class WhisperPlugin : Plugin() {

    private var whisperHandle: Long = 0
    private var isTranscribing = false
    private var shouldCancel = false
    private val modelFiles = mapOf(
        "tiny" to "ggml-tiny.bin",
        "base" to "ggml-base.bin",
        "small" to "ggml-small.bin"
    )

    @PluginMethod
    fun loadModel(call: PluginCall) {
        val modelName = call.getString("model") ?: "small"
        val modelFile = modelFiles[modelName] ?: "ggml-small.bin"

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val modelPath = getModelPath(modelFile)
                val success = WhisperJNI.loadModel(modelPath)
                if (success > 0) {
                    whisperHandle = success
                    call.resolve(JSObject().put("success", true).put("model", modelName).put("path", modelPath))
                } else {
                    call.reject("Failed to load model: $modelName")
                }
            } catch (e: Exception) {
                call.reject("Error loading model: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun checkModel(call: PluginCall) {
        val modelName = call.getString("model") ?: "small"
        val modelFile = modelFiles[modelName] ?: "ggml-small.bin"

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val modelPath = getModelPath(modelFile)
                val file = File(modelPath)
                val installed = file.exists()
                val size = if (installed) file.length() else 0
                call.resolve(JSObject().put("installed", installed).put("model", modelName).put("size", size))
            } catch (e: Exception) {
                call.resolve(JSObject().put("installed", false).put("model", modelName))
            }
        }
    }

    @PluginMethod
    fun transcribe(call: PluginCall) {
        val audioPath = call.getString("audioPath") ?: return call.reject("Missing audioPath")
        val language = call.getString("language") ?: "zh"
        val modelName = call.getString("model") ?: "small"

        if (whisperHandle == 0L) {
            call.reject("Model not loaded. Call loadModel first.")
            return
        }

        // 驗證影片長度 (30 分鐘限制)
        val duration = getVideoDuration(audioPath)
        if (duration > 1800) {
            call.reject("Video exceeds 30 minutes limit (short video only)")
            return
        }

        isTranscribing = true
        shouldCancel = false

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = WhisperJNI.transcribe(whisperHandle, audioPath, language)
                isTranscribing = false
                shouldCancel = false

                val segmentsArray = result.map { segment ->
                    JSObject()
                        .put("text", segment.text)
                        .put("start", segment.start)
                        .put("end", segment.end)
                }.toTypedArray()

                call.resolve(JSObject()
                    .put("segments", segmentsArray)
                    .put("language", result.firstOrNull()?.language ?: language)
                    .put("duration", duration)
                )
            } catch (e: Exception) {
                isTranscribing = false
                shouldCancel = false
                call.reject("Transcription failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun cancel(call: PluginCall) {
        isTranscribing = false
        shouldCancel = true
        WhisperJNI.cancel()
        call.resolve(JSObject().put("cancelled", true))
    }

    private fun getModelPath(modelFile: String): String {
        // 1. 優先從 files 目錄載入 (已複製)
        val context: Context = activity!!
        val filesDir = context.filesDir.absolutePath
        val targetPath = "$filesDir/models/$modelFile"
        val targetFile = File(targetPath)

        if (targetFile.exists()) {
            return targetPath
        }

        // 2. 從 assets 複製到 files 目錄
        val assetPath = "models/$modelFile"
        targetFile.parentFile?.mkdirs()
        try {
            context.assets.open(assetPath).use { input ->
                targetFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            }
            return targetPath
        } catch (e: Exception) {
            Log.e("WhisperPlugin", "Failed to copy model from assets: ${e.message}")
            return targetPath
        }
    }

    private fun getVideoDuration(path: String): Double {
        // 使用 FFprobeKit 取得影片長度
        return try {
            val session = FFprobeKit.getMediaInformation(path)
            if (session.returnCode == 0) {
                val info = session.mediaInformation
                info?.duration ?: 0.0
            } else {
                0.0
            }
        } catch (e: Exception) {
            Log.e("WhisperPlugin", "FFprobe failed: ${e.message}")
            0.0
        }
    }

    // 進度回調 (從 JNI 呼叫)
    @Suppress("UNUSED_PARAMETER")
    fun onProgress(current: Int, total: Int, text: String, start: Double, end: Double) {
        if (!isTranscribing || shouldCancel) return
        val progress = JSObject()
            .put("current", current)
            .put("total", total)
            .put("text", text)
            .put("start", start)
            .put("end", end)
        notifyListeners("progress", progress)
    }

    // 取消標記 (從 JNI 呼叫)
    @Suppress("UNUSED_PARAMETER")
    fun checkCancelled(): Boolean {
        return shouldCancel
    }

    companion object {
        // JNI 宣告
        external fun loadModel(path: String): Long
        external fun transcribe(handle: Long, audioPath: String, language: String): List<TranscriptionSegment>
        external fun cancel()
        external fun checkCancelled(handle: Long): Boolean
    }

    data class TranscriptionSegment(
        val text: String,
        val start: Double,
        val end: Double,
        val language: String = "zh"
    )
}