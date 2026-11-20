// 檔案系統擴充插件 - DocumentPicker + 沙盒存取
// 檔案位置: src/capacitor-app/plugins/filesystem/FileSystemPlugin.ts

import { CapacitorPlugin, PluginMethod } from '@capacitor/core';

export interface FilePickerResult {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

@CapacitorPlugin(name: 'FileSystemExt')
export class FileSystemPlugin {
  /**
   * 選擇影片檔案
   */
  @PluginMethod()
  async pickVideo(): Promise<FilePickerResult | null> {
    // iOS: UIDocumentPickerViewController (UTType.movie)
    // Android: Intent.ACTION_OPEN_DOCUMENT (video/*)
    return null;
  }

  /**
   * 選擇字幕檔案
   */
  @PluginMethod()
  async pickSubtitle(): Promise<FilePickerResult | null> {
    // iOS: UIDocumentPickerViewController (UTType.plainText, "public.srt")
    // Android: Intent.ACTION_OPEN_DOCUMENT (text/plain, .srt)
    return null;
  }

  /**
   * 選擇資料夾
   */
  @PluginMethod()
  async pickFolder(): Promise<{ uri: string } | null> {
    // iOS: UIDocumentPickerViewController (UTType.folder)
    // Android: Intent.ACTION_OPEN_DOCUMENT_TREE
    return null;
  }

  /**
   * 另存檔案 (開啟儲存對話框)
   */
  @PluginMethod()
  async saveFile(params: { suggestedName: string; data: string; mimeType?: string }): Promise<{ uri: string } | null> {
    // iOS: UIDocumentPickerViewController (export)
    // Android: Intent.ACTION_CREATE_DOCUMENT
    return null;
  }
}

// iOS 實作 (Swift)
/*
import Foundation
import Capacitor
import UniformTypeIdentifiers
import MobileCoreServices

@objc(FileSystemPlugin)
public class FileSystemPlugin: CAPPlugin {
    private var pickCall: CAPPluginCall?
    private var saveCall: CAPPluginCall?

    @objc func pickVideo(_ call: CAPPluginCall) {
        self.pickCall = call
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.movie], asCopy: true)
        picker.delegate = self
        picker.allowsMultipleSelection = false
        self.bridge?.viewController?.present(picker, animated: true)
    }

    @objc func pickSubtitle(_ call: CAPPluginCall) {
        self.pickCall = call
        let types: [UTType] = [UTType.plainText, UTType(filenameExtension: "srt")!].compactMap { $0 }
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: true)
        picker.delegate = self
        picker.allowsMultipleSelection = false
        self.bridge?.viewController?.present(picker, animated: true)
    }

    @objc func pickFolder(_ call: CAPPluginCall) {
        self.pickCall = call
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.folder], asCopy: false)
        picker.delegate = self
        self.bridge?.viewController?.present(picker, animated: true)
    }

    @objc func saveFile(_ call: CAPPluginCall) {
        self.saveCall = call
        let suggestedName = call.getString("suggestedName") ?? "file"
        let data = call.getString("data") ?? ""
        let mimeType = call.getString("mimeType") ?? "text/plain"

        // 寫入暫存檔
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent(suggestedName)
        do {
            try data.write(to: fileURL, atomically: true, encoding: .utf8)

            let picker = UIDocumentPickerViewController(forExporting: [fileURL], asCopy: true)
            picker.delegate = self
            self.bridge?.viewController?.present(picker, animated: true)
        } catch {
            call.reject("Failed to create temp file: \(error.localizedDescription)")
        }
    }
}

extension FileSystemPlugin: UIDocumentPickerDelegate {
    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let url = urls.first else { return }

        // 開始存取安全範圍資源
        let secured = url.startAccessingSecurityScopedResource()
        defer { if (secured) { url.stopAccessingSecurityScopedResource() } }

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
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pickCall?.resolve(["cancelled": true])
        saveCall?.resolve(["cancelled": true])
        pickCall = nil
        saveCall = nil
    }
}
*/

// Android 實作 (Kotlin)
/*
package com.subtitle.review

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
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

@CapacitorPlugin(name = "FileSystemExt")
@NativePlugin()
class FileSystemPlugin : Plugin() {

    private var pickCall: PluginCall? = null
    private var saveCall: PluginCall? = null
    private var pendingSaveData: String? = null
    private var pendingSaveName: String? = null
    private var pendingSaveMime: String? = null

    companion object {
        private const val PICK_VIDEO = 1001
        private const val PICK_SUBTITLE = 1002
        private const val PICK_FOLDER = 1003
        private const val SAVE_FILE = 1004
    }

    @PluginMethod
    fun pickVideo(call: PluginCall) {
        pickCall = call
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            type = "video/*"
            addCategory(Intent.CATEGORY_OPENABLE)
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("video/mp4", "video/quicktime", "video/x-m4v", "video/webm"))
        }
        startActivityForResult(call, intent, PICK_VIDEO)
    }

    @PluginMethod
    fun pickSubtitle(call: PluginCall) {
        pickCall = call
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            type = "text/plain"
            addCategory(Intent.CATEGORY_OPENABLE)
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("text/plain", "application/x-subrip"))
        }
        startActivityForResult(call, intent, PICK_SUBTITLE)
    }

    @PluginMethod
    fun pickFolder(call: PluginCall) {
        pickCall = call
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
        startActivityForResult(call, intent, PICK_FOLDER)
    }

    @PluginMethod
    fun saveFile(call: PluginCall) {
        saveCall = call
        pendingSaveName = call.getString("suggestedName") ?: "file"
        pendingSaveData = call.getString("data") ?? ""
        pendingSaveMime = call.getString("mimeType") ?: "text/plain"

        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = pendingSaveMime
            putExtra(Intent.EXTRA_TITLE, pendingSaveName)
        }
        startActivityForResult(call, intent, SAVE_FILE)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (resultCode != Activity.RESULT_OK) {
            pickCall?.resolve(JSObject().put("cancelled", true))
            saveCall?.resolve(JSObject().put("cancelled", true))
            pickCall = null
            saveCall = null
            return
        }

        data?.data?.let { uri ->
            val takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            activity?.contentResolver?.takePersistableUriPermission(uri, takeFlags)

            when (requestCode) {
                PICK_VIDEO, PICK_SUBTITLE, SAVE_FILE -> {
                    val cursor = activity?.contentResolver?.query(uri, null, null, null, null)
                    val name = cursor?.use { it.getString(it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME)) } ?: "unknown"
                    val size = cursor?.use { it.getLong(it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_SIZE)) } ?: 0
                    val mimeType = cursor?.use { it.getString(it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_MIME_TYPE)) } ?: "application/octet-stream"

                    val result = JSObject()
                        .put("uri", uri.toString())
                        .put("name", name)
                        .put("size", size)
                        .put("mimeType", mimeType)

                    pickCall?.resolve(result)
                    saveCall?.resolve(result)
                }
                PICK_FOLDER -> {
                    val result = JSObject().put("uri", uri.toString())
                    pickCall?.resolve(result)
                }
            }
        }

        pickCall = null
        saveCall = null
        pendingSaveData = null
        pendingSaveName = null
        pendingSaveMime = null
    }
}
*/