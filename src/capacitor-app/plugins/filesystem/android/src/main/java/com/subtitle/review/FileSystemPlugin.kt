// FileSystemExt 原生插件 - Android Kotlin 實作
// 檔案位置: src/capacitor-app/plugins/filesystem/android/src/main/java/com/subtitle/review/FileSystemPlugin.kt
//
// 功能: 影片/字幕選擇器、資料夾選擇、檔案儲存

package com.subtitle.review

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
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

        // 寫入暫存檔
        val tempFile = File(activity!!.cacheDir, pendingSaveName!!)
        try {
            FileOutputStream(tempFile).use { output ->
                output.write(pendingSaveData!!.toByteArray())
            }

            val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = pendingSaveMime
                putExtra(Intent.EXTRA_TITLE, pendingSaveName)
            }
            startActivityForResult(call, intent, SAVE_FILE)
        } catch (e: Exception) {
            call.reject("Failed to create temp file: ${e.message}")
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (resultCode != Activity.RESULT_OK) {
            pickCall?.resolve(JSObject().put("cancelled", true))
            saveCall?.resolve(JSObject().put("cancelled", true))
            pickCall = null
            saveCall = null
            pendingSaveData = null
            pendingSaveName = null
            pendingSaveMime = null
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