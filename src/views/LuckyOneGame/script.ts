import { ref, onMounted, type Ref } from 'vue'

// --- Types ---
export interface Card {
  word: string
  flipped: boolean
  type: 'lucky' | 'empty'
  value: number | null
}

export interface WordGroup {
  id: string
  name: string
  words: string[]
}

interface LocalStorageData {
  words: string[]
  luckyCount: number
  isInputHidden: boolean
  groups?: WordGroup[]
  currentGroupId?: string | null
}

// 导出主逻辑函数
export function useGameLogic() {
  // --- State ---
  const words: Ref<string[]> = ref(Array(9).fill(''))
  const cards: Ref<Card[]> = ref([])
  const gameStarted: Ref<boolean> = ref(false)
  const gameOver: Ref<boolean> = ref(false)
  const luckyCount: Ref<number> = ref(1)
  const isInputHidden: Ref<boolean> = ref(false)
  const cardBackRefs: Ref<HTMLElement[]> = ref([])
  const isAnimating: Ref<boolean> = ref(false)

  // [新增] 控制清空确认弹窗的显示
  const showClearModal: Ref<boolean> = ref(false)

  // [新增] 分组管理状态
  const groups: Ref<WordGroup[]> = ref([])
  const currentGroupId: Ref<string | null> = ref(null)
  const showGroupModal: Ref<boolean> = ref(false)
  const groupNameInput: Ref<string> = ref('')

  // --- Audio ---
  const audioContext: AudioContext = new (
    window.AudioContext || (window as any).webkitAudioContext
  )()

  function ensureAudioContext(): void {
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }
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

  function playLuckySound(): void {
    // 胜利/幸运音效 (Major triad arpeggio)
    const frequencies: number[] = [523.25, 659.25, 783.99, 1046.5]
    frequencies.forEach((freq: number, index: number) => {
      setTimeout(() => {
        playSound(freq, 0.3, 'sine')
      }, index * 100)
    })
  }

  function playEmptySound(): void {
    // 骷髅嘲笑音效 (Descending pitch sequence)
    const now = audioContext.currentTime
    const laughNotes = [400, 350, 300, 250, 200]

    laughNotes.forEach((freq, i) => {
      const osc = audioContext.createOscillator()
      const gain = audioContext.createGain()

      osc.connect(gain)
      gain.connect(audioContext.destination)

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now + i * 0.1)
      osc.frequency.linearRampToValueAtTime(freq * 0.8, now + i * 0.1 + 0.08)

      gain.gain.setValueAtTime(0, now + i * 0.1)
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.1)

      osc.start(now + i * 0.1)
      osc.stop(now + i * 0.1 + 0.1)
    })
  }

  // --- Game Logic ---
  function initCards(): void {
    cards.value = words.value.map(
      (w: string): Card => ({
        word: w,
        flipped: false,
        type: 'empty',
        value: 0,
      }),
    )
  }

  function updateLuckyCountConstraints(): void {
    const maxAllowed: number = Math.max(1, words.value.length)
    if (luckyCount.value < 1) luckyCount.value = 1
    if (luckyCount.value > maxAllowed) luckyCount.value = maxAllowed
  }

  function startGame(): void {
    if (gameOver.value || isAnimating.value) return

    const hasWords: boolean = words.value.some((w: string) => w.trim())
    if (!hasWords) {
      alert('请至少输入一个单词！')
      return
    }

    updateLuckyCountConstraints()

    gameStarted.value = true
    gameOver.value = false
    isAnimating.value = false

    const maxLucky: number = Math.max(
      1,
      Math.min(luckyCount.value, words.value.length),
    )
    const luckyIndices: Set<number> = new Set()
    while (luckyIndices.size < maxLucky) {
      luckyIndices.add(Math.floor(Math.random() * words.value.length))
    }

    cards.value = words.value.map((w: string, i: number): Card => {
      if (luckyIndices.has(i)) {
        return {
          word: w,
          flipped: false,
          type: 'lucky',
          value: Math.floor(Math.random() * 5) + 1, // 1-5分
        }
      } else {
        return {
          word: w,
          flipped: false,
          type: 'empty',
          value: null,
        }
      }
    })
  }

  function resetGame(): void {
    if (isAnimating.value) return
    gameStarted.value = false
    gameOver.value = false
    isAnimating.value = false
    initCards()
  }

  function triggerConfetti(container: HTMLElement): void {
    const fragment = document.createDocumentFragment()

    const particles: number = 30
    const colors = [
      '#ff0000',
      '#00ff00',
      '#0000ff',
      '#ffff00',
      '#ff00ff',
      '#00ffff',
    ]

    for (let i = 0; i < particles; i++) {
      const p: HTMLDivElement = document.createElement('div')
      p.className = 'confetti'
      const angle: number = Math.random() * Math.PI * 2
      const distance: number = 60 + Math.random() * 90
      const tx: number = Math.cos(angle) * distance
      const ty: number = Math.sin(angle) * distance
      const color = colors[Math.floor(Math.random() * colors.length)]

      p.style.setProperty('--tx', tx + 'px')
      p.style.setProperty('--ty', ty + 'px')
      p.style.setProperty('--bg', color)

      const scale = 0.5 + Math.random() * 0.5
      p.style.transform = `translate(-50%, -50%) scale(${scale})`

      fragment.appendChild(p)
    }

    container.appendChild(fragment)

    setTimeout(() => {
      const addedParticles: NodeListOf<Element> =
        container.querySelectorAll('.confetti')
      addedParticles.forEach((el: Element) => el.remove())
    }, 1000)
  }

  function handleCardClick(index: number): void {
    const card: Card = cards.value[index]
    if (
      !gameStarted.value ||
      gameOver.value ||
      card.flipped ||
      isAnimating.value
    )
      return

    card.flipped = true

    if (card.type === 'lucky') {
      playLuckySound()
      const el: HTMLElement | undefined = cardBackRefs.value[index]
      if (el) {
        requestAnimationFrame(() => {
          triggerConfetti(el)
        })
      }
    } else {
      playEmptySound()
    }
  }

  // --- Persistence ---
  function saveToLocalStorage(): void {
    const data: LocalStorageData = {
      words: words.value,
      luckyCount: luckyCount.value,
      isInputHidden: isInputHidden.value,
      groups: groups.value,
      currentGroupId: currentGroupId.value,
    }
    localStorage.setItem('luckyOneGame', JSON.stringify(data))
  }

  function addWord(): void {
    if (isAnimating.value) return
    words.value.push('')
    initCards()
    updateLuckyCountConstraints()
    saveToLocalStorage()
  }

  function removeWord(): void {
    if (isAnimating.value) return
    if (words.value.length <= 1) {
      alert('至少需要保留1个单词！')
      return
    }
    words.value.pop()
    initCards()
    updateLuckyCountConstraints()
    saveToLocalStorage()
  }

  // [修改] 请求清空：不直接清空，而是打开弹窗
  function requestClearWords(): void {
    if (isAnimating.value) return
    showClearModal.value = true
  }

  // [新增] 确认清空：执行清空逻辑并关闭弹窗
  function confirmClearWords(): void {
    words.value = words.value.map(() => '')
    currentGroupId.value = null // 清空时取消当前分组选中
    initCards()
    saveToLocalStorage()
    showClearModal.value = false
  }

  // [新增] 取消清空
  function cancelClearWords(): void {
    showClearModal.value = false
  }

  function toggleInput(): void {
    isInputHidden.value = !isInputHidden.value
    saveToLocalStorage()
  }

  function handleWordInput(index: number): void {
    // 实时同步到当前分组
    if (currentGroupId.value) {
      const group = groups.value.find((g) => g.id === currentGroupId.value)
      if (group) {
        group.words[index] = words.value[index]
      }
    }

    saveToLocalStorage()
    if (cards.value[index]) {
      cards.value[index].word = words.value[index]
    }
  }

  function loadFromLocalStorage(): void {
    try {
      const saved: string | null = localStorage.getItem('luckyOneGame')
      if (saved) {
        const data: LocalStorageData = JSON.parse(saved)

        // 恢复分组
        if (Array.isArray(data.groups) && data.groups.length > 0) {
          groups.value = data.groups
        } else {
          // 如果没有分组，创建一个默认分组
          const defaultGroup: WordGroup = {
            id: Date.now().toString(),
            name: '默认分组',
            words: Array.isArray(data.words) ? data.words : Array(9).fill(''),
          }
          groups.value = [defaultGroup]
        }

        // 恢复选中状态
        if (
          data.currentGroupId &&
          groups.value.some((g) => g.id === data.currentGroupId)
        ) {
          currentGroupId.value = data.currentGroupId
        } else {
          currentGroupId.value = groups.value[0].id
        }

        // 恢复单词 (从当前分组加载，确保一致性)
        const currentGroup = groups.value.find(
          (g) => g.id === currentGroupId.value,
        )
        if (currentGroup) {
          words.value = [...currentGroup.words]
        }

        if (data.luckyCount) luckyCount.value = data.luckyCount
        if (typeof data.isInputHidden === 'boolean')
          isInputHidden.value = data.isInputHidden
      } else {
        // 首次加载，创建默认分组
        const defaultGroup: WordGroup = {
          id: Date.now().toString(),
          name: '默认分组',
          words: Array(9).fill(''),
        }
        groups.value = [defaultGroup]
        currentGroupId.value = defaultGroup.id
        words.value = [...defaultGroup.words]
      }
    } catch (e) {
      console.error(e)
    }
  }

  // [新增] 控制删除分组确认弹窗
  const showDeleteConfirmModal: Ref<boolean> = ref(false)
  const groupToDeleteId: Ref<string | null> = ref(null)

  // [新增] 重命名模式状态
  const isRenaming: Ref<boolean> = ref(false)
  const renamingGroupId: Ref<string | null> = ref(null)

  // --- Group Management ---
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
      // 重命名逻辑
      const group = groups.value.find((g) => g.id === renamingGroupId.value)
      if (group) {
        group.name = name
        saveToLocalStorage()
      }
    } else {
      // 新建逻辑 - 创建空白单词数组
      const newGroup: WordGroup = {
        id: Date.now().toString(),
        name: name,
        words: Array(9).fill(''), // 新分组使用空白单词
      }
      groups.value.push(newGroup)
      currentGroupId.value = newGroup.id
      words.value = [...newGroup.words] // 切换到新分组的空白单词
      initCards() // 更新卡片显示
    }

    saveToLocalStorage()
    closeGroupModal()
  }

  function updateCurrentGroup(): void {
    if (!currentGroupId.value) return
    const groupIndex = groups.value.findIndex(
      (g) => g.id === currentGroupId.value,
    )
    if (groupIndex !== -1) {
      groups.value[groupIndex].words = [...words.value]
      saveToLocalStorage()
    }
  }

  // [修改] 请求删除分组：打开弹窗
  function requestDeleteGroup(id: string): void {
    groupToDeleteId.value = id
    showDeleteConfirmModal.value = true
  }

  // [新增] 确认删除分组
  function confirmDeleteGroup(): void {
    if (!groupToDeleteId.value) return

    groups.value = groups.value.filter((g) => g.id !== groupToDeleteId.value)

    // 如果删除后没有分组了，创建一个默认分组
    if (groups.value.length === 0) {
      const defaultGroup: WordGroup = {
        id: Date.now().toString(),
        name: '默认分组',
        words: Array(9).fill(''),
      }
      groups.value.push(defaultGroup)
      currentGroupId.value = defaultGroup.id
      words.value = [...defaultGroup.words]
    } else if (currentGroupId.value === groupToDeleteId.value) {
      // 如果删除了当前选中的分组，选中第一个
      currentGroupId.value = groups.value[0].id
      words.value = [...groups.value[0].words]
    }

    initCards()
    updateLuckyCountConstraints()
    saveToLocalStorage()
    showDeleteConfirmModal.value = false
    groupToDeleteId.value = null
  }

  // [新增] 取消删除分组
  function cancelDeleteGroup(): void {
    showDeleteConfirmModal.value = false
    groupToDeleteId.value = null
  }

  function selectGroup(id: string): void {
    const group = groups.value.find((g) => g.id === id)
    if (group) {
      currentGroupId.value = id
      words.value = [...group.words]
      initCards()
      updateLuckyCountConstraints()
      saveToLocalStorage()
    }
  }

  onMounted(() => {
    loadFromLocalStorage()
    initCards()
    document.addEventListener('click', ensureAudioContext, { once: true })
  })

  return {
    words,
    cards,
    gameStarted,
    gameOver,
    luckyCount,
    isInputHidden,
    cardBackRefs,
    isAnimating,
    showClearModal,
    groups,
    currentGroupId,
    showGroupModal,
    groupNameInput,
    showDeleteConfirmModal,
    isRenaming,
    startGame,
    resetGame,
    handleCardClick,
    addWord,
    removeWord,
    requestClearWords,
    confirmClearWords,
    cancelClearWords,
    toggleInput,
    handleWordInput,
    updateLuckyCountConstraints,
    openSaveGroupModal,
    closeGroupModal,
    saveGroup,
    updateCurrentGroup,
    requestDeleteGroup,
    confirmDeleteGroup,
    cancelDeleteGroup,
    selectGroup,
  }
}
