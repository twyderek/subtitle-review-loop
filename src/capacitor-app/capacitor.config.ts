import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.subtitle.review',
  appName: '字幕校對工具',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
    scrollEnabled: true,
    limitsNavBarToVisibleBounds: true,
    backgroundColor: '#09101f',
    // 自訂 Info.plist 權限
    infoPlist: {
      NSDocumentsFolderUsageDescription: '需要存取文件夾以讀寫影片/字幕專案',
      NSPhotoLibraryUsageDescription: '需要存取相簿匯入影片',
      NSMicrophoneUsageDescription: '語音轉錄功能需要麥克風權限',
      UIFileSharingEnabled: true,
      LSSupportsOpeningDocumentsInPlace: true,
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#09101f',
    overrideUserAgent: 'SubtitleReviewApp/1.0',
    // Android 權限
    permissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.MANAGE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#09101f',
      showSpinner: false,
    },
    CapacitorHttp: {
      enabled: true,
    },
    // 內建插件配置
    Filesystem: {
      iosDocumentPickerMode: 'import',
    },
    Share: {
      iosShareSheetCompletion: true,
    },
  },
};

export default config;