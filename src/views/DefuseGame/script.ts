import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  type Ref,
  type ComponentPublicInstance,
} from 'vue'
import { message } from '@tauri-apps/plugin-dialog'

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

  function setWireRef(
    el: Element | ComponentPublicInstance | null,
    index: number,
  ): void {
    if (el instanceof HTMLElement) wireBackRefs.value[index] = el
  }

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
      message('请至少输入一个单词！', { title: '拆弹专家' })
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
      message('请输入分组名称', { title: '拆弹专家' })
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

  watch(
    () =>
      showWordManagerModal.value ||
      showClearModal.value ||
      showDeleteConfirmModal.value ||
      showGroupModal.value,
    (v) => {
      document.body.style.overflow = v ? 'hidden' : ''
    },
  )

  onUnmounted(() => {
    document.body.style.overflow = ''
    document.removeEventListener('click', ensureAudioContext)
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
    setWireRef,
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
