# 气泡消消乐 修复+水下重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复气泡消消乐的目标判定/扣心/合规/类型 bug，并对其做水下主题深度视觉重设计。

**Architecture:** 单一游戏 composable（`useBubblePopGame`）+ 模板（`index.vue`）+ 作用域样式（`style.css`）。逻辑修复集中在 composable 的生成/点击/帧循环；视觉重设计集中在 `style.css` 与 `index.vue` 模板结构微调。不引入新文件、不改数据结构（仅移除 `Bubble.isTarget` 字段）。

**Tech Stack:** Vue 3 `<script setup lang="ts">`、Tauri v2、Vite、Tailwind v4 工具类、Catppuccin CSS 变量、Web Audio API、`@tauri-apps/plugin-dialog`。

## Global Constraints

- 无分号、单引号（Prettier 强制，含 `prettier-plugin-tailwindcss`）。
- 禁止 `alert`/`confirm`；用 `@tauri-apps/plugin-dialog` 的 `message()`。
- 颜色仅用 Catppuccin token（`--ctp-*`、`--bg-*`、`--accent-*`），不写死调色板 hex（爆炸/confetti 等纯特效色除外，沿用现状）。
- TypeScript strict，`noUnusedLocals`/`noUnusedParameters` 强制；`v-for` 中用函数式 ref，签名 `(el: Element | ComponentPublicInstance | null)`。
- 无测试框架：验证 = `npx vue-tsc --noEmit`（BubblePop 零错误）+ `npx vite build` 成功 +（最终）dev server 手动试玩。
- localStorage key `bubblePopGame` 不变；路由 `/bubble-pop`、首页入口不变。
- 文件：`src/views/BubblePop/{script.ts,index.vue,style.css}`。

---

### Task 1: 逻辑修复（目标判定 / 干扰去重 / 扣心 / dialog / 类型）

**Files:**
- Modify: `src/views/BubblePop/script.ts`
- Modify: `src/views/BubblePop/index.vue`（仅 `:ref` 回调签名）

**Interfaces:**
- Produces: `isTargetWord(word: string): boolean`（内部 helper，不导出）。
- 变更：`Bubble` 接口移除 `isTarget`。`startGame` 变为 `async`。
- Consumes: 现有 `currentTarget: Ref<WordPair | null>`、`activeBubbles: Ref<Bubble[]>`、`validPairs`、`bubbleConfig`。

- [ ] **Step 1: 从 `Bubble` 接口移除 `isTarget` 字段**

`script.ts` 中接口改为：

```ts
export interface Bubble {
  id: number
  word: string
  x: number
  y: number
  speed: number
  color: string
  isPopping: boolean
  isShaking: boolean
}
```

- [ ] **Step 2: 新增 `isTargetWord` helper**

放在 `spawnBubble` 之前（`// ── Bubble lifecycle ──` 区域内）：

```ts
function isTargetWord(word: string): boolean {
  return word === currentTarget.value?.english
}
```

- [ ] **Step 3: 重写 `spawnBubble` —— 按词判定目标、干扰去重、无候选不生成**

替换整个 `spawnBubble` 函数：

```ts
function spawnBubble() {
  const cfg = bubbleConfig.value
  const pairs = validPairs.value
  if (!pairs.length || !currentTarget.value) return

  const hasTarget = activeBubbles.value.some(
    (b: Bubble) => !b.isPopping && isTargetWord(b.word),
  )

  let word: string
  if (!hasTarget) {
    word = currentTarget.value.english
  } else {
    const onScreen = new Set(
      activeBubbles.value
        .filter((b: Bubble) => !b.isPopping)
        .map((b: Bubble) => b.word),
    )
    const distractors = pairs
      .map((p: WordPair) => p.english)
      .filter(
        (e: string) => e !== currentTarget.value!.english && !onScreen.has(e),
      )
    if (!distractors.length) return
    word = distractors[Math.floor(Math.random() * distractors.length)]
  }

  const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin)
  const wobbleDelay = (Math.random() * 2).toFixed(2) + 's'
  const color = BUBBLE_COLORS[colorCursor++ % BUBBLE_COLORS.length]
  const id = ++bubbleIdCounter

  activeBubbles.value.push({
    id,
    word,
    x: pickX(),
    y: arenaHeight + 80,
    speed,
    color,
    isPopping: false,
    isShaking: false,
  })

  nextTick(() => {
    const el = bubbleElMap.get(id)
    if (el) el.style.setProperty('--wobble-delay', wobbleDelay)
  })
}
```

- [ ] **Step 4: 点击判定改为实时比对**

`handleBubbleClick` 中替换分支：

```ts
function handleBubbleClick(id: number) {
  const bubble = activeBubbles.value.find((b: Bubble) => b.id === id)
  if (!bubble || bubble.isPopping || bubble.isShaking) return

  if (isTargetWord(bubble.word)) {
    handleCorrect(bubble)
  } else {
    handleWrong(bubble)
  }
}
```

- [ ] **Step 5: 仅目标词飘走才扣心**

替换 `updateBubbles` 的逃逸处理段：

```ts
function updateBubbles() {
  let escaped = false
  const toRemove: number[] = []

  for (const b of activeBubbles.value) {
    if (b.isPopping) continue
    b.y -= b.speed
    const el = bubbleElMap.get(b.id)
    if (el) el.style.top = b.y + 'px'

    if (b.y < -120) {
      toRemove.push(b.id)
      if (isTargetWord(b.word) && !escaped) {
        escaped = true
        onBubbleEscaped()
      }
    }
  }

  for (const id of toRemove) removeBubble(id)
  spawnIfNeeded()
}
```

- [ ] **Step 6: `alert` → Tauri `message`，`startGame` 改 async**

文件顶部 import 区新增：

```ts
import { message } from '@tauri-apps/plugin-dialog'
```

`startGame` 改为：

```ts
async function startGame() {
  if (validPairs.value.length < 2) {
    await message('请至少添加 2 个单词对才能开始游戏！', {
      title: '气泡消消乐',
    })
    return
  }
  // …（其余函数体保持不变）
}
```

- [ ] **Step 7: 修 `index.vue` 两处函数式 ref 签名（清基线类型错误）**

`<script setup>` 顶部从 vue 引入类型：

```ts
import type { ComponentPublicInstance } from 'vue'
```

模板两处 `:ref` 改为：

```html
<div :ref="(el: Element | ComponentPublicInstance | null) => setArenaEl(el)" class="game-arena">
```

```html
<div
  v-for="bubble in activeBubbles"
  :key="bubble.id"
  :ref="(el: Element | ComponentPublicInstance | null) => setBubbleRef(bubble.id, el)"
  ...
>
```

并同步放宽 composable 形参类型（保留 `instanceof HTMLElement` 守卫）：

```ts
function setBubbleRef(id: number, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) {
    bubbleElMap.set(id, el)
  } else {
    bubbleElMap.delete(id)
  }
}

function setArenaEl(el: Element | ComponentPublicInstance | null) {
  arenaEl = el instanceof HTMLElement ? el : null
  if (arenaEl) arenaHeight = arenaEl.clientHeight
}
```

- [ ] **Step 8: 格式化 + 类型检查**

Run:
```bash
npx prettier --write src/views/BubblePop/script.ts src/views/BubblePop/index.vue
npx vue-tsc --noEmit 2>&1 | grep -i BubblePop || echo "NO_BUBBLEPOP_ERRORS"
```
Expected: `NO_BUBBLEPOP_ERRORS`（两个基线错误也被清除）。

- [ ] **Step 9: 提交**

```bash
git add src/views/BubblePop/script.ts src/views/BubblePop/index.vue
git commit -m "fix(bubble-pop): 实时目标判定、干扰去重、仅目标扣心、Tauri dialog 与类型修复"
```

---

### Task 2: 水下视觉重设计（背景 / 气泡质感 / 题卡 / 连击 / 覆盖层）

**Files:**
- Modify: `src/views/BubblePop/style.css`
- Modify: `src/views/BubblePop/index.vue`（clue 卡片化、连击徽标、环境气泡容器）

**Interfaces:**
- Consumes: Task 1 后的 `currentTarget`、`combo`、`comboMultiplier`、`activeBubbles`、`gamePhase`、`clueFading`、`clueEntering`。
- 不新增 composable 状态。环境气泡为纯 CSS 装饰。

- [ ] **Step 1: 水下背景 + 光束 + 环境气泡（style.css）**

替换 `.game-arena` 规则并新增背景层与 keyframes。背景用 Catppuccin token 纵向渐变；新增 `.ambient-bubbles`、`.light-ray`、上升气泡 keyframes：

```css
.game-arena {
  position: relative;
  overflow: hidden;
  margin-top: calc(56px + var(--safe-top, 0px));
  height: calc(100dvh - 56px - var(--safe-top, 0px) - var(--safe-bottom, 0px));
  background: linear-gradient(
    to bottom,
    var(--ctp-crust) 0%,
    var(--ctp-mantle) 45%,
    var(--ctp-base) 100%
  );
}

@media (min-width: 1024px) {
  .game-arena {
    margin-top: 90px;
    height: calc(100vh - 90px);
  }
}

.light-ray {
  position: absolute;
  top: -20%;
  width: 18%;
  height: 140%;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--ctp-blue) 18%, transparent),
    transparent 70%
  );
  filter: blur(8px);
  pointer-events: none;
  transform: rotate(12deg);
  animation: rayDrift 14s ease-in-out infinite;
}
.light-ray.ray-2 {
  left: 40%;
  width: 12%;
  animation-duration: 19s;
  animation-delay: -5s;
}
.light-ray.ray-3 {
  left: 72%;
  width: 14%;
  animation-duration: 23s;
  animation-delay: -9s;
}

@keyframes rayDrift {
  0%,
  100% {
    transform: translateX(0) rotate(12deg);
    opacity: 0.5;
  }
  50% {
    transform: translateX(30px) rotate(12deg);
    opacity: 0.85;
  }
}

.ambient-bubbles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.ambient-bubble {
  position: absolute;
  bottom: -40px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 30%,
    color-mix(in srgb, var(--ctp-sky) 45%, transparent),
    color-mix(in srgb, var(--ctp-blue) 12%, transparent)
  );
  opacity: 0.35;
  animation: ambientRise linear infinite;
}

@keyframes ambientRise {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 0.35;
  }
  90% {
    opacity: 0.3;
  }
  100% {
    transform: translateY(-110vh) scale(1.15);
    opacity: 0;
  }
}
```

- [ ] **Step 2: 在模板加入背景装饰层（index.vue）**

在 `.game-arena` 内、气泡 `v-for` 之前插入光束与环境气泡容器（环境气泡 12 个，参数内联）：

```html
<div class="light-ray ray-1"></div>
<div class="light-ray ray-2"></div>
<div class="light-ray ray-3"></div>
<div class="ambient-bubbles" aria-hidden="true">
  <span
    v-for="n in 12"
    :key="`amb-${n}`"
    class="ambient-bubble"
    :style="{
      left: `${(n * 8.3) % 100}%`,
      width: `${10 + ((n * 7) % 26)}px`,
      height: `${10 + ((n * 7) % 26)}px`,
      animationDuration: `${9 + ((n * 3) % 11)}s`,
      animationDelay: `${-(n * 1.7) % 12}s`,
    }"
  ></span>
</div>
```

- [ ] **Step 3: 气泡水泡质感（style.css）**

替换 `.bubble` 主体并新增高光伪元素（保留 wobble/pop/shake）：

```css
.bubble {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  user-select: none;
  width: clamp(80px, 10vw, 120px);
  height: clamp(80px, 10vw, 120px);
  font-size: clamp(0.75rem, 1.5vw, 1rem);
  font-weight: 700;
  letter-spacing: 0.03em;
  text-align: center;
  padding: 8px;
  word-break: break-word;
  backdrop-filter: blur(2px);
  box-shadow:
    inset -10px -12px 24px rgba(0, 0, 0, 0.18),
    inset 8px 8px 18px rgba(255, 255, 255, 0.45),
    0 6px 18px rgba(0, 0, 0, 0.25);
  animation: bubbleWobble 3s ease-in-out infinite;
  animation-delay: var(--wobble-delay, 0s);
  transition: transform 0.08s ease;
  -webkit-app-region: no-drag;
}

.bubble::after {
  content: '';
  position: absolute;
  top: 14%;
  left: 18%;
  width: 32%;
  height: 24%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    rgba(255, 255, 255, 0.85),
    rgba(255, 255, 255, 0) 70%
  );
  pointer-events: none;
  transition: transform 0.08s ease;
}

.bubble:hover {
  transform: scale(1.08);
}
.bubble:hover::after {
  transform: translate(2px, 2px);
}
```

- [ ] **Step 4: 题卡（clue）卡片化（style.css + index.vue）**

style.css 替换 `.clue-banner` / `.clue-text` 并新增连击徽标样式：

```css
.clue-banner {
  position: fixed;
  top: 90px;
  left: 0;
  right: 0;
  z-index: 90;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 8px;
  pointer-events: none;
}

.clue-card {
  display: inline-flex;
  align-items: center;
  padding: 10px 28px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card) 70%, transparent);
  backdrop-filter: blur(10px);
  border: 1px solid color-mix(in srgb, var(--accent-primary) 35%, transparent);
  box-shadow: 0 6px 24px color-mix(in srgb, var(--accent-primary) 22%, transparent);
}

.clue-text {
  display: inline-block;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  color: var(--accent-primary);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
.clue-text.clue-entering {
  animation: clueIn 0.2s ease-out;
}
.clue-text.clue-fading {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.combo-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: clamp(0.8rem, 1.6vw, 1rem);
  font-weight: 800;
  color: var(--ctp-base);
  background: linear-gradient(135deg, var(--ctp-yellow), var(--ctp-peach));
  box-shadow: 0 2px 10px color-mix(in srgb, var(--ctp-peach) 40%, transparent);
  animation: comboPulse 0.3s ease;
}

@keyframes comboPulse {
  0% {
    transform: scale(0.7);
  }
  60% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}
```

index.vue 替换 clue banner 块为卡片 + 连击徽标：

```html
<div
  v-if="gamePhase === 'playing' || gamePhase === 'paused'"
  class="clue-banner"
>
  <span class="clue-card">
    <span
      class="clue-text"
      :class="{ 'clue-fading': clueFading, 'clue-entering': clueEntering }"
      >{{ currentTarget?.chinese }}</span
    >
  </span>
  <span v-if="combo >= 2" :key="combo" class="combo-badge"
    >×{{ comboMultiplier }} 连击</span
  >
</div>
```

（保留顶栏原 score；顶栏内原 `combo >= 2` 的小字连击可移除，避免重复——删除 `index.vue` 顶栏 score 块里的 `<span v-if="combo >= 2" ...>×{{ comboMultiplier }} 连击</span>`。）

- [ ] **Step 5: 覆盖层玻璃拟态统一（style.css）**

为 `.idle-overlay` 增加水下提示底；`.modal-box` / `.word-manager-inner` / `.rename-box` 增加半透明 + 模糊背（保持可读性）。替换/新增：

```css
.modal-box {
  background: color-mix(in srgb, var(--bg-card) 88%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid color-mix(in srgb, var(--accent-primary) 18%, transparent);
  border-radius: 20px;
  padding: 36px 40px;
  max-width: 420px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.idle-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-primary);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
  pointer-events: none;
  animation: fadeIn 0.4s ease;
}
```

- [ ] **Step 6: 格式化 + 类型检查 + 构建**

Run:
```bash
npx prettier --write src/views/BubblePop/style.css src/views/BubblePop/index.vue
npx vue-tsc --noEmit 2>&1 | grep -i BubblePop || echo "NO_BUBBLEPOP_ERRORS"
npx vite build 2>&1 | tail -3
```
Expected: `NO_BUBBLEPOP_ERRORS` 且 build 成功。

- [ ] **Step 7: 提交**

```bash
git add src/views/BubblePop/style.css src/views/BubblePop/index.vue
git commit -m "feat(bubble-pop): 水下主题重设计——背景光束、环境气泡、水泡质感、题卡与连击徽标"
```

---

### Task 3: 手动验证与收尾

**Files:** 无（验证 + 进度记录）

- [ ] **Step 1: dev server 手动试玩**

Run: `bun run vite:dev`（端口 1420）。逐项确认：
- 答对切题后，提示与"可点的正确气泡"始终一致（无两个相同词、点正确词不再判错）。
- 干扰泡飘出顶部不扣心；只有目标词飘走扣 1 心并重生目标。
- 仅 2 个单词对时同屏不出现重复气泡，且能正常进行/通关。
- 水下背景渐变、光束漂移、环境气泡上升、水泡高光、题卡、连击徽标、各覆盖层在深/浅色与窄/宽窗口下正常。
- 单词数 < 2 时点"开始"弹出 Tauri 原生 `message`（非浏览器 alert）。

- [ ] **Step 2: 最终全量类型检查**

Run: `npx vue-tsc --noEmit 2>&1 | grep -E "error TS" | sed 's/(.*//' | sort | uniq -c`
Expected: 不再出现 `src/views/BubblePop/index.vue`（基线 2 错已清）；无新增错误。

- [ ] **Step 3:（如手动发现问题）回到 systematic-debugging 修复后再次验证**

无问题则结束，进入代码评审与分支收尾。

## Self-Review

- **Spec 覆盖**：A①→Task1 Step3-4；A②→Task1 Step3；A③→Task1 Step5；A④/⑤→Task1 Step6/Step7、Step3；B 背景/气泡/题卡/连击/覆盖层→Task2 全部；C 不改动数据结构（仅移除 `isTarget`）已在 Task1 Step1 限定；D 验证→Task3。全部命中。
- **Placeholder 扫描**：无 TBD/TODO；每个改代码步骤含完整代码块。
- **类型一致**：`isTargetWord` 在 Task1 定义并贯穿使用；ref 签名 `Element | ComponentPublicInstance | null` 在模板与 composable 一致；`Bubble` 移除 `isTarget` 后无残留引用（Step3-5 已覆盖全部读取点）。
