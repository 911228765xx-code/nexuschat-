# NexusChat 原生 App 构建指南

## 概述

NexusChat 使用 **Capacitor 8** 将网页版封装为原生 App。
App 加载的是部署在 `https://nexuschat.best` 的线上版本，无需每次更新都重新打包 App。

---

## 项目结构

```
nexuschat/
├── android/          ← Android 原生工程（用 Android Studio 打开）
├── ios/App/          ← iOS 原生工程（用 Xcode 打开）
├── capacitor.config.ts  ← Capacitor 配置（App ID、插件配置等）
└── dist/public/      ← Web 构建产物（cap sync 时同步到原生工程）
```

---

## 日常开发工作流

```bash
# 1. 修改前端代码后，重新构建
pnpm cap:build   # = pnpm build && npx cap sync

# 2. 仅同步（不重新构建）
pnpm cap:sync    # = npx cap sync

# 3. 打开 Android Studio
pnpm cap:android # = npx cap open android

# 4. 打开 Xcode
pnpm cap:ios     # = npx cap open ios
```

---

## Android APK 构建

### 环境要求
- **Android Studio** Ladybug 或更高版本
- **JDK 17**（Android Studio 自带）
- **Android SDK** API 35（targetSdkVersion）

### 步骤

1. 安装 Android Studio：https://developer.android.com/studio
2. 打开工程：`File → Open → nexuschat/android`
3. 等待 Gradle 同步完成
4. 构建 Debug APK：`Build → Build Bundle(s) / APK(s) → Build APK(s)`
5. APK 路径：`android/app/build/outputs/apk/debug/app-debug.apk`

### 构建 Release APK（上架用）

```bash
# 生成签名密钥（首次）
keytool -genkey -v -keystore nexuschat.keystore -alias nexuschat \
  -keyalg RSA -keysize 2048 -validity 10000

# 在 android/app/build.gradle 中配置签名
```

在 `android/app/build.gradle` 的 `android {}` 块中添加：

```groovy
signingConfigs {
    release {
        storeFile file("nexuschat.keystore")
        storePassword "your_store_password"
        keyAlias "nexuschat"
        keyPassword "your_key_password"
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

---

## iOS IPA 构建

### 环境要求
- **Mac** 电脑（必须）
- **Xcode 16** 或更高版本
- **Apple Developer 账号**（$99/年，上架 App Store 必须）

### 步骤

1. 在 Mac 上安装 Xcode：https://developer.apple.com/xcode/
2. 打开工程：`open nexuschat/ios/App/App.xcodeproj`
3. 配置 Bundle ID：`com.nexuschat.app`（需要在 Apple Developer Portal 注册）
4. 选择 Development Team
5. 构建：`Product → Build`
6. 归档（上架用）：`Product → Archive`

### 真机测试（无需 Apple Developer 账号）

1. 连接 iPhone 到 Mac
2. 在 Xcode 中选择你的 iPhone 作为目标设备
3. 点击 Run（▶）即可安装到手机

---

## App 配置

### App ID
- Android: `com.nexuschat.app`
- iOS: `com.nexuschat.app`

### 深链接
- 自定义 URL Scheme: `nexuschat://app/chat`、`nexuschat://app/research` 等
- App Links (Android) / Universal Links (iOS): `https://nexuschat.best/app/*`

### 已集成的原生插件
| 插件 | 功能 |
|---|---|
| `@capacitor/keyboard` | 键盘弹出时底部导航不被遮挡 |
| `@capacitor/status-bar` | 状态栏透明叠加，深色内容 |
| `@capacitor/app` | Android 返回键处理、深链接、冷启动 URL |

### 推送通知（Firebase FCM）
推送通知需要额外配置：
1. 在 Firebase Console 创建项目
2. 下载 `google-services.json`（Android）和 `GoogleService-Info.plist`（iOS）
3. 安装 `@capacitor/push-notifications`
4. 按照 Capacitor 文档配置：https://capacitorjs.com/docs/apis/push-notifications

---

## 更新 App 内容

由于 `capacitor.config.ts` 中配置了 `server.url: 'https://nexuschat.best'`，
**App 直接加载线上网站**，无需重新打包 App 即可更新内容。

只有以下情况需要重新打包：
- 修改原生插件配置
- 添加新的原生权限
- 更新 App 图标或启动屏
- 升级 Capacitor 版本

---

## App 图标配置

推荐使用 `capacitor-assets` 工具自动生成所有尺寸的图标：

```bash
# 安装工具
npm install -g @capacitor/assets

# 准备图标文件（1024x1024 PNG，无圆角）
# 放到 resources/ 目录：
# resources/icon.png         ← App 图标
# resources/splash.png       ← 启动屏（2732x2732 PNG）

# 生成所有尺寸
npx capacitor-assets generate
```
