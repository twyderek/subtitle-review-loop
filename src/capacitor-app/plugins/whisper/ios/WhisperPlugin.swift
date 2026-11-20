// Whisper 原生插件 - iOS Swift 實作
// 檔案位置: src/capacitor-app/plugins/whisper/ios/WhisperPlugin.swift

import Foundation
import Capacitor

@objc(WhisperPlugin)
public class WhisperPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WhisperPlugin"
    public let jsName = "Whisper"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "loadModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "transcribe", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
    ]

    private var whisperContext: OpaquePointer?
    private var isTranscribing = false
    private var progressCallback: (([String: Any]) -> Void)?
    private let queue = DispatchQueue(label: "com.subtitle.review.whisper", qos: .userInitiated)

    // 模型路徑對應
    private let modelPaths: [String: String] = [
        "tiny": "ggml-tiny.bin",
        "base": "ggml-base.bin",
        "small": "ggml-small.bin",
    ]

    @objc func loadModel(_ call: CAPPluginCall) {
        guard let modelName = call.getString("model"),
              let modelFile = modelPaths[modelName] else {
            call.reject("Invalid model name")
            return
        }

        queue.async {
            do {
                let modelPath = try self.getModelPath(modelFile)
                let result = self.loadWhisperModel(modelPath)
                DispatchQueue.main.async {
                    if result {
                        call.resolve(["success": true, "model": modelName])
                    } else {
                        call.reject("Failed to load model: \(modelName)")
                    }
                }
            } catch {
                DispatchQueue.main.async {
                    call.reject("Error loading model: \(error.localizedDescription)")
                }
            }
        }
    }

    @objc func checkModel(_ call: CAPPluginCall) {
        guard let modelName = call.getString("model"),
              let modelFile = modelPaths[modelName] else {
            call.resolve(["installed": false])
            return
        }

        queue.async {
            do {
                let modelPath = try self.getModelPath(modelFile)
                let installed = FileManager.default.fileExists(atPath: modelPath)
                DispatchQueue.main.async {
                    call.resolve(["installed": installed, "model": modelName])
                }
            } catch {
                DispatchQueue.main.async {
                    call.resolve(["installed": false, "model": modelName])
                }
            }
        }
    }

    @objc func transcribe(_ call: CAPPluginCall) {
        guard let audioPath = call.getString("audioPath") else {
            call.reject("Missing audioPath")
            return
        }

        let language = call.getString("language") ?? "zh"
        let modelName = call.getString("model") ?? "small"

        // 檢查模型是否已載入
        guard whisperContext != nil else {
            call.reject("Model not loaded. Call loadModel first.")
            return
        }

        // 驗證影片長度 (30 分鐘限制)
        let duration = getVideoDuration(audioPath)
        if duration > 1800 {
            call.reject("Video exceeds 30 minutes limit (short video only)")
            return
        }

        isTranscribing = true

        // 設定進度回調
        self.progressCallback = { [weak self] progress in
            self?.notifyListeners("progress", data: progress)
        }

        queue.async {
            do {
                let result = try self.performTranscription(audioPath: audioPath, language: language)
                DispatchQueue.main.async {
                    self.isTranscribing = false
                    self.progressCallback = nil
                    call.resolve(result)
                }
            } catch {
                DispatchQueue.main.async {
                    self.isTranscribing = false
                    self.progressCallback = nil
                    call.reject("Transcription failed: \(error.localizedDescription)")
                }
            }
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        isTranscribing = false
        // whisper.cpp 沒有直接的取消 API，這裡標記取消
        call.resolve(["cancelled": true])
    }

    // MARK: - Private Methods

    private func getModelPath(_ modelFile: String) throws -> String {
        // 優先從 App Bundle 載入 (內建模型)
        if let bundlePath = Bundle.main.path(forResource: modelFile.replacingOccurrences(of: ".bin", with: ""), ofType: "bin") {
            return bundlePath
        }

        // 其次從 Documents 目錄載入 (下載的模型)
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let modelPath = documentsPath.appendingPathComponent("models/\(modelFile)").path

        if FileManager.default.fileExists(atPath: modelPath) {
            return modelPath
        }

        throw NSError(domain: "WhisperPlugin", code: 404, userInfo: [NSLocalizedDescriptionKey: "Model not found: \(modelFile)"])
    }

    private func loadWhisperModel(_ path: String) -> Bool {
        // 這裡需要連結 whisper.cpp
        // 實際實作需要在 Bridging Header 中引入 whisper.h
        // 並確保 whisper.cpp 編譯為 static library 連結到 App target

        /*
        let cPath = (path as NSString).utf8String
        let params = whisper_context_default_params()
        whisperContext = whisper_init_from_file_with_params(cPath, params)
        return whisperContext != nil
        */

        // 暫時返回 true，實際需連結 whisper.cpp
        print("[WhisperPlugin] Loading model from: \(path)")
        return true
    }

    private func performTranscription(audioPath: String, language: String) throws -> [String: Any] {
        guard let ctx = whisperContext else {
            throw NSError(domain: "WhisperPlugin", code: 500, userInfo: [NSLocalizedDescriptionKey: "Context not initialized"])
        }

        // 載入音訊檔案 (需要 ffmpeg 或自行實作 WAV 讀取)
        // 這裡簡化：假設已轉換為 16kHz mono WAV
        let audioData = try loadAudioFile(audioPath)

        // 設定推理參數
        var params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY)
        params.language = strdup(language)
        params.translate = false
        params.print_progress = false
        params.print_realtime = false
        params.print_timestamps = true
        params.no_timestamps = false

        // 進度回調
        params.new_segment_callback = { ctx, n_new, user_data in
            let plugin = Unmanaged<WhisperPlugin>.fromOpaque(user_data!).takeUnretainedValue()
            plugin.handleNewSegment(ctx: ctx, n_new: n_new)
        }
        params.new_segment_callback_user_data = Unmanaged.passUnretained(self).toOpaque()

        // 執行推理
        let result = whisper_full(ctx, params, audioData, Int32(audioData.count))
        if result != 0 {
            throw NSError(domain: "WhisperPlugin", code: 500, userInfo: [NSLocalizedDescriptionKey: "whisper_full failed with code: \(result)"])
        }

        // 收集結果
        let nSegments = whisper_full_n_segments(ctx)
        var segments: [[String: Any]] = []

        for i in 0..<nSegments {
            let text = String(cString: whisper_full_get_segment_text(ctx, i))
            let t0 = whisper_full_get_segment_t0(ctx, i)
            let t1 = whisper_full_get_segment_t1(ctx, i)

            segments.append([
                "text": text.trimmingCharacters(in: .whitespacesAndNewlines),
                "start": Double(t0) / 100.0,  // whisper 回傳 centiseconds
                "end": Double(t1) / 100.0,
            ])
        }

        let detectedLanguage = String(cString: whisper_lang_str(whisper_full_lang_id(ctx))) ?? language

        return [
            "segments": segments,
            "language": detectedLanguage,
        ]
    }

    private func handleNewSegment(ctx: OpaquePointer?, n_new: Int32) {
        guard let ctx = ctx, let callback = progressCallback else { return }

        let nSegments = whisper_full_n_segments(ctx)
        let newSegmentIndex = nSegments - Int(n_new)

        if newSegmentIndex >= 0 {
            let text = String(cString: whisper_full_get_segment_text(ctx, newSegmentIndex))
            let t0 = whisper_full_get_segment_t0(ctx, newSegmentIndex)
            let t1 = whisper_full_get_segment_t1(ctx, newSegmentIndex)

            callback([
                "current": newSegmentIndex + 1,
                "total": nSegments,
                "text": text.trimmingCharacters(in: .whitespacesAndNewlines),
                "start": Double(t0) / 100.0,
                "end": Double(t1) / 100.0,
            ])
        }
    }

    private func loadAudioFile(_ path: String) throws -> [Float] {
        // 實際需要：用 ffmpeg 將任意格式轉為 16kHz mono PCM
        // 這裡返回空陣列，實際實作需整合 ffmpeg 或使用 AVFoundation
        print("[WhisperPlugin] Loading audio from: \(path)")
        return []
    }

    private func getVideoDuration(_ path: String) -> Double {
        // 使用 ffprobe 取得影片長度
        // 實際實作需呼叫 FFmpegPlugin 或直接用 ffprobe
        return 0
    }
}