import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  type Ref,
} from 'vue'

// ── Types ────────────────────────────────────────────────────────────────────

export interface WordPair {
  id: string
  english: string
  chinese: string
}

export interface WordGroup {
  id: string
  name: string
  pairs: WordPair[]
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Bubble {
  id: number
  word: string
  isTarget: boolean
  x: number
  y: number
  speed: number
  color: string
  isPopping: boolean
  isShaking: boolean
}

interface LocalStorageData {
  groups: WordGroup[]
  currentGroupId: string | null
  difficulty: Difficulty
  highScore: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'bubblePopGame'

const BUBBLE_COLORS = [
  'var(--ctp-blue)',
  'var(--ctp-green)',
  'var(--ctp-peach)',
  'var(--ctp-red)',
  'var(--ctp-mauve)',
  'var(--ctp-yellow)',
]

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { count: number; speedMin: number; speedMax: number }
> = {
  easy: { count: 3, speedMin: 0.6, speedMax: 1.0 },
  medium: { count: 5, speedMin: 1.1, speedMax: 1.6 },
  hard: { count: 7, speedMin: 1.8, speedMax: 2.4 },
}

const DEFAULT_PAIRS: WordPair[] = [
  { id: 'd1', english: 'apple', chinese: '苹果' },
  { id: 'd2', english: 'banana', chinese: '香蕉' },
  { id: 'd3', english: 'cat', chinese: '猫' },
  { id: 'd4', english: 'dog', chinese: '狗' },
  { id: 'd5', english: 'book', chinese: '书' },
  { id: 'd6', english: 'school', chinese: '学校' },
  { id: 'd7', english: 'water', chinese: '水' },
  { id: 'd8', english: 'sun', chinese: '太阳' },
]

// ── Composable ────────────────────────────────────────────────────────────────

export function useBubblePopGame() {
  // ── Game state ──────────────────────────────────────────────────────────────
  const gamePhase = ref<'idle' | 'playing' | 'paused' | 'gameover' | 'win'>(
    'idle',
  )
  const score = ref(0)
  const combo = ref(0)
  const lives = ref(3)
  const lostLives = ref(0)
  const highScore = ref(0)
  const difficulty = ref<Difficulty>('easy')
  const answeredCount = ref(0)
  const totalCount = ref(0)

  // ── Bubble state ────────────────────────────────────────────────────────────
  const activeBubbles = ref<Bubble[]>([])
  const bubbleElMap = new Map<number, HTMLElement>()

  let arenaEl: HTMLElement | null = null
  let bubbleIdCounter = 0
  let colorCursor = 0
  let arenaHeight = 600
  let rafId: number | null = null

  // ── Word queue ──────────────────────────────────────────────────────────────
  const wordQueue = ref<WordPair[]>([])
  const currentTarget = ref<WordPair | null>(null)

  // ── Clue animation ──────────────────────────────────────────────────────────
  const clueFading = ref(false)
  const clueEntering = ref(false)

  // ── Groups ──────────────────────────────────────────────────────────────────
  const groups = ref<WordGroup[]>([])
  const currentGroupId = ref<string | null>(null)

  // ── Modal visibility ────────────────────────────────────────────────────────
  const showWordManagerModal = ref(false)
  const showRenameModal = ref(false)
  const renamingGroupId = ref<string | null>(null)
  const renameInput = ref('')
  const showDeleteConfirmModal = ref(false)
  const groupToDeleteId = ref<string | null>(null)

  // ── Computed ─────────────────────────────────────────────────────────────────
  const currentGroup: Ref<WordGroup | null> = computed(
    () =>
      groups.value.find((g: WordGroup) => g.id === currentGroupId.value) ??
      null,
  )

  const validPairs: Ref<WordPair[]> = computed(() =>
    (currentGroup.value?.pairs ?? []).filter(
      (p: WordPair) => p.english.trim() && p.chinese.trim(),
    ),
  )

  const bubbleConfig = computed(
    () => DIFFICULTY_CONFIG[difficulty.value as Difficulty],
  )

  const comboMultiplier = computed(() => Math.min(combo.value + 1, 5))

  // ── Audio ─────────────────────────────────────────────────────────────────────
  let audioCtx: AudioContext | null = null

  function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )()
    }
    if (audioCtx.state === 'suspended') audioCtx.resume()
  }

  function playTone(
    frequency: number,
    type: OscillatorType,
    gain: number,
    duration: number,
  ) {
    if (!audioCtx) return
    const osc = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    osc.connect(g)
    g.connect(audioCtx.destination)
    osc.frequency.value = frequency
    osc.type = type
    const now = audioCtx.currentTime
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(gain, now + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, now + duration)
    osc.start(now)
    osc.stop(now + duration + 0.05)
  }

  function playPopSound() {
    ensureAudioContext()
    ;[523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => playTone(f, 'sine', 0.18, 0.25), i * 60),
    )
  }

  function playWrongSound() {
    ensureAudioContext()
    playTone(300, 'sawtooth', 0.18, 0.1)
    setTimeout(() => playTone(220, 'sawtooth', 0.18, 0.08), 80)
  }

  function playEscapeSound() {
    ensureAudioContext()
    if (!audioCtx) return
    const osc = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    osc.connect(g)
    g.connect(audioCtx.destination)
    osc.type = 'sine'
    const now = audioCtx.currentTime
    osc.frequency.setValueAtTime(400, now)
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3)
    g.gain.setValueAtTime(0.2, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc.start(now)
    osc.stop(now + 0.35)
  }

  function playWinSound() {
    ensureAudioContext()
    ;[261, 329, 392, 523, 659].forEach((f, i) =>
      setTimeout(() => playTone(f, 'triangle', 0.4, 0.3), i * 120),
    )
  }

  function playLoseSound() {
    ensureAudioContext()
    ;[392, 330, 262, 196].forEach((f, i) =>
      setTimeout(() => playTone(f, 'sawtooth', 0.3, 0.15), i * 180),
    )
  }

  // ── rAF loop ──────────────────────────────────────────────────────────────────

  function startLoop() {
    if (rafId !== null) return
    rafId = requestAnimationFrame(tick)
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function tick() {
    if (gamePhase.value !== 'playing') return
    updateBubbles()
    rafId = requestAnimationFrame(tick)
  }

  // ── Bubble lifecycle ──────────────────────────────────────────────────────────

  function setBubbleRef(id: number, el: Element | null) {
    if (el instanceof HTMLElement) {
      bubbleElMap.set(id, el)
    } else {
      bubbleElMap.delete(id)
    }
  }

  function setArenaEl(el: Element | null) {
    arenaEl = el instanceof HTMLElement ? el : null
    if (arenaEl) arenaHeight = arenaEl.clientHeight
  }

  function pickX(): number {
    const existing = activeBubbles.value
    for (let attempt = 0; attempt < 6; attempt++) {
      const x = 5 + Math.random() * 78
      const tooClose = existing.some(
        (b: Bubble) =>
          Math.abs(b.x - x) < 12 && Math.abs(b.y - arenaHeight) < 200,
      )
      if (!tooClose) return x
    }
    return 5 + Math.random() * 78
  }

  function spawnBubble() {
    const cfg = bubbleConfig.value
    const pairs = validPairs.value
    if (!pairs.length || !currentTarget.value) return

    const hasTarget = activeBubbles.value.some(
      (b: Bubble) => b.isTarget && !b.isPopping,
    )

    let word: string
    if (!hasTarget) {
      word = currentTarget.value.english
    } else {
      const distractors = pairs
        .map((p: WordPair) => p.english)
        .filter((e: string) => e !== currentTarget.value!.english)
      word = distractors.length
        ? distractors[Math.floor(Math.random() * distractors.length)]
        : pairs[Math.floor(Math.random() * pairs.length)].english
    }

    const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin)
    const wobbleDelay = (Math.random() * 2).toFixed(2) + 's'
    const color = BUBBLE_COLORS[colorCursor++ % BUBBLE_COLORS.length]
    const id = ++bubbleIdCounter
    const isTarget = !hasTarget

    activeBubbles.value.push({
      id,
      word,
      isTarget,
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

  function spawnIfNeeded() {
    const active = activeBubbles.value.filter((b: Bubble) => !b.isPopping)
    if (active.length < bubbleConfig.value.count) spawnBubble()
  }

  function removeBubble(id: number) {
    bubbleElMap.delete(id)
    activeBubbles.value = activeBubbles.value.filter((b: Bubble) => b.id !== id)
  }

  function spawnSparkles(cx: number, cy: number, color: string) {
    if (!arenaEl) return
    const arenaRect = arenaEl.getBoundingClientRect()
    const x = cx - arenaRect.left
    const y = cy - arenaRect.top

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const dist = 40 + Math.random() * 50
      const el = document.createElement('div')
      el.className = 'sparkle-particle'
      el.style.left = x + 'px'
      el.style.top = y + 'px'
      el.style.background = color
      el.style.setProperty('--sx', Math.cos(angle) * dist + 'px')
      el.style.setProperty('--sy', Math.sin(angle) * dist + 'px')
      arenaEl.appendChild(el)
      setTimeout(() => el.remove(), 650)
    }
  }

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
        if (!escaped) {
          escaped = true
          onBubbleEscaped()
        }
      }
    }

    for (const id of toRemove) removeBubble(id)
    spawnIfNeeded()
  }

  function onBubbleEscaped() {
    playEscapeSound()
    combo.value = 0
    lostLives.value++
    lives.value--
    if (lives.value <= 0) {
      setTimeout(() => triggerGameOver(), 400)
    }
  }

  // ── Click handler ─────────────────────────────────────────────────────────────

  function handleBubbleClick(id: number) {
    const bubble = activeBubbles.value.find((b: Bubble) => b.id === id)
    if (!bubble || bubble.isPopping || bubble.isShaking) return

    if (bubble.isTarget) {
      handleCorrect(bubble)
    } else {
      handleWrong(bubble)
    }
  }

  function handleCorrect(bubble: Bubble) {
    const el = bubbleElMap.get(bubble.id)
    const rect = el?.getBoundingClientRect()

    bubble.isPopping = true
    playPopSound()

    if (rect) {
      spawnSparkles(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        bubble.color,
      )
    }

    score.value += 10 * comboMultiplier.value
    combo.value++
    answeredCount.value++

    setTimeout(() => removeBubble(bubble.id), 420)
    advanceTarget()
  }

  function handleWrong(bubble: Bubble) {
    playWrongSound()
    combo.value = 0

    bubble.isShaking = false
    nextTick(() => {
      bubble.isShaking = true
      setTimeout(() => {
        bubble.isShaking = false
      }, 520)
    })
  }

  // ── Target / queue management ─────────────────────────────────────────────────

  function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  function advanceTarget() {
    if (wordQueue.value.length === 0) {
      stopLoop()
      setTimeout(() => triggerWin(), 600)
      return
    }

    clueFading.value = true
    setTimeout(() => {
      currentTarget.value = wordQueue.value.shift() ?? null
      clueFading.value = false
      clueEntering.value = true
      setTimeout(() => {
        clueEntering.value = false
      }, 250)
    }, 150)
  }

  // ── Game flow ─────────────────────────────────────────────────────────────────

  function startGame() {
    if (validPairs.value.length < 2) {
      alert('请至少添加 2 个单词对才能开始游戏！')
      return
    }

    arenaHeight = arenaEl?.clientHeight ?? 600

    score.value = 0
    combo.value = 0
    lives.value = 3
    lostLives.value = 0
    answeredCount.value = 0
    activeBubbles.value = []
    bubbleElMap.clear()
    bubbleIdCounter = 0
    colorCursor = 0

    const shuffled = shuffleArray(validPairs.value)
    wordQueue.value = shuffled.slice(1)
    totalCount.value = shuffled.length
    currentTarget.value = shuffled[0]

    clueEntering.value = true
    setTimeout(() => (clueEntering.value = false), 250)

    gamePhase.value = 'playing'
    startLoop()
  }

  function pauseGame() {
    if (gamePhase.value !== 'playing') return
    gamePhase.value = 'paused'
    stopLoop()
  }

  function resumeGame() {
    if (gamePhase.value !== 'paused') return
    gamePhase.value = 'playing'
    startLoop()
  }

  function resetGame() {
    stopLoop()
    activeBubbles.value = []
    bubbleElMap.clear()
    wordQueue.value = []
    currentTarget.value = null
    gamePhase.value = 'idle'
    score.value = 0
    combo.value = 0
    lives.value = 3
    lostLives.value = 0
    answeredCount.value = 0
  }

  function triggerWin() {
    stopLoop()
    if (score.value > highScore.value) {
      highScore.value = score.value
      saveToLocalStorage()
    }
    gamePhase.value = 'win'
    playWinSound()
    spawnConfetti()
  }

  function triggerGameOver() {
    stopLoop()
    gamePhase.value = 'gameover'
    playLoseSound()
    activeBubbles.value = []
    bubbleElMap.clear()
  }

  function spawnConfetti() {
    if (!arenaEl) return
    const colors = [
      '#f38ba8',
      '#a6e3a1',
      '#89b4fa',
      '#fab387',
      '#cba6f7',
      '#f9e2af',
    ]
    for (let i = 0; i < 30; i++) {
      const el = document.createElement('div')
      el.className = 'confetti-piece'
      el.style.left = Math.random() * 100 + '%'
      el.style.top = '-20px'
      el.style.background = colors[Math.floor(Math.random() * colors.length)]
      el.style.setProperty('--cf-dur', 2 + Math.random() * 2 + 's')
      el.style.transform = `rotate(${Math.random() * 360}deg)`
      arenaEl.appendChild(el)
      setTimeout(() => el.remove(), 4500)
    }
  }

  // ── Group management ──────────────────────────────────────────────────────────

  function selectGroup(id: string) {
    currentGroupId.value = id
    saveToLocalStorage()
  }

  function createGroup() {
    const newGroup: WordGroup = {
      id: Date.now().toString(),
      name: `分组 ${groups.value.length + 1}`,
      pairs: [],
    }
    groups.value.push(newGroup)
    currentGroupId.value = newGroup.id
    saveToLocalStorage()
  }

  function openRenameModal(id: string) {
    renamingGroupId.value = id
    const g = groups.value.find((g: WordGroup) => g.id === id)
    renameInput.value = g?.name ?? ''
    showRenameModal.value = true
  }

  function confirmRename() {
    const name = renameInput.value.trim()
    if (!name) return
    const g = groups.value.find(
      (g: WordGroup) => g.id === renamingGroupId.value,
    )
    if (g) g.name = name
    showRenameModal.value = false
    renamingGroupId.value = null
    saveToLocalStorage()
  }

  function cancelRename() {
    showRenameModal.value = false
    renamingGroupId.value = null
  }

  function requestDeleteGroup(id: string) {
    groupToDeleteId.value = id
    showDeleteConfirmModal.value = true
  }

  function confirmDeleteGroup() {
    if (!groupToDeleteId.value) return
    groups.value = groups.value.filter(
      (g: WordGroup) => g.id !== groupToDeleteId.value,
    )

    if (groups.value.length === 0) {
      const defaultGroup: WordGroup = {
        id: Date.now().toString(),
        name: '默认分组',
        pairs: [...DEFAULT_PAIRS],
      }
      groups.value.push(defaultGroup)
    }

    if (!groups.value.some((g: WordGroup) => g.id === currentGroupId.value)) {
      currentGroupId.value = groups.value[0].id
    }

    showDeleteConfirmModal.value = false
    groupToDeleteId.value = null
    saveToLocalStorage()
  }

  function cancelDeleteGroup() {
    showDeleteConfirmModal.value = false
    groupToDeleteId.value = null
  }

  function addPair() {
    const g = groups.value.find((g: WordGroup) => g.id === currentGroupId.value)
    if (!g) return
    g.pairs.push({ id: Date.now().toString(), english: '', chinese: '' })
    saveToLocalStorage()
  }

  function removePair(pairId: string) {
    const g = groups.value.find((g: WordGroup) => g.id === currentGroupId.value)
    if (!g) return
    g.pairs = g.pairs.filter((p: WordPair) => p.id !== pairId)
    saveToLocalStorage()
  }

  function handlePairInput() {
    saveToLocalStorage()
  }

  function openWordManager() {
    showWordManagerModal.value = true
  }

  function closeWordManager() {
    showWordManagerModal.value = false
  }

  // ── Persistence ───────────────────────────────────────────────────────────────

  function saveToLocalStorage() {
    const data: LocalStorageData = {
      groups: groups.value,
      currentGroupId: currentGroupId.value,
      difficulty: difficulty.value,
      highScore: highScore.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data: LocalStorageData = JSON.parse(raw)
        if (Array.isArray(data.groups) && data.groups.length > 0) {
          groups.value = data.groups
        } else {
          groups.value = [
            {
              id: Date.now().toString(),
              name: '默认分组',
              pairs: [...DEFAULT_PAIRS],
            },
          ]
        }
        currentGroupId.value =
          data.currentGroupId &&
          groups.value.some((g: WordGroup) => g.id === data.currentGroupId)
            ? data.currentGroupId
            : groups.value[0].id
        if (data.difficulty) difficulty.value = data.difficulty
        if (typeof data.highScore === 'number') highScore.value = data.highScore
      } else {
        groups.value = [
          {
            id: Date.now().toString(),
            name: '默认分组',
            pairs: [...DEFAULT_PAIRS],
          },
        ]
        currentGroupId.value = groups.value[0].id
      }
    } catch {
      groups.value = [
        {
          id: Date.now().toString(),
          name: '默认分组',
          pairs: [...DEFAULT_PAIRS],
        },
      ]
      currentGroupId.value = groups.value[0].id
    }
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────────

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (gamePhase.value === 'playing') pauseGame()
      else if (gamePhase.value === 'paused') resumeGame()
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    loadFromLocalStorage()
    document.addEventListener('click', ensureAudioContext, { once: true })
    document.addEventListener('keydown', handleKeydown)

    resizeObserver = new ResizeObserver(() => {
      if (arenaEl) arenaHeight = arenaEl.clientHeight
    })
    if (arenaEl) resizeObserver.observe(arenaEl)
  })

  onUnmounted(() => {
    stopLoop()
    document.removeEventListener('keydown', handleKeydown)
    resizeObserver?.disconnect()
    document.body.style.overflow = ''
    audioCtx?.close()
  })

  watch(showWordManagerModal, (v: boolean) => {
    document.body.style.overflow = v ? 'hidden' : ''
  })

  watch(difficulty, saveToLocalStorage)

  // ── Return ────────────────────────────────────────────────────────────────────

  return {
    // state
    gamePhase,
    score,
    combo,
    comboMultiplier,
    lives,
    lostLives,
    highScore,
    difficulty,
    answeredCount,
    totalCount,
    activeBubbles,
    currentTarget,
    clueFading,
    clueEntering,
    validPairs,
    // groups
    groups,
    currentGroupId,
    currentGroup,
    showWordManagerModal,
    showRenameModal,
    renameInput,
    renamingGroupId,
    showDeleteConfirmModal,
    // methods
    setArenaEl,
    setBubbleRef,
    handleBubbleClick,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    selectGroup,
    createGroup,
    openRenameModal,
    confirmRename,
    cancelRename,
    requestDeleteGroup,
    confirmDeleteGroup,
    cancelDeleteGroup,
    addPair,
    removePair,
    handlePairInput,
    openWordManager,
    closeWordManager,
  }
}
