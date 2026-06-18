# 拆弹专家(剪线游戏)Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在英语游戏中心新增第 14 个游戏「拆弹专家」——9 根电线各对应一个单词,剪安全线得分、剪炸弹线扣心,剪开所有安全线获胜、三颗心扣光失败。

**Architecture:** 沿用项目既有的「composable + index.vue + style.css」单游戏结构,复用「单词炸弹」的 Web Audio 音效、爆炸粒子、分组单词管理弹窗与 Catppuccin 主题。UI 采用 3×3 剪线卡片网格,用纯 CSS 做电线质感与断线/引爆动画。

**Tech Stack:** Vue 3 `<script setup lang="ts">`、Vite、Tailwind v4(catppuccin `ctp-*` 工具类)、Tauri v2、Web Audio API、localStorage。

## Global Constraints

- 无测试套件:每个任务用 `npx vue-tsc --noEmit`(类型检查,期望 0 error)+ `bun run vite:dev` 手动验证 + `npx prettier --write .` 替代红/绿测试循环。
- 代码风格:无分号、单引号(Prettier 强制);Vue SFC 一律 `<script setup lang="ts">`;无注释除非 WHY 不明显。
- TS:`strict`、`noUnusedLocals`、`noUnusedParameters`;`@/` 映射 `src/`。
- 颜色只用 `assets/catppuccin.css` 变量或 `ctp-*` 工具类,禁止硬编码调色板色值。
- 顶部拖拽区使用 `<DragBar />` 组件(`@/components/DragBar.vue`),与其他游戏一致。
- 固定常量:电线 9 根、心 3 颗;炸弹数 easy=2 / normal=3 / hard=4。
- localStorage key:`wireDefuseGame`(独立,不与 `wordBombGame` 冲突)。
- 单词数固定 9;旧数据不足补空、超出截断;允许留空,至少 1 个非空即可开始。
- 默认难度 `normal`;首页标签 `Mobile, Desktop, Tablet`。

---

### Task 1: 游戏逻辑 composable (`script.ts`)

**Files:**
- Create: `src/views/DefuseGame/script.ts`

**Interfaces:**
- Consumes: 无(首个任务)。
- Produces: `useDefuseGame()` 返回以下供 `index.vue` 使用:
  - 状态:`words: Ref<string[]>`、`wires: Ref<Wire[]>`、`difficulty: Ref<Difficulty>`、`hearts: Ref<number>`、`gameStarted/gameOver/gameWon/isAnimating: Ref<boolean>`、`wireBackRefs: Ref<HTMLElement[]>`、`bombCount/safeTotal/safeCut`(computed `Ref<number>`)、`groups/currentGroupId/showGroupModal/groupNameInput/showDeleteConfirmModal/isRenaming/showWordManagerModal/showClearModal`。
  - 方法:`startGame()`、`resetGame()`、`setDifficulty(d: Difficulty)`、`cutWire(index: number)`、`handleWordInput(index: number)`、`openWordManager()`、`closeWordManager()`、`requestClearWords()`、`confirmClearWords()`、`cancelClearWords()`、`openSaveGroupModal(renameId?: string | null)`、`closeGroupModal()`、`saveGroup()`、`requestDeleteGroup(id)`、`confirmDeleteGroup()`、`cancelDeleteGroup()`、`selectGroup(id)`。
  - 类型导出:`Difficulty`、`WireState`、`Wire`、`WordGroup`。

- [ ] **Step 1: 创建 `src/views/DefuseGame/script.ts`,写入完整 composable**

```ts
import { ref, computed, onMounted, onUnmounted, watch, type Ref } from 'vue'

export type Difficulty = 'easy' | 'normal' | 'hard'
export type WireState = 'intact' | 'cut' | 'detonated'

export interface Wire {
  word: string
  state: WireState
  isBomb: boolean
  color: string
}

export interface WordGroup {
  id: string
  name: string
  words: string[]
}

interface LocalStorageData {
  words: string[]
  difficulty: Difficulty
  groups?: WordGroup[]
  currentGroupId?: string | null
}

const WIRE_COUNT = 9
const MAX_HEARTS = 3
const BOMB_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 2,
  normal: 3,
  hard: 4,
}
const WIRE_COLORS = [
  '--ctp-red',
  '--ctp-peach',
  '--ctp-yellow',
  '--ctp-green',
  '--ctp-teal',
  '--ctp-sky',
  '--ctp-blue',
  '--ctp-mauve',
  '--ctp-pink',
]

function normalizeWords(arr: unknown): string[] {
  const base = Array.isArray(arr) ? arr.map((w) => String(w ?? '')) : []
  const out = base.slice(0, WIRE_COUNT)
  while (out.length < WIRE_COUNT) out.push('')
  return out
}

export function useDefuseGame() {
  const words: Ref<string[]> = ref(Array(WIRE_COUNT).fill(''))
  const wires: Ref<Wire[]> = ref([])
  const difficulty: Ref<Difficulty> = ref('normal')
  const hearts: Ref<number> = ref(MAX_HEARTS)
  const gameStarted: Ref<boolean> = ref(false)
  const gameOver: Ref<boolean> = ref(false)
  const gameWon: Ref<boolean> = ref(false)
  const isAnimating: Ref<boolean> = ref(false)
  const wireBackRefs: Ref<HTMLElement[]> = ref([])

  const showWordManagerModal: Ref<boolean> = ref(false)
  const showClearModal: Ref<boolean> = ref(false)
  const groups: Ref<WordGroup[]> = ref([])
  const currentGroupId: Ref<string | null> = ref(null)
  const showGroupModal: Ref<boolean> = ref(false)
  const groupNameInput: Ref<string> = ref('')
  const showDeleteConfirmModal: Ref<boolean> = ref(false)
  const groupToDeleteId: Ref<string | null> = ref(null)
  const isRenaming: Ref<boolean> = ref(false)
  const renamingGroupId: Ref<string | null> = ref(null)

  const bombCount = computed<number>(() => BOMB_BY_DIFFICULTY[difficulty.value])
  const safeTotal = computed<number>(() => WIRE_COUNT - bombCount.value)
  const safeCut = computed<number>(
    () => wires.value.filter((w) => !w.isBomb && w.state === 'cut').length,
  )

  const audioContext: AudioContext = new (
    window.AudioContext || (window as any).webkitAudioContext
  )()

  function ensureAudioContext(): void {
    if (audioContext.state === 'suspended') audioContext.resume()
  }

  function playSound(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
  ): void {
    if (!audioContext) return
    ensureAudioContext()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.value = frequency
    oscillator.type = type
    const now = audioContext.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.1)
  }

  function playBombSound(): void {
    ;[120, 90, 60].forEach((freq, index) => {
      setTimeout(() => playSound(freq, 0.4, 'sawtooth'), index * 40)
    })
  }

  function playCutSound(): void {
    ;[523.25, 659.25, 783.99].forEach((freq, index) => {
      setTimeout(() => playSound(freq, 0.15, 'sine'), index * 80)
    })
  }

  function playWinSound(): void {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
      setTimeout(() => playSound(freq, 0.25, 'triangle'), index * 120)
    })
  }

  function playLoseSound(): void {
    ;[200, 150, 100].forEach((freq, index) => {
      setTimeout(() => playSound(freq, 0.5, 'sawtooth'), index * 150)
    })
  }

  function triggerExplosion(container: HTMLElement): void {
    const fragment = document.createDocumentFragment()
    const boom = document.createElement('div')
    boom.className = 'explosion'
    fragment.appendChild(boom)
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div')
      p.className = 'particle'
      const angle = Math.random() * Math.PI * 2
      const distance = 60 + Math.random() * 90
      p.style.setProperty('--tx', Math.cos(angle) * distance + 'px')
      p.style.setProperty('--ty', Math.sin(angle) * distance + 'px')
      const scale = 0.5 + Math.random() * 0.5
      p.style.transform = `translate(-50%, -50%) scale(${scale})`
      fragment.appendChild(p)
    }
    container.appendChild(fragment)
    setTimeout(() => {
      boom.remove()
      container.querySelectorAll('.particle').forEach((el) => el.remove())
    }, 800)
  }

  function initWires(): void {
    wires.value = words.value.map(
      (w, i): Wire => ({
        word: w,
        state: 'intact',
        isBomb: false,
        color: WIRE_COLORS[i % WIRE_COLORS.length],
      }),
    )
  }

  function setDifficulty(d: Difficulty): void {
    if (gameStarted.value && !gameOver.value) return
    difficulty.value = d
    saveToLocalStorage()
  }

  function startGame(): void {
    if (isAnimating.value) return
    if (!words.value.some((w) => w.trim())) {
      alert('请至少输入一个单词！')
      return
    }
    hearts.value = MAX_HEARTS
    gameStarted.value = true
    gameOver.value = false
    gameWon.value = false
    isAnimating.value = false
    const bombIndices = new Set<number>()
    while (bombIndices.size < bombCount.value) {
      bombIndices.add(Math.floor(Math.random() * WIRE_COUNT))
    }
    wires.value = words.value.map(
      (w, i): Wire => ({
        word: w,
        state: 'intact',
        isBomb: bombIndices.has(i),
        color: WIRE_COLORS[i % WIRE_COLORS.length],
      }),
    )
  }

  function resetGame(): void {
    if (isAnimating.value) return
    gameStarted.value = false
    gameOver.value = false
    gameWon.value = false
    hearts.value = MAX_HEARTS
    initWires()
  }

  function checkWin(): void {
    if (safeCut.value >= safeTotal.value) {
      gameWon.value = true
      gameOver.value = true
      playWinSound()
    }
  }

  function cutWire(index: number): void {
    const wire = wires.value[index]
    if (
      !gameStarted.value ||
      gameOver.value ||
      wire.state !== 'intact' ||
      isAnimating.value
    )
      return

    if (wire.isBomb) {
      wire.state = 'detonated'
      isAnimating.value = true
      hearts.value = Math.max(0, hearts.value - 1)
      playBombSound()
      requestAnimationFrame(() => {
        const el = wireBackRefs.value[index]
        if (el) triggerExplosion(el)
      })
      setTimeout(() => {
        isAnimating.value = false
        if (hearts.value <= 0) {
          gameOver.value = true
          gameWon.value = false
          playLoseSound()
        }
      }, 700)
    } else {
      wire.state = 'cut'
      playCutSound()
      checkWin()
    }
  }

  function saveToLocalStorage(): void {
    const data: LocalStorageData = {
      words: words.value,
      difficulty: difficulty.value,
      groups: groups.value,
      currentGroupId: currentGroupId.value,
    }
    localStorage.setItem('wireDefuseGame', JSON.stringify(data))
  }

  function handleWordInput(index: number): void {
    if (currentGroupId.value) {
      const group = groups.value.find((g) => g.id === currentGroupId.value)
      if (group) group.words[index] = words.value[index]
    }
    saveToLocalStorage()
    if (wires.value[index]) wires.value[index].word = words.value[index]
  }

  function openWordManager(): void {
    showWordManagerModal.value = true
  }

  function closeWordManager(): void {
    showWordManagerModal.value = false
  }

  function requestClearWords(): void {
    showClearModal.value = true
  }

  function confirmClearWords(): void {
    words.value = words.value.map(() => '')
    if (currentGroupId.value) {
      const group = groups.value.find((g) => g.id === currentGroupId.value)
      if (group) group.words = [...words.value]
    }
    initWires()
    saveToLocalStorage()
    showClearModal.value = false
  }

  function cancelClearWords(): void {
    showClearModal.value = false
  }

  function openSaveGroupModal(renameId: string | null = null): void {
    if (renameId) {
      isRenaming.value = true
      renamingGroupId.value = renameId
      const group = groups.value.find((g) => g.id === renameId)
      groupNameInput.value = group ? group.name : ''
    } else {
      isRenaming.value = false
      renamingGroupId.value = null
      groupNameInput.value = ''
    }
    showGroupModal.value = true
  }

  function closeGroupModal(): void {
    showGroupModal.value = false
    isRenaming.value = false
    renamingGroupId.value = null
  }

  function saveGroup(): void {
    const name = groupNameInput.value.trim()
    if (!name) {
      alert('请输入分组名称')
      return
    }
    if (isRenaming.value && renamingGroupId.value) {
      const group = groups.value.find((g) => g.id === renamingGroupId.value)
      if (group) group.name = name
    } else {
      const newGroup: WordGroup = {
        id: Date.now().toString(),
        name,
        words: Array(WIRE_COUNT).fill(''),
      }
      groups.value.push(newGroup)
      currentGroupId.value = newGroup.id
      words.value = [...newGroup.words]
      initWires()
    }
    saveToLocalStorage()
    closeGroupModal()
  }

  function requestDeleteGroup(id: string): void {
    groupToDeleteId.value = id
    showDeleteConfirmModal.value = true
  }

  function confirmDeleteGroup(): void {
    if (!groupToDeleteId.value) return
    groups.value = groups.value.filter((g) => g.id !== groupToDeleteId.value)
    if (groups.value.length === 0) {
      const defaultGroup: WordGroup = {
        id: Date.now().toString(),
        name: '默认分组',
        words: Array(WIRE_COUNT).fill(''),
      }
      groups.value.push(defaultGroup)
      currentGroupId.value = defaultGroup.id
      words.value = [...defaultGroup.words]
    } else if (currentGroupId.value === groupToDeleteId.value) {
      currentGroupId.value = groups.value[0].id
      words.value = [...groups.value[0].words]
    }
    initWires()
    saveToLocalStorage()
    showDeleteConfirmModal.value = false
    groupToDeleteId.value = null
  }

  function cancelDeleteGroup(): void {
    showDeleteConfirmModal.value = false
    groupToDeleteId.value = null
  }

  function selectGroup(id: string): void {
    const group = groups.value.find((g) => g.id === id)
    if (group) {
      currentGroupId.value = id
      words.value = normalizeWords(group.words)
      group.words = [...words.value]
      initWires()
      saveToLocalStorage()
    }
  }

  function loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('wireDefuseGame')
      if (saved) {
        const data: LocalStorageData = JSON.parse(saved)
        if (Array.isArray(data.groups) && data.groups.length > 0) {
          groups.value = data.groups.map((g) => ({
            ...g,
            words: normalizeWords(g.words),
          }))
        } else {
          groups.value = [
            {
              id: Date.now().toString(),
              name: '默认分组',
              words: normalizeWords(data.words),
            },
          ]
        }
        if (
          data.currentGroupId &&
          groups.value.some((g) => g.id === data.currentGroupId)
        ) {
          currentGroupId.value = data.currentGroupId
        } else {
          currentGroupId.value = groups.value[0].id
        }
        const currentGroup = groups.value.find(
          (g) => g.id === currentGroupId.value,
        )
        if (currentGroup) words.value = [...currentGroup.words]
        if (data.difficulty && data.difficulty in BOMB_BY_DIFFICULTY) {
          difficulty.value = data.difficulty
        }
      } else {
        const defaultGroup: WordGroup = {
          id: Date.now().toString(),
          name: '默认分组',
          words: Array(WIRE_COUNT).fill(''),
        }
        groups.value = [defaultGroup]
        currentGroupId.value = defaultGroup.id
        words.value = [...defaultGroup.words]
      }
    } catch (e) {
      console.error(e)
    }
  }

  onMounted(() => {
    loadFromLocalStorage()
    initWires()
    document.addEventListener('click', ensureAudioContext, { once: true })
  })

  watch(showWordManagerModal, (v) => {
    document.body.style.overflow = v ? 'hidden' : ''
  })

  onUnmounted(() => {
    document.body.style.overflow = ''
    audioContext.close()
  })

  return {
    words,
    wires,
    difficulty,
    hearts,
    gameStarted,
    gameOver,
    gameWon,
    isAnimating,
    wireBackRefs,
    bombCount,
    safeTotal,
    safeCut,
    showWordManagerModal,
    showClearModal,
    groups,
    currentGroupId,
    showGroupModal,
    groupNameInput,
    showDeleteConfirmModal,
    isRenaming,
    startGame,
    resetGame,
    setDifficulty,
    cutWire,
    handleWordInput,
    openWordManager,
    closeWordManager,
    requestClearWords,
    confirmClearWords,
    cancelClearWords,
    openSaveGroupModal,
    closeGroupModal,
    saveGroup,
    requestDeleteGroup,
    confirmDeleteGroup,
    cancelDeleteGroup,
    selectGroup,
  }
}
```

- [ ] **Step 2: 类型检查**

Run: `cd /Users/jenkin/Documents/english-games && npx vue-tsc --noEmit`
Expected: 无 `src/views/DefuseGame/script.ts` 相关错误(此时 `index.vue` 尚未引用,文件本身应通过)。

- [ ] **Step 3: 提交**

```bash
git add src/views/DefuseGame/script.ts
git commit -m "feat(defuse): 拆弹专家游戏逻辑 composable"
```

---

### Task 2: 游戏视图 (`index.vue`)

**Files:**
- Create: `src/views/DefuseGame/index.vue`

**Interfaces:**
- Consumes: `useDefuseGame()`(Task 1 的全部返回值)、`@/components/DragBar.vue`。
- Produces: 默认导出的 Vue 组件,供 Task 4 在 router 注册为 `DefuseGame`。

- [ ] **Step 1: 创建 `src/views/DefuseGame/index.vue`,写入模板与 script**

```vue
<template>
  <div
    class="bg-ctp-base min-h-screen p-2 transition-colors duration-300 sm:p-5"
    style="
      padding-bottom: max(0.5rem, var(--safe-bottom));
      padding-left: max(0.5rem, var(--safe-left));
      padding-right: max(0.5rem, var(--safe-right));
    "
  >
    <DragBar />
    <div
      class="bg-ctp-mantle mx-auto flex min-h-[95vh] max-w-[1400px] flex-col overflow-hidden rounded-2xl shadow-2xl"
    >
      <header
        class="border-ctp-surface1 bg-ctp-surface0 flex flex-wrap items-center justify-center gap-3 rounded-xl border-b-2 px-4 py-3 shadow-md sm:justify-between sm:px-6 sm:py-4"
      >
        <div class="flex items-center gap-4">
          <router-link
            to="/"
            class="bg-ctp-surface1 text-ctp-text inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:brightness-110"
          >
            <i class="fas fa-home"></i> 首页
          </router-link>
          <div class="bg-ctp-surface2 h-6 w-0.5"></div>
          <h1
            class="text-ctp-red flex items-center justify-center gap-3 text-2xl font-black tracking-wide"
          >
            <i class="fas fa-scissors"></i> 拆弹专家
          </h1>
        </div>

        <div class="flex items-center gap-2">
          <i
            v-for="n in 3"
            :key="n"
            class="fas text-2xl"
            :class="n <= hearts ? 'fa-heart text-ctp-red' : 'fa-heart-broken text-ctp-overlay0'"
          ></i>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="bg-ctp-surface1 flex items-center gap-1 rounded-lg p-1">
            <button
              v-for="opt in difficulties"
              :key="opt.value"
              class="rounded-md px-3 py-1.5 text-sm font-bold transition-all"
              :class="
                difficulty === opt.value
                  ? 'bg-ctp-blue text-ctp-base shadow-sm'
                  : 'text-ctp-subtext1 hover:text-ctp-text'
              "
              :disabled="gameStarted && !gameOver"
              @click="setDifficulty(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
          <button
            class="bg-ctp-green text-ctp-base inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-bold shadow-md transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            @click="startGame"
            :disabled="(gameStarted && !gameOver) || isAnimating"
          >
            <i class="fas fa-play"></i> 开始
          </button>
          <button
            class="bg-ctp-red text-ctp-base inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-bold shadow-md transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            @click="resetGame"
            :disabled="isAnimating"
          >
            <i class="fas fa-redo"></i> 重置
          </button>
          <button
            class="bg-ctp-mauve text-ctp-base inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:brightness-110"
            @click="openWordManager"
          >
            <i class="fas fa-edit"></i> 管理单词
          </button>
        </div>
      </header>

      <div
        class="text-ctp-subtext1 mx-8 mt-5 text-center text-lg font-bold"
        v-if="gameStarted && !gameOver"
      >
        已拆 {{ safeCut }} / 共 {{ safeTotal }} 根安全线 · 炸弹 {{ bombCount }} 个
      </div>

      <div
        v-if="gameOver"
        class="animate-fadeIn mx-8 mt-5 rounded-2xl p-5 text-center text-2xl font-bold text-white shadow-lg"
        :class="
          gameWon
            ? 'from-ctp-green to-ctp-teal bg-linear-to-br'
            : 'from-ctp-red to-ctp-maroon bg-linear-to-br'
        "
      >
        {{ gameWon ? '🎉 拆弹成功！所有安全线已剪断' : '💥 Boom！拆弹失败' }}
      </div>

      <div class="wires-grid">
        <div
          v-for="(wire, index) in wires"
          :key="index"
          class="wire-cell"
          :class="{
            cut: wire.state === 'cut',
            detonated: wire.state === 'detonated',
            disabled:
              !gameStarted || gameOver || wire.state !== 'intact' || isAnimating,
          }"
          @click="cutWire(index)"
        >
          <div class="wire-track" ref="wireBackRefs">
            <span class="wire-segment left" :style="{ background: `var(${wire.color})` }"></span>
            <span class="wire-knot">
              <i
                v-if="wire.state === 'intact'"
                class="fas fa-scissors text-ctp-text/70"
              ></i>
              <i
                v-else-if="wire.state === 'cut'"
                class="fas fa-check text-ctp-green"
              ></i>
              <span v-else class="text-xl">💥</span>
            </span>
            <span class="wire-segment right" :style="{ background: `var(${wire.color})` }"></span>
          </div>
          <div class="wire-word">{{ wire.word }}</div>
        </div>
      </div>

      <div
        class="border-ctp-blue bg-ctp-surface0 text-ctp-text mx-8 mt-8 mb-8 rounded-lg border-l-4 p-4 text-sm"
      >
        <h3 class="text-ctp-blue mt-0">游戏规则</h3>
        <ol class="mb-0 list-decimal pl-5">
          <li class="mb-2">点击"管理单词"为 9 根电线各输入一个单词</li>
          <li class="mb-2">选择难度（简单 2 / 普通 3 / 困难 4 个炸弹），点击"开始"</li>
          <li class="mb-2">点击电线即剪断：安全线显示 ✓，炸弹线爆炸并扣 1 颗心</li>
          <li class="mb-2">剪开全部安全线即获胜；三颗心扣光即失败</li>
          <li class="mb-2">点击"重置"重新分布炸弹</li>
        </ol>
      </div>

      <WordManagerModals
        v-if="showWordManagerModal || showClearModal || showDeleteConfirmModal || showGroupModal"
        :show-word-manager-modal="showWordManagerModal"
        :show-clear-modal="showClearModal"
        :show-delete-confirm-modal="showDeleteConfirmModal"
        :show-group-modal="showGroupModal"
        :is-renaming="isRenaming"
        :groups="groups"
        :current-group-id="currentGroupId"
        :words="words"
        v-model:group-name-input="groupNameInput"
        @close-word-manager="closeWordManager"
        @select-group="selectGroup"
        @open-save-group-modal="openSaveGroupModal"
        @request-delete-group="requestDeleteGroup"
        @request-clear-words="requestClearWords"
        @handle-word-input="handleWordInput"
        @confirm-clear-words="confirmClearWords"
        @cancel-clear-words="cancelClearWords"
        @confirm-delete-group="confirmDeleteGroup"
        @cancel-delete-group="cancelDeleteGroup"
        @save-group="saveGroup"
        @close-group-modal="closeGroupModal"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DragBar from '@/components/DragBar.vue'
import WordManagerModals from './WordManagerModals.vue'
import { useDefuseGame, type Difficulty } from './script'

const difficulties: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: '简单' },
  { value: 'normal', label: '普通' },
  { value: 'hard', label: '困难' },
]

const {
  words,
  wires,
  difficulty,
  hearts,
  gameStarted,
  gameOver,
  gameWon,
  isAnimating,
  wireBackRefs,
  bombCount,
  safeTotal,
  safeCut,
  showWordManagerModal,
  showClearModal,
  groups,
  currentGroupId,
  showGroupModal,
  groupNameInput,
  showDeleteConfirmModal,
  isRenaming,
  startGame,
  resetGame,
  setDifficulty,
  cutWire,
  handleWordInput,
  openWordManager,
  closeWordManager,
  requestClearWords,
  confirmClearWords,
  cancelClearWords,
  openSaveGroupModal,
  closeGroupModal,
  saveGroup,
  requestDeleteGroup,
  confirmDeleteGroup,
  cancelDeleteGroup,
  selectGroup,
} = useDefuseGame()
</script>

<style scoped src="./style.css"></style>
```

> 说明:单词管理 + 分组的弹窗群抽成独立组件 `WordManagerModals.vue`(Task 3),让 `index.vue` 聚焦于游戏盘面,职责单一。

- [ ] **Step 2: 提交(此时尚不能类型检查通过,因 `WordManagerModals.vue`、`style.css` 未建——下一任务补齐后统一检查)**

```bash
git add src/views/DefuseGame/index.vue
git commit -m "feat(defuse): 游戏视图 index.vue 盘面与状态栏"
```

---

### Task 3: 单词管理弹窗组件 (`WordManagerModals.vue`) + 样式 (`style.css`)

**Files:**
- Create: `src/views/DefuseGame/WordManagerModals.vue`
- Create: `src/views/DefuseGame/style.css`

**Interfaces:**
- Consumes: 由 `index.vue` 传入的 props/emits(见 Task 2 模板中的绑定)。`groups: WordGroup[]`、`words: string[]`、布尔开关、`currentGroupId: string | null`、`isRenaming: boolean`、`groupNameInput`(`v-model`)。
- Produces: 完整弹窗 UI;`style.css` 供 `index.vue` 通过 `<style scoped src>` 引入。

- [ ] **Step 1: 创建 `src/views/DefuseGame/WordManagerModals.vue`**(固定 9 词,无增/删词条按钮,保留清空)

```vue
<template>
  <div>
    <div
      v-if="showWordManagerModal"
      class="animate-fadeIn fixed inset-0 z-1000 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        class="animate-popIn bg-ctp-base flex h-[85vh] w-11/12 max-w-5xl flex-col overflow-hidden rounded-2xl shadow-2xl"
      >
        <div
          class="border-ctp-surface1 flex items-center justify-between border-b px-6 py-4"
        >
          <h2 class="text-ctp-text m-0 text-xl font-bold">
            <i class="fas fa-book mr-2"></i>单词库管理
          </h2>
          <button
            class="text-ctp-subtext1 hover:text-ctp-red transition-colors"
            @click="emit('close-word-manager')"
          >
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <div
            class="border-ctp-surface1 bg-ctp-surface1 rounded-t-xl border-b px-5 pt-4 pb-0"
          >
            <div class="scrollbar-none flex gap-1.5 overflow-x-auto pb-0">
              <div
                v-for="group in groups"
                :key="group.id"
                class="relative top-px mr-1 cursor-pointer rounded-t-xl border border-b-0 border-transparent px-5 py-2.5 text-sm whitespace-nowrap transition-all"
                :class="
                  currentGroupId === group.id
                    ? 'bg-ctp-base text-ctp-blue border-ctp-surface1 border-b-ctp-base z-10 font-semibold'
                    : 'text-ctp-subtext1 hover:text-ctp-text bg-transparent hover:bg-white/50'
                "
                @click="emit('select-group', group.id)"
              >
                <span>{{ group.name }}</span>
              </div>
              <div
                class="text-ctp-subtext1 hover:text-ctp-blue mb-1 ml-1 flex h-8 w-8 cursor-pointer items-center justify-center self-center rounded-full bg-white/50 text-xl transition-all hover:bg-white hover:shadow-md"
                @click="emit('open-save-group-modal', null)"
              >
                +
              </div>
            </div>
          </div>

          <div
            class="bg-ctp-base border-ctp-surface1 rounded-b-xl border border-t-0 p-5 shadow-sm"
          >
            <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap gap-2">
                <button
                  v-if="currentGroupId"
                  class="from-ctp-sky to-ctp-blue text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110"
                  @click="emit('open-save-group-modal', currentGroupId)"
                >
                  ✎ 重命名分组
                </button>
                <button
                  v-if="currentGroupId"
                  class="from-ctp-maroon to-ctp-red text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110"
                  @click="emit('request-delete-group', currentGroupId)"
                >
                  🗑 删除本组
                </button>
              </div>
              <button
                class="from-ctp-mauve to-ctp-pink text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110"
                @click="emit('request-clear-words')"
              >
                × 清空
              </button>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div
                v-for="(_word, index) in words"
                :key="index"
                class="flex flex-col"
              >
                <label class="text-ctp-blue mb-1.5 font-bold">
                  电线 {{ index + 1 }}:
                </label>
                <input
                  type="text"
                  v-model="words[index]"
                  :placeholder="`输入单词 ${index + 1}`"
                  @input="emit('handle-word-input', index)"
                  autocapitalize="off"
                  autocorrect="off"
                  spellcheck="false"
                  class="border-ctp-surface1 dark:bg-ctp-surface0 text-ctp-text placeholder-ctp-overlay1 focus:border-ctp-blue focus:ring-ctp-blue/20 w-full rounded-lg border-2 bg-white p-3 text-base transition-colors focus:ring-2 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          class="border-ctp-surface1 bg-ctp-surface0 flex justify-end border-t px-6 py-4"
        >
          <button
            class="from-ctp-green to-ctp-teal text-ctp-base rounded-lg bg-linear-to-r px-8 py-2.5 font-bold shadow-md transition-all hover:brightness-110"
            @click="emit('close-word-manager')"
          >
            完成
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showClearModal"
      class="animate-fadeIn fixed inset-0 z-2000 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        class="animate-popIn bg-ctp-mantle w-11/12 max-w-md rounded-2xl p-8 text-center shadow-2xl"
      >
        <h3 class="text-ctp-text mt-0 text-2xl font-bold">确认清空？</h3>
        <p class="text-ctp-subtext1 mb-6 text-base">
          此操作将清空所有已输入的单词，无法撤销。
        </p>
        <div class="flex justify-center gap-4">
          <button
            class="bg-ctp-surface1 text-ctp-text rounded-lg px-6 py-2.5 font-bold transition-all hover:brightness-110"
            @click="emit('cancel-clear-words')"
          >
            取消
          </button>
          <button
            class="from-ctp-red to-ctp-maroon text-ctp-base rounded-lg bg-linear-to-r px-6 py-2.5 font-bold shadow-md transition-all hover:brightness-110"
            @click="emit('confirm-clear-words')"
          >
            确定清空
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showDeleteConfirmModal"
      class="animate-fadeIn fixed inset-0 z-2000 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        class="animate-popIn bg-ctp-mantle w-11/12 max-w-md rounded-2xl p-8 text-center shadow-2xl"
      >
        <h3 class="text-ctp-text mt-0 text-2xl font-bold">确认删除分组？</h3>
        <p class="text-ctp-subtext1 mb-6 text-base">
          此操作将永久删除该分组，无法撤销。
        </p>
        <div class="flex justify-center gap-4">
          <button
            class="bg-ctp-surface1 text-ctp-text rounded-lg px-6 py-2.5 font-bold transition-all hover:brightness-110"
            @click="emit('cancel-delete-group')"
          >
            取消
          </button>
          <button
            class="from-ctp-red to-ctp-maroon text-ctp-base rounded-lg bg-linear-to-r px-6 py-2.5 font-bold shadow-md transition-all hover:brightness-110"
            @click="emit('confirm-delete-group')"
          >
            确定删除
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showGroupModal"
      class="animate-fadeIn fixed inset-0 z-2000 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        class="animate-popIn bg-ctp-mantle w-11/12 max-w-md rounded-2xl p-8 text-center shadow-2xl"
      >
        <h3 class="text-ctp-text mt-0 text-2xl font-bold">
          {{ isRenaming ? '重命名分组' : '新建分组' }}
        </h3>
        <p class="text-ctp-subtext1 mb-4 text-base">请输入分组名称：</p>
        <input
          type="text"
          :value="groupNameInput"
          @input="emit('update:groupNameInput', ($event.target as HTMLInputElement).value)"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          placeholder="输入分组名称"
          class="border-ctp-surface1 dark:bg-ctp-surface0 text-ctp-text focus:border-ctp-blue focus:ring-ctp-blue/20 mb-4 w-full rounded-lg border-2 bg-white p-3 text-base transition-colors focus:ring-2 focus:outline-none"
          @keyup.enter="emit('save-group')"
        />
        <div class="flex justify-center gap-4">
          <button
            class="bg-ctp-surface1 text-ctp-text rounded-lg px-6 py-2.5 font-bold transition-all hover:brightness-110"
            @click="emit('close-group-modal')"
          >
            取消
          </button>
          <button
            class="from-ctp-green to-ctp-teal text-ctp-base rounded-lg bg-linear-to-r px-6 py-2.5 font-bold shadow-md transition-all hover:brightness-110"
            @click="emit('save-group')"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WordGroup } from './script'

defineProps<{
  showWordManagerModal: boolean
  showClearModal: boolean
  showDeleteConfirmModal: boolean
  showGroupModal: boolean
  isRenaming: boolean
  groups: WordGroup[]
  currentGroupId: string | null
  words: string[]
  groupNameInput: string
}>()

const emit = defineEmits<{
  'close-word-manager': []
  'select-group': [id: string]
  'open-save-group-modal': [id: string | null]
  'request-delete-group': [id: string]
  'request-clear-words': []
  'handle-word-input': [index: number]
  'confirm-clear-words': []
  'cancel-clear-words': []
  'confirm-delete-group': []
  'cancel-delete-group': []
  'save-group': []
  'close-group-modal': []
  'update:groupNameInput': [value: string]
}>()
</script>
```

- [ ] **Step 2: 创建 `src/views/DefuseGame/style.css`**(电线质感 + 断线/引爆动画 + 复用炸弹爆炸粒子 + 弹窗动画)

```css
.wires-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(12px, 2.5vw, 28px);
  margin-top: 24px;
  padding: 0 clamp(12px, 3vw, 30px);
}

.wire-cell {
  position: relative;
  height: clamp(120px, 22vw, 200px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  border-radius: 16px;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  box-shadow: 0 6px 14px var(--shadow-color);
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    opacity 0.3s;
}

.wire-cell:not(.disabled):hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 22px var(--shadow-color);
  cursor:
    url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><text y="20" font-size="20">✂️</text></svg>')
      14 14,
    pointer;
}

.wire-cell.disabled {
  cursor: not-allowed;
}

.wire-track {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80%;
  height: 22px;
}

.wire-segment {
  position: relative;
  height: 14px;
  flex: 1;
  border-radius: 7px;
  box-shadow:
    inset 0 3px 4px rgba(255, 255, 255, 0.55),
    inset 0 -3px 5px rgba(0, 0, 0, 0.35);
  transition: transform 0.35s ease;
}

.wire-segment::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 8%;
  width: 84%;
  height: 3px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.5);
}

.wire-segment.left {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.wire-segment.right {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.wire-knot {
  z-index: 2;
  display: flex;
  height: 30px;
  width: 30px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-base);
  border: 2px solid var(--border-color);
  font-size: 13px;
}

.wire-word {
  font-size: clamp(20px, 3.2vw, 34px);
  font-weight: 800;
  color: var(--text-primary);
  word-break: break-word;
  text-align: center;
  padding: 0 8px;
}

.wire-cell.cut .wire-segment.left {
  transform: translateX(-10px);
}

.wire-cell.cut .wire-segment.right {
  transform: translateX(10px);
}

.wire-cell.cut {
  opacity: 0.7;
}

.wire-cell.cut .wire-knot {
  border-color: var(--ctp-green);
}

.wire-cell.detonated {
  border-color: var(--ctp-red);
  animation: cellShake 0.5s;
}

.wire-cell.detonated .wire-segment {
  background: var(--ctp-red) !important;
  filter: brightness(0.4) saturate(1.4);
}

.wire-cell.detonated .wire-segment.left {
  transform: translateX(-6px);
}

.wire-cell.detonated .wire-segment.right {
  transform: translateX(6px);
}

@keyframes cellShake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-8px);
  }
  75% {
    transform: translateX(8px);
  }
}

:deep(.explosion) {
  position: absolute;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    rgba(255, 230, 120, 0.95) 0%,
    rgba(255, 140, 0, 0.85) 45%,
    rgba(255, 0, 0, 0.6) 70%,
    rgba(255, 0, 0, 0) 72%
  );
  pointer-events: none;
  animation: explode 600ms ease-out forwards;
  filter: blur(0.3px);
}

@keyframes explode {
  0% {
    transform: translate(-50%, -50%) scale(0.2);
    opacity: 0.9;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.6);
    opacity: 0;
  }
}

:deep(.particle) {
  position: absolute;
  width: 10px;
  height: 10px;
  background: radial-gradient(circle, #fff59d 0%, #ff9800 60%, #f44336 100%);
  border-radius: 50%;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: fly 720ms ease-out forwards;
}

@keyframes fly {
  0% {
    transform: translate(-50%, -50%) scale(0.7);
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty)))
      scale(0.4);
    opacity: 0;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

.animate-popIn {
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}

.scrollbar-none {
  scrollbar-width: none;
}

@media (max-width: 768px) {
  .wires-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .wires-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: 类型检查**

Run: `cd /Users/jenkin/Documents/english-games && npx vue-tsc --noEmit`
Expected: 0 error(`script.ts` + `index.vue` + `WordManagerModals.vue` 全部通过)。

- [ ] **Step 4: 提交**

```bash
git add src/views/DefuseGame/WordManagerModals.vue src/views/DefuseGame/style.css
git commit -m "feat(defuse): 单词管理弹窗组件与电线质感样式"
```

---

### Task 4: 集成路由与首页入口

**Files:**
- Modify: `src/router/index.js`
- Modify: `src/views/Home.vue`(`games` 数组)
- Modify: `CLAUDE.md`(游戏表格新增一行)

**Interfaces:**
- Consumes: Task 2 的 `DefuseGame` 默认导出组件。
- Produces: 可经 `/defuse` 访问、首页可见的游戏入口。

- [ ] **Step 1: 在 `src/router/index.js` 注册路由**

在 import 段(`BubblePopGame` import 之后)加入:
```js
import DefuseGame from '../views/DefuseGame/index.vue'
```
在 `routes` 数组末尾(`bubble-pop` 条目之后)加入:
```js
  {
    path: '/defuse',
    name: 'DefuseGame',
    component: DefuseGame,
  },
```

- [ ] **Step 2: 在 `src/views/Home.vue` 的 `games` 数组追加条目**

找到 `games` 数组(各项形如 `{ path, title, desc, tags }`),在末尾追加:
```js
  {
    path: '/defuse',
    title: '拆弹专家',
    desc: '剪断电线读单词，避开炸弹保住三颗心',
    tags: ['Mobile', 'Desktop', 'Tablet'],
  },
```
> 注意:照搬数组中已有条目的字段名与书写风格(若现有用 `name` 而非 `title`,或字段顺序不同,以现有为准)。先读该数组确认确切结构再插入。

- [ ] **Step 3: 更新 `CLAUDE.md` 游戏表格**

在 `## Game Views` 的表格末尾追加一行:
```md
| `/defuse` | `DefuseGame` | 拆弹专家 | Mobile, Tablet, Desktop |
```
并把首段「Version / 13 games」相关描述里若有「13 个游戏」字样改为 14(如有)。

- [ ] **Step 4: 类型检查 + 格式化**

Run: `cd /Users/jenkin/Documents/english-games && npx vue-tsc --noEmit && npx prettier --write .`
Expected: 0 类型错误;Prettier 正常写入。

- [ ] **Step 5: 提交**

```bash
git add src/router/index.js src/views/Home.vue CLAUDE.md
git commit -m "feat(defuse): 注册路由与首页入口"
```

---

### Task 5: 手动验证（dev server）

**Files:** 无(仅运行验证)。

- [ ] **Step 1: 启动 dev server**

Run: `cd /Users/jenkin/Documents/english-games && bun run vite:dev`
打开 `http://localhost:1420/#/defuse`。

- [ ] **Step 2: 逐项手动验证**

- [ ] 首页能看到「拆弹专家」卡片,标签 Mobile/Desktop/Tablet,点击进入 `/defuse`。
- [ ] 「管理单词」弹窗:9 个输入框、分组新建/重命名/删除/切换、清空均工作;输入后刷新页面仍保留。
- [ ] 三种难度按钮可切换,选中态高亮;开始后难度按钮禁用。
- [ ] 普通难度点「开始」:盘面 9 根线,进度显示「共 6 根安全线 · 炸弹 3 个」。简单显示 7/2、困难 5/4。
- [ ] 点安全线:断口回缩 + ✓ + 成功音,进度 +1;点炸弹线:爆炸粒子 + 抖动 + 扣 1 心 + 低音。
- [ ] 剪开全部安全线 → 顶部绿色「拆弹成功」+ 上扬音;扣光 3 心 → 红色「Boom 拆弹失败」+ 低沉音。
- [ ] 「重置」清盘、心恢复 3、炸弹重新随机分布。
- [ ] 切换浅色/深色系统主题,配色正确(无硬编码突兀色)。

- [ ] **Step 3: 若发现问题,回到对应任务修复并重新提交;全部通过则完成。**

---

## Self-Review

**1. Spec coverage**
- 9 线/3 心/难度炸弹数:Task 1 常量 + `bombCount` computed ✓
- 剪安全线/炸弹线、扣心、引爆标记、继续:`cutWire` ✓
- 赢=剪开所有安全线、输=心归零:`checkWin` / `cutWire` 心归零分支 ✓
- 单词可编辑 + 分组(独立 key):Task 1 持久化 + Task 3 弹窗 ✓
- 3×3 电线质感 UI、Catppuccin、爆炸复用:Task 2/3 ✓
- 集成 router/Home/CLAUDE.md:Task 4 ✓
- 默认值(留空允许、默认普通、标签三端):`startGame` 校验 / `difficulty='normal'` / Home 条目 ✓

**2. Placeholder scan:** 无 TBD/TODO;所有步骤含完整代码或确切命令。Task 4 Step 2/3 要求「先读现有结构再插入」是必要的上下文核对,非占位。

**3. Type consistency:** `useDefuseGame` 返回名与 `index.vue` 解构一致;`Difficulty/Wire/WordGroup` 在 `script.ts` 导出并被 `index.vue`/`WordManagerModals.vue` import;`cutWire/setDifficulty/safeCut/safeTotal/bombCount` 命名前后一致;弹窗 emits 事件名与 `index.vue` `@` 监听一一对应。
