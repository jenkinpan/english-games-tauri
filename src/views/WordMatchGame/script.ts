import { ref, computed, onMounted, watch } from 'vue'

// --- 类型定义 ---

export interface WordItem {
  id: string
  text: string
}

export interface CategoryItem {
  id: string
  name: string
  words: WordItem[]
}

export interface GameGroup {
  id: string
  name: string
  categories: CategoryItem[]
}

export interface GameWord extends WordItem {
  categoryId: string // 正确归属的类别ID
  status: 'pool' | 'completed' // 在池子中还是已完成
}

export function useCategoryGame() {
  const STORAGE_KEY = 'word_category_game_v2'

  // --- 状态 ---
  const showLibraryModal = ref(false)
  const groups = ref<GameGroup[]>([])
  const currentGroupId = ref<string>('')
  const editingGroupId = ref<string>('')

  const showDeleteConfirm = ref(false)
  const groupToDeleteId = ref<string | null>(null)

  const isPlaying = ref(false)
  const gameWords = ref<GameWord[]>([])
  const selectedWordId = ref<string | null>(null)
  const showWinModal = ref(false)

  // --- ★ 拖拽与交互状态 ---
  const draggedWord = ref<GameWord | null>(null)
  const errorCategoryId = ref<string | null>(null)

  const touchGhost = ref({
    text: '',
    x: 0,
    y: 0,
    visible: false,
  })

  // --- 初始化 ---
  onMounted(() => {
    loadData()
  })

  watch(groups, () => saveData(), { deep: true })
  watch(currentGroupId, () => saveData())

  function saveData() {
    const data = {
      groups: groups.value,
      currentGroupId: currentGroupId.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.groups && Array.isArray(parsed.groups)) {
          groups.value = parsed.groups
          currentGroupId.value =
            parsed.currentGroupId || groups.value[0]?.id || ''
          editingGroupId.value = currentGroupId.value
          return
        }
      } catch (e) {
        console.error('Load failed', e)
      }
    }
    initDefaultData()
  }

  function initDefaultData() {
    const defaultGroup: GameGroup = {
      id: Date.now().toString(),
      name: '体验词库',
      categories: [
        {
          id: 'c1',
          name: 'Fruits (水果)',
          words: [
            { id: 'w1', text: 'Apple' },
            { id: 'w2', text: 'Banana' },
            { id: 'w3', text: 'Orange' },
          ],
        },
        {
          id: 'c2',
          name: 'Animals (动物)',
          words: [
            { id: 'w4', text: 'Lion' },
            { id: 'w5', text: 'Tiger' },
            { id: 'w6', text: 'Elephant' },
          ],
        },
      ],
    }
    groups.value = [defaultGroup]
    currentGroupId.value = defaultGroup.id
    editingGroupId.value = defaultGroup.id
  }

  // --- Computed ---
  const currentGroup = computed(() =>
    groups.value.find((g) => g.id === currentGroupId.value),
  )

  const currentEditingGroup = computed(() =>
    groups.value.find((g) => g.id === editingGroupId.value),
  )

  // 左侧单词池：只显示状态为 pool 的
  const poolWords = computed(() =>
    gameWords.value.filter((w) => w.status === 'pool'),
  )

  // 右侧分类
  const gameCategories = computed(() => {
    return currentGroup.value ? currentGroup.value.categories : []
  })

  // 获取某个分类下已完成的单词
  function getCompletedWordsForCategory(catId: string) {
    return gameWords.value.filter(
      (w) => w.status === 'completed' && w.categoryId === catId,
    )
  }

  // --- CRUD (省略部分保持简洁，功能同前) ---
  function createGroup() {
    const newGroup: GameGroup = {
      id: Date.now().toString(),
      name: `新词库 ${groups.value.length + 1}`,
      categories: [],
    }
    groups.value.push(newGroup)
    editingGroupId.value = newGroup.id
    if (!currentGroupId.value) currentGroupId.value = newGroup.id
  }
  function deleteGroup(id: string) {
    if (groups.value.length <= 1) {
      alert('至少保留一个分组！')
      return
    }
    groupToDeleteId.value = id
    showDeleteConfirm.value = true
  }
  function confirmDeleteGroup() {
    if (!groupToDeleteId.value) return
    const idx = groups.value.findIndex((g) => g.id === groupToDeleteId.value)
    if (idx !== -1) groups.value.splice(idx, 1)
    if (currentGroupId.value === groupToDeleteId.value)
      currentGroupId.value = groups.value[0].id
    if (editingGroupId.value === groupToDeleteId.value)
      editingGroupId.value = groups.value[0].id
    showDeleteConfirm.value = false
    groupToDeleteId.value = null
  }
  function cancelDeleteGroup() {
    showDeleteConfirm.value = false
    groupToDeleteId.value = null
  }
  function addCategory() {
    if (!currentEditingGroup.value) return
    currentEditingGroup.value.categories.push({
      id: Date.now().toString(),
      name: '',
      words: [],
    })
  }
  function removeCategory(catIndex: number) {
    if (!currentEditingGroup.value) return
    currentEditingGroup.value.categories.splice(catIndex, 1)
  }
  function addWordToCategory(catIndex: number) {
    if (!currentEditingGroup.value) return
    currentEditingGroup.value.categories[catIndex].words.push({
      id: Date.now().toString() + Math.random(),
      text: '',
    })
  }
  function removeWordFromCategory(catIndex: number, wordIndex: number) {
    if (!currentEditingGroup.value) return
    currentEditingGroup.value.categories[catIndex].words.splice(wordIndex, 1)
  }

  // --- 游戏逻辑 ---
  function startGame() {
    if (!currentGroup.value || currentGroup.value.categories.length === 0) {
      alert('当前分组为空，请先编辑添加分类和单词！')
      showLibraryModal.value = true
      return
    }

    const allWords: GameWord[] = []
    let hasWords = false

    currentGroup.value.categories.forEach((cat) => {
      cat.words.forEach((w) => {
        if (w.text.trim()) {
          hasWords = true
          allWords.push({
            id: w.id,
            text: w.text,
            categoryId: cat.id,
            status: 'pool' as const,
          })
        }
      })
    })

    if (!hasWords) {
      alert('分类中没有单词，请先添加单词！')
      return
    }

    gameWords.value = allWords.sort(() => Math.random() - 0.5)
    isPlaying.value = true
    selectedWordId.value = null
    showWinModal.value = false
    errorCategoryId.value = null
  }

  function resetGame() {
    isPlaying.value = false
    gameWords.value = []
    selectedWordId.value = null
    showWinModal.value = false
    errorCategoryId.value = null
  }

  // --- ★★★ 核心匹配逻辑 (修复版) ★★★ ---
  function checkMatch(wordId: string, targetCatId: string) {
    // 必须从 gameWords 数组中查找最新的对象引用
    const word = gameWords.value.find((w) => w.id === wordId)

    if (!word) return

    if (word.categoryId === targetCatId) {
      // 正确：修改状态，这会自动触发 computed 属性更新
      word.status = 'completed'
      selectedWordId.value = null
      playSound('correct')
      checkWin()
    } else {
      // 错误
      playSound('wrong')
      selectedWordId.value = null

      // 触发震动
      errorCategoryId.value = targetCatId
      setTimeout(() => {
        errorCategoryId.value = null
      }, 500)
    }
  }

  // --- 点击交互 ---
  function handleWordClick(word: GameWord) {
    if (selectedWordId.value === word.id) {
      selectedWordId.value = null
    } else {
      selectedWordId.value = word.id
      playSound('click')
    }
  }

  function handleCategoryClick(targetCatId: string) {
    if (!selectedWordId.value) return
    checkMatch(selectedWordId.value, targetCatId)
  }

  // --- ★★★ 电脑端 鼠标拖拽 (修复版) ★★★ ---
  function onDragStart(event: DragEvent, word: GameWord) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.dropEffect = 'move'
      // 必须设置 setData 否则 Firefox 可能不工作
      event.dataTransfer.setData('text/plain', word.id)
    }
    draggedWord.value = word
    playSound('click')
  }

  function onDrop(event: DragEvent, catId: string) {
    // 优先使用内存中的 draggedWord，如果不一致再尝试 dataTransfer
    let wordId = draggedWord.value?.id

    if (!wordId && event.dataTransfer) {
      wordId = event.dataTransfer.getData('text/plain')
    }

    if (wordId) {
      checkMatch(wordId, catId)
    }

    draggedWord.value = null
  }

  // --- ★★★ 移动端 触摸拖拽 (修复版) ★★★ ---
  function onTouchStart(event: TouchEvent, word: GameWord) {
    if (event.touches.length > 1) return

    const touch = event.touches[0]
    draggedWord.value = word

    // 初始化 Ghost 位置
    touchGhost.value = {
      text: word.text,
      x: touch.clientX,
      y: touch.clientY,
      visible: true,
    }

    playSound('click')
  }

  function onTouchMove(event: TouchEvent) {
    if (!draggedWord.value || !touchGhost.value.visible) return

    // 阻止默认滚动，确保是拖拽操作
    if (event.cancelable) event.preventDefault()

    const touch = event.touches[0]
    touchGhost.value.x = touch.clientX
    touchGhost.value.y = touch.clientY
  }

  function onTouchEnd(event: TouchEvent) {
    if (!draggedWord.value) return

    const touch = event.changedTouches[0]
    const x = touch.clientX
    const y = touch.clientY

    // 获取坐标下的元素 (Ghost 必须设置 pointer-events: none)
    const targetElement = document.elementFromPoint(x, y)

    // 查找目标分类框
    const dropTarget = targetElement?.closest('.category-card')

    if (dropTarget) {
      const catId = dropTarget.getAttribute('data-cat-id')
      if (catId) {
        checkMatch(draggedWord.value.id, catId)
      }
    }

    // 重置状态
    draggedWord.value = null
    touchGhost.value.visible = false
  }

  function checkWin() {
    if (gameWords.value.every((w) => w.status === 'completed')) {
      setTimeout(() => {
        playSound('win')
        showWinModal.value = true
      }, 500)
    }
  }

  // --- 音效 ---
  const audioCtx = new (
    window.AudioContext || (window as any).webkitAudioContext
  )()
  function playSound(type: 'click' | 'correct' | 'wrong' | 'win') {
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    const t = audioCtx.currentTime

    if (type === 'click') {
      osc.frequency.setValueAtTime(400, t)
      gain.gain.setValueAtTime(0.1, t)
      osc.start(t)
      osc.stop(t + 0.05)
    } else if (type === 'correct') {
      osc.frequency.setValueAtTime(600, t)
      osc.frequency.linearRampToValueAtTime(1000, t + 0.1)
      gain.gain.setValueAtTime(0.1, t)
      gain.gain.linearRampToValueAtTime(0, t + 0.2)
      osc.start(t)
      osc.stop(t + 0.2)
    } else if (type === 'wrong') {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(150, t)
      osc.frequency.linearRampToValueAtTime(100, t + 0.2)
      gain.gain.setValueAtTime(0.1, t)
      gain.gain.linearRampToValueAtTime(0, t + 0.3)
      osc.start(t)
      osc.stop(t + 0.3)
    } else if (type === 'win') {
      ;[523, 659, 784, 1046].forEach((f, i) => {
        const o = audioCtx.createOscillator()
        const g = audioCtx.createGain()
        o.connect(g)
        g.connect(audioCtx.destination)
        o.frequency.value = f
        g.gain.setValueAtTime(0.1, t + i * 0.1)
        g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.5)
        o.start(t + i * 0.1)
        o.stop(t + i * 0.1 + 0.5)
      })
    }
  }

  return {
    groups,
    currentGroupId,
    editingGroupId,
    showLibraryModal,
    currentEditingGroup,
    showDeleteConfirm,
    isPlaying,
    poolWords,
    gameCategories,
    selectedWordId,
    showWinModal,
    // 导出状态
    errorCategoryId,
    draggedWord,
    touchGhost,
    // 交互方法
    onDragStart,
    onDrop,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    // CRUD方法
    createGroup,
    deleteGroup,
    confirmDeleteGroup,
    cancelDeleteGroup,
    addCategory,
    removeCategory,
    addWordToCategory,
    removeWordFromCategory,
    startGame,
    resetGame,
    handleWordClick,
    handleCategoryClick,
    getCompletedWordsForCategory,
  }
}
