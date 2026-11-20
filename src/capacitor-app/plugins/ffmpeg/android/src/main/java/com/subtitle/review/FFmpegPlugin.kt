// FFmpeg 原生插件 - Android Kotlin 實作
// 檔案位置: src/capacitor-app/plugins/ffmpeg/android/src/main/java/com/subtitle/review/FFmpegPlugin.kt
//
// 依賴: FFmpegKit (com.arthenica:ffmpeg-kit-full-gpl)

package com.subtitle.review

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

@CapacitorPlugin(name = "FFmpeg")
@NativePlugin()
class FFmpegPlugin : Plugin() {

    @PluginMethod
    fun getVideoInfo(call: PluginCall) {
        val path = call.getString("path") ?: return call.reject("Missing path")

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val session = FFprobeKit.getMediaInformation(path)
                if (session.returnCode == 0) {
                    val info = session.mediaInformation
                    val videoStream = info?.getStreams()?.firstOrNull { it.mediaType == "video" }

                    call.resolve(JSObject()
                        .put("duration", info?.duration ?: 0.0)
                        .put("width", videoStream?.width ?: 0)
                        .put("height", videoStream?.height ?: 0)
                        .put("codec", videoStream?.codec ?: "")
                        .put("bitrate", info?.bitrate ?: 0)
                        .put("format", info?.format ?: "")
                    )
                } else {
                    call.reject("FFprobe failed: ${session.output}")
                }
            } catch (e: Exception) {
                call.reject("Error getting video info: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun burnSubtitles(call: PluginCall) {
        val videoPath = call.getString("videoPath") ?: return call.reject("Missing videoPath")
        val subtitlePath = call.getString("subtitlePath") ?: return call.reject("Missing subtitlePath")
        val outputPath = call.getString("outputPath") ?: return call.reject("Missing outputPath")
        val settings = call.getObject("settings") ?: return call.reject("Missing settings")

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = burnSubtitles(videoPath, subtitlePath, outputPath, settings)
                call.resolve(JSObject().put("outputPath", result))
            } catch (e: Exception) {
                call.reject("Burn subtitles failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun generateSample(call: PluginCall) {
        val videoPath = call.getString("videoPath") ?: return call.reject("Missing videoPath")
        val subtitlePath = call.getString("subtitlePath") ?: return call.reject("Missing subtitlePath")
        val outputPath = call.getString("outputPath") ?: return call.reject("Missing outputPath")
        val settings = call.getObject("settings") ?: return call.reject("Missing settings")
        val startTime = call.getDouble("startTime") ?: 10.0
        val duration = call.getDouble("duration") ?: 20.0

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = generateSample(videoPath, subtitlePath, outputPath, settings, startTime, duration)
                call.resolve(JSObject().put("outputPath", result))
            } catch (e: Exception) {
                call.reject("Generate sample failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun execute(call: PluginCall) {
        val command = call.getString("command") ?: return call.reject("Missing command")

        CoroutineScope(Dispatchers.IO).launch {
            val session = FFmpegKit.execute(command)
            call.resolve(JSObject()
                .put("output", session.output)
                .put("exitCode", session.returnCode)
            )
        }
    }

    private fun burnSubtitles(
        videoPath: String,
        subtitlePath: String,
        outputPath: String,
        settings: Map<String, Any>
    ): String {
        val fontFamily = settings["fontFamily"] as? String ?: "Microsoft JhengHei"
        val fontSize = settings["fontSize"] as? Int ?: 18
        val fontColor = settings["fontColor"] as? String ?: "#ffffff"
        val outlineColor = settings["outlineColor"] as? String ?: "#000000"
        val outlineWidth = settings["outlineWidth"] as? Double ?: 2.0
        val position = settings["position"] as? String ?: "bottom"
        val marginV = settings["marginV"] as? Int ?: 30
        val bold = settings["bold"] as? Boolean ?: true
        val alignment = settings["alignment"] as? Int ?: 2

        val style = buildForceStyle(
            fontFamily = fontFamily,
            fontSize = fontSize,
            fontColor = fontColor,
            outlineColor = outlineColor,
            outlineWidth = outlineWidth,
            bold = bold,
            alignment = alignment,
            marginV = marginV
        )

        val command = "ffmpeg -y -i \"$videoPath\" -vf \"subtitles='$subtitlePath':force_style='$style'\" -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart \"$outputPath\""

        val session = FFmpegKit.execute(command)
        if (session.returnCode != 0) {
            throw RuntimeException("FFmpeg failed: ${session.output}")
        }

        return outputPath
    }

    private fun generateSample(
        videoPath: String,
        subtitlePath: String,
        outputPath: String,
        settings: Map<String, Any>,
        startTime: Double,
        duration: Double
    ): String {
        val fontFamily = settings["fontFamily"] as? String ?: "Microsoft JhengHei"
        val fontSize = settings["fontSize"] as? Int ?: 18
        val fontColor = settings["fontColor"] as? String ?: "#ffffff"
        val outlineColor = settings["outlineColor"] as? String ?: "#000000"
        val outlineWidth = settings["outlineWidth"] as? Double ?: 2.0
        val bold = settings["bold"] as? Boolean ?: true
        val alignment = settings["alignment"] as? Int ?: 2
        val marginV = settings["marginV"] as? Int ?: 30

        val style = buildForceStyle(
            fontFamily = fontFamily,
            fontSize = fontSize,
            fontColor = fontColor,
            outlineColor = outlineColor,
            outlineWidth = outlineWidth,
            bold = bold,
            alignment = alignment,
            marginV = marginV
        )

        val command = "ffmpeg -y -ss $startTime -t $duration -i \"$videoPath\" -vf \"subtitles='$subtitlePath':force_style='$style'\" -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart \"$outputPath\""

        val session = FFmpegKit.execute(command)
        if (session.returnCode != 0) {
            throw RuntimeException("FFmpeg failed: ${session.output}")
        }

        return outputPath
    }

    private fun buildForceStyle(
        fontFamily: String,
        fontSize: Int,
        fontColor: String,
        outlineColor: String,
        outlineWidth: Double,
        bold: Boolean,
        alignment: Int,
        marginV: Int
    ): String {
        fun hexToAss(hex: String): String {
            val clean = hex.removePrefix("#")
            return "&H00${clean.substring(4, 6)}${clean.substring(2, 4)}${clean.substring(0, 2)}".uppercase()
        }

        return buildList {
            add("FontName=$fontFamily")
            add("FontSize=$fontSize")
            add("Bold=${if (bold) 1 else 0}")
            add("PrimaryColour=${hexToAss(fontColor)}")
            add("OutlineColour=${hexToAss(outlineColor)}")
            add("BorderStyle=1")
            add("Outline=$outlineWidth")
            add("Shadow=0")
            add("Alignment=$alignment")
            add("MarginV=$marginV")
        }.joinToString(",")
    }
}