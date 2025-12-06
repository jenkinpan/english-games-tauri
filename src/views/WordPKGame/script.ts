import { reactive, ref, computed, watch, onMounted } from 'vue'

// --- 类型定义 ---
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

export interface Card {
  id: string
  text: string
  type: 'english' | 'chinese'
  status: 'normal' | 'selected' | 'matched' | 'error'
  wordId: string
}

export interface PlayerState {
  id: number
  name: string
  color: string
  score: number
  timeLeft: number
  cards: Card[]
  selectedCardId: string | null
  isActive: boolean
  // 新增：待消除的单词队列
  pendingWords: WordPair[]
}

// --- 默认数据 ---
const defaultWords: WordPair[] = [
  { id: '1', chinese: '苹果', english: 'apple' },
  { id: '2', chinese: '香蕉', english: 'banana' },
  { id: '3', chinese: '猫', english: 'cat' },
  { id: '4', chinese: '狗', english: 'dog' },
  { id: '5', chinese: '书', english: 'book' },
  { id: '6', chinese: '铅笔', english: 'pencil' },
  { id: '7', chinese: '学校', english: 'school' },
  { id: '8', chinese: '老师', english: 'teacher' },
]

export const useGameLogic = () => {
  // --- 游戏状态 ---
  const isRunning = ref(false)
  const showResult = ref(false)
  const showDeleteConfirm = ref(false)
  const groupToDelete = ref<string | null>(null)
  const timeLimit = ref(60)
  let timerInterval: any = null

  // --- 单词库管理状态 ---
  const showLibraryModal = ref(false)
  const groups = ref<WordGroup[]>([])
  const currentGroupId = ref<string>('')
  const editingGroupId = ref<string>('')

  const STORAGE_KEY = 'word_pk_groups_v1'

  onMounted(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        groups.value = JSON.parse(saved)
      } catch (e) {
        console.error('加载存档失败', e)
        initDefaultGroup()
      }
    } else {
      initDefaultGroup()
    }

    if (groups.value.length > 0) {
      currentGroupId.value = groups.value[0].id
      editingGroupId.value = groups.value[0].id
    }
  })

  watch(
    groups,
    (newVal) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal))
    },
    { deep: true },
  )

  const initDefaultGroup = () => {
    groups.value = [
      {
        id: Date.now().toString(),
        name: '默认词库',
        words: [...defaultWords],
      },
    ]
  }

  // --- 分组 CRUD ---
  const createGroup = () => {
    const newGroup: WordGroup = {
      id: Date.now().toString(),
      name: `新分组 ${groups.value.length + 1}`,
      words: [],
    }
    groups.value.push(newGroup)
    editingGroupId.value = newGroup.id
  }

  const deleteGroup = (id: string) => {
    if (groups.value.length <= 1) {
      alert('至少保留一个分组！')
      return
    }

    // 显示自定义确认对话框
    groupToDelete.value = id
    showDeleteConfirm.value = true
  }

  const confirmDeleteGroup = () => {
    const id = groupToDelete.value
    if (!id) return

    const index = groups.value.findIndex((g) => g.id === id)
    if (index === -1) return

    groups.value.splice(index, 1)

    if (editingGroupId.value === id) {
      editingGroupId.value = groups.value[0].id
    }
    if (currentGroupId.value === id) {
      currentGroupId.value = groups.value[0].id
    }

    // 关闭对话框
    showDeleteConfirm.value = false
    groupToDelete.value = null
  }

  const cancelDeleteGroup = () => {
    showDeleteConfirm.value = false
    groupToDelete.value = null
  }

  const currentEditingGroup = computed(() =>
    groups.value.find((g) => g.id === editingGroupId.value),
  )

  const addWord = () => {
    if (!currentEditingGroup.value) return
    currentEditingGroup.value.words.push({
      id: Date.now().toString(),
      english: '',
      chinese: '',
    })
  }

  const removeWord = (wordId: string) => {
    if (!currentEditingGroup.value) return
    const idx = currentEditingGroup.value.words.findIndex(
      (w) => w.id === wordId,
    )
    if (idx !== -1) currentEditingGroup.value.words.splice(idx, 1)
  }

  // --- 玩家状态 ---
  const players = reactive<PlayerState[]>([
    {
      id: 1,
      name: '蓝方',
      color: 'blue',
      score: 0,
      timeLeft: 60,
      cards: [],
      selectedCardId: null,
      isActive: true,
      pendingWords: [],
    },
    {
      id: 2,
      name: '红方',
      color: 'red',
      score: 0,
      timeLeft: 60,
      cards: [],
      selectedCardId: null,
      isActive: true,
      pendingWords: [],
    },
  ])

  // --- 游戏核心 ---

  const startGame = () => {
    const group = groups.value.find((g) => g.id === currentGroupId.value)
    if (!group) {
      alert('请选择一个分组！')
      return
    }

    const validWords = group.words.filter(
      (w) => w.english.trim() && w.chinese.trim(),
    )

    if (validWords.length < 4) {
      alert(
        `分组【${group.name}】的有效单词太少（当前${validWords.length}个），建议至少添加4个！`,
      )
      return
    }

    showResult.value = false
    isRunning.value = true

    players.forEach((p) => {
      p.score = 0
      p.timeLeft = timeLimit.value
      p.selectedCardId = null
      p.isActive = true
      p.pendingWords = [...validWords].sort(() => Math.random() - 0.5)
      dealNextBatch(p)
    })

    clearInterval(timerInterval)
    timerInterval = setInterval(gameTick, 1000)
  }

  const dealNextBatch = (player: PlayerState) => {
    const nextBatch = player.pendingWords.splice(0, 8)

    if (nextBatch.length === 0) {
      player.isActive = false
      return
    }

    player.cards = generateCards(nextBatch)
  }

  const generateCards = (sourceWords: WordPair[]): Card[] => {
    let chineseCards: Card[] = sourceWords.map((pair) => ({
      id: `cn-${pair.id}`,
      wordId: pair.id,
      text: pair.chinese,
      type: 'chinese',
      status: 'normal',
    }))

    let englishCards: Card[] = sourceWords.map((pair) => ({
      id: `en-${pair.id}`,
      wordId: pair.id,
      text: pair.english,
      type: 'english',
      status: 'normal',
    }))

    chineseCards.sort(() => Math.random() - 0.5)
    englishCards.sort(() => Math.random() - 0.5)

    return [...chineseCards, ...englishCards]
  }

  const gameTick = () => {
    let activePlayers = 0
    players.forEach((p) => {
      if (p.isActive && p.timeLeft > 0) p.timeLeft--

      if (p.timeLeft <= 0) {
        p.isActive = false
      } else if (p.isActive) {
        activePlayers++
      }
    })

    if (activePlayers === 0) endGame()
  }

  const handleCardClick = (playerIndex: number, card: Card) => {
    const player = players[playerIndex]
    if (!player.isActive || card.status === 'matched') return

    if (player.selectedCardId === card.id) {
      card.status = 'normal'
      player.selectedCardId = null
      return
    }

    if (!player.selectedCardId) {
      player.selectedCardId = card.id
      card.status = 'selected'
      return
    }

    const prevCard = player.cards.find((c) => c.id === player.selectedCardId)
    if (!prevCard) return

    if (prevCard.type === card.type) {
      prevCard.status = 'normal'
      player.selectedCardId = card.id
      card.status = 'selected'
      return
    }

    const isMatch = prevCard.wordId === card.wordId

    if (isMatch) {
      prevCard.status = 'matched'
      card.status = 'matched'
      player.score += 10
      player.selectedCardId = null

      if (player.cards.every((c) => c.status === 'matched')) {
        if (player.pendingWords.length > 0) {
          setTimeout(() => {
            dealNextBatch(player)
          }, 300)
        } else {
          player.isActive = false
          endGame()
        }
      }
    } else {
      prevCard.status = 'error'
      card.status = 'error'
      player.score = Math.max(0, player.score - 5)
      setTimeout(() => {
        if (prevCard.status === 'error') prevCard.status = 'normal'
        if (card.status === 'error') card.status = 'normal'
      }, 800)
      player.selectedCardId = null
    }
  }

  const endGame = () => {
    clearInterval(timerInterval)
    isRunning.value = false
    showResult.value = true
  }

  const resetGame = () => {
    showResult.value = false
    isRunning.value = false
    clearInterval(timerInterval)
    players.forEach((p) => {
      p.score = 0
      p.timeLeft = timeLimit.value
      p.cards = []
      p.pendingWords = []
    })
  }

  const winnerText = computed(() => {
    const p1 = players[0]
    const p2 = players[1]

    const p1Cleared =
      p1.cards.length > 0 &&
      p1.cards.every((c) => c.status === 'matched') &&
      p1.pendingWords.length === 0
    const p2Cleared =
      p2.cards.length > 0 &&
      p2.cards.every((c) => c.status === 'matched') &&
      p2.pendingWords.length === 0

    if (p1Cleared && !p2Cleared) return '蓝方全部通关，获胜！'
    if (p2Cleared && !p1Cleared) return '红方全部通关，获胜！'

    if (p1.score > p2.score) return '蓝方分数更高，获胜！'
    if (p2.score > p1.score) return '红方分数更高，获胜！'

    return '平局！'
  })

  return {
    isRunning,
    showResult,
    showDeleteConfirm,
    groupToDelete,
    timeLimit,
    players,
    winnerText,
    groups,
    currentGroupId,
    showLibraryModal,
    editingGroupId,
    currentEditingGroup,
    startGame,
    resetGame,
    handleCardClick,
    createGroup,
    deleteGroup,
    confirmDeleteGroup,
    cancelDeleteGroup,
    addWord,
    removeWord,
  }
}
