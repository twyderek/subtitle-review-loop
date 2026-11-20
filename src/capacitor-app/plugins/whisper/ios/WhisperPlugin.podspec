# Podspec for WhisperPlugin
# 此檔案供 CocoaPods 管理 whisper.cpp static library 依賴
# 路徑: src/capacitor-app/plugins/whisper/ios/WhisperPlugin.podspec

Pod::Spec.new do |s|
  s.name             = 'WhisperPlugin'
  s.version          = '1.0.0'
  s.summary          = 'Whisper.cpp native plugin for Capacitor'
  s.description      = 'iOS native plugin wrapping whisper.cpp for on-device speech recognition'
  s.homepage         = 'https://github.com/ggerganov/whisper.cpp'
  s.license          = { :type => 'MIT', :file => 'LICENSE' }
  s.author           = { 'Subtitle Review' => 'subtitle-review@example.com' }
  s.source           = { :path => '.' }
  s.platform         = :ios, '15.0'
  s.swift_version    = '5.9'

  # 核心依賴
  s.dependency 'Capacitor', '>= 6.0'

  # whisper.cpp static library
  # 需先編譯 whisper.cpp 為 libwhisper.a
  s.vendored_libraries = 'Frameworks/libwhisper.a'
  s.public_header_files = 'Frameworks/whisper.h'
  s.source_files = 'Sources/**/*.swift'
  s.preserve_paths = 'Frameworks/**/*'

  # 編譯設定
  s.pod_target_xcconfig = {
    'SWIFT_INCLUDE_PATHS' => '$(PODS_ROOT)/WhisperPlugin/Frameworks',
    'LIBRARY_SEARCH_PATHS' => '$(PODS_ROOT)/WhisperPlugin/Frameworks',
    'HEADER_SEARCH_PATHS' => '$(PODS_ROOT)/WhisperPlugin/Frameworks',
    'SWIFT_OBJC_BRIDGING_HEADER' => '$(PODS_ROOT)/WhisperPlugin/WhisperPlugin-Bridging-Header.h',
    'OTHER_LDFLAGS' => '-lwhisper -framework AVFoundation -framework Accelerate',
    'ENABLE_BITCODE' => 'NO',
    'DEFINES_MODULE' => 'YES'
  }

  # 所需框架
  s.frameworks = 'AVFoundation', 'Accelerate', 'Foundation'
  s.libraries = 'c++', 'whisper'

  # 資源檔案 (模型檔案不包含在 pod 中，由 App 內建或下載)
  # s.resource_bundles = {
  #   'WhisperModels' => ['Resources/Models/*.bin']
  # }
end