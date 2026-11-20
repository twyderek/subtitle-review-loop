// FFmpeg 原生插件橋接 - 使用 FFmpegKit
// 檔案位置: src/capacitor-app/plugins/ffmpeg/FFmpegPlugin.ts

import { CapacitorPlugin, PluginMethod } from '@capacitor/core';

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  format: string;
}

export interface BurnSubtitlesParams {
  videoPath: string;
  subtitlePath: string;
  outputPath: string;
  settings: {
    fontFamily: string;
    fontSize: number;
    fontColor: string;
    outlineColor: string;
    outlineWidth: number;
    position: 'top' | 'middle' | 'bottom';
    marginV: number;
    bold: boolean;
    alignment: number;
  };
}

export interface GenerateSampleParams extends BurnSubtitlesParams {
  startTime?: number;
  duration?: number;
}

@CapacitorPlugin(name: 'FFmpeg')
export class FFmpegPlugin {
  /**
   * 取得影片資訊 (含長度，用於 30min 驗證)
   */
  @PluginMethod()
  async getVideoInfo(params: { path: string }): Promise<VideoInfo> {
    // 實際呼叫 FFmpegKit.getMediaInformation
    // 這裡返回模擬值，實際需在原生層實作
    return {
      duration: 0,
      width: 0,
      height: 0,
      codec: '',
      bitrate: 0,
      format: '',
    };
  }

  /**
   * 燒錄字幕到影片
   */
  @PluginMethod()
  async burnSubtitles(params: BurnSubtitlesParams): Promise<{ outputPath: string }> {
    // 組裝 FFmpeg 指令
    const command = this.buildBurnCommand(params);

    // 執行 FFmpegKit
    // const result = await FFmpegKit.executeAsync(command);
    // if (result.getReturnCode() !== 0) throw new Error(result.getOutput());

    return { outputPath: params.outputPath };
  }

  /**
   * 產生預覽短片
   */
  @PluginMethod()
  async generateSample(params: GenerateSampleParams): Promise<{ outputPath: string }> {
    const { startTime = 10, duration = 20, ...burnParams } = params;
    const command = this.buildSampleCommand(burnParams, startTime, duration);

    // const result = await FFmpegKit.executeAsync(command);
    // if (result.getReturnCode() !== 0) throw new Error(result.getOutput());

    return { outputPath: params.outputPath };
  }

  /**
   * 執行自訂 FFmpeg 指令
   */
  @PluginMethod()
  async execute(params: { command: string }): Promise<{ output: string; exitCode: number }> {
    // const result = await FFmpegKit.executeAsync(params.command);
    // return { output: result.getOutput(), exitCode: result.getReturnCode() };
    return { output: '', exitCode: 0 };
  }

  private buildBurnCommand(params: BurnSubtitlesParams): string {
    const { videoPath, subtitlePath, outputPath, settings } = params;
    const style = this.buildForceStyle(settings);

    return `ffmpeg -y -i "${videoPath}" -vf "subtitles='${subtitlePath}':force_style='${style}'" -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`;
  }

  private buildSampleCommand(params: BurnSubtitlesParams, startTime: number, duration: number): string {
    const { videoPath, subtitlePath, outputPath, settings } = params;
    const style = this.buildForceStyle(settings);

    return `ffmpeg -y -ss ${startTime} -t ${duration} -i "${videoPath}" -vf "subtitles='${subtitlePath}':force_style='${style}'" -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`;
  }

  private buildForceStyle(settings: BurnSubtitlesParams['settings']): string {
    const hexToAss = (hex: string) => {
      const clean = hex.replace('#', '');
      return `&H00${clean.slice(4,6)}${clean.slice(2,4)}${clean.slice(0,2)}`.toUpperCase();
    };

    return [
      `FontName=${settings.fontFamily}`,
      `FontSize=${settings.fontSize}`,
      `Bold=${settings.bold ? 1 : 0}`,
      `PrimaryColour=${hexToAss(settings.fontColor)}`,
      `OutlineColour=${hexToAss(settings.outlineColor)}`,
      'BorderStyle=1',
      `Outline=${settings.outlineWidth}`,
      'Shadow=0',
      `Alignment=${settings.alignment}`,
      `MarginV=${settings.marginV}`,
    ].join(',');
  }
}

// iOS 實作參考 (Swift)
/*
import Foundation
import Capacitor
import FFmpegKit

@objc(FFmpegPlugin)
public class FFmpegPlugin: CAPPlugin {
    @objc func getVideoInfo(_ call: CAPPluginCall) {
        guard let path = call.getString("path") else { call.reject("Missing path"); return }
        FFmpegKit.getMediaInformationAsync(path) { session in
            let info = session.getMediaInformation()
            call.resolve([
                "duration": info?.getDuration() ?? 0,
                "width": info?.getStreams().first?.getWidth() ?? 0,
                "height": info?.getStreams().first?.getHeight() ?? 0,
                "codec": info?.getStreams().first?.getCodec() ?? "",
                "bitrate": info?.getBitrate() ?? 0,
                "format": info?.getFormat() ?? "",
            ])
        }
    }

    @objc func burnSubtitles(_ call: CAPPluginCall) {
        // 參數解析與指令組裝...
        FFmpegKit.executeAsync(command) { session in
            if session.getReturnCode() == 0 {
                call.resolve(["outputPath": outputPath])
            } else {
                call.reject("FFmpeg failed: \(session.getOutput())")
            }
        }
    }
}
*/

// Android 實作參考 (Kotlin)
/*
package com.subtitle.review

import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.FFmpegKitConfig
import com.arthenica.ffmpegkit.Session
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
            val session = FFmpegKit.getMediaInformation(path)
            val info = session.getMediaInformation()
            call.resolve(JSObject()
                .put("duration", info?.getDuration() ?: 0)
                .put("width", info?.getStreams()?.firstOrNull()?.getWidth() ?: 0)
                .put("height", info?.getStreams()?.firstOrNull()?.getHeight() ?: 0)
                .put("codec", info?.getStreams()?.firstOrNull()?.getCodec() ?: "")
                .put("bitrate", info?.getBitrate() ?: 0)
                .put("format", info?.getFormat() ?: "")
            )
        }
    }

    @PluginMethod
    fun burnSubtitles(call: PluginCall) {
        // 參數解析...
        CoroutineScope(Dispatchers.IO).launch {
            val session = FFmpegKit.executeAsync(command)
            if (session.getReturnCode() == 0) {
                call.resolve(JSObject().put("outputPath", outputPath))
            } else {
                call.reject("FFmpeg failed: ${session.getOutput()}")
            }
        }
    }
}
*/