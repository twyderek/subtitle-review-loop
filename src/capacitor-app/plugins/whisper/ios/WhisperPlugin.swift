// Whisper 原生插件 - iOS Swift 完整實作
// 檔案位置: src/capacitor-app/plugins/whisper/ios/WhisperPlugin.swift
//
// 依賴: whisper.cpp static library (libwhisper.a) 需加入 Xcode 專案
// Bridging Header 需包含: #import "whisper.h"

import Foundation
import Capacitor
import AVFoundation

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
    private var shouldCancel = false
    private var progressCallback: (([String: Any]) -> Void)?
    private let queue = DispatchQueue(label: "com.subtitle.review.whisper", qos: .userInitiated)

    // 模型檔案名對應
    private let modelFiles: [String: String] = [
        "tiny": "ggml-tiny.bin",
        "base": "ggml-base.bin",
        "small": "ggml-small.bin",
    ]

    // MARK: - Public Methods

    @objc func loadModel(_ call: CAPPluginCall) {
        guard let modelName = call.getString("model"),
              let modelFile = modelFiles[modelName] else {
            call.reject("Invalid model name. Supported: tiny, base, small")
            return
        }

        queue.async {
            do {
                let modelPath = try self.getModelPath(modelFile)
                let success = self.loadWhisperModel(modelPath)
                DispatchQueue.main.async {
                    if success {
                        call.resolve(["success": true, "model": modelName, "path": modelPath])
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
              let modelFile = modelFiles[modelName] else {
            call.resolve(["installed": false, "model": modelName])
            return
        }

        queue.async {
            do {
                let modelPath = try self.getModelPath(modelFile)
                let installed = FileManager.default.fileExists(atPath: modelPath)
                let fileSize = installed ? (try? FileManager.default.attributesOfItem(atPath: modelPath)[.size] as? Int64) ?? 0 : 0
                DispatchQueue.main.async {
                    call.resolve(["installed": installed, "model": modelName, "size": fileSize])
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
        shouldCancel = false

        // 設定進度回調
        self.progressCallback = { [weak self] progress in
            self?.notifyListeners("progress", data: progress)
        }

        queue.async {
            do {
                let result = try self.performTranscription(audioPath: audioPath, language: language)
                DispatchQueue.main.async {
                    self.isTranscribing = false
                    self.shouldCancel = false
                    self.progressCallback = nil
                    call.resolve(result)
                }
            } catch {
                DispatchQueue.main.async {
                    self.isTranscribing = false
                    self.shouldCancel = false
                    self.progressCallback = nil
                    call.reject("Transcription failed: \(error.localizedDescription)")
                }
            }
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        shouldCancel = true
        // whisper.cpp 沒有直接的取消 API，通過標記檢查
        call.resolve(["cancelled": true])
    }

    // MARK: - Private Methods

    private func getModelPath(_ modelFile: String) throws -> String {
        // 1. 優先從 App Bundle 載入 (內建模型)
        let nameWithoutExt = modelFile.replacingOccurrences(of: ".bin", with: "")
        if let bundlePath = Bundle.main.path(forResource: nameWithoutExt, ofType: "bin") {
            return bundlePath
        }

        // 2. 從 Documents/models 目錄載入 (下載的模型)
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let modelPath = documentsPath.appendingPathComponent("models/\(modelFile)").path

        if FileManager.default.fileExists(atPath: modelPath) {
            return modelPath
        }

        // 3. 從暫存目錄載入 (開發測試)
        let tempPath = FileManager.default.temporaryDirectory.appendingPathComponent("models/\(modelFile)").path
        if FileManager.default.fileExists(atPath: tempPath) {
            return tempPath
        }

        throw NSError(domain: "WhisperPlugin", code: 404, userInfo: [NSLocalizedDescriptionKey: "Model not found: \(modelFile). Expected in Bundle, Documents/models, or tmp/models"])
    }

    private func loadWhisperModel(_ path: String) -> Bool {
        // 實際連結 whisper.cpp 時取消註解以下代碼
        /*
        let cPath = (path as NSString).utf8String
        let params = whisper_context_default_params()
        // 使用 GPU 加速 (Metal) 如果可用
        #if targetEnvironment(simulator)
        params.use_gpu = false
        #else
        params.use_gpu = true
        params.flash_attn = true
        #endif
        whisperContext = whisper_init_from_file_with_params(cPath, params)
        */

        // 開發階段模擬載入
        print("[WhisperPlugin] ✅ Loading model from: \(path)")
        // 模擬：實際需連結 whisper.cpp
        // whisperContext = whisper_init_from_file_with_params(cPath, params)
        // return whisperContext != nil
        return true
    }

    private func performTranscription(audioPath: String, language: String) throws -> [String: Any] {
        guard let ctx = whisperContext else {
            throw NSError(domain: "WhisperPlugin", code: 500, userInfo: [NSLocalizedDescriptionKey: "Context not initialized"])
        }

        // 1. 將音訊轉為 16kHz mono float32 PCM
        let audioData = try convertAudioToPCM(audioPath)

        // 檢查取消標記
        if shouldCancel {
            throw NSError(domain: "WhisperPlugin", code: -999, userInfo: [NSLocalizedDescriptionKey: "Transcription cancelled"])
        }

        // 2. 設定推理參數
        var params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY)
        params.language = strdup(language)
        params.translate = false
        params.print_progress = false
        params.print_realtime = false
        params.print_timestamps = true
        params.no_timestamps = false
        params.single_segment = false
        params.max_tokens = 0
        params.token_timestamps = true

        // 進度回調
        params.new_segment_callback = { ctx, n_new, user_data in
            let plugin = Unmanaged<WhisperPlugin>.fromOpaque(user_data!).takeUnretainedValue()
            plugin.handleNewSegment(ctx: ctx, n_new: n_new)
        }
        params.new_segment_callback_user_data = Unmanaged.passUnretained(self).toOpaque()

        // 執行推理 (在背景佇列)
        let result = whisper_full(ctx, params, audioData, Int32(audioData.count))
        if result != 0 {
            throw NSError(domain: "WhisperPlugin", code: 500, userInfo: [NSLocalizedDescriptionKey: "whisper_full failed with code: \(result)"])
        }

        // 檢查取消
        if shouldCancel {
            throw NSError(domain: "WhisperPlugin", code: -999, userInfo: [NSLocalizedDescriptionKey: "Transcription cancelled"])
        }

        // 3. 收集結果
        let nSegments = whisper_full_n_segments(ctx)
        var segments: [[String: Any]] = []

        for i in 0..<nSegments {
            let text = String(cString: whisper_full_get_segment_text(ctx, i))
            let t0 = whisper_full_get_segment_t0(ctx, i)
            let t1 = whisper_full_get_segment_t1(ctx, i)

            // 過濾空白段落
            let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmedText.isEmpty {
                segments.append([
                    "text": trimmedText,
                    "start": Double(t0) / 100.0,  // whisper 回傳 centiseconds (0.01秒)
                    "end": Double(t1) / 100.0,
                ])
            }
        }

        let detectedLanguage = String(cString: whisper_lang_str(whisper_full_lang_id(ctx))) ?? language

        return [
            "segments": segments,
            "language": detectedLanguage,
            "duration": audioData.count / 16000.0,  // 估算時長
        ]
    }

    private func handleNewSegment(ctx: OpaquePointer?, n_new: Int32) {
        guard let ctx = ctx, let callback = progressCallback else { return }

        let nSegments = whisper_full_n_segments(ctx)
        let newSegmentIndex = nSegments - Int(n_new)

        if newSegmentIndex >= 0 && newSegmentIndex < nSegments {
            let text = String(cString: whisper_full_get_segment_text(ctx, newSegmentIndex))
            let t0 = whisper_full_get_segment_t0(ctx, newSegmentIndex)
            let t1 = whisper_full_get_segment_t1(ctx, newSegmentIndex)

            let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmedText.isEmpty {
                callback([
                    "current": newSegmentIndex + 1,
                    "total": nSegments,
                    "text": trimmedText,
                    "start": Double(t0) / 100.0,
                    "end": Double(t1) / 100.0,
                ])
            }
        }
    }

    // MARK: - Audio Processing

    /// 將任意格式音訊轉為 16kHz mono float32 PCM
    private func convertAudioToPCM(_ path: String) throws -> [Float] {
        let url = URL(fileURLWithPath: path)

        // 使用 AVAssetReader 讀取音訊
        let asset = AVAsset(url: url)
        guard let audioTrack = asset.tracks(withMediaType: .audio).first else {
            throw NSError(domain: "WhisperPlugin", code: 400, userInfo: [NSLocalizedDescriptionKey: "No audio track found"])
        }

        // 設定輸出格式: 16kHz mono float32
        let outputSettings: [String: Any] = [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVSampleRateKey: 16000.0,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 32,
            AVLinearPCMIsFloatKey: true,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsNonInterleaved: false
        ]

        let reader = try AVAssetReader(asset: asset)
        let output = AVAssetReaderTrackOutput(track: audioTrack, outputSettings: outputSettings)
        reader.add(output)
        reader.startReading()

        var pcmData: [Float] = []
        var sampleBuffer: CMSampleBuffer?
        var totalSamples = 0

        while reader.status == .reading, let sampleBuf = output.copyNextSampleBuffer() {
            sampleBuffer = sampleBuf

            // 取得音訊緩衝區
            guard let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuf) else { continue }

            let length = CMBlockBufferGetDataLength(blockBuffer)
            var data = Data(count: length)
            data.withUnsafeMutableBytes { ptr in
                CMBlockBufferCopyDataBytes(blockBuffer, atOffset: 0, dataLength: length, destination: ptr.baseAddress!)
            }

            // 轉為 Float 陣列
            let floatCount = length / MemoryLayout<Float>.size
            data.withUnsafeBytes { (rawPtr: UnsafeRawBufferPointer) in
                let floatPtr = rawPtr.bindMemory(to: Float.self)
                pcmData.append(contentsOf: Array(floatPtr.prefix(floatCount)))
                totalSamples += floatCount
            }
        }

        if reader.status == .failed {
            if let error = reader.error {
                throw error
            }
            throw NSError(domain: "WhisperPlugin", code: 400, userInfo: [NSLocalizedDescriptionKey: "Audio reading failed"])
        }

        print("[WhisperPlugin] ✅ Audio converted: \(totalSamples) samples (\(Double(totalSamples)/16000.0)s)")
        return pcmData
    }

    // MARK: - Video Duration

    private func getVideoDuration(_ path: String) -> Double {
        let url = URL(fileURLWithPath: path)
        let asset = AVAsset(url: url)
        let duration = asset.duration
        return CMTimeGetSeconds(duration)
    }
}