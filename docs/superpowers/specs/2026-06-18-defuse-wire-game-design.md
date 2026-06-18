# 拆弹专家(剪线游戏)设计文档

日期:2026-06-18
状态:待用户确认

## 概述

在英语游戏中心新增第 14 个游戏:**拆弹专家**(剪线拆弹)。屏幕上有 9 根电线,每根对应一个单词。其中若干根连接炸弹。玩家逐根"剪线"(读出该线上的单词),剪到炸弹线会扣一颗心。剪开所有安全线即获胜,三颗心扣光即失败。风格、配色与「单词炸弹」一致。

## 核心机制

| 参数 | 值 |
|---|---|
| 电线总数 | 9(固定) |
| 炸弹数 | 简单 2 / 普通 3 / 困难 4(随难度变化) |
| 生命(心) | 3(固定) |
| 安全线数 | 9 − 炸弹数(简单 7 / 普通 6 / 困难 5) |

**流程**
1. 玩家在 9 个单词输入框填入单词(可用分组管理,见下)。
2. 选择难度(简单/普通/困难),点击「开始」。
3. 系统随机把 N 根线设为炸弹线,其余为安全线(玩家不可见)。
4. 玩家逐根点击剪线:
   - **安全线**:显示绿色断口 ✂️ + 播放成功音效,记一次成功。
   - **炸弹线**:触发爆炸粒子动画 + 爆炸音效,**扣 1 颗心**,该线标记为「已引爆」(变红、不可再点)。
5. **胜利**:所有安全线都被剪开(炸弹线无需剪)。
6. **失败**:心归零(归零瞬间结束本局,展示失败状态)。
7. 可随时「重新开始」:重新随机分布炸弹,单词不变。

**已澄清的数值冲突**:困难模式 4 个炸弹 > 3 颗心,因此胜利条件是「剪开所有安全线」而非「剪开全部 9 根线」——炸弹线只是障碍,不需要被剪开。

## UI 方案(方案 A + 电线质感)

复用「单词炸弹」的 **3×3 网格**结构,与其视觉一脉相承。

**单根线卡片(wire cell)**
- 卡片中部横贯一段**电线**:用 CSS 渐变 + 内阴影做出圆柱铜线质感,两端有金属接头,线身有高光条。不同卡片电线颜色取自 `--ctp-*` 调色板(red/peach/yellow/green/blue/mauve 等),增强"彩色排线"既视感。
- 电线下方/上方显示该线对应的**单词标签**。
- 未剪:完整电线 + 单词,hover 时剪刀光标、轻微放大。
- 剪开(安全):电线从中间断开成两截(左右回缩动画),断口冒绿色火花,显示 ✂️;卡片置灰锁定。
- 引爆(炸弹):电线烧断变焦黑,触发 `triggerExplosion` 粒子 + 屏幕轻微抖动,卡片变红锁定。

**顶部状态栏**
- 左:标题「拆弹专家」。
- 中:**3 颗心**(♥ 实心 / ♡ 空心,扣心时碎裂动画)。
- 右:进度「已拆 X / 共 Y 安全线」、当前难度标签。

**控制区**
- 难度选择:三个分段按钮(简单/普通/困难),选中态用 `--accent-primary`。
- 「开始 / 重新开始」按钮。
- 「单词管理」按钮(打开单词与分组弹窗)。

**结束态**
- 胜利:全屏祝贺覆盖层(「拆弹成功!」)+ 上扬音效。
- 失败:覆盖层(「Boom! 拆弹失败」)+ 低沉音效,按钮「再来一局」。

顶部 40px 透明拖拽区 `data-tauri-drag-region`,其余区域 `[-webkit-app-region:no-drag]`,与其他游戏一致。

## 配色

全部使用 `assets/catppuccin.css` 变量,不硬编码:
- 背景 `--bg-base`、卡片 `--bg-card`、文字 `--text-primary/secondary`、边框 `--border-color`、阴影 `--shadow-color`。
- 强调 `--accent-primary`(难度选中、按钮)。
- 电线颜色与状态:安全断口 `--ctp-green`、引爆 `--ctp-red`、心 `--ctp-red`、电线本体取多种 `--ctp-*`。

## 数据与持久化

沿用「单词炸弹」的**分组系统**(同一套 CRUD 模式),但使用**独立 localStorage key**:`wireDefuseGame`。

```ts
interface WordGroup { id: string; name: string; words: string[] }
interface LocalStorageData {
  words: string[]            // 长度固定 9
  difficulty: 'easy' | 'normal' | 'hard'
  groups?: WordGroup[]
  currentGroupId?: string | null
}
```

- 单词数固定 9(不提供增删词条按钮;若旧数据不足 9 则补空、超过则截断)。
- 分组功能与炸弹游戏一致:新建/重命名/删除/切换,删除最后一个分组自动建「默认分组」。
- `difficulty` 持久化,下次进入沿用。

## 文件结构(遵循项目约定)

```
src/views/DefuseGame/
  index.vue     # 模板,<script setup> 调用 useDefuseGame()
  script.ts     # 导出 useDefuseGame(),全部状态+逻辑
  style.css     # 电线质感/断线/引爆/碎心等 scoped 动画
```

**script.ts 导出的状态/方法(概要)**
- 状态:`words`、`wires`(每根:`{ word, state: 'intact'|'cut'|'detonated', isBomb, color }`)、`hearts`、`difficulty`、`gameStarted`、`gameOver`、`gameWon`、`safeTotal`、`safeCut`,以及分组相关 refs(`groups`、`currentGroupId`、`showGroupModal`、`groupNameInput`、`showDeleteConfirmModal`、`isRenaming` 等)、`showWordManagerModal`。
- 方法:`startGame()`、`resetGame()`、`setDifficulty(d)`、`cutWire(index)`、单词与分组 CRUD(`add/removeWord` 不提供;`handleWordInput`、`openWordManager/closeWordManager`、`openSaveGroupModal`、`saveGroup`、`selectGroup`、`requestDeleteGroup`、`confirmDeleteGroup` 等)、持久化 `save/loadFromLocalStorage()`。
- 音频:复用炸弹游戏的 Web Audio 程序化音效(`playSound`、爆炸/成功音、`ensureAudioContext`),`onUnmounted` 关闭 `audioContext`。
- 弹窗开启时锁 `body` 滚动。

**炸弹分配**:`startGame()` 校验 9 个单词至少非空(或允许空?——见下「待确认」),用 `Set` 随机选 N 个 index 为炸弹,初始化 `wires`,计算 `safeTotal = 9 - N`。

## 集成改动

1. `src/router/index.js`:import `DefuseGame`,新增 `{ path: '/defuse', name: 'DefuseGame', component }`。
2. `src/views/Home.vue`:`games` 数组新增条目 `{ path: '/defuse', title: '拆弹专家', desc: '…', tags: ['Desktop','Tablet'] }`。
3. `CLAUDE.md` 游戏表格新增一行(可选,实施时一并更新)。

## 错误处理 / 边界

- 未填任何单词点开始:提示「请至少输入一个单词」(与炸弹游戏一致),或允许空线(待确认)。
- 游戏进行中禁止重复点击同一根线、禁止在动画过程中触发新操作(`isAnimating` 锁,复用炸弹游戏思路)。
- 切换难度仅在未开始/已结束时生效,进行中切换需先重置。
- localStorage 解析失败 try/catch,回退到默认分组。

## 验证方式

无测试套件,按项目惯例:`bun run dev` 跑起,手动验证——三种难度炸弹数正确、剪安全线/炸弹线动画与扣心、胜负覆盖层、分组增删改切、刷新后单词与难度保留、浅色/深色主题下配色正确。提交前 `npx prettier --write .` 与 `vue-tsc --noEmit`。

## 已定默认(可调整)

1. **空单词**:与炸弹游戏一致——允许留空,至少 1 个非空即可点「开始」;空线照常可被剪/引爆,只是不显示单词。
2. **难度默认值**:首次进入默认「普通(3 炸弹)」。
3. **首页标签**:`Mobile, Desktop, Tablet`(3×3 网格在手机上也可用,与炸弹游戏看齐)。
