import { ref, reactive, computed, onMounted, watch } from 'vue'

// --- Types ---
export interface Cell {
  value: string | null
  isWinning: boolean
  word: string
}

export interface RoundResult {
  round: number
  winnerName: string
  winnerClass: string
  icon: string
}

// 单词项（只保留 id 和 text）
export interface WordItem {
  id: string
  text: string
}

// 分组结构
export interface WordGroup {
  id: string
  name: string
  words: WordItem[]
}

export interface LocalStorageData {
  words: string[] // 旧数据兼容
  wordCount: number
  isWordInputHidden: boolean
  groups?: WordGroup[]
  currentGroupId?: string | null
}

export function useGameLogic() {
  // --- Game State ---
  const currentPlayer = ref('white')
  const board = ref<Cell[]>(
    Array(9)
      .fill(null)
      .map(() => ({ value: null, isWinning: false, word: '' })),
  )
  const gameOver = ref(false)
  const currentRound = ref(0)
  const stats = reactive({ whiteWins: 0, blackWins: 0, draws: 0 })
  const roundResults = ref<RoundResult[]>([])

  // 弹窗状态
  const showWinModal = ref(false)
  const winText = ref('')

  // --- 词库管理状态 ---
  const showLibraryModal = ref(false)
  const groups = ref<WordGroup[]>([])
  const currentGroupId = ref<string>('')
  const editingGroupId = ref<string>('')

  // 删除确认弹窗状态
  const showDeleteConfirm = ref(false)
  const groupToDeleteId = ref<string | null>(null)

  const STORAGE_KEY = 'wordGridGame_v3' // 升级 Key

  // --- Computed ---
  const totalRounds = computed(
    () => stats.whiteWins + stats.blackWins + stats.draws,
  )

  const whitePercent = computed(() =>
    totalRounds.value === 0
      ? 0
      : Math.round((stats.whiteWins / totalRounds.value) * 100),
  )

  const blackPercent = computed(() =>
    totalRounds.value === 0
      ? 0
      : Math.round((stats.blackWins / totalRounds.value) * 100),
  )

  const currentEditingGroup = computed(() =>
    groups.value.find((g) => g.id === editingGroupId.value),
  )

  const currentGameGroup = computed(() =>
    groups.value.find((g) => g.id === currentGroupId.value),
  )

  const allWords = computed(() => {
    if (!currentGameGroup.value) return []
    // 过滤掉空单词
    return currentGameGroup.value.words
      .map((w) => w.text.trim())
      .filter((t) => t !== '')
  })

  const finalResultHTML = computed(() => {
    // 简单的判断逻辑：如果玩过的轮次覆盖了大部分单词
    if (totalRounds.value > 0 && allWords.value.length > 0) {
      if ((currentRound.value + 1) * 9 >= allWords.value.length) {
        let winner
        if (stats.whiteWins > stats.blackWins) winner = '白棋'
        else if (stats.blackWins > stats.whiteWins) winner = '黑棋'
        else winner = '平局'

        // ★ 更新为 Font Awesome 图标
        return `<i class="fas fa-trophy"></i> 最终获胜方：<span class="highlight">${winner}</span> <i class="fas fa-trophy"></i>`
      }
    }
    return ''
  })

  // --- Audio ---
  let audioContext: AudioContext | null = null
  function ensureAudioContext() {
    if (!audioContext) {
      audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )()
    }
    if (audioContext.state === 'suspended') audioContext.resume()
  }

  function playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
  ) {
    ensureAudioContext()
    if (!audioContext) return
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, audioContext.currentTime)
    gain.gain.setValueAtTime(0, audioContext.currentTime)
    gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration,
    )
    osc.connect(gain)
    gain.connect(audioContext.destination)
    osc.start()
    osc.stop(audioContext.currentTime + duration)
  }

  function playSound(type: string) {
    if (type === 'click') playTone(440, 0.1, 'sine')
    else if (type === 'win')
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        setTimeout(() => playTone(f, 0.2, 'sine'), i * 100),
      )
    else if (type === 'draw') playTone(330, 0.3, 'sine')
  }

  // --- Game Logic ---
  function initBoard() {
    board.value = Array(9)
      .fill(null)
      .map(() => ({ value: null, isWinning: false, word: '' }))

    const words = allWords.value
    if (words.length === 0) return

    for (let i = 0; i < 9; i++) {
      const index = (currentRound.value * 9 + i) % words.length
      board.value[i].word = words[index] || ''
    }
  }

  function makeMove(index: number) {
    if (gameOver.value || board.value[index].value) return
    board.value[index].value = currentPlayer.value
    playSound('click')

    const winPattern = checkWin()
    if (winPattern) {
      gameOver.value = true
      const winnerName = currentPlayer.value === 'white' ? '白棋' : '黑棋'
      handleWin(winnerName, winPattern)
      return
    }

    if (board.value.every((c) => c.value)) {
      gameOver.value = true
      handleDraw()
      return
    }
    currentPlayer.value = currentPlayer.value === 'white' ? 'black' : 'white'
  }

  function checkWin(): number[] | null {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ]
    for (const [a, b, c] of lines) {
      if (
        board.value[a].value &&
        board.value[a].value === board.value[b].value &&
        board.value[a].value === board.value[c].value
      ) {
        return [a, b, c]
      }
    }
    return null
  }

  function handleWin(name: string, pattern: number[]) {
    if (name === '白棋') stats.whiteWins++
    else stats.blackWins++
    pattern.forEach((idx) => (board.value[idx].isWinning = true))
    playSound('win')
    createConfetti()

    // ★ 更新为 Font Awesome 类名
    roundResults.value.push({
      round: currentRound.value + 1,
      winnerName: name,
      winnerClass: name === '白棋' ? 'white-win' : 'black-win',
      icon: 'fas fa-medal',
    })
    winText.value = `恭喜${name}获胜！`
    showWinModal.value = true
  }

  function handleDraw() {
    stats.draws++
    playSound('draw')

    // ★ 更新为 Font Awesome 类名
    roundResults.value.push({
      round: currentRound.value + 1,
      winnerName: '平局',
      winnerClass: 'draw',
      icon: 'fas fa-handshake',
    })
    winText.value = '平局！'
    showWinModal.value = true
  }

  function fullRestart() {
    currentRound.value = 0
    stats.whiteWins = 0
    stats.blackWins = 0
    stats.draws = 0
    roundResults.value = []
    resetGame()
  }

  function resetGame() {
    currentPlayer.value = currentRound.value % 2 === 0 ? 'white' : 'black'
    gameOver.value = false
    initBoard()
  }

  function nextRound() {
    if (allWords.value.length === 0) {
      alert('请先在词库中添加单词！')
      return
    }
    currentRound.value++
    resetGame()
  }

  function createConfetti() {
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4']
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const el = document.createElement('div')
        el.className = 'confetti'
        if (document.body) document.body.appendChild(el)
        el.style.left = Math.random() * 100 + '%'
        el.style.background = colors[Math.floor(Math.random() * colors.length)]
        el.style.animationDelay = Math.random() * 0.5 + 's'
        setTimeout(() => el.remove(), 3000)
      }, i * 20)
    }
  }

  function closeWinModal() {
    showWinModal.value = false
  }

  // --- Group Management Logic ---
  function createGroup() {
    const newGroup: WordGroup = {
      id: Date.now().toString(),
      name: `新分组 ${groups.value.length + 1}`,
      words: [],
    }
    groups.value.push(newGroup)
    editingGroupId.value = newGroup.id
    if (!currentGroupId.value) currentGroupId.value = newGroup.id
  }

  // ★ 修改：deleteGroup 不再直接删除，而是打开弹窗
  function deleteGroup(id: string) {
    if (groups.value.length <= 1) {
      alert('至少保留一个分组！')
      return
    }
    // 移除原生 confirm，改为设置状态
    groupToDeleteId.value = id
    showDeleteConfirm.value = true
  }

  // ★ 新增：确认删除逻辑
  function confirmDeleteGroup() {
    if (!groupToDeleteId.value) return

    const id = groupToDeleteId.value
    const idx = groups.value.findIndex((g) => g.id === id)
    if (idx !== -1) groups.value.splice(idx, 1)

    // 重置选中状态
    if (currentGroupId.value === id) currentGroupId.value = groups.value[0].id
    if (editingGroupId.value === id) editingGroupId.value = groups.value[0].id

    // 关闭弹窗
    showDeleteConfirm.value = false
    groupToDeleteId.value = null
  }

  // ★ 新增：取消删除
  function cancelDeleteGroup() {
    showDeleteConfirm.value = false
    groupToDeleteId.value = null
  }

  function addWord() {
    if (!currentEditingGroup.value) return
    currentEditingGroup.value.words.push({
      id: Date.now().toString(),
      text: '',
    })
  }

  function removeWord(wordId: string) {
    if (!currentEditingGroup.value) return
    const idx = currentEditingGroup.value.words.findIndex(
      (w) => w.id === wordId,
    )
    if (idx !== -1) currentEditingGroup.value.words.splice(idx, 1)
  }

  // --- Persistence & Migration ---
  watch(
    groups,
    () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          groups: groups.value,
          currentGroupId: currentGroupId.value,
        }),
      )
      // 实时更新棋盘
      if (!gameOver.value) initBoard()
    },
    { deep: true },
  )

  watch(currentGroupId, (newId) => {
    if (newId) {
      initBoard()
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          groups: groups.value,
          currentGroupId: newId,
        }),
      )
    }
  })

  function loadData() {
    // 1. 加载新版数据
    const savedNew = localStorage.getItem(STORAGE_KEY)
    if (savedNew) {
      try {
        const data = JSON.parse(savedNew)
        if (data.groups && Array.isArray(data.groups)) {
          groups.value = data.groups
          currentGroupId.value =
            data.currentGroupId || groups.value[0]?.id || ''
          editingGroupId.value = currentGroupId.value
          return
        }
      } catch (e) {
        console.error('Load V3 failed', e)
      }
    }

    // 2. 迁移旧数据 (wordGridGame)
    const savedOld = localStorage.getItem('wordGridGame')
    let initialWords: WordItem[] = []

    if (savedOld) {
      try {
        const oldData = JSON.parse(savedOld)
        // 情况 A: 已经是 WordPK 样式的 groups 结构 (上一次尝试可能产生的数据)
        if (oldData.groups && Array.isArray(oldData.groups)) {
          // 转换为新结构 (去掉 chinese)
          groups.value = oldData.groups.map((g: any) => ({
            id: g.id,
            name: g.name,
            words: g.words.map((w: any) => ({
              id: w.id || Date.now() + Math.random(),
              text: w.english || w.text || '', // 兼容不同字段名
            })),
          }))
          currentGroupId.value = oldData.currentGroupId || groups.value[0].id
          editingGroupId.value = currentGroupId.value
          return
        }
        // 情况 B: 最原始的 { words: string[] } 结构
        if (oldData.words && Array.isArray(oldData.words)) {
          initialWords = oldData.words
            .filter((w: string) => w && w.trim())
            .map((w: string, i: number) => ({
              id: `migrated-${i}`,
              text: w,
            }))
        }
      } catch (e) {
        console.error('Migration failed', e)
      }
    }

    // 3. 默认数据
    if (initialWords.length === 0) {
      initialWords = [
        'apple',
        'banana',
        'cat',
        'dog',
        'egg',
        'fish',
        'girl',
        'hat',
        'ice',
      ].map((text, i) => ({ id: `${i}`, text }))
    }

    const defaultGroup: WordGroup = {
      id: Date.now().toString(),
      name: '默认词库',
      words: initialWords,
    }

    groups.value = [defaultGroup]
    currentGroupId.value = defaultGroup.id
    editingGroupId.value = defaultGroup.id
  }

  onMounted(() => {
    loadData()
    initBoard()
  })

  return {
    currentPlayer,
    board,
    gameOver,
    stats,
    roundResults,
    showWinModal,
    winText,
    totalRounds,
    whitePercent,
    blackPercent,
    finalResultHTML,
    allWords, // 导出供模板判断长度
    // Group & Library
    groups,
    currentGroupId,
    editingGroupId,
    showLibraryModal,
    currentEditingGroup,
    // Functions
    makeMove,
    fullRestart,
    nextRound,
    closeWinModal,
    createGroup,
    deleteGroup,
    addWord,
    removeWord,
    // Delete Confirm
    showDeleteConfirm,
    confirmDeleteGroup,
    cancelDeleteGroup,
  }
}
