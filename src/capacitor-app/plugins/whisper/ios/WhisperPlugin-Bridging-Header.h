// WhisperPlugin-Bridging-Header.h
// 此檔案需加入 Xcode 專案的 Build Settings > Swift Compiler - General > Objective-C Bridging Header
// 路徑: $(SRCROOT)/Plugins/Whisper/WhisperPlugin-Bridging-Header.h

#ifndef WhisperPlugin_Bridging_Header_h
#define WhisperPlugin_Bridging_Header_h

// whisper.cpp C API
#include "whisper.h"

// 系統框架
#import <AVFoundation/AVFoundation.h>
#import <Foundation/Foundation.h>

#endif /* WhisperPlugin_Bridging_Header_h */