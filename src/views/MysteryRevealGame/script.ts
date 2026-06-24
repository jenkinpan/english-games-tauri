import { ref, onMounted, computed, type Ref } from 'vue'
import { message } from '@tauri-apps/plugin-dialog'

// --- Types ---
export interface WordGroup {
  id: string
  name: string
  words: string[]
}

interface LocalStorageData {
  words: string[]
  groups?: WordGroup[]
  currentGroupId?: string | null
}

export function useGameLogic() {
  // --- Core State ---
  const groups: Ref<WordGroup[]> = ref([])
  const currentGroupId: Ref<string | null> = ref(null)

  // 当前正在玩的游戏词库
  const words: Ref<string[]> = ref(Array(5).fill(''))
  // 游戏进行时的随机词库 (乱序)
  const gameWords: Ref<string[]> = ref([])

  // 游戏状态
  const gameStarted: Ref<boolean> = ref(false)
  const currentWordIndex: Ref<number> = ref(0)
  const score: Ref<number> = ref(0)
  const guessInput: Ref<string> = ref('')
  const showSuccessAnim: Ref<boolean> = ref(false)
  const isInputError: Ref<boolean> = ref(false)

  // 遮挡层状态 (16个方块, true=遮挡, false=揭示)
  const revealMask: Ref<boolean[]> = ref(Array(16).fill(true))

  // --- Modal States ---
  const showGroupModal: Ref<boolean> = ref(false)
  const groupNameInput: Ref<string> = ref('')
  const isRenaming: Ref<boolean> = ref(false)
  const renamingGroupId: Ref<string | null> = ref(null)
  const showDeleteConfirmModal: Ref<boolean> = ref(false)
  const groupToDeleteId: Ref<string | null> = ref(null)
  const showClearModal: Ref<boolean> = ref(false)
  const showInputSection: Ref<boolean> = ref(true)

  // --- Computed ---
  // 计算当前目标单词
  const currentWord = computed(() => {
    if (
      !gameWords.value.length ||
      currentWordIndex.value >= gameWords.value.length
    )
      return ''
    return gameWords.value[currentWordIndex.value]
  })

  // 计算图片路径
  const currentImageUrl = computed(() => {
    const word = currentWord.value.trim()
    if (!word) return ''
    // [演示模式] 使用在线占位图，显示单词文本，方便您测试
    return `https://placehold.co/400x400/185a9d/FFF?text=${word}`

    // [生产模式] 如果您准备好了本地图片，请取消下面这行的注释，并注释掉上面那行
    // return `/assets/images/${word.toLowerCase()}.png`;
  })

  // --- Audio System ---
  const audioContext: AudioContext = new (
    window.AudioContext || (window as any).webkitAudioContext
  )()

  function ensureAudioContext(): void {
    if (audioContext.state === 'suspended') audioContext.resume()
  }

  // 生成简单的合成音效 (不需要mp3文件)
  function playSound(
    freq: number,
    type: OscillatorType,
    duration: number,
    vol: number = 0.1,
  ) {
    if (!audioContext) return
    ensureAudioContext()
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()
    osc.type = type
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(audioContext.destination)
    gain.gain.setValueAtTime(vol, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration,
    )
    osc.start()
    osc.stop(audioContext.currentTime + duration)
  }

  function playSuccessSound() {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      setTimeout(() => playSound(f, 'sine', 0.3, 0.2), i * 100),
    )
  }

  function playErrorSound() {
    playSound(150, 'sawtooth', 0.3, 0.3)
    setTimeout(() => playSound(100, 'sawtooth', 0.3, 0.3), 150)
  }

  // 播放单词发音 (优先尝试MP3，这里为了代码简单，如果没有MP3文件会静默失败或在控制台报错)
  function playWordAudio() {
    const word = currentWord.value.trim()
    if (!word) return

    // 1. 尝试播放 MP3
    // 假设您的音频放在 public/audio/ 下，例如 public/audio/apple.mp3
    const audioPath = `/audio/${word.toLowerCase()}.mp3`
    const audio = new Audio(audioPath)

    audio.play().catch(() => {
      // 2. 如果播放 MP3 失败 (没有文件)，使用浏览器自带 TTS
      // console.warn("MP3 not found, using TTS");
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word)
        utterance.lang = 'en-US' // 设置为美式英语
        window.speechSynthesis.speak(utterance)
      }
    })
  }

  // --- Game Actions ---
  function startGame() {
    const validWords = words.value.filter((w) => w.trim() !== '')
    if (validWords.length === 0) {
      message('请至少输入一个单词！', { title: '看图猜单词' })
      return
    }

    // 随机打乱单词顺序
    gameWords.value = [...validWords].sort(() => Math.random() - 0.5)

    currentWordIndex.value = 0
    score.value = 0
    gameStarted.value = true
    loadLevel()
  }

  function resetGame() {
    gameStarted.value = false
    guessInput.value = ''
    showSuccessAnim.value = false
    currentWordIndex.value = 0
  }

  function loadLevel() {
    revealMask.value = Array(16).fill(true) // 重置遮挡
    guessInput.value = ''
    showSuccessAnim.value = false
    isInputError.value = false
  }

  function revealBlock(index: number) {
    if (!gameStarted.value || !revealMask.value[index] || showSuccessAnim.value)
      return
    revealMask.value[index] = false
    playSound(800 + index * 20, 'sine', 0.1, 0.05) // 点击音效
    // 可选：点击揭示扣分
    // score.value = Math.max(0, score.value - 5);
  }

  function submitGuess() {
    if (!guessInput.value.trim()) return

    if (
      guessInput.value.trim().toLowerCase() === currentWord.value.toLowerCase()
    ) {
      // Correct
      playSuccessSound()
      showSuccessAnim.value = true
      revealMask.value = Array(16).fill(false) // 全开
      score.value += 100

      setTimeout(() => {
        if (currentWordIndex.value < gameWords.value.length - 1) {
          currentWordIndex.value++
          loadLevel()
        } else {
          message(`🎉 恭喜通关！总分: ${score.value}`, { title: '看图猜单词' })
          resetGame()
        }
      }, 2000)
    } else {
      // Wrong
      playErrorSound()
      isInputError.value = true
      score.value = Math.max(0, score.value - 10)
      setTimeout(() => (isInputError.value = false), 500)
    }
  }

  // --- Data Persistence ---
  function saveToLocalStorage() {
    const data: LocalStorageData = {
      words: words.value,
      groups: groups.value,
      currentGroupId: currentGroupId.value,
    }
    localStorage.setItem('guessWordGame', JSON.stringify(data))
  }

  function loadFromLocalStorage() {
    const saved = localStorage.getItem('guessWordGame')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.groups && data.groups.length) {
          groups.value = data.groups
          currentGroupId.value = data.currentGroupId || groups.value[0].id
          const currentGroup = groups.value.find(
            (g) => g.id === currentGroupId.value,
          )
          words.value = currentGroup
            ? [...currentGroup.words]
            : Array(5).fill('')
        } else {
          createDefaultGroup()
        }
      } catch (e) {
        createDefaultGroup()
      }
    } else {
      createDefaultGroup()
    }
  }

  function createDefaultGroup() {
    const newGroup: WordGroup = {
      id: Date.now().toString(),
      name: '默认词库',
      words: ['apple', 'banana', 'cat'],
    }
    groups.value = [newGroup]
    currentGroupId.value = newGroup.id
    words.value = [...newGroup.words]
  }

  // --- Group & Word Management ---
  function addWord() {
    words.value.push('')
    saveToLocalStorage()
  }

  function removeWord() {
    if (words.value.length > 1) {
      words.value.pop()
      saveToLocalStorage()
    }
  }

  function handleWordInput(index: number) {
    if (currentGroupId.value) {
      const g = groups.value.find((x) => x.id === currentGroupId.value)
      if (g) g.words[index] = words.value[index]
    }
    saveToLocalStorage()
  }

  function selectGroup(id: string) {
    const g = groups.value.find((x) => x.id === id)
    if (g) {
      currentGroupId.value = id
      words.value = [...g.words]
      saveToLocalStorage()
    }
  }

  function openSaveGroupModal(renameId: string | null = null) {
    if (renameId) {
      isRenaming.value = true
      renamingGroupId.value = renameId
      const g = groups.value.find((x) => x.id === renameId)
      groupNameInput.value = g ? g.name : ''
    } else {
      isRenaming.value = false
      renamingGroupId.value = null
      groupNameInput.value = ''
    }
    showGroupModal.value = true
  }

  function saveGroup() {
    const name = groupNameInput.value.trim()
    if (!name) return
    if (isRenaming.value && renamingGroupId.value) {
      const g = groups.value.find((x) => x.id === renamingGroupId.value)
      if (g) g.name = name
    } else {
      const newG = {
        id: Date.now().toString(),
        name,
        words: Array(5).fill(''),
      }
      groups.value.push(newG)
      selectGroup(newG.id)
    }
    saveToLocalStorage()
    showGroupModal.value = false
  }

  function requestDeleteGroup(id: string) {
    groupToDeleteId.value = id
    showDeleteConfirmModal.value = true
  }

  function confirmDeleteGroup() {
    if (!groupToDeleteId.value) return
    groups.value = groups.value.filter((g) => g.id !== groupToDeleteId.value)
    if (!groups.value.length) createDefaultGroup()
    else if (currentGroupId.value === groupToDeleteId.value)
      selectGroup(groups.value[0].id)

    saveToLocalStorage()
    showDeleteConfirmModal.value = false
  }

  function requestClearWords() {
    showClearModal.value = true
  }

  function confirmClearWords() {
    words.value = words.value.map(() => '')
    if (currentGroupId.value) {
      const g = groups.value.find((x) => x.id === currentGroupId.value)
      if (g) g.words = [...words.value]
    }
    saveToLocalStorage()
    showClearModal.value = false
  }

  onMounted(() => {
    loadFromLocalStorage()
    document.addEventListener('click', ensureAudioContext, { once: true })
  })

  // *** IMPORTANT: Export everything used in template ***
  return {
    words,
    groups,
    currentGroupId,
    gameStarted,
    score,
    revealMask,
    guessInput,
    showSuccessAnim,
    isInputError,
    currentWordIndex,
    currentImageUrl,
    currentWord, // Added currentWord here
    showGroupModal,
    groupNameInput,
    isRenaming,
    showDeleteConfirmModal,
    showClearModal,
    showInputSection,
    startGame,
    resetGame,
    revealBlock,
    submitGuess,
    playWordAudio,
    addWord,
    removeWord,
    handleWordInput,
    requestClearWords,
    confirmClearWords,
    selectGroup,
    openSaveGroupModal,
    saveGroup,
    closeGroupModal: () => (showGroupModal.value = false),
    requestDeleteGroup,
    confirmDeleteGroup,
    cancelDeleteGroup: () => (showDeleteConfirmModal.value = false),
    cancelClearWords: () => (showClearModal.value = false),
  }
}
