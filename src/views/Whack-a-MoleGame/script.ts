import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const isTouchDevice =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0))

// --- Types ---
export interface WordItem {
  english: string
  chinese: string
}

export interface HoleState {
  id: number
  state: 'up' | 'down' | 'hit' | 'miss'
  word: WordItem | null
  isTarget: boolean
  timerId: any
}

export interface FloatingText {
  id: number
  text: string
  type: 'score-up' | 'score-down'
  x: number
  y: number
}

export interface Particle {
  id: number
  x: number
  y: number
  color: string
  angle: number
  speed: number
}

export function useWhackGame() {
  // --- Constants ---
  const GAME_DURATION = 60
  const MOLE_STAY_TIME = 1500
  const SPAWN_INTERVAL = 1000
  const STORAGE_KEY = 'whack_mole_vocab_v1'

  // --- State ---
  const score = ref(0)
  const timeLeft = ref(GAME_DURATION)
  const isPlaying = ref(false)
  const gameOver = ref(false)

  const defaultVocab: WordItem[] = [
    { english: 'floor', chinese: 'n. 地板' },
    { english: 'window', chinese: 'n. 窗户' },
    { english: 'chair', chinese: 'n. 椅子' },
    { english: 'table', chinese: 'n. 桌子' },
    { english: 'sofa', chinese: 'n. 沙发' },
    { english: 'door', chinese: 'n. 门' },
    { english: 'phone', chinese: 'n. 电话' },
    { english: 'clean', chinese: 'v. 打扫' },
  ]

  const vocabulary = ref<WordItem[]>([])
  const tempVocabulary = ref<WordItem[]>([])
  const currentTarget = ref<WordItem | null>(null)

  // 核心修改：确保这里初始化的类型正确，但主要在 initHoles 填充数据
  const holes = ref<HoleState[]>([])
  const holeRefs = new Map<number, HTMLElement>()

  function setHoleRef(el: any, index: number) {
    if (el) {
      holeRefs.set(index, el)
    }
  }

  // UI / VFX State
  const isTargetChanging = ref(false)
  const showResult = ref(false)
  const showSettings = ref(false)

  // 锤子位置与动画状态
  const hammerX = ref(0)
  const hammerY = ref(0)
  const isSwinging = ref(false)
  const isShaking = ref(false)
  const isHammerVisible = ref(false)

  const floatingTexts = ref<FloatingText[]>([])
  const particles = ref<Particle[]>([])
  let floatIdCounter = 0
  let particleIdCounter = 0

  let gameTimer: any = null
  let spawnTimer: any = null

  // --- Audio ---
  let audioCtx: AudioContext | null = null

  function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )()
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
  }

  function playSound(type: 'hit' | 'miss' | 'spawn') {
    ensureAudioContext()
    if (!audioCtx) return

    const t = audioCtx.currentTime
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()

    osc.connect(gain)
    gain.connect(audioCtx.destination)

    if (type === 'hit') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(300, t)
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1)
      gain.gain.setValueAtTime(0.3, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15)
      osc.start(t)
      osc.stop(t + 0.15)
    } else if (type === 'miss') {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(150, t)
      osc.frequency.linearRampToValueAtTime(200, t + 0.1)
      osc.frequency.linearRampToValueAtTime(150, t + 0.2)
      gain.gain.setValueAtTime(0.2, t)
      gain.gain.linearRampToValueAtTime(0, t + 0.3)
      osc.start(t)
      osc.stop(t + 0.3)
    } else if (type === 'spawn') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, t)
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.1)
      gain.gain.setValueAtTime(0.05, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1)
      osc.start(t)
      osc.stop(t + 0.1)
    }
  }

  // --- Input Handling (Mouse Tracking) ---
  function updateHammerPosition(e: MouseEvent) {
    hammerX.value = e.clientX
    hammerY.value = e.clientY
  }

  function triggerHammerSwing() {
    if (!isHammerVisible.value) return

    isSwinging.value = false
    nextTick(() => {
      isSwinging.value = true
      // 【修改点】将时间从 150 改为 200，匹配新的 CSS 动画时长
      setTimeout(() => {
        isSwinging.value = false
      }, 200)
      checkHit()
    })
  }

  function checkHit() {
    const hX = hammerX.value - 14
    const hY = hammerY.value - 54
    const hW = 108
    const hH = 54

    const hammerRect = {
      left: hX,
      right: hX + hW,
      top: hY,
      bottom: hY + hH,
    }

    holes.value.forEach((hole, index) => {
      if (hole.state === 'up') {
        const el = holeRefs.get(index)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (
            !(
              hammerRect.left > rect.right ||
              hammerRect.right < rect.left ||
              hammerRect.top > rect.bottom ||
              hammerRect.bottom < rect.top
            )
          ) {
            whack(index)
          }
        }
      }
    })
  }

  function showHammer() {
    isHammerVisible.value = true
  }
  function hideHammer() {
    isHammerVisible.value = false
  }

  // --- Game Logic ---
  // 初始化地鼠洞数据
  function initHoles() {
    holes.value = Array.from({ length: 9 }, (_, i) => ({
      id: i,
      state: 'down',
      word: null,
      isTarget: false,
      timerId: null,
    }))
  }

  function pickNewTarget() {
    if (vocabulary.value.length === 0) return
    isTargetChanging.value = true
    setTimeout(() => (isTargetChanging.value = false), 300)

    const randomIdx = Math.floor(Math.random() * vocabulary.value.length)
    currentTarget.value = vocabulary.value[randomIdx]

    holes.value.forEach((hole) => {
      if (hole.state === 'up' && hole.word) {
        hole.isTarget = hole.word.english === currentTarget.value?.english
      }
    })
  }

  function spawnMole() {
    if (!isPlaying.value || !currentTarget.value) return

    const availableHoles = holes.value.filter((h) => h.state === 'down')
    if (availableHoles.length === 0) return

    const randomHole =
      availableHoles[Math.floor(Math.random() * availableHoles.length)]
    const holeIndex = holes.value.indexOf(randomHole)

    const isCorrect = Math.random() < 0.4
    let moleWord = currentTarget.value

    if (!isCorrect) {
      const distractors = vocabulary.value.filter(
        (w) => w.english !== currentTarget.value?.english,
      )
      if (distractors.length > 0) {
        moleWord = distractors[Math.floor(Math.random() * distractors.length)]
      }
    }

    const hole = holes.value[holeIndex]
    hole.state = 'up'
    hole.word = moleWord
    hole.isTarget = moleWord.english === currentTarget.value.english

    playSound('spawn')

    if (hole.timerId) clearTimeout(hole.timerId)
    hole.timerId = setTimeout(() => {
      if (hole.state === 'up') {
        hole.state = 'down'
      }
    }, MOLE_STAY_TIME)
  }

  function startGame() {
    if (vocabulary.value.length < 4) {
      alert('词库单词太少啦！请至少添加4个单词。')
      openSettings()
      return
    }

    initHoles() // 这里保留，确保重开游戏时重置
    score.value = 0
    timeLeft.value = GAME_DURATION
    isPlaying.value = true
    gameOver.value = false
    showResult.value = false

    pickNewTarget()

    gameTimer = setInterval(() => {
      timeLeft.value--
      if (timeLeft.value <= 0) {
        endGame()
      }
    }, 1000)

    spawnTimer = setInterval(spawnMole, SPAWN_INTERVAL)
    spawnMole()
  }

  function endGame() {
    isPlaying.value = false
    gameOver.value = true
    clearInterval(gameTimer)
    clearInterval(spawnTimer)

    holes.value.forEach((h) => {
      clearTimeout(h.timerId)
      h.state = 'down'
    })

    showResult.value = true
  }

  function whack(index: number) {
    if (!isPlaying.value) return
    const hole = holes.value[index]

    if (hole.state !== 'up') return

    const effectX = hammerX.value
    const effectY = hammerY.value

    if (hole.isTarget) {
      score.value += 10
      hole.state = 'hit'
      playSound('hit')
      spawnFloatingText(effectX, effectY, '+10', 'score-up')
      spawnParticles(effectX, effectY, '#ffd700')
      triggerScreenShake()
      setTimeout(pickNewTarget, 200)
    } else {
      score.value = Math.max(0, score.value - 5)
      hole.state = 'miss'
      playSound('miss')
      spawnFloatingText(effectX, effectY, '-5', 'score-down')
      spawnParticles(effectX, effectY, '#ff4757')
    }

    if (hole.timerId) clearTimeout(hole.timerId)
    hole.timerId = setTimeout(() => {
      hole.state = 'down'
    }, 500)
  }

  function triggerScreenShake() {
    isShaking.value = true
    setTimeout(() => (isShaking.value = false), 300)
  }

  function spawnParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      const id = particleIdCounter++
      particles.value.push({
        id,
        x,
        y,
        color,
        angle: Math.random() * 360,
        speed: Math.random() * 5 + 2,
      })
      setTimeout(() => {
        particles.value = particles.value.filter((p) => p.id !== id)
      }, 500)
    }
  }

  function spawnFloatingText(
    x: number,
    y: number,
    text: string,
    type: 'score-up' | 'score-down',
  ) {
    const id = floatIdCounter++
    floatingTexts.value.push({ id, text, type, x, y })
    setTimeout(() => {
      floatingTexts.value = floatingTexts.value.filter((f) => f.id !== id)
    }, 800)
  }

  function getFeedback(score: number): string {
    if (score >= 200) return '🌟 单词大师！简直神速！'
    if (score >= 100) return '👍 非常棒！继续保持！'
    if (score >= 50) return '🙂 不错哦，再接再厉！'
    return '💪 加油！多背几个单词再来！'
  }

  function openSettings() {
    tempVocabulary.value = JSON.parse(JSON.stringify(vocabulary.value))
    if (tempVocabulary.value.length === 0) addTempWord()
    showSettings.value = true
  }
  function closeResult() {
    showResult.value = false
  }
  function addTempWord() {
    tempVocabulary.value.push({ english: '', chinese: '' })
  }
  function removeTempWord(index: number) {
    tempVocabulary.value.splice(index, 1)
  }
  function saveSettings() {
    const validWords = tempVocabulary.value.filter(
      (w) => w.english.trim() !== '' && w.chinese.trim() !== '',
    )
    if (validWords.length < 4) {
      if (!confirm('单词数量较少（建议至少4个），确定要保存吗？')) return
    }
    vocabulary.value = validWords
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vocabulary.value))
    showSettings.value = false
  }
  function loadVocabulary() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        vocabulary.value = JSON.parse(saved)
      } catch (e) {
        vocabulary.value = JSON.parse(JSON.stringify(defaultVocab))
      }
    } else {
      vocabulary.value = JSON.parse(JSON.stringify(defaultVocab))
    }
  }

  function handleHoleTap(index: number) {
    if (!isPlaying.value) return
    if (holes.value[index]?.state === 'up') {
      whack(index)
    }
  }

  onMounted(() => {
    loadVocabulary()
    // ★★★ 核心修复：组件加载时就初始化9个洞 ★★★
    initHoles()

    if (!isTouchDevice) {
      window.addEventListener('mousemove', updateHammerPosition)
      window.addEventListener('mousedown', triggerHammerSwing)
    }
  })

  onUnmounted(() => {
    if (!isTouchDevice) {
      window.removeEventListener('mousemove', updateHammerPosition)
      window.removeEventListener('mousedown', triggerHammerSwing)
    }
    if (gameTimer) clearInterval(gameTimer)
    if (spawnTimer) clearInterval(spawnTimer)
    holes.value.forEach((h) => {
      if (h.timerId) clearTimeout(h.timerId)
    })
    if (audioCtx) {
      audioCtx.close()
    }
  })

  return {
    score,
    timeLeft,
    isPlaying,
    gameOver,
    currentTarget,
    holes,
    vocabulary,
    tempVocabulary,
    showResult,
    showSettings,
    isTargetChanging,
    isShaking,
    hammerX,
    hammerY,
    isSwinging,
    isHammerVisible,
    floatingTexts,
    particles,
    isTouchDevice,
    handleHoleTap,
    startGame,
    endGame,
    whack,
    closeResult,
    openSettings,
    saveSettings,
    addTempWord,
    removeTempWord,
    getFeedback,
    showHammer,
    hideHammer,
    setHoleRef,
  }
}
