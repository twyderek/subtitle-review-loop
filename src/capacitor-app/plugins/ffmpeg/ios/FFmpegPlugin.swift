// FFmpeg 原生插件 - iOS Swift 實作
// 檔案位置: src/capacitor-app/plugins/ffmpeg/ios/FFmpegPlugin.swift
//
// 依賴: FFmpegKit (pod 'FFmpegKit') or MobileFFmpeg

import Foundation
import Capacitor

@objc(FFmpegPlugin)
public class FFmpegPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FFmpegPlugin"
    public let jsName = "FFmpeg"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getVideoInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "burnSubtitles", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generateSample", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "execute", returnType: CAPPluginReturnPromise),
    ]

    private let queue = DispatchQueue(label: "com.subtitle.review.ffmpeg", qos: .userInitiated)

    // MARK: - Public Methods

    @objc func getVideoInfo(_ call: CAPPluginCall) {
        guard let path = call.getString("path") else {
            call.reject("Missing path")
            return
        }

        queue.async {
            // 使用 FFmpegKit 取得媒體資訊
            // 實際需整合 FFmpegKit
            let info = self.getMediaInfo(path)
            DispatchQueue.main.async {
                call.resolve(info)
            }
        }
    }

    @objc func burnSubtitles(_ call: CAPPluginCall) {
        guard let videoPath = call.getString("videoPath"),
              let subtitlePath = call.getString("subtitlePath"),
              let outputPath = call.getString("outputPath"),
              let settings = call.getObject("settings") else {
            call.reject("Missing required parameters")
            return
        }

        queue.async {
            do {
                let result = try self.burnSubtitles(
                    videoPath: videoPath,
                    subtitlePath: subtitlePath,
                    outputPath: outputPath,
                    settings: settings
                )
                DispatchQueue.main.async {
                    call.resolve(["outputPath": result])
                }
            } catch {
                DispatchQueue.main.async {
                    call.reject("Burn subtitles failed: \(error.localizedDescription)")
                }
            }
        }
    }

    @objc func generateSample(_ call: CAPPluginCall) {
        guard let videoPath = call.getString("videoPath"),
              let subtitlePath = call.getString("subtitlePath"),
              let outputPath = call.getString("outputPath"),
              let settings = call.getObject("settings") else {
            call.reject("Missing required parameters")
            return
        }

        let startTime = call.getDouble("startTime") ?? 10.0
        let duration = call.getDouble("duration") ?? 20.0

        queue.async {
            do {
                let result = try self.generateSample(
                    videoPath: videoPath,
                    subtitlePath: subtitlePath,
                    outputPath: outputPath,
                    settings: settings,
                    startTime: startTime,
                    duration: duration
                )
                DispatchQueue.main.async {
                    call.resolve(["outputPath": result])
                }
            } catch {
                DispatchQueue.main.async {
                    call.reject("Generate sample failed: \(error.localizedDescription)")
                }
            }
        }
    }

    @objc func execute(_ call: CAPPluginCall) {
        guard let command = call.getString("command") else {
            call.reject("Missing command")
            return
        }

        queue.async {
            let result = self.executeFFmpeg(command)
            DispatchQueue.main.async {
                call.resolve(result)
            }
        }
    }

    // MARK: - Private Methods

    private func getMediaInfo(_ path: String) -> [String: Any] {
        // 實際需整合 FFmpegKit
        // 這裡返回模擬資料
        return [
            "duration": 0.0,
            "width": 0,
            "height": 0,
            "codec": "",
            "bitrate": 0,
            "format": "",
        ]
    }

    private func burnSubtitles(
        videoPath: String,
        subtitlePath: String,
        outputPath: String,
        settings: [String: Any]
    ) throws -> String {
        // 組裝 FFmpeg 指令
        let fontFamily = settings["fontFamily"] as? String ?? "Microsoft JhengHei"
        let fontSize = settings["fontSize"] as? Int ?? 18
        let fontColor = settings["fontColor"] as? String ?? "#ffffff"
        let outlineColor = settings["outlineColor"] as? String ?? "#000000"
        let outlineWidth = settings["outlineWidth"] as? Double ?? 2.0
        let position = settings["position"] as? String ?? "bottom"
        let marginV = settings["marginV"] as? Int ?? 30
        let bold = settings["bold"] as? Bool ?? true
        let alignment = settings["alignment"] as? Int ?? 2

        let style = buildForceStyle(
            fontFamily: fontFamily,
            fontSize: fontSize,
            fontColor: fontColor,
            outlineColor: outlineColor,
            outlineWidth: outlineWidth,
            bold: bold,
            alignment: alignment,
            marginV: marginV
        )

        let command = "ffmpeg -y -i \"\(videoPath)\" -vf \"subtitles='\(subtitlePath)':force_style='\(style)'\" -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart \"\(outputPath)\""

        // 實際需呼叫 FFmpegKit 執行
        // let session = FFmpegKit.execute(command)
        // if session.getReturnCode() != 0 { throw ... }

        print("[FFmpegPlugin] Burn command: \(command)")
        return outputPath
    }

    private func generateSample(
        videoPath: String,
        subtitlePath: String,
        outputPath: String,
        settings: [String: Any],
        startTime: Double,
        duration: Double
    ) throws -> String {
        let fontFamily = settings["fontFamily"] as? String ?? "Microsoft JhengHei"
        let fontSize = settings["fontSize"] as? Int ?? 18
        let fontColor = settings["fontColor"] as? String ?? "#ffffff"
        let outlineColor = settings["outlineColor"] as? String ?? "#000000"
        let outlineWidth = settings["outlineWidth"] as? Double ?? 2.0
        let bold = settings["bold"] as? Bool ?? true
        let alignment = settings["alignment"] as? Int ?? 2

        let style = buildForceStyle(
            fontFamily: fontFamily,
            fontSize: fontSize,
            fontColor: fontColor,
            outlineColor: outlineColor,
            outlineWidth: outlineWidth,
            bold: bold,
            alignment: alignment,
            marginV: settings["marginV"] as? Int ?? 30
        )

        let command = "ffmpeg -y -ss \(startTime) -t \(duration) -i \"\(videoPath)\" -vf \"subtitles='\(subtitlePath)':force_style='\(style)'\" -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart \"\(outputPath)\""

        print("[FFmpegPlugin] Sample command: \(command)")
        return outputPath
    }

    private func executeFFmpeg(_ command: String) -> [String: Any] {
        // 實際需呼叫 FFmpegKit
        // let session = FFmpegKit.execute(command)
        return [
            "output": "",
            "exitCode": 0
        ]
    }

    private func buildForceStyle(
        fontFamily: String,
        fontSize: Int,
        fontColor: String,
        outlineColor: String,
        outlineWidth: Double,
        bold: Bool,
        alignment: Int,
        marginV: Int
    ) -> String {
        func hexToAss(_ hex: String) -> String {
            let clean = hex.replacingOccurrences(of: "#", with: "")
            return "&H00\(clean.suffix(2))\(clean.dropFirst(2).prefix(2))\(clean.prefix(2))".uppercased()
        }

        return [
            "FontName=\(fontFamily)",
            "FontSize=\(fontSize)",
            "Bold=\(bold ? 1 : 0)",
            "PrimaryColour=\(hexToAss(fontColor))",
            "OutlineColour=\(hexToAss(outlineColor))",
            "BorderStyle=1",
            "Outline=\(outlineWidth)",
            "Shadow=0",
            "Alignment=\(alignment)",
            "MarginV=\(marginV)",
        ].joined(separator: ",")
    }
}