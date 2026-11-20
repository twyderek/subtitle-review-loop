// Whisper 原生插件 - Android Kotlin 實作
// 檔案位置: src/capacitor-app/plugins/whisper/android/src/main/java/com/subtitle/review/WhisperPlugin.kt

package com.subtitle.review

import android.content.Context
import android.util.Log
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

@CapacitorPlugin(name = "Whisper")
@NativePlugin()
class WhisperPlugin : Plugin() {

    private var whisperHandle: Long = 0
    private var isTranscribing = false
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
                    call.resolve(JSObject().put("success", true).put("model", modelName))
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
                val installed = File(modelPath).exists()
                call.resolve(JSObject().put("installed", installed).put("model", modelName))
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

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = WhisperJNI.transcribe(whisperHandle, audioPath, language)
                isTranscribing = false

                val segmentsArray = result.map { segment ->
                    JSObject()
                        .put("text", segment.text)
                        .put("start", segment.start)
                        .put("end", segment.end)
                }.toTypedArray()

                call.resolve(JSObject()
                    .put("segments", segmentsArray)
                    .put("language", result.firstOrNull()?.language ?: language)
                )
            } catch (e: Exception) {
                isTranscribing = false
                call.reject("Transcription failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun cancel(call: PluginCall) {
        isTranscribing = false
        WhisperJNI.cancel()
        call.resolve(JSObject().put("cancelled", true))
    }

    private fun getModelPath(modelFile: String): String {
        // 優先從 assets 載入 (內建模型)
        val assetPath = "models/$modelFile"
        val context: Context = activity!!
        val filesDir = context.filesDir.absolutePath
        val targetPath = "$filesDir/models/$modelFile"
        val targetFile = File(targetPath)

        if (targetFile.exists()) {
            return targetPath
        }

        // 從 assets 複製到 files 目錄
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
        // 使用 FFmpegPlugin 的 getVideoInfo 或直接呼叫 ffprobe
        // 這裡簡化返回 0，實際需整合 FFmpegKit
        return 0.0
    }

    // 進度回調 (從 JNI 呼叫)
    @Suppress("UNUSED_PARAMETER")
    fun onProgress(current: Int, total: Int, text: String, start: Double, end: Double) {
        if (!isTranscribing) return
        val progress = JSObject()
            .put("current", current)
            .put("total", total)
            .put("text", text)
            .put("start", start)
            .put("end", end)
        notifyListeners("progress", progress)
    }

    companion object {
        // JNI 宣告
        external fun loadModel(path: String): Long
        external fun transcribe(handle: Long, audioPath: String, language: String): List<TranscriptionSegment>
        external fun cancel()
    }

    data class TranscriptionSegment(
        val text: String,
        val start: Double,
        val end: Double,
        val language: String = "zh"
    )
}