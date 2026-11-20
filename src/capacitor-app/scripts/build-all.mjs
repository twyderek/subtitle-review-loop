// 統一建置腳本
import { execa } from 'execa';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const capDir = path.join(root, 'src', 'capacitor-app');

async function buildAll({ platform = 'all', configuration = 'Release' } = {}) {
  console.log('🚀 開始建置原生 App (短影音專用，Whisper Small)...');

  // 1. 建置前端
  console.log('\n📦 步驟 1/5: 建置前端 (Vite)...');
  await execa('npm', ['run', 'build'], { cwd: capDir, stdio: 'inherit' });

  // 2. Capacitor sync
  console.log('\n🔄 步驟 2/5: Capacitor Sync...');
  await execa('npx', ['cap', 'sync'], { cwd: capDir, stdio: 'inherit' });

  // 3. 編譯 Whisper 原生庫 (如需要)
  console.log('\n🔨 步驟 3/5: 檢查 Whisper 原生庫...');
  await ensureWhisperNative();

  const results: any = { ios: null, android: null };

  // 4. iOS 建置
  if (platform === 'all' || platform === 'ios') {
    if (process.platform !== 'darwin') {
      console.warn('⚠️ iOS 建置需 macOS，略過');
    } else {
      console.log('\n🍎 步驟 4/5: 建置 iOS App...');
      results.ios = await buildIOS(configuration);
    }
  }

  // 5. Android 建置
  if (platform === 'all' || platform === 'android') {
    console.log('\n🤖 步驟 5/5: 建置 Android App...');
    results.android = await buildAndroid(configuration);
  }

  console.log('\n✅ 建置完成!');
  console.log('📱 iOS:', results.ios?.ipa ? '成功' : '略過/失敗');
  console.log('🤖 Android:', results.android?.aab ? '成功' : '略過/失敗');

  return results;
}

async function ensureWhisperNative(): Promise<void> {
  const iosLib = path.join(capDir, 'ios', 'App', 'Plugins', 'Whisper', 'Frameworks', 'libwhisper.a');
  const androidLib = path.join(capDir, 'android', 'app', 'src', 'main', 'jniLibs', 'arm64-v8a', 'libwhisper.so');

  const iosExists = await fs.access(iosLib).then(() => true).catch(() => false);
  const androidExists = await fs.access(androidLib).then(() => true).catch(() => false);

  if (!iosExists && process.platform === 'darwin') {
    console.log('  iOS Whisper 庫不存在，建議執行: npm run whisper:build:ios');
  }
  if (!androidExists) {
    console.log('  Android Whisper 庫不存在，建議執行: npm run whisper:build:android');
  }
}

async function buildIOS(configuration: string) {
  const iosDir = path.join(capDir, 'ios');
  const archivePath = path.join(root, 'dist-capacitor-ios', 'App.xcarchive');
  const ipaDir = path.join(root, 'dist-capacitor-ios', 'ipa');

  await fs.mkdir(path.dirname(archivePath), { recursive: true });
  await fs.mkdir(ipaDir, { recursive: true });

  // Archive
  await execa('xcodebuild', [
    '-workspace', 'App.xcworkspace',
    '-scheme', 'App',
    '-configuration', configuration,
    '-destination', 'generic/platform=iOS',
    '-archivePath', archivePath,
    'archive'
  ], { cwd: iosDir, stdio: 'inherit' });

  // Export IPA
  const exportOptionsPath = path.join(iosDir, 'ExportOptions.plist');
  if (await fs.access(exportOptionsPath).then(() => true).catch(() => false)) {
    await execa('xcodebuild', [
      '-exportArchive',
      '-archivePath', archivePath,
      '-exportPath', ipaDir,
      '-exportOptionsPlist', exportOptionsPath
    ], { cwd: iosDir, stdio: 'inherit' });
  } else {
    console.warn('⚠️ ExportOptions.plist 不存在，跳過 IPA 匯出');
    console.log('   請在 Xcode 中手動匯出或建立 ExportOptions.plist');
  }

  const ipaFiles = await fs.readdir(ipaDir).catch(() => []);
  const ipaFile = ipaFiles.find(f => f.endsWith('.ipa'));

  return {
    archive: archivePath,
    ipa: ipaFile ? path.join(ipaDir, ipaFile) : null,
    ipaDir,
  };
}

async function buildAndroid(configuration: string) {
  const androidDir = path.join(capDir, 'android');
  const gradleCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

  // 確保 gradlew 可執行
  if (process.platform !== 'win32') {
    await execa('chmod', ['+x', gradleCmd], { cwd: androidDir });
  }

  await execa(gradleCmd, ['clean', `assemble${configuration}`, `bundle${configuration}`], {
    cwd: androidDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      GRADLE_OPTS: '-Xmx4g -Dorg.gradle.jvmargs=-Xmx4g',
    },
  });

  const configLower = configuration.toLowerCase();
  const aabPath = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', configLower, `app-${configLower}.aab`);
  const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', configLower, `app-${configLower}.apk`);

  const aabExists = await fs.access(aabPath).then(() => true).catch(() => false);
  const apkExists = await fs.access(apkPath).then(() => true).catch(() => false);

  return {
    aab: aabExists ? aabPath : null,
    apk: apkExists ? apkPath : null,
    outputDir: path.join(androidDir, 'app', 'build', 'outputs'),
  };
}

// CLI 入口
const args = process.argv.slice(2);
const platform = args.find(a => a.startsWith('--platform='))?.split('=')[1] || 'all';
const config = args.find(a => a.startsWith('--config='))?.split('=')[1] || 'Release';

buildAll({ platform, configuration: config }).catch(e => {
  console.error('❌ 建置失敗:', e.message);
  process.exit(1);
});