import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { message } from '@tauri-apps/plugin-dialog'
import { useSpeech } from '@/composables/useSpeech'

export interface WordPair {
  id: string
  english: string
  chinese: string
}

export interface WordGroup {
  id: string
  name: string
  words: WordPair[]
}

export interface Option {
  word: WordPair
  state: 'idle' | 'correct' | 'wrong'
}

interface PersistedData {
  groups: WordGroup[]
  currentGroupId: string | null
}

const STORAGE_KEY = 'listenPickGame'
const TOTAL_QUESTIONS = 10
const OPTION_COUNT = 4
const TITLE = '听音辨词'

const defaultWords: WordPair[] = [
  { id: 'd1', english: 'apple', chinese: '苹果' },
  { id: 'd2', english: 'banana', chinese: '香蕉' },
  { id: 'd3', english: 'cat', chinese: '猫' },
  { id: 'd4', english: 'dog', chinese: '狗' },
  { id: 'd5', english: 'book', chinese: '书' },
  { id: 'd6', english: 'pencil', chinese: '铅笔' },
  { id: 'd7', english: 'school', chinese: '学校' },
  { id: 'd8', english: 'teacher', chinese: '老师' },
  { id: 'd9', english: 'water', chinese: '水' },
  { id: 'd10', english: 'red', chinese: '红色' },
  { id: 'd11', english: 'blue', chinese: '蓝色' },
  { id: 'd12', english: 'happy', chinese: '开心的' },
]

function shuffle<T>(list: T[]): T[] {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export interface ListenPickState {
  isSupported: ComputedRef<boolean>
  isSpeaking: Ref<boolean>
  groups: Ref<WordGroup[]>
  currentGroupId: Ref<string | null>
  currentGroup: ComputedRef<WordGroup | undefined>
  showLibrary: Ref<boolean>
  editingGroupId: Ref<string | null>
  editingGroup: ComputedRef<WordGroup | undefined>
  showDeleteConfirm: Ref<boolean>
  isPlaying: Ref<boolean>
  isPaused: Ref<boolean>
  isGameOver: Ref<boolean>
  questionNumber: ComputedRef<number>
  totalQuestions: number
  score: Ref<number>
  combo: Ref<number>
  options: Ref<Option[]>
  answered: Ref<boolean>
  startGame: () => void
  resetGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  exitToStart: () => void
  replay: () => void
  selectOption: (option: Option) => void
  openLibrary: () => void
  closeLibrary: () => void
  selectEditingGroup: (id: string) => void
  createGroup: () => void
  requestDeleteGroup: () => void
  confirmDeleteGroup: () => void
  cancelDeleteGroup: () => void
  addWord: () => void
  removeWord: (wordId: string) => void
}

export function useListenPickGame(): ListenPickState {
  const { isSupported, isSpeaking, speak, cancel } = useSpeech()

  const groups = ref<WordGroup[]>([])
  const currentGroupId = ref<string | null>(null)
  const editingGroupId = ref<string | null>(null)
  const showLibrary = ref(false)
  const showDeleteConfirm = ref(false)

  const isPlaying = ref(false)
  const isPaused = ref(false)
  const isGameOver = ref(false)
  const score = ref(0)
  const combo = ref(0)
  const options = ref<Option[]>([])
  const answered = ref(false)

  let quizWords: WordPair[] = []
  const currentIndex = ref(0)
  let currentWord: WordPair | null = null
  let advanceTimer: ReturnType<typeof setTimeout> | null = null

  const currentGroup = computed(() =>
    groups.value.find((g) => g.id === currentGroupId.value),
  )
  const editingGroup = computed(() =>
    groups.value.find((g) => g.id === editingGroupId.value),
  )
  const questionNumber = computed(() =>
    isPlaying.value ? currentIndex.value + 1 : 0,
  )

  function initDefaultGroup() {
    const group: WordGroup = {
      id: Date.now().toString(),
      name: '默认词库',
      words: defaultWords.map((w) => ({ ...w })),
    }
    groups.value = [group]
    currentGroupId.value = group.id
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      initDefaultGroup()
      return
    }
    try {
      const data = JSON.parse(raw) as PersistedData
      if (Array.isArray(data.groups) && data.groups.length > 0) {
        groups.value = data.groups
        currentGroupId.value =
          data.currentGroupId &&
          data.groups.some((g) => g.id === data.currentGroupId)
            ? data.currentGroupId
            : data.groups[0].id
      } else {
        initDefaultGroup()
      }
    } catch {
      initDefaultGroup()
    }
  }

  function save() {
    const data: PersistedData = {
      groups: groups.value,
      currentGroupId: currentGroupId.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function validWordsOf(group: WordGroup | undefined): WordPair[] {
    if (!group) return []
    return group.words.filter((w) => w.english.trim() && w.chinese.trim())
  }

  function buildOptions() {
    if (!currentWord) return
    const pool = validWordsOf(currentGroup.value).filter(
      (w) => w.id !== currentWord!.id,
    )
    const distractors = shuffle(pool).slice(0, OPTION_COUNT - 1)
    options.value = shuffle([currentWord, ...distractors]).map((word) => ({
      word,
      state: 'idle',
    }))
  }

  function askQuestion() {
    currentWord = quizWords[currentIndex.value]
    answered.value = false
    buildOptions()
    nextTick(() => speak(currentWord!.english))
  }

  function startGame() {
    const valid = validWordsOf(currentGroup.value)
    if (valid.length < OPTION_COUNT) {
      message(
        `当前词库有效单词太少（需至少 ${OPTION_COUNT} 个），请先在词库里补充。`,
        {
          title: TITLE,
        },
      )
      return
    }
    if (!isSupported.value) {
      message('当前设备不支持语音朗读，无法进行听音辨词。', { title: TITLE })
      return
    }

    quizWords = shuffle(valid).slice(0, Math.min(TOTAL_QUESTIONS, valid.length))
    currentIndex.value = 0
    score.value = 0
    combo.value = 0
    isGameOver.value = false
    isPlaying.value = true
    askQuestion()
  }

  function selectOption(option: Option) {
    if (answered.value || !currentWord) return
    answered.value = true

    const isCorrect = option.word.id === currentWord.id
    if (isCorrect) {
      option.state = 'correct'
      score.value += 10 + combo.value * 2
      combo.value += 1
    } else {
      option.state = 'wrong'
      combo.value = 0
      const right = options.value.find((o) => o.word.id === currentWord!.id)
      if (right) right.state = 'correct'
    }

    scheduleAdvance()
  }

  function scheduleAdvance() {
    advanceTimer = setTimeout(advance, 1200)
  }

  function advance() {
    advanceTimer = null
    if (currentIndex.value + 1 >= quizWords.length) {
      endGame()
    } else {
      currentIndex.value += 1
      askQuestion()
    }
  }

  function endGame() {
    isPlaying.value = false
    isPaused.value = false
    isGameOver.value = true
    cancel()
  }

  function resetGame() {
    if (advanceTimer) clearTimeout(advanceTimer)
    advanceTimer = null
    cancel()
    isPlaying.value = false
    isPaused.value = false
    isGameOver.value = false
    answered.value = false
    options.value = []
    score.value = 0
    combo.value = 0
    currentIndex.value = 0
    currentWord = null
    quizWords = []
  }

  function pauseGame() {
    if (!isPlaying.value || isPaused.value) return
    isPaused.value = true
    cancel()
    if (advanceTimer) {
      clearTimeout(advanceTimer)
      advanceTimer = null
    }
  }

  function resumeGame() {
    if (!isPaused.value) return
    isPaused.value = false
    if (answered.value) {
      advance()
    } else if (currentWord) {
      speak(currentWord.english)
    }
  }

  function exitToStart() {
    resetGame()
  }

  function replay() {
    if (isPaused.value || !currentWord) return
    speak(currentWord.english)
  }

  function openLibrary() {
    editingGroupId.value = currentGroupId.value
    showLibrary.value = true
  }

  function closeLibrary() {
    showLibrary.value = false
    showDeleteConfirm.value = false
  }

  function selectEditingGroup(id: string) {
    editingGroupId.value = id
    currentGroupId.value = id
  }

  function createGroup() {
    const group: WordGroup = {
      id: Date.now().toString(),
      name: `新词库 ${groups.value.length + 1}`,
      words: [],
    }
    groups.value.push(group)
    editingGroupId.value = group.id
    currentGroupId.value = group.id
  }

  function requestDeleteGroup() {
    if (groups.value.length <= 1) {
      message('至少保留一个词库。', { title: TITLE })
      return
    }
    showDeleteConfirm.value = true
  }

  function confirmDeleteGroup() {
    const id = editingGroupId.value
    const index = groups.value.findIndex((g) => g.id === id)
    if (index !== -1) groups.value.splice(index, 1)
    const fallback = groups.value[0]?.id ?? null
    editingGroupId.value = fallback
    if (currentGroupId.value === id) currentGroupId.value = fallback
    showDeleteConfirm.value = false
  }

  function cancelDeleteGroup() {
    showDeleteConfirm.value = false
  }

  function addWord() {
    if (!editingGroup.value) return
    editingGroup.value.words.push({
      id: Date.now().toString(),
      english: '',
      chinese: '',
    })
  }

  function removeWord(wordId: string) {
    if (!editingGroup.value) return
    const idx = editingGroup.value.words.findIndex((w) => w.id === wordId)
    if (idx !== -1) editingGroup.value.words.splice(idx, 1)
  }

  watch(groups, save, { deep: true })
  watch(currentGroupId, save)

  onMounted(() => {
    load()
    document.body.style.overflow = 'hidden'
  })

  onUnmounted(() => {
    if (advanceTimer) clearTimeout(advanceTimer)
    cancel()
    document.body.style.overflow = ''
  })

  return {
    isSupported,
    isSpeaking,
    groups,
    currentGroupId,
    currentGroup,
    showLibrary,
    editingGroupId,
    editingGroup,
    showDeleteConfirm,
    isPlaying,
    isPaused,
    isGameOver,
    questionNumber,
    totalQuestions: TOTAL_QUESTIONS,
    score,
    combo,
    options,
    answered,
    startGame,
    resetGame,
    pauseGame,
    resumeGame,
    exitToStart,
    replay,
    selectOption,
    openLibrary,
    closeLibrary,
    selectEditingGroup,
    createGroup,
    requestDeleteGroup,
    confirmDeleteGroup,
    cancelDeleteGroup,
    addWord,
    removeWord,
  }
}
