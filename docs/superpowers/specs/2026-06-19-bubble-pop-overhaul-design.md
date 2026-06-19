# 气泡消消乐 修复 + 水下重设计 — 设计文档

日期：2026-06-19
分支：`fix/bubble-pop-overhaul`
目标文件：`src/views/BubblePop/{script.ts,index.vue,style.css}`

## 背景

气泡消消乐（`/bubble-pop`）是一款"看中文提示、点对应英文气泡"的消除游戏。当前实现存在一个明确的正确性 bug（单词和气泡对不上）以及若干其他问题，且 UI 有较大提升空间。本次工作分两部分：**逻辑修复**（正确性/合规）与**水下主题深度重设计**（视觉）。

游戏机制（不变）：
- 顶部显示中文提示 = `currentTarget.chinese`；气泡显示英文 = `bubble.word`。
- 玩家点中与当前提示匹配的英文气泡 → 答对、切下一题、加分（含连击倍率，最高 ×5）。
- 三档难度（简单/中等/困难）控制同屏气泡数与上升速度。
- 3 颗心；答完全部单词对 → 胜利。
- 单词分组 CRUD + localStorage（key `bubblePopGame`）。

## 根本原因分析

### Bug ① 单词/气泡对不上（用户报告）
`Bubble.isTarget` 是**生成气泡时冻结的静态布尔**（`script.ts` `spawnBubble`），而 `currentTarget` 会随答对切换（`advanceTarget`）。点击判定 `handleBubbleClick` 只读这个冻结标记。

触发链：第 1 题"苹果"，屏幕有干扰泡 `banana`(isTarget=false)。答对 `apple` → 题目切到"香蕉(banana)"。旧 `banana` 泡仍在场且 isTarget=false；生成逻辑发现"无目标泡"又新生成一个 `banana`(isTarget=true)。结果同屏两个 `banana`、提示是香蕉，点中旧的反而判错 → "对不上"。

根因：**正确性应在点击时按当前题目实时比对，而非用生成时冻结的标记。**

### Bug ② 干扰泡飘走也扣心（严重）
`updateBubbles` 中任意气泡飞出顶部即触发 `onBubbleEscaped` 扣心，不区分目标/干扰。干扰泡是"不该点"的、会持续自然飘走 → 一开局生命被干扰泡掏空，近乎不可通关。

根因：**只有目标词飘走（玩家没及时找到）才应扣心；干扰泡飘走应免责。**

### 其他
- ③ `startGame` 用浏览器 `alert()`，违反项目 Tauri dialog 约束（须用 `@tauri-apps/plugin-dialog` 的 `message()`）。
- ④ 两个基线类型错误：`index.vue:131,136` 函数式 ref 签名写成 `(el: Element | null)`，应为 `(el: Element | ComponentPublicInstance | null)`。
- ⑤ 少词时仍硬生成重复干扰泡（与 ① 同源）。

## A. 逻辑修复

1. **实时目标判定**
   - 从 `Bubble` 接口移除 `isTarget` 字段。
   - 新增 helper `isTargetWord(word): boolean` = `word === currentTarget.value?.english`。
   - `handleBubbleClick`：`isTargetWord(bubble.word)` → `handleCorrect`，否则 `handleWrong`。
   - `spawnBubble` 的 `hasTarget` 改为按词判断：`activeBubbles.some(b => !b.isPopping && isTargetWord(b.word))`。

2. **干扰泡去重 + 数量收敛**
   - 生成干扰泡时，候选 = `validPairs.english` 过滤掉 `currentTarget.english` **以及所有在场（未 popping）气泡的词**。
   - 候选为空 → `return`（不生成）。这天然把同屏气泡数收敛到可用唯一词数，修复少词重复。

3. **仅目标飘走扣心**
   - `updateBubbles`：气泡飞出顶部时，若 `isTargetWord(b.word)` → 调 `onBubbleEscaped()`（扣心、断连击）；否则仅 `removeBubble`，不扣心。
   - 目标飘走后，`spawnBubble` 的 `hasTarget` 为 false，会重新生成目标泡，玩家可再次尝试同一题。
   - 每 tick 至多扣一颗心（保留现有 `escaped` 去重）。

4. **Tauri dialog**
   - `import { message } from '@tauri-apps/plugin-dialog'`；`startGame` 中 `alert(...)` → `await message('请至少添加 2 个单词对才能开始游戏！', { title: '气泡消消乐' })`，函数改 `async`。

5. **类型修复**
   - `index.vue` 两处 `:ref` 回调签名改为 `(el: Element | ComponentPublicInstance | null)`（从 `vue` 引入 `ComponentPublicInstance` 类型）。`setArenaEl`/`setBubbleRef` 形参类型同步放宽并保留 `instanceof HTMLElement` 守卫。

验收：`vue-tsc --noEmit` 对 BubblePop **零错误**（含清掉 2 个基线错）。

## B. 水下视觉重设计（Catppuccin）

所有颜色继续使用 Catppuccin token（`--ctp-*`、`--bg-*`、`--accent-*`），随 `prefers-color-scheme` 自适应；不写死调色板 hex（爆炸/confetti 等纯特效色除外，沿用现状）。

- **背景（`game-arena`）**：深色纵向渐变（深→浅，深色主题 `--ctp-crust`→`--ctp-mantle`/`--ctp-base`；浅色主题对应浅 token）。叠加：
  - 2–3 道缓慢漂移的对角光束（低透明度，CSS `@keyframes` 平移）。
  - 一层持续上升的"环境小气泡"（纯 CSS 装饰、`pointer-events:none`、不参与游戏逻辑、低透明度、随机大小与时长）。
- **气泡质感**：半透明主体（提高 `color-mix` 透明度）、左上角白色高光月牙（径向渐变伪元素）、底部环境色折射、细描边；hover 轻放大 + 高光偏移。保留 `bubbleWobble` 上浮、`bubblePop` 炸裂、`bubbleShake` 错误抖动。
- **提示区（clue）**：从裸文字升级为居中半透明"气泡卡片"（圆角 + 轻发光 + 模糊背），中文题目更醒目；切题 `clueIn` 上浮淡入沿用。
- **连击反馈**：连击 ≥2 时题卡旁 `×N 连击` 徽标随连击数放大/变暖色（`--ctp-yellow`/`--ctp-peach`）；答对 sparkle 粒子增强。
- **生命**：保留 3 颗 emoji 心与 `heartLoss` 失命动画，配色/位置融入新顶栏。
- **覆盖层**：空闲/暂停/胜利/失败/单词管理/重命名/删除确认，统一玻璃拟态（模糊 + 半透明卡），与水下风一致；胜利保留 confetti。
- **响应式**：沿用现有 `clamp()` 与 `@media (min-width:1024px)` 断点；气泡尺寸、题卡、顶栏在桌面/平板/移动自适应。

## C. 不改动

单词分组 CRUD、localStorage 结构（`bubblePopGame`）、难度三档、计分/连击规则、路由 `/bubble-pop`、首页入口。唯一数据结构变化：`Bubble` 移除 `isTarget` 字段。

## D. 验证

无测试框架，采用：
1. `npx vue-tsc --noEmit` → BubblePop 零错误。
2. `npx vite build` → 成功。
3. dev server 手动试玩，重点确认：
   - 答对切题后不再出现"提示与可点正确气泡对不上"。
   - 干扰泡飘走不扣心；只有目标词飘走扣心。
   - 少词（如 2 对）时同屏不出现重复气泡。
   - 水下背景、气泡质感、题卡、连击徽标、各覆盖层在深/浅色与三种尺寸下表现正常。

## 文件影响

| 文件 | 改动 |
|---|---|
| `src/views/BubblePop/script.ts` | 移除 `isTarget`；新增 `isTargetWord`；改 `spawnBubble`/`handleBubbleClick`/`updateBubbles`；`alert`→`message`，`startGame` 改 async |
| `src/views/BubblePop/index.vue` | `:ref` 回调签名修正；clue 卡片化；连击徽标；覆盖层结构微调 |
| `src/views/BubblePop/style.css` | 水下背景、环境气泡、光束、气泡质感、玻璃拟态覆盖层、题卡 |
