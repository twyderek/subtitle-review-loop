package com.subtitle.review;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 初始化 FFmpegKit (如果需要)
        // com.arthenica.ffmpegkit.FFmpegKitConfig.setLogCallback(...)
    }
}