import { ref, reactive, onMounted, nextTick, computed, watch } from 'vue'

// --- Types ---
export interface PathCell {
  r: number
  c: number
}

export interface BoardCell {
  id: number
  r: number
  c: number
  type: string
  content: string | number
  status: string
  eventClass: string
}

export interface Player {
  id: number
  position: number
  frozen: boolean
  hasShield: boolean // [新增] 是否拥有护盾
  style: Record<string, string | number>
}

export interface Question {
  id: string
  q: string
  a: string
}

export interface QuestionGroup {
  id: string
  name: string
  questions: Question[]
}

export interface ModalButton {
  text: string
  class?: string
  action?: () => void
  callback?: () => void
}

export interface GameModal {
  show: boolean
  title: string
  body: string
  buttons: ModalButton[]
}

// --- Composable Logic ---
export function useGameLogic() {
  // --- Constants ---
  const COLS = 8
  const ROWS = 6
  const PATH_MAP: PathCell[] = []
  const STORAGE_KEY = 'millionaire_data_v2'

  for (let r = 1; r <= ROWS; r++) {
    if (r % 2 !== 0) {
      for (let c = 1; c <= COLS; c++) {
        PATH_MAP.push({ r, c })
      }
    } else {
      for (let c = COLS; c >= 1; c--) {
        PATH_MAP.push({ r, c })
      }
    }
  }

  // --- State ---
  const boardCells = ref<BoardCell[]>([])
  const cellRefs = ref<any[]>([])
  const players = ref<Player[]>([])
  const currentPlayer = ref(1)
  const playerCount = ref(2)
  const gameActive = ref(true)

  // 回合处理锁
  const isTurnProcessing = ref(false)

  // 题库管理
  const questionGroups = ref<QuestionGroup[]>([])
  const currentGroupId = ref<string>('')
  const showSettings = ref(false)

  // 已出题目记录
  const usedQuestionIds = ref<Set<string>>(new Set())

  // 骰子
  const diceMsg = ref('点击骰子开始')
  const isRolling = ref(false)
  const diceStyle = ref({
    transform: 'translateZ(-50px) rotateX(-25deg) rotateY(-35deg)',
  })

  // 弹窗
  const gameModal = reactive<GameModal>({
    show: false,
    title: '',
    body: '',
    buttons: [],
  })

  const showDeleteGroupConfirm = ref(false)
  const groupToDeleteId = ref<string | null>(null)

  // --- Computed ---
  const currentGroup = computed(
    () =>
      questionGroups.value.find((g) => g.id === currentGroupId.value) || null,
  )

  const activeQuestions = computed(() => {
    if (currentGroup.value && currentGroup.value.questions.length > 0) {
      return currentGroup.value.questions
    }
    return [{ id: 'default', q: '暂无题目，请在设置中添加！', a: '无' }]
  })

  watch(currentGroupId, () => {
    usedQuestionIds.value.clear()
  })

  // --- Audio ---
  let audioCtx: AudioContext | null = null
  const SFX = {
    get ctx() {
      if (!audioCtx) {
        audioCtx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )()
      }
      return audioCtx
    },
    playTone: function (
      freq: number,
      type: OscillatorType,
      duration: number,
    ): void {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime)
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        this.ctx.currentTime + duration,
      )
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + duration)
    },
    roll: () => {
      let count = 0
      const interval = setInterval(() => {
        SFX.playTone(200 + Math.random() * 100, 'square', 0.05)
        count++
        if (count > 8) clearInterval(interval)
      }, 60)
    },
    win: () => {
      ;[440, 554, 659, 880].forEach((f, i) =>
        setTimeout(() => SFX.playTone(f, 'sine', 0.3), i * 150),
      )
    },
    correct: () => {
      SFX.playTone(600, 'sine', 0.1)
      setTimeout(() => SFX.playTone(900, 'sine', 0.2), 100)
    },
    wrong: () => {
      SFX.playTone(150, 'sawtooth', 0.3)
      setTimeout(() => SFX.playTone(100, 'sawtooth', 0.3), 200)
    },
    magic: () => {
      SFX.playTone(1200, 'triangle', 0.5)
    },
    shield: () => {
      SFX.playTone(300, 'sine', 0.1)
      setTimeout(() => SFX.playTone(500, 'sine', 0.3), 100)
    },
  }

  // --- Game Logic ---
  function getPlayerIcon(id: number): string {
    const icons = [
      'fas fa-hat-wizard',
      'fas fa-dragon',
      'fas fa-ghost',
      'fas fa-cat',
    ]
    return icons[(id - 1) % icons.length]
  }

  function resetGame() {
    currentPlayer.value = 1
    gameActive.value = true
    isTurnProcessing.value = false
    gameModal.show = false
    showSettings.value = false
    usedQuestionIds.value.clear()
    diceMsg.value = '点击骰子开始'
    diceStyle.value = {
      transform: 'translateZ(-50px) rotateX(-25deg) rotateY(-35deg)',
    }
    generateBoard()
    createPlayers()
  }

  function generateBoard(): void {
    const totalCells = PATH_MAP.length
    boardCells.value = PATH_MAP.map((pos, i) => {
      let type = 'normal'
      let content: string | number = i
      let status = 'unknown'
      let eventClass = ''

      if (i === 0) {
        status = 'start'
        content = 'fas fa-flag-checkered'
      } else if (i === totalCells - 1) {
        status = 'end'
        content = 'fas fa-trophy'
      } else {
        const r = Math.random()
        const isLateGame = i >= totalCells - 21
        const isEarlyGame = i > 0 && i <= 20 // [新增] 前20格判断

        if (isLateGame && Math.random() < 0.08) {
          type = 'warp_win'
        } else if (isEarlyGame && Math.random() < 0.15) {
          // [新增] 前20格有 15% 概率生成护盾
          type = 'shield'
        } else {
          if (r < 0.15) type = 'lucky'
          else if (r < 0.3) type = 'bad'
          else if (r < 0.4) type = 'freeze'
          else if (r < 0.5) type = 'attack'
          else if (r < 0.55) type = 'again'
        }
      }

      return { id: i, r: pos.r, c: pos.c, type, content, status, eventClass }
    })
  }

  function createPlayers(): void {
    players.value = Array.from({ length: playerCount.value }, (_, idx) => ({
      id: idx + 1,
      position: 0,
      frozen: false,
      hasShield: false, // [新增] 初始无护盾
      style: {},
    }))
    nextTick(updatePlayerVisuals)
  }

  function updatePlayerVisuals(): void {
    const offsets = [
      { x: -15, y: -15 },
      { x: 15, y: -15 },
      { x: -15, y: 15 },
      { x: 15, y: 15 },
    ]
    players.value.forEach((p) => {
      const cell = cellRefs.value[p.position]
      if (cell && cell.offsetLeft !== undefined) {
        const offset = offsets[(p.id - 1) % 4]
        const left = cell.offsetLeft + cell.offsetWidth / 2 - 25 + offset.x
        const top = cell.offsetTop + cell.offsetHeight / 2 - 40 + offset.y
        const zIndex = Math.floor(top) + 1000 + offset.y
        p.style = { left: `${left}px`, top: `${top}px`, zIndex: zIndex }
      }
    })
  }

  function changePlayerCount(delta: number): void {
    const n = playerCount.value + delta
    if (n < 1 || n > 4) return
    playerCount.value = n
    resetGame()
  }

  function rollDice(): void {
    if (!gameActive.value) return
    if (isTurnProcessing.value) return

    const p = players.value.find((p) => p.id === currentPlayer.value)
    if (!p) return

    isTurnProcessing.value = true

    if (p.frozen) {
      p.frozen = false
      alert(`玩家 ${currentPlayer.value} 正在解冻中，本轮跳过！`)
      nextPlayer()
      return
    }

    SFX.roll()
    isRolling.value = true
    diceMsg.value = '命运转动中...'

    setTimeout(() => {
      isRolling.value = false
      const result = Math.floor(Math.random() * 6) + 1
      const tiltX = -10
      const tiltY = -5

      let rx = 0,
        ry = 0
      switch (result) {
        case 1:
          rx = 0 + tiltX
          ry = 0 + tiltY
          break
        case 2:
          rx = 0 + tiltX
          ry = -90 + tiltY
          break
        case 3:
          rx = 0 + tiltX
          ry = -180 + tiltY
          break
        case 4:
          rx = 0 + tiltX
          ry = 90 + tiltY
          break
        case 5:
          rx = -90 + tiltX
          ry = 0 + tiltY
          break
        case 6:
          rx = 90 + tiltX
          ry = 0 + tiltY
          break
      }
      diceStyle.value = {
        transform: `translateZ(-50px) rotateX(${rx + 720}deg) rotateY(${ry + 720}deg)`,
      }
      diceMsg.value = `点数：${result}`
      setTimeout(() => movePlayer(result), 800)
    }, 1000)
  }

  function movePlayer(steps: number): void {
    const p = players.value.find((p) => p.id === currentPlayer.value)
    if (!p) return
    const lastPos = p.position
    let target = p.position + steps
    if (target >= PATH_MAP.length - 1) target = PATH_MAP.length - 1

    let current = p.position
    const timer = setInterval(() => {
      if (current < target) {
        current++
        if (p) p.position = current
        updatePlayerVisuals()
      } else {
        clearInterval(timer)
        handleLand(target, lastPos)
      }
    }, 250)
  }

  function handleWin(playerId: number) {
    SFX.win()
    gameActive.value = false
    showModal(
      '<i class="fas fa-crown"></i> 巅峰时刻',
      `恭喜玩家 ${playerId} 率先抵达终点！获得至尊法师称号！`,
      [{ text: '再来一局', class: 'btn-green', action: resetGame }],
    )
  }

  function handleLand(posIndex: number, lastPos: number): void {
    if (posIndex === PATH_MAP.length - 1) {
      handleWin(currentPlayer.value)
      return
    }
    showQuestion(posIndex, lastPos)
  }

  function showQuestion(posIndex: number, lastPos: number): void {
    const qList = activeQuestions.value
    let availableQuestions = qList.filter(
      (q) => !usedQuestionIds.value.has(q.id),
    )

    if (availableQuestions.length === 0) {
      usedQuestionIds.value.clear()
      availableQuestions = qList
    }

    const q =
      availableQuestions[Math.floor(Math.random() * availableQuestions.length)]

    if (q.id !== 'default') {
      usedQuestionIds.value.add(q.id)
    }

    const showAnswerAction = () => {
      gameModal.body = `<div class="modal-q-box"><div class="q-text">${q.q}</div><div class="a-text">答案: ${q.a}</div></div>`
    }
    showModal(
      '<i class="fas fa-scroll"></i> 智慧试炼',
      `<div class="modal-q-box"><div class="q-text">${q.q}</div></div>`,
      [
        {
          text: '<i class="fas fa-eye"></i> 看答案',
          class: 'btn-yellow',
          action: showAnswerAction,
        },
        {
          text: '<i class="fas fa-times"></i> 答错 (后退)',
          class: 'btn-red',
          action: () => {
            closeModal()
            handleWrong(lastPos)
          },
        },
        {
          text: '<i class="fas fa-check"></i> 答对 (事件)',
          class: 'btn-green',
          action: () => {
            closeModal()
            revealEvent(posIndex)
          },
        },
      ],
    )
  }

  function handleWrong(lastPos: number): void {
    SFX.wrong()
    const p = players.value.find((p) => p.id === currentPlayer.value)
    if (!p) return
    p.position = lastPos
    updatePlayerVisuals()
    nextPlayer()
  }

  function revealEvent(posIndex: number): void {
    const cell = boardCells.value[posIndex]
    cell.status = ''
    if (cell.type === 'normal') {
      SFX.correct()
      cell.content = 'fas fa-check'
      setTimeout(nextPlayer, 500)
    } else {
      handleSpecialEvent(cell)
    }
  }

  function handleSpecialEvent(cell: BoardCell): void {
    const p = players.value.find((p) => p.id === currentPlayer.value)
    if (!p) return

    SFX.magic()
    let title = '',
      msg = ''

    // [新增] 护盾处理：检查是否触发负面效果且玩家拥有护盾
    const isNegative = ['bad', 'freeze'].includes(cell.type)
    if (isNegative && p.hasShield) {
      p.hasShield = false
      cell.content = 'fas fa-shield-alt' // 显示盾牌图标
      cell.eventClass = 'event-lucky'
      SFX.shield()
      showEventModal(
        '<i class="fas fa-shield-alt"></i> 绝对防御',
        '护盾生效！你成功抵挡了本次负面魔法效果。',
        () => nextPlayer(), // 直接结束回合，不触发原本的负面效果
      )
      return
    }

    switch (cell.type) {
      case 'shield': // [新增] 获取护盾事件
        cell.eventClass = 'event-lucky'
        cell.content = 'fas fa-shield-alt'
        title = '<i class="fas fa-shield-alt"></i> 神圣护盾'
        msg = '获得魔法护盾！可以抵挡下一次陷阱、冰冻或攻击。'
        SFX.shield()
        showEventModal(title, msg, () => {
          p.hasShield = true
          nextPlayer()
        })
        break
      case 'lucky':
        cell.eventClass = 'event-lucky'
        cell.content = 'fas fa-gem'
        title = '<i class="fas fa-gem"></i> 幸运宝石'
        msg = '发现魔法宝石，传送前进 2 格！'
        showEventModal(title, msg, () => simpleMove(2, true))
        break
      case 'warp_win':
        cell.eventClass = 'event-lucky'
        cell.content = 'fas fa-rocket'
        title = '<i class="fas fa-rocket"></i> 命运眷顾'
        msg = '触发传送法阵，直接抵达终点！'
        showEventModal(title, msg, () => {
          p.position = PATH_MAP.length - 1
          updatePlayerVisuals()
          handleWin(currentPlayer.value)
        })
        break
      case 'bad':
        cell.eventClass = 'event-bad'
        cell.content = 'fas fa-bomb'
        title = '<i class="fas fa-bomb"></i> 魔法陷阱'
        msg = '触发了防御法阵，被击退 2 格！'
        showEventModal(title, msg, () => simpleMove(-2, true))
        break
      case 'freeze':
        cell.eventClass = 'event-freeze'
        cell.content = 'fas fa-snowflake'
        title = '<i class="fas fa-snowflake"></i> 绝对零度'
        msg = '你被寒冰冻结，下回合暂停行动。'
        showEventModal(title, msg, () => {
          p.frozen = true
          nextPlayer()
        })
        break
      case 'again':
        cell.eventClass = 'event-lucky'
        cell.content = 'fas fa-bolt'
        title = '<i class="fas fa-bolt"></i> 魔力充盈'
        msg = '魔力涌动，获得额外行动机会！'
        showEventModal(title, msg, () => {
          isTurnProcessing.value = false
          diceMsg.value = '获得额外回合！请再次投掷'
        })
        break
      case 'attack':
        cell.eventClass = 'event-pvp'
        cell.content = 'fas fa-meteor'
        title = '<i class="fas fa-meteor"></i> 陨石术'
        msg = '召唤陨石攻击对手，其他玩家后退 2 格！(护盾可抵挡)'
        showEventModal(title, msg, () => {
          players.value.forEach((targetP) => {
            if (targetP.id !== currentPlayer.value) {
              // [新增] 攻击判定：检查受害者是否有护盾
              if (targetP.hasShield) {
                targetP.hasShield = false // 消耗护盾，免除后退
                // 可以在这里加个小提示，但为了流畅简单跳过
              } else {
                targetP.position = Math.max(0, targetP.position - 2)
              }
            }
          })
          updatePlayerVisuals()
          nextPlayer()
        })
        break
    }
  }

  function simpleMove(steps: number, endTurn: boolean): void {
    const p = players.value.find((p) => p.id === currentPlayer.value)
    if (!p) return
    let t = p.position + steps
    if (t < 0) t = 0
    if (t >= PATH_MAP.length - 1) t = PATH_MAP.length - 1
    p.position = t
    updatePlayerVisuals()

    if (t === PATH_MAP.length - 1) {
      handleWin(currentPlayer.value)
      return
    }

    if (endTurn) nextPlayer()
  }

  function showEventModal(
    title: string,
    msg: string,
    callback: () => void,
  ): void {
    showModal(title, msg, [
      {
        text: '确定',
        class: 'btn-blue',
        action: () => {
          closeModal()
          callback()
        },
      },
    ])
  }

  function nextPlayer(): void {
    currentPlayer.value++
    if (currentPlayer.value > playerCount.value) currentPlayer.value = 1
    isTurnProcessing.value = false
    diceMsg.value = '点击骰子开始'
  }

  function showModal(
    title: string,
    htmlContent: string,
    buttons: ModalButton[],
  ): void {
    gameModal.title = title
    gameModal.body = htmlContent
    gameModal.buttons = buttons
    gameModal.show = true
  }

  function closeModal(): void {
    gameModal.show = false
  }

  // --- Group & Question Management ---
  function loadData(): void {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) questionGroups.value = parsed
      } catch (e) {
        console.error(e)
      }
    } else {
      const oldData = localStorage.getItem('magicQuestions_v4')
      const defaultQuestions = oldData
        ? JSON.parse(oldData)
        : [
            { id: '1', q: '中国的首都是？', a: '北京' },
            { id: '2', q: '1 + 1 = ?', a: '2' },
            { id: '3', q: '水的化学式？', a: 'H2O' },
          ]
      const defaultGroup: QuestionGroup = {
        id: Date.now().toString(),
        name: '默认题库',
        questions: defaultQuestions,
      }
      questionGroups.value = [defaultGroup]
      saveData()
    }
    if (questionGroups.value.length > 0)
      currentGroupId.value = questionGroups.value[0].id
  }

  function saveData(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questionGroups.value))
  }

  watch(
    questionGroups,
    () => {
      saveData()
    },
    { deep: true },
  )

  function createGroup(): void {
    const newGroup: QuestionGroup = {
      id: Date.now().toString(),
      name: `新分组 ${questionGroups.value.length + 1}`,
      questions: [],
    }
    questionGroups.value.push(newGroup)
    currentGroupId.value = newGroup.id
  }

  function deleteGroup(id: string): void {
    if (questionGroups.value.length <= 1) {
      alert('至少保留一个分组！')
      return
    }
    groupToDeleteId.value = id
    showDeleteGroupConfirm.value = true
  }

  function confirmDeleteGroup(): void {
    if (groupToDeleteId.value) {
      questionGroups.value = questionGroups.value.filter(
        (g) => g.id !== groupToDeleteId.value,
      )
      if (currentGroupId.value === groupToDeleteId.value) {
        currentGroupId.value = questionGroups.value[0].id
      }
    }
    showDeleteGroupConfirm.value = false
    groupToDeleteId.value = null
  }

  function addQuestion(): void {
    if (!currentGroup.value) return
    currentGroup.value.questions.push({
      id: Date.now().toString(),
      q: '',
      a: '',
    })
  }

  function removeQuestion(index: number): void {
    if (!currentGroup.value) return
    currentGroup.value.questions.splice(index, 1)
  }

  onMounted(() => {
    loadData()
    resetGame()
    window.addEventListener('resize', updatePlayerVisuals)
  })

  return {
    boardCells,
    cellRefs,
    players,
    currentPlayer,
    diceMsg,
    isRolling,
    diceStyle,
    showSettings,
    gameModal,
    showDeleteGroupConfirm,
    questionGroups,
    currentGroupId,
    currentGroup,
    resetGame,
    changePlayerCount,
    rollDice,
    getPlayerIcon,
    createGroup,
    deleteGroup,
    confirmDeleteGroup,
    addQuestion,
    removeQuestion,
  }
}
