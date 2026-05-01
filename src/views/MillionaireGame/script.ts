import {
  ref,
  reactive,
  onMounted,
  onUnmounted,
  nextTick,
  computed,
  watch,
} from 'vue'

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
  hasShield: boolean
  justHitTrap: boolean
  score: number
  style: Record<string, string | number>
}

export interface Question {
  id: string
  q: string
  a: string
  difficulty?: number
}

export interface QuestionGroup {
  id: string
  name: string
  questions: Question[]
  timerSeconds?: number
}

const DEFAULT_TIMER_SECONDS = 15

export interface ModalButton {
  text: string
  class?: string
  action?: () => void
  callback?: () => void
}

export interface Chest {
  type: string
  gameType: string
  icon: string
  color: string
  label: string
}

export interface ChestRewardDisplay {
  type: string
  icon: string
  name: string
  desc: string
  effectVal: string
  effectUnit: string
  color: string
  badgeBg: string
  badgeColor: string
  badgeText: string
}

export interface GameModal {
  show: boolean
  title: string
  body: string
  buttons: ModalButton[]
}

// --- Weighted random helper ---
function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0)
  let r = Math.random() * total
  for (const item of items) {
    r -= item.weight
    if (r <= 0) return item
  }
  return items[items.length - 1]
}

// --- Composable Logic ---
export function useGameLogic() {
  // --- Constants ---
  const COLS = 8
  const ROWS = 6
  const PATH_MAP: PathCell[] = []
  const STORAGE_KEY = 'millionaire_data_v2'

  const CHEST_REWARD_MAP: Record<string, ChestRewardDisplay> = {
    lucky: {
      type: 'lucky',
      icon: '💎',
      name: '幸运宝石',
      desc: '发现魔法宝石，传送前进 2 格！',
      effectVal: '+2',
      effectUnit: '格',
      color: 'var(--ctp-green)',
      badgeBg: 'color-mix(in srgb,var(--ctp-green) 20%,var(--ctp-surface0))',
      badgeColor: 'var(--ctp-green)',
      badgeText: '奖励',
    },
    shield: {
      type: 'shield',
      icon: '🛡️',
      name: '神圣护盾',
      desc: '获得魔法护盾！可以抵挡下一次陷阱或攻击。',
      effectVal: '×1',
      effectUnit: '护盾',
      color: 'var(--ctp-sapphire)',
      badgeBg: 'color-mix(in srgb,var(--ctp-sapphire) 20%,var(--ctp-surface0))',
      badgeColor: 'var(--ctp-sapphire)',
      badgeText: '奖励',
    },
    again: {
      type: 'again',
      icon: '⚡',
      name: '魔力充盈',
      desc: '魔力涌动！获得额外行动机会。',
      effectVal: '+1',
      effectUnit: '回合',
      color: 'var(--ctp-yellow)',
      badgeBg: 'color-mix(in srgb,var(--ctp-yellow) 20%,var(--ctp-surface0))',
      badgeColor: 'var(--ctp-yellow)',
      badgeText: '奖励',
    },
    bad: {
      type: 'bad',
      icon: '💣',
      name: '魔法陷阱',
      desc: '触发防御法阵，被击退 2 格！',
      effectVal: '-2',
      effectUnit: '格',
      color: 'var(--ctp-red)',
      badgeBg: 'color-mix(in srgb,var(--ctp-red) 20%,var(--ctp-surface0))',
      badgeColor: 'var(--ctp-red)',
      badgeText: '惩罚',
    },
    freeze: {
      type: 'freeze',
      icon: '💀',
      name: '石化诅咒',
      desc: '被石化了，下回合无法行动。',
      effectVal: '-1',
      effectUnit: '回合',
      color: 'var(--ctp-blue)',
      badgeBg: 'color-mix(in srgb,var(--ctp-blue) 20%,var(--ctp-surface0))',
      badgeColor: 'var(--ctp-blue)',
      badgeText: '惩罚',
    },
    freeze_spell: {
      type: 'freeze_spell',
      icon: '❄️',
      name: '寒冰锁链',
      desc: '获得石化术！选择一名对手将其石化一回合。',
      effectVal: '×1',
      effectUnit: '对手',
      color: 'var(--ctp-sky)',
      badgeBg: 'color-mix(in srgb,var(--ctp-sky) 20%,var(--ctp-surface0))',
      badgeColor: 'var(--ctp-sky)',
      badgeText: '特殊',
    },
    attack: {
      type: 'attack',
      icon: '☄️',
      name: '陨石术',
      desc: '召唤陨石锁定最近的对手！对手后退 2 格。',
      effectVal: '-2',
      effectUnit: '对手',
      color: 'var(--ctp-mauve)',
      badgeBg: 'color-mix(in srgb,var(--ctp-mauve) 20%,var(--ctp-surface0))',
      badgeColor: 'var(--ctp-mauve)',
      badgeText: '特殊',
    },
    empty: {
      type: 'empty',
      icon: '📦',
      name: '空宝箱',
      desc: '这个宝箱里什么都没有，回合结束。',
      effectVal: '0',
      effectUnit: '',
      color: 'var(--ctp-overlay1)',
      badgeBg: 'color-mix(in srgb,var(--ctp-overlay1) 20%,var(--ctp-surface0))',
      badgeColor: 'var(--ctp-overlay1)',
      badgeText: '无',
    },
  }

  onMounted(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
  })

  onUnmounted(() => {
    document.body.style.overflow = ''
    document.body.style.overscrollBehavior = ''
  })

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

  const isTurnProcessing = ref(false)
  const extraTurnThisRound = ref(false)
  const gameLog = ref<string[]>([])

  // 题库管理
  const questionGroups = ref<QuestionGroup[]>([])
  const currentGroupId = ref<string>('')
  const showSettings = ref(false)

  const questionUseCount = ref<Map<string, number>>(new Map())
  const currentQuestionReward = ref(0)

  interface GameSnapshot {
    players: Player[]
    currentPlayer: number
    extraTurnThisRound: boolean
    lastDiceResult: number | null
    totalRolls: number
    questionUseCount: Array<[string, number]>
    boardCells: BoardCell[]
    gameLog: string[]
  }
  const lastSnapshot = ref<GameSnapshot | null>(null)

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

  // 宝箱选择
  const chestModal = reactive({
    show: false,
    title: '',
    chests: [] as Chest[],
  })
  const chestPhase = ref<'pick' | 'opening' | 'reward'>('pick')
  const chestReward = ref<ChestRewardDisplay | null>(null)
  const chestThemeIdx = ref(0)
  const selectedChest = ref(-1)
  let pendingChestCallback: (() => void) | null = null

  const showDeleteGroupConfirm = ref(false)
  const groupToDeleteId = ref<string | null>(null)

  const timerValue = ref(15000)
  const isTimerActive = ref(false)
  let timerInterval: any = null

  const SOUND_KEY = 'millionaire_sound_enabled'
  const soundEnabled = ref(localStorage.getItem(SOUND_KEY) !== '0')
  function toggleSound(): void {
    soundEnabled.value = !soundEnabled.value
    localStorage.setItem(SOUND_KEY, soundEnabled.value ? '1' : '0')
  }

  const TEAM_KEY = 'millionaire_team_mode'
  const teamMode = ref(localStorage.getItem(TEAM_KEY) === '1')
  function toggleTeamMode(): void {
    teamMode.value = !teamMode.value
    localStorage.setItem(TEAM_KEY, teamMode.value ? '1' : '0')
  }
  function teamOf(playerId: number): 'A' | 'B' {
    return playerId % 2 === 1 ? 'A' : 'B'
  }
  function teamColor(playerId: number): string {
    return teamOf(playerId) === 'A' ? 'var(--ctp-red)' : 'var(--ctp-blue)'
  }
  const teamScores = computed(() => {
    const a = players.value
      .filter((p) => teamOf(p.id) === 'A')
      .reduce((s, p) => s + p.score, 0)
    const b = players.value
      .filter((p) => teamOf(p.id) === 'B')
      .reduce((s, p) => s + p.score, 0)
    return { A: a, B: b }
  })

  // --- Computed ---
  const formattedTime = computed(() => (timerValue.value / 1000).toFixed(1))

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

  const isCurrentPlayerFrozen = computed(() => {
    const p = players.value.find((pl) => pl.id === currentPlayer.value)
    return p?.frozen ?? false
  })

  watch(currentGroupId, () => {
    questionUseCount.value.clear()
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
      volume = 0.2,
    ): void {
      if (!soundEnabled.value) return
      if (this.ctx.state === 'suspended') this.ctx.resume()
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime)
      gain.gain.setValueAtTime(volume, this.ctx.currentTime)
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
    // Dramatic chest-opening sequence
    chestOpen: () => {
      // Low rumble
      SFX.playTone(80, 'sawtooth', 0.18, 0.15)
      setTimeout(() => SFX.playTone(130, 'sawtooth', 0.15, 0.12), 180)
      // Rising pitch
      setTimeout(() => SFX.playTone(280, 'sine', 0.2, 0.18), 420)
      setTimeout(() => SFX.playTone(460, 'sine', 0.2, 0.2), 650)
      setTimeout(() => SFX.playTone(680, 'triangle', 0.25, 0.22), 880)
      // Climax burst
      setTimeout(() => {
        SFX.playTone(980, 'triangle', 0.35, 0.25)
        SFX.playTone(1460, 'sine', 0.2, 0.18)
      }, 1100)
      // Sparkle trail
      setTimeout(() => {
        ;[780, 980, 1180, 1380].forEach((f, i) =>
          setTimeout(() => SFX.playTone(f, 'sine', 0.18, 0.14), i * 85),
        )
      }, 1400)
    },
  }

  function addLog(msg: string): void {
    gameLog.value.unshift(msg)
    if (gameLog.value.length > 25) gameLog.value.pop()
  }

  function buildChestPool(p: Player): {
    gameType: string
    icon: string
    color: string
    label: string
    reward: ChestRewardDisplay
    weight: number
  }[] {
    const positions = players.value.map((pl) => pl.position)
    const maxPos = Math.max(...positions)
    const avgPos =
      positions.reduce((s, v) => s + v, 0) / Math.max(1, positions.length)
    const isTrailing = players.value.length > 1 && maxPos - p.position >= 4
    const isLeading = players.value.length > 1 && p.position - avgPos >= 5

    const w = (trail: number, normal: number, lead: number): number =>
      isTrailing ? trail : isLeading ? lead : normal

    return [
      {
        gameType: 'empty',
        icon: 'fas fa-question',
        color: 'var(--ctp-overlay1)',
        label: '空宝箱 (无事发生)',
        reward: CHEST_REWARD_MAP.empty,
        weight: w(8, 15, 18),
      },
      {
        gameType: 'lucky',
        icon: 'fas fa-gem',
        color: 'var(--ctp-green)',
        label: '幸运宝石 (前进2格)',
        reward: CHEST_REWARD_MAP.lucky,
        weight: w(35, 25, 10),
      },
      {
        gameType: p.hasShield ? 'lucky' : 'shield',
        icon: 'fas fa-shield-alt',
        color: 'var(--ctp-sapphire)',
        label: p.hasShield ? '魔法宝石 (前进2格)' : '神圣护盾 (抵挡伤害)',
        reward: p.hasShield ? CHEST_REWARD_MAP.lucky : CHEST_REWARD_MAP.shield,
        weight: w(20, 15, 8),
      },
      {
        gameType: 'again',
        icon: 'fas fa-bolt',
        color: 'var(--ctp-yellow)',
        label: '魔力充盈 (额外回合)',
        reward: CHEST_REWARD_MAP.again,
        weight: w(22, 18, 10),
      },
      {
        gameType: 'bad',
        icon: 'fas fa-bomb',
        color: 'var(--ctp-red)',
        label: '魔法陷阱 (后退2格)',
        reward: CHEST_REWARD_MAP.bad,
        weight: w(10, 20, 28),
      },
      {
        gameType: 'freeze',
        icon: 'fas fa-skull',
        color: 'var(--ctp-blue)',
        label: '石化诅咒 (暂停一回合)',
        reward: CHEST_REWARD_MAP.freeze,
        weight: w(5, 10, 16),
      },
      {
        gameType: 'attack',
        icon: 'fas fa-meteor',
        color: 'var(--ctp-mauve)',
        label: '陨石术 (砸向榜首对手)',
        reward: CHEST_REWARD_MAP.attack,
        weight: w(14, 10, 6),
      },
      {
        gameType: 'freeze_spell',
        icon: 'fas fa-snowflake',
        color: 'var(--ctp-sky)',
        label: '寒冰锁链 (石化一名对手)',
        reward: CHEST_REWARD_MAP.freeze_spell,
        weight: w(18, 12, 6),
      },
    ]
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

  const lastDiceResult = ref<number | null>(null)
  const totalRolls = ref(0)

  function resetGame() {
    currentPlayer.value = 1
    gameActive.value = true
    isTurnProcessing.value = false
    extraTurnThisRound.value = false
    gameLog.value = []
    gameModal.show = false
    chestModal.show = false
    chestPhase.value = 'pick'
    chestReward.value = null
    selectedChest.value = -1
    pendingChestCallback = null
    showSettings.value = false
    questionUseCount.value.clear()
    lastSnapshot.value = null
    diceMsg.value = '点击骰子开始'
    diceStyle.value = {
      transform: 'translateZ(-50px) rotateX(-25deg) rotateY(-35deg)',
    }
    lastDiceResult.value = null
    totalRolls.value = 0

    generateBoard()
    createPlayers()
  }

  function generateBoard(): void {
    const totalCells = PATH_MAP.length
    let consecutiveNegativeCount = 0
    let positiveCount = 0
    let negativeCount = 0
    let shieldCount = 0

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
        const isEarlyGame = i > 0 && i <= 25
        const isSafeZone = i > 0 && i <= 15
        const forceSafe = consecutiveNegativeCount >= 2
        const isWinningZone = i >= totalCells - 5

        if (isWinningZone && Math.random() < 0.15 && !forceSafe) {
          type = 'warp_win'
        } else if (isEarlyGame && Math.random() < 0.15 && !forceSafe) {
          type = 'shield'
        } else {
          if (isSafeZone) {
            if (r < 0.2) type = 'lucky'
            else if (r < 0.35 && !forceSafe) type = 'attack'
            else if (r < 0.45) type = 'again'
          } else {
            if (forceSafe) {
              if (r < 0.3) type = 'lucky'
              else if (r < 0.5) type = 'again'
              else type = 'normal'
            } else {
              const balanceForceSafe = negativeCount - positiveCount >= 3
              if (balanceForceSafe) {
                if (r < 0.35) type = 'lucky'
                else if (r < 0.55) type = 'again'
                else type = 'normal'
              } else if (r < 0.15) type = 'lucky'
              else if (r < 0.3) type = 'bad'
              else if (r < 0.4) {
                if (i >= 25) type = 'freeze'
              } else if (r < 0.5) type = 'freeze_spell'
              else if (r < 0.6) type = 'attack'
              else if (r < 0.65) type = 'again'
            }
          }
        }
      }

      const isNegative = ['bad', 'freeze', 'attack', 'freeze_spell'].includes(
        type,
      )
      if (isNegative) {
        consecutiveNegativeCount++
        negativeCount++
      } else {
        consecutiveNegativeCount = 0
        if (['shield', 'lucky', 'again', 'warp_win'].includes(type)) {
          positiveCount++
          if (type === 'shield') shieldCount++
        }
      }

      return { id: i, r: pos.r, c: pos.c, type, content, status, eventClass }
    })

    while (shieldCount < 2) {
      const cand = boardCells.value.find(
        (c) =>
          c.type === 'normal' && c.status !== 'start' && c.status !== 'end',
      )
      if (!cand) break
      cand.type = 'shield'
      shieldCount++
    }
  }

  function createPlayers(): void {
    players.value = Array.from({ length: playerCount.value }, (_, idx) => ({
      id: idx + 1,
      position: 0,
      frozen: false,
      hasShield: false,
      justHitTrap: false,
      score: 0,
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
    if (n < 2 || n > 4) return
    playerCount.value = n
    resetGame()
  }

  function captureSnapshot(): void {
    lastSnapshot.value = {
      players: JSON.parse(JSON.stringify(players.value)),
      currentPlayer: currentPlayer.value,
      extraTurnThisRound: extraTurnThisRound.value,
      lastDiceResult: lastDiceResult.value,
      totalRolls: totalRolls.value,
      questionUseCount: Array.from(questionUseCount.value.entries()),
      boardCells: JSON.parse(JSON.stringify(boardCells.value)),
      gameLog: [...gameLog.value],
    }
  }

  const canUndo = computed(
    () => gameActive.value && lastSnapshot.value !== null,
  )

  function undo(): void {
    const snap = lastSnapshot.value
    if (!snap || !gameActive.value) return

    stopTimer()
    gameModal.show = false
    chestModal.show = false
    chestPhase.value = 'pick'
    chestReward.value = null
    selectedChest.value = -1
    pendingChestCallback = null
    isRolling.value = false

    players.value = snap.players.map((p) => ({ ...p, style: {} }))
    currentPlayer.value = snap.currentPlayer
    extraTurnThisRound.value = snap.extraTurnThisRound
    lastDiceResult.value = snap.lastDiceResult
    totalRolls.value = snap.totalRolls
    questionUseCount.value = new Map(snap.questionUseCount)
    boardCells.value = snap.boardCells
    gameLog.value = [...snap.gameLog]

    isTurnProcessing.value = false
    diceMsg.value = '已撤销，请重新投掷'
    lastSnapshot.value = null
    nextTick(updatePlayerVisuals)
  }

  function rollDice(): void {
    if (!gameActive.value) return
    if (isTurnProcessing.value) return

    const p = players.value.find((p) => p.id === currentPlayer.value)
    if (!p) return

    captureSnapshot()
    isTurnProcessing.value = true

    if (p.frozen) {
      p.frozen = false
      addLog(`❄️ P${p.id} 石化，跳过回合`)
      showEventModal(
        '<i class="fas fa-snowflake"></i> 抵抗石化中',
        `玩家 ${currentPlayer.value} 正在抵御石化，本轮跳过！`,
        () => {
          nextPlayer()
        },
      )
      return
    }

    SFX.roll()
    isRolling.value = true
    diceMsg.value = '命运转动中...'

    setTimeout(() => {
      isRolling.value = false
      let result = Math.floor(Math.random() * 6) + 1

      if (p.justHitTrap) {
        result = Math.floor(Math.random() * 4) + 3
        p.justHitTrap = false
      } else {
        if (totalRolls.value < 8 && lastDiceResult.value !== null) {
          while (result === lastDiceResult.value) {
            result = Math.floor(Math.random() * 6) + 1
          }
        }
      }

      lastDiceResult.value = result
      totalRolls.value++

      addLog(`🎲 P${p.id} 掷出 ${result}`)

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
    const p = players.value.find((pl) => pl.id === playerId)
    const indivScore = p?.score ?? 0
    let body = `恭喜玩家 ${playerId} 率先抵达终点！<br/>个人积分：<strong>${indivScore}</strong>`
    if (teamMode.value && playerCount.value === 4) {
      const t = teamOf(playerId)
      const tScore = teamScores.value[t]
      const mates = players.value
        .filter((pl) => teamOf(pl.id) === t)
        .map((pl) => `P${pl.id}`)
        .join(' & ')
      body = `战队 ${t} 获胜！<br/>${mates}<br/>战队总分：<strong>${tScore}</strong>`
      addLog(`🏆 战队${t} 获胜 (${tScore}分)`)
    } else {
      addLog(`🏆 P${playerId} 获胜 (${indivScore}分)`)
    }
    showModal('<i class="fas fa-crown"></i> 巅峰时刻', body, [
      { text: '再来一局', class: 'btn-green', action: resetGame },
    ])
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
    const counts = qList.map((q) => questionUseCount.value.get(q.id) ?? 0)
    const minCount = Math.min(...counts)
    const available = qList.filter(
      (q) => (questionUseCount.value.get(q.id) ?? 0) === minCount,
    )
    const q = available[Math.floor(Math.random() * available.length)]
    if (q.id !== 'default') {
      questionUseCount.value.set(
        q.id,
        (questionUseCount.value.get(q.id) ?? 0) + 1,
      )
    }
    const diff = Math.max(1, Math.min(3, q.difficulty ?? 1))
    const stars = '★'.repeat(diff) + '☆'.repeat(3 - diff)
    const reward = diff * 10
    currentQuestionReward.value = reward

    const diffBar = `<div style="margin-bottom:8px;color:var(--ctp-yellow);font-size:1rem">难度 ${stars} · 答对得 ${reward} 分</div>`
    const showAnswerAction = () => {
      gameModal.body = `<div class="modal-q-box">${diffBar}<div class="q-text">${q.q}</div><div class="a-text">答案: ${q.a}</div></div>`
    }

    showModal(
      '<i class="fas fa-scroll"></i> 智慧试炼',
      `<div class="modal-q-box">${diffBar}<div class="q-text">${q.q}</div></div>`,
      [
        {
          text: '<i class="fas fa-eye"></i> 看答案',
          class: 'btn-yellow',
          action: () => {
            stopTimer()
            showAnswerAction()
          },
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
            awardScore(reward)
            revealEvent(posIndex)
          },
        },
      ],
    )

    startTimer(() => {
      closeModal()
      SFX.wrong()
      setTimeout(() => {
        showModal(
          '<i class="fas fa-hourglass-end"></i> 时间到！',
          '思考时间结束，算作回答错误！',
          [
            {
              text: '接受惩罚',
              class: 'btn-red',
              action: () => {
                closeModal()
                handleWrong(lastPos)
              },
            },
          ],
        )
      }, 300)
    })
  }

  function awardScore(delta: number): void {
    const p = players.value.find((p) => p.id === currentPlayer.value)
    if (!p) return
    p.score += delta
    if (p.score < 0) p.score = 0
  }

  function handleWrong(lastPos: number): void {
    SFX.wrong()
    const p = players.value.find((p) => p.id === currentPlayer.value)
    if (!p) return
    const reward = currentQuestionReward.value
    const penalty = Math.min(p.score, Math.max(5, Math.floor(reward / 2)))
    if (penalty > 0) p.score -= penalty
    addLog(`❌ P${p.id} 答错，退回${penalty ? ` -${penalty}分` : ''}`)
    p.position = lastPos
    updatePlayerVisuals()
    nextPlayer()
  }

  function revealEvent(posIndex: number): void {
    const cell = boardCells.value[posIndex]
    cell.status = ''
    const p = players.value.find((pl) => pl.id === currentPlayer.value)
    if (!p) return

    if (cell.type === 'warp_win' || cell.type === 'freeze_spell') {
      executeEventEffect(cell, p)
      return
    }
    showChestModal(posIndex)
  }

  function showChestModal(posIndex: number): void {
    const p = players.value.find((p) => p.id === currentPlayer.value)
    if (!p) return

    SFX.magic()

    const pool = buildChestPool(p)

    const positiveTypes = ['shield', 'lucky', 'again']
    const negativeTypes = ['bad', 'freeze', 'attack']
    const chests: Chest[] = []
    let attempts = 0

    while (chests.length < 3 && attempts < 100) {
      attempts++
      const poolItem = weightedRandom(pool)
      if (
        poolItem.gameType !== 'lucky' &&
        poolItem.gameType !== 'empty' &&
        chests.some((c) => c.gameType === poolItem.gameType)
      )
        continue

      chests.push({
        type: poolItem.gameType,
        gameType: poolItem.gameType,
        icon: poolItem.icon,
        color: poolItem.color,
        label: poolItem.label,
      })
    }

    const hasPositive = chests.some((c) => positiveTypes.includes(c.gameType))
    if (!hasPositive && chests.length === 3) {
      chests[Math.floor(Math.random() * 3)] = {
        type: 'lucky',
        gameType: 'lucky',
        icon: 'fas fa-gem',
        color: 'var(--ctp-green)',
        label: '幸运宝石 (前进2格)',
      }
    }

    const negCount = chests.filter((c) =>
      negativeTypes.includes(c.gameType),
    ).length
    if (negCount > 1) {
      for (let i = 0; i < chests.length; i++) {
        if (negativeTypes.includes(chests[i].gameType)) {
          chests[i] = {
            type: 'again',
            gameType: 'again',
            icon: 'fas fa-bolt',
            color: 'var(--ctp-yellow)',
            label: '魔力充盈 (额外回合)',
          }
          break
        }
      }
    }

    chestPhase.value = 'pick'
    chestReward.value = null
    chestThemeIdx.value = Math.floor(Math.random() * 3)
    selectedChest.value = -1
    chestModal.title = '<i class="fas fa-gift"></i> 命运宝箱'
    chestModal.chests = chests
    chestModal.show = true

    pendingChestCallback = () => {
      const chosen = chests[selectedChest.value]
      const cell = boardCells.value[posIndex]
      cell.eventClass = ['bad', 'freeze'].includes(chosen.gameType)
        ? 'event-bad'
        : ['attack', 'freeze_spell'].includes(chosen.gameType)
          ? 'event-pvp'
          : chosen.gameType === 'empty'
            ? ''
            : 'event-lucky'
      cell.content = chosen.icon
      const overriddenCell = { ...cell, type: chosen.gameType }
      executeEventEffect(overriddenCell, p)
    }
  }

  function selectChest(index: number): void {
    if (chestPhase.value !== 'pick') return
    if (selectedChest.value >= 0) return
    selectedChest.value = index
    chestThemeIdx.value = index

    setTimeout(() => {
      chestPhase.value = 'opening'
      SFX.chestOpen()
    }, 600)
    setTimeout(() => {
      const chosen = chestModal.chests[index]
      chestReward.value =
        CHEST_REWARD_MAP[chosen.gameType] || CHEST_REWARD_MAP.empty
      chestPhase.value = 'reward'
    }, 2500)
  }

  function skipChestOpening(): void {
    if (chestPhase.value !== 'opening') return
    const chosen = chestModal.chests[selectedChest.value]
    chestReward.value =
      CHEST_REWARD_MAP[chosen.gameType] || CHEST_REWARD_MAP.empty
    chestPhase.value = 'reward'
  }

  function handleRewardContinue(): void {
    chestModal.show = false
    if (pendingChestCallback) {
      pendingChestCallback()
      pendingChestCallback = null
    }
  }

  // Single-target attack — keep modal only for shield decision
  function handleSingleAttack(victim: Player): void {
    if (victim.hasShield) {
      SFX.shield()
      showModal(
        '<i class="fas fa-meteor"></i> 紧急防御',
        `<strong>玩家 ${victim.id}</strong> 遭到 <strong style="color:var(--ctp-red)">陨石术</strong>是否消耗护盾防御？`,
        [
          {
            text: '使用护盾 (无伤)',
            class: 'btn-green',
            action: () => {
              victim.hasShield = false
              closeModal()
              SFX.shield()
              addLog(`🛡️ P${victim.id} 护盾抵挡陨石`)
              updatePlayerVisuals()
              nextPlayer()
            },
          },
          {
            text: '不使用 (后退)',
            class: 'btn-red',
            action: () => {
              victim.position = Math.max(0, victim.position - 2)
              updatePlayerVisuals()
              closeModal()
              addLog(`☄️ P${victim.id} 被陨石击退 -2`)
              nextPlayer()
            },
          },
        ],
      )
    } else {
      SFX.wrong()
      victim.position = Math.max(0, victim.position - 2)
      updatePlayerVisuals()
      addLog(`☄️ P${victim.id} 被陨石击退 -2`)
      nextPlayer()
    }
  }

  // Freeze spell — keep modal only for target selection and shield decision
  function handleFreezeSpellProcess() {
    const targets = players.value.filter((p) => p.id !== currentPlayer.value)

    if (targets.length === 0) {
      addLog(`❄️ P${currentPlayer.value} 无对手可石化`)
      nextPlayer()
      return
    }

    const buttons = targets.map((p) => ({
      text: `玩家 ${p.id}`,
      class: 'btn-blue',
      action: () => {
        closeModal()
        applyFreezeSpell(p)
      },
    }))

    showModal(
      '<i class="fas fa-snowflake"></i> 选择目标',
      '获得石化术！请选择一位玩家进行石化：',
      buttons,
    )
  }

  function applyFreezeSpell(victim: Player) {
    if (victim.hasShield) {
      SFX.shield()
      showModal(
        '<i class="fas fa-shield-alt"></i> 紧急防御',
        `<strong>玩家 ${victim.id}</strong> 被石化术锁定！是否消耗护盾抵挡？`,
        [
          {
            text: '使用护盾 (抵挡)',
            class: 'btn-green',
            action: () => {
              victim.hasShield = false
              closeModal()
              SFX.shield()
              addLog(`🛡️ P${victim.id} 护盾抵挡石化术`)
              nextPlayer()
            },
          },
          {
            text: '不使用 (接受石化)',
            class: 'btn-gray',
            action: () => {
              closeModal()
              victim.frozen = true
              addLog(`💀 P${victim.id} 被石化`)
              nextPlayer()
            },
          },
        ],
      )
    } else {
      SFX.wrong()
      victim.frozen = true
      addLog(`💀 P${victim.id} 被石化`)
      nextPlayer()
    }
  }

  // executeEventEffect — no notification-only modals; effects fire immediately
  function executeEventEffect(cell: BoardCell, p: Player): void {
    switch (cell.type) {
      case 'empty':
        cell.content = 'fas fa-question'
        SFX.correct()
        addLog(`📦 P${p.id} 空宝箱`)
        nextPlayer()
        break

      case 'shield':
        SFX.shield()
        if (p.hasShield) {
          cell.eventClass = 'event-lucky'
          cell.content = 'fas fa-angle-double-right'
          addLog(`⚡ P${p.id} 魔力溢出 +2格`)
          simpleMove(2, true)
        } else {
          cell.eventClass = 'event-lucky'
          cell.content = 'fas fa-shield-alt'
          addLog(`🛡️ P${p.id} 获得护盾`)
          p.hasShield = true
          nextPlayer()
        }
        break

      case 'lucky':
        cell.eventClass = 'event-lucky'
        cell.content = 'fas fa-gem'
        SFX.correct()
        addLog(`✨ P${p.id} 幸运 +2格`)
        simpleMove(2, true)
        break

      case 'warp_win': {
        cell.eventClass = 'event-lucky'
        cell.content = 'fas fa-rocket'
        const others = players.value.filter((pl) => pl.id !== p.id)
        const avgOthers =
          others.length > 0
            ? others.reduce((s, pl) => s + pl.position, 0) / others.length
            : 0
        const blowout = others.length > 0 && p.position - avgOthers >= 8
        if (blowout) {
          SFX.correct()
          addLog(`🚀 P${p.id} 魔力受阻 +5格`)
          simpleMove(5, true)
        } else {
          SFX.win()
          addLog(`🚀 P${p.id} 传送至终点！`)
          p.position = PATH_MAP.length - 1
          updatePlayerVisuals()
          handleWin(currentPlayer.value)
        }
        break
      }

      case 'bad':
        cell.eventClass = 'event-bad'
        cell.content = 'fas fa-bomb'
        if (p.hasShield) {
          SFX.shield()
          showModal(
            '<i class="fas fa-bomb"></i> 魔法陷阱触发',
            `<strong>玩家 ${p.id}</strong> 触发了 <strong style="color:var(--ctp-red)">魔法陷阱</strong>是否消耗护盾防御？`,
            [
              {
                text: '使用护盾 (无伤)',
                class: 'btn-green',
                action: () => {
                  p.hasShield = false
                  closeModal()
                  addLog(`🛡️ P${p.id} 护盾挡陷阱`)
                  nextPlayer()
                },
              },
              {
                text: '不使用 (后退)',
                class: 'btn-red',
                action: () => {
                  p.justHitTrap = true
                  closeModal()
                  addLog(`💣 P${p.id} 触发陷阱 -2格`)
                  simpleMove(-2, true)
                },
              },
            ],
          )
        } else {
          SFX.wrong()
          addLog(`💣 P${p.id} 触发陷阱 -2格`)
          p.justHitTrap = true
          simpleMove(-2, true)
        }
        break

      case 'freeze':
        cell.eventClass = 'event-freeze'
        cell.content = 'fas fa-skull'
        if (p.hasShield) {
          SFX.shield()
          showModal(
            '<i class="fas fa-skull"></i> 石化诅咒触发',
            `<strong>玩家 ${p.id}</strong> 触发了 <strong style="color:var(--ctp-blue)">石化诅咒</strong>是否消耗护盾防御？`,
            [
              {
                text: '使用护盾 (抵挡)',
                class: 'btn-green',
                action: () => {
                  p.hasShield = false
                  closeModal()
                  addLog(`🛡️ P${p.id} 护盾挡石化`)
                  nextPlayer()
                },
              },
              {
                text: '不使用 (接受石化)',
                class: 'btn-gray',
                action: () => {
                  closeModal()
                  p.frozen = true
                  addLog(`💀 P${p.id} 被石化`)
                  nextPlayer()
                },
              },
            ],
          )
        } else {
          SFX.wrong()
          addLog(`💀 P${p.id} 被石化`)
          p.frozen = true
          nextPlayer()
        }
        break

      case 'again':
        cell.eventClass = 'event-lucky'
        if (extraTurnThisRound.value) {
          cell.content = 'fas fa-gem'
          SFX.correct()
          addLog(`✨ P${p.id} 魔力溢出(连锁) +2格`)
          simpleMove(2, true)
        } else {
          extraTurnThisRound.value = true
          cell.content = 'fas fa-bolt'
          SFX.magic()
          addLog(`⚡ P${p.id} 获得额外回合`)
          isTurnProcessing.value = false
          diceMsg.value = '获得额外回合！请再次投掷'
        }
        break

      case 'attack': {
        cell.eventClass = 'event-pvp'
        cell.content = 'fas fa-meteor'
        const others = players.value.filter(
          (pl) => pl.id !== currentPlayer.value,
        )

        if (others.length === 0) {
          addLog(`☄️ P${p.id} 无对手可攻击`)
          nextPlayer()
          break
        }

        const attackTarget = [...others].sort(
          (a, b) => b.position - a.position,
        )[0]

        addLog(`☄️ P${p.id} → P${attackTarget.id} 陨石`)
        handleSingleAttack(attackTarget)
        break
      }

      case 'freeze_spell':
        cell.eventClass = 'event-pvp'
        cell.content = 'fas fa-snowflake'
        handleFreezeSpellProcess()
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
    extraTurnThisRound.value = false
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

  function startTimer(onTimeout: () => void): void {
    if (timerInterval) clearInterval(timerInterval)
    const seconds = currentGroup.value?.timerSeconds ?? DEFAULT_TIMER_SECONDS
    timerValue.value = Math.max(1, seconds) * 1000
    isTimerActive.value = true
    timerInterval = setInterval(() => {
      timerValue.value -= 100
      if (timerValue.value <= 0) {
        timerValue.value = 0
        stopTimer()
        onTimeout()
      }
    }, 100)
  }

  function stopTimer(): void {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    isTimerActive.value = false
  }

  function closeModal(): void {
    gameModal.show = false
    stopTimer()
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
        timerSeconds: DEFAULT_TIMER_SECONDS,
      }
      questionGroups.value = [defaultGroup]
      saveData()
    }
    questionGroups.value.forEach((g) => {
      if (typeof g.timerSeconds !== 'number')
        g.timerSeconds = DEFAULT_TIMER_SECONDS
    })
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
      timerSeconds: DEFAULT_TIMER_SECONDS,
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
      difficulty: 1,
    })
  }

  function removeQuestion(index: number): void {
    if (!currentGroup.value) return
    currentGroup.value.questions.splice(index, 1)
  }

  function showImportResult(msg: string, ok: boolean): void {
    showModal(
      ok
        ? '<i class="fas fa-check-circle"></i> 导入成功'
        : '<i class="fas fa-exclamation-circle"></i> 导入失败',
      msg,
      [{ text: '确定', class: 'btn-blue', action: closeModal }],
    )
  }

  function exportGroups(): void {
    const data = JSON.stringify(questionGroups.value, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ts = new Date().toISOString().slice(0, 10)
    a.download = `millionaire-questions-${ts}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function importGroups(): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result))
          const incoming: QuestionGroup[] = Array.isArray(parsed)
            ? parsed
            : [parsed]
          let added = 0
          incoming.forEach((g) => {
            if (!g || !Array.isArray(g.questions)) return
            const newGroup: QuestionGroup = {
              id: Date.now().toString() + '_' + added,
              name: (g.name || '导入分组') + ' (导入)',
              timerSeconds: g.timerSeconds ?? DEFAULT_TIMER_SECONDS,
              questions: g.questions
                .filter((q: any) => q && typeof q.q === 'string')
                .map((q: any, i: number) => ({
                  id: Date.now().toString() + '_' + added + '_' + i,
                  q: String(q.q),
                  a: String(q.a ?? ''),
                  difficulty: Math.max(
                    1,
                    Math.min(3, Number(q.difficulty) || 1),
                  ),
                })),
            }
            questionGroups.value.push(newGroup)
            added++
          })
          if (added > 0) {
            currentGroupId.value =
              questionGroups.value[questionGroups.value.length - 1].id
            showImportResult(`成功导入 ${added} 个分组`, true)
          } else {
            showImportResult('文件格式不正确', false)
          }
        } catch (err) {
          showImportResult('解析失败：' + (err as Error).message, false)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  function handleKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return
    }
    if (showSettings.value) return

    if (chestModal.show && chestPhase.value === 'pick') {
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        e.preventDefault()
        selectChest(parseInt(e.key, 10) - 1)
      }
      return
    }

    if (gameModal.show) {
      if (e.key === 'Enter') {
        e.preventDefault()
        const btns = gameModal.buttons
        if (btns.length > 0) {
          const primary =
            btns.find((b) => b.class && b.class.includes('btn-green')) ||
            btns[btns.length - 1]
          primary.action?.()
        }
      }
      return
    }

    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault()
      rollDice()
    } else if (e.key.toLowerCase() === 'u') {
      e.preventDefault()
      undo()
    }
  }

  onMounted(() => {
    loadData()
    resetGame()
    window.addEventListener('resize', updatePlayerVisuals)
    window.addEventListener('keydown', handleKey)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKey)
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
    chestModal,
    chestPhase,
    chestReward,
    chestThemeIdx,
    selectedChest,
    selectChest,
    handleRewardContinue,
    skipChestOpening,
    showDeleteGroupConfirm,
    questionGroups,
    currentGroupId,
    currentGroup,
    resetGame,
    undo,
    canUndo,
    changePlayerCount,
    rollDice,
    getPlayerIcon,
    createGroup,
    deleteGroup,
    confirmDeleteGroup,
    addQuestion,
    removeQuestion,
    exportGroups,
    importGroups,
    soundEnabled,
    toggleSound,
    teamMode,
    toggleTeamMode,
    teamOf,
    teamColor,
    teamScores,
    isTimerActive,
    formattedTime,
    isCurrentPlayerFrozen,
    gameLog,
  }
}
