# Spec: TTS 发音 Composable (`useSpeech`)

## 1. 背景与问题

应用是面向小学英语课堂的 14 个游戏集合。**听音**是英语学习的核心能力，但目前 14 个游戏中只有 1 个（看图猜单词 / MysteryRevealGame）有发音，且实现非常朴素：

```ts
if ('speechSynthesis' in window) {
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = 'en-US'
  window.speechSynthesis.speak(utterance)
}
```

这段代码的不足，正是本 composable 要统一解决的：

1. **不挑选英语语音** —— 只设 `lang='en-US'`，实际由系统默认 voice 决定。某些系统默认 voice 不是英语，会用中文嗓音念英文单词，发音错误。
2. **不取消上一段** —— 连续点击会把多个 utterance 排进队列依次播放，体验混乱。
3. **无语速 / 音调控制** —— 小学生需要较慢、清晰的发音。
4. **无可用性检测** —— 无法向 UI 反馈「本设备不支持发音」。
5. **样板分散** —— 每个想加发音的游戏都要重复这段代码。

## 2. 目标

提供一个共享 composable `useSpeech()`，让任意游戏一行接入「点击朗读英文单词」：

- 自动挑选最佳英语语音（优先 en-US，回退任意英语 voice）。
- 朗读前取消正在播放的内容（同一时刻只播一个词）。
- 可配置语速（默认偏慢，适合小学课堂）、音调、音量。
- 暴露 `isSupported` 响应式状态供 UI 决定是否显示喇叭按钮。
- 暴露 `isSpeaking` 状态供 UI 做按钮高亮 / 动画。
- 零新增依赖（纯浏览器 `window.speechSynthesis` Web Speech API）。

## 3. 非目标 (Out of Scope)

- **不**改造其它 13 个游戏接入发音（本次只交付 composable + 一个使用方：听音辨词新游戏；MysteryReveal 的迁移作为可选后续）。
- **不**做离线 TTS / 音频文件 / 第三方 TTS 服务 —— 仅用系统内置语音。
- **不**做中文朗读（课堂只需英文发音；中文释义靠看）。
- **不**做语音识别（speech-to-text）。

## 4. 技术约束（项目既定）

- `<script setup lang="ts">`，严格 TS（`strict`、`noUnusedLocals/Parameters`）。
- 无分号、单引号（Prettier 强制）。
- 无注释除非 WHY 非显而易见。
- 文件位置：`src/composables/useSpeech.ts`，与既有 `useDevice.ts` 同目录、同风格（顶层模块状态 + `export function useSpeechXxx()` + 显式 `Ref/ComputedRef` 类型）。
- Tauri WebView：macOS = WKWebView（Web Speech API 支持良好）；Windows = WebView2/Edge（支持）；Android = 系统 WebView（支持，voice 取决于设备 TTS 引擎）。

## 5. API 设计

```ts
export interface SpeakOptions {
  rate?: number   // 语速 0.1–10，默认 0.85（偏慢，适合小学）
  pitch?: number  // 音调 0–2，默认 1
  volume?: number // 音量 0–1，默认 1
  lang?: string   // BCP-47，默认 'en-US'
}

export interface SpeechState {
  isSupported: ComputedRef<boolean>
  isSpeaking: Ref<boolean>
  speak: (text: string, options?: SpeakOptions) => void
  cancel: () => void
}

export function useSpeech(): SpeechState
```

### 行为约定

- **`speak(text, options)`**
  - `text` 为空或 `!isSupported` → 静默返回（不抛错）。
  - 调用即先 `window.speechSynthesis.cancel()`，再播新内容 → 单词级「抢断」，连点只播最后一个。
  - 创建 `SpeechSynthesisUtterance`，设置挑好的英语 `voice` + `lang` + `rate/pitch/volume`。
  - 绑定 `onstart` → `isSpeaking = true`，`onend` / `onerror` → `isSpeaking = false`。
- **`cancel()`** → `window.speechSynthesis.cancel()` 并置 `isSpeaking = false`。
- **`isSupported`** → `'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window`。

### 语音挑选（模块级，懒加载 + 缓存）

```
1. window.speechSynthesis.getVoices()
2. 优先级：lang===目标(en-US) > lang以'en'开头 > 名称含 'English' > 第一个可用
3. 若首次返回空数组（Chromium voices 异步加载），监听一次 'voiceschanged' 后重选并缓存。
```

voice 选择结果用模块级变量缓存，多个游戏实例共享，避免重复计算。

### 生命周期

- 模块级单例状态（参照 `useDevice` 的 `listenerCount` 模式）：`isSpeaking` 全局共享（同一时刻全应用只播一个词，符合直觉）。
- 组件 `onUnmounted` 时若该组件触发过播放，调用 `cancel()` 防止离开游戏后仍在念。用引用计数：最后一个使用者卸载时移除 `voiceschanged` 监听。

## 6. 边界情况

| 情况 | 处理 |
|------|------|
| 设备不支持 Web Speech | `isSupported=false`，UI 隐藏喇叭按钮；`speak` 静默 no-op |
| `getVoices()` 首次返回空 | 监听 `voiceschanged`，到达后重选 voice |
| 系统无任何英语 voice | 回退到第一个可用 voice + `lang='en-US'`（尽力而为） |
| 连续快速点击 | 每次 `speak` 先 `cancel`，只播最后一次 |
| 切换游戏路由 | 卸载时 `cancel()`，停止残留朗读 |
| Android 设备 TTS 引擎未装英文 | 尽力播放；不报错（教学环境通常已具备） |

## 7. 验收标准

- `vue-tsc --noEmit` 通过，Prettier 通过。
- 在 `useSpeech` 之上：点击喇叭朗读一个英文单词，发音为英语（非中文嗓音）。
- 连续点 3 个不同单词，只听到最后一个。
- 在不支持的环境 `isSupported` 为 `false`，调用 `speak` 不报错。
- 离开页面后无残留朗读声。

## 8. 后续（本次不做，记录方向）

- 把 MysteryRevealGame 现有朴素发音替换为 `useSpeech`。
- 给记忆卡片、单词炸弹等展示单词的游戏加喇叭按钮。
- 可选：句子级朗读、慢速重复（double-tap 放慢）。
