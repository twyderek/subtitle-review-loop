// FileSystemExt 原生插件 - iOS Swift 實作
// 檔案位置: src/capacitor-app/plugins/filesystem/ios/FileSystemPlugin.swift
//
// 功能: 影片/字幕選擇器、資料夾選擇、檔案儲存

import Foundation
import Capacitor
import UniformTypeIdentifiers
import MobileCoreServices

@objc(FileSystemPlugin)
public class FileSystemPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FileSystemPlugin"
    public let jsName = "FileSystemExt"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pickVideo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickSubtitle", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickFolder", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveFile", returnType: CAPPluginReturnPromise),
    ]

    private var pickCall: CAPPluginCall?
    private var saveCall: CAPPluginCall?
    private var pendingSaveData: String?
    private var pendingSaveName: String?
    private var pendingSaveMime: String?

    // MARK: - Public Methods

    @objc func pickVideo(_ call: CAPPluginCall) {
        self.pickCall = call
        DispatchQueue.main.async {
            let types: [UTType] = [UTType.movie, UTType.mpeg4Movie, UTType.quickTimeMovie, UTType(filenameExtension: "webm")!].compactMap { $0 }
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: true)
            picker.delegate = self
            picker.allowsMultipleSelection = false
            picker.shouldShowFileExtensions = true
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }

    @objc func pickSubtitle(_ call: CAPPluginCall) {
        self.pickCall = call
        DispatchQueue.main.async {
            let types: [UTType] = [UTType.plainText, UTType(filenameExtension: "srt")!, UTType(filenameExtension: "vtt")!].compactMap { $0 }
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: true)
            picker.delegate = self
            picker.allowsMultipleSelection = false
            picker.shouldShowFileExtensions = true
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }

    @objc func pickFolder(_ call: CAPPluginCall) {
        self.pickCall = call
        DispatchQueue.main.async {
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.folder], asCopy: false)
            picker.delegate = self
            picker.allowsMultipleSelection = false
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }

    @objc func saveFile(_ call: CAPPluginCall) {
        self.saveCall = call
        self.pendingSaveName = call.getString("suggestedName") ?? "file"
        self.pendingSaveData = call.getString("data") ?? ""
        self.pendingSaveMime = call.getString("mimeType") ?? "text/plain"

        DispatchQueue.main.async {
            // 寫入暫存檔
            let tempDir = FileManager.default.temporaryDirectory
            let fileURL = tempDir.appendingPathComponent(self.pendingSaveName!)

            do {
                try self.pendingSaveData!.write(to: fileURL, atomically: true, encoding: .utf8)

                let picker = UIDocumentPickerViewController(forExporting: [fileURL], asCopy: true)
                picker.delegate = self
                self.bridge?.viewController?.present(picker, animated: true)
            } catch {
                call.reject("Failed to create temp file: \(error.localizedDescription)")
            }
        }
    }
}

// MARK: - UIDocumentPickerDelegate
extension FileSystemPlugin: UIDocumentPickerDelegate {
    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let url = urls.first else { return }

        // 開始存取安全範圍資源
        let secured = url.startAccessingSecurityScopedResource()
        defer { if secured { url.stopAccessingSecurityScopedResource() } }

        let fileName = url.lastPathComponent
        let fileSize = (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0
        let mimeType = (try? url.resourceValues(forKeys: [.contentTypeKey]))?.contentType?.preferredMIMEType ?? "application/octet-stream"

        let result: [String: Any] = [
            "uri": url.absoluteString,
            "name": fileName,
            "size": fileSize,
            "mimeType": mimeType,
        ]

        pickCall?.resolve(result)
        saveCall?.resolve(result)
        pickCall = nil
        saveCall = nil
        pendingSaveData = nil
        pendingSaveName = nil
        pendingSaveMime = nil
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pickCall?.resolve(["cancelled": true])
        saveCall?.resolve(["cancelled": true])
        pickCall = nil
        saveCall = nil
        pendingSaveData = nil
        pendingSaveName = nil
        pendingSaveMime = nil
    }
}