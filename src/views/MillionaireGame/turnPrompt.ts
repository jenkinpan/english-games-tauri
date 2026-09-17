export type ChestPhase = 'pick' | 'opening' | 'reward'

export type TurnPromptTone = 'ready' | 'active' | 'warning' | 'success'

export interface TurnPromptInput {
  currentPlayer: number
  gameActive: boolean
  isTurnProcessing: boolean
  isRolling: boolean
  isCurrentPlayerFrozen: boolean
  extraTurnThisRound: boolean
  showSettings: boolean
  showShop: boolean
  gameModalShown: boolean
  chestModalShown: boolean
  chestPhase: ChestPhase
  isTimerActive: boolean
}

export interface TurnFlowPrompt {
  icon: string
  title: string
  action: string
  detail: string
  tone: TurnPromptTone
  stepIndex: number
}

export const TURN_FLOW_STEPS = ['掷骰', '移动', '答题', '事件', '结算']

export function buildTurnFlowPrompt(input: TurnPromptInput): TurnFlowPrompt {
  if (!input.gameActive) {
    return {
      icon: 'fas fa-crown',
      title: '本局已结束',
      action: '查看结果或点击重置再来一局',
      detail: '胜负已结算，可以复盘战报或重新开始。',
      tone: 'success',
      stepIndex: 4,
    }
  }

  if (input.showSettings) {
    return {
      icon: 'fas fa-book-reader',
      title: '题库管理中',
      action: '完成设置后继续游戏',
      detail: '当前回合会保留，关闭题库后回到棋盘。',
      tone: 'active',
      stepIndex: 0,
    }
  }

  if (input.showShop) {
    return {
      icon: 'fas fa-store',
      title: `玩家 ${input.currentPlayer} 逛商店`,
      action: '购买道具或关闭商店',
      detail: '道具会影响之后的掷骰、防御或对手状态。',
      tone: 'active',
      stepIndex: 0,
    }
  }

  if (input.chestModalShown) {
    if (input.chestPhase === 'opening') {
      return {
        icon: 'fas fa-gift',
        title: '宝箱开启中',
        action: '等待动画或点击跳过',
        detail: '宝箱结果即将揭晓，随后会自动结算事件。',
        tone: 'active',
        stepIndex: 3,
      }
    }

    if (input.chestPhase === 'reward') {
      return {
        icon: 'fas fa-wand-sparkles',
        title: '查看宝箱奖励',
        action: '点击继续并结算效果',
        detail: '奖励或惩罚会写入战报，然后进入下一步。',
        tone: 'active',
        stepIndex: 3,
      }
    }

    return {
      icon: 'fas fa-gift',
      title: '命运宝箱',
      action: '选择 1 个宝箱揭晓事件',
      detail: '宝箱结果会根据局势做平衡，落后玩家更容易追赶。',
      tone: 'active',
      stepIndex: 3,
    }
  }

  if (input.gameModalShown) {
    if (input.isTimerActive) {
      return {
        icon: 'fas fa-scroll',
        title: '智慧试炼中',
        action: '答题、看答案或等待倒计时',
        detail: '答对才能触发事件，答错或超时会退回原位置。',
        tone: 'active',
        stepIndex: 2,
      }
    }

    return {
      icon: 'fas fa-hand-pointer',
      title: '等待选择',
      action: '根据弹窗完成当前事件',
      detail: '护盾、防御、目标选择或结果确认都在这里处理。',
      tone: 'active',
      stepIndex: 3,
    }
  }

  if (input.isRolling) {
    return {
      icon: 'fas fa-dice-d20',
      title: '命运转动中',
      action: '等待骰子停下',
      detail: '点数确定后，棋子会自动前进到目标格。',
      tone: 'active',
      stepIndex: 0,
    }
  }

  if (input.isTurnProcessing) {
    return {
      icon: 'fas fa-route',
      title: `玩家 ${input.currentPlayer} 行动中`,
      action: '等待移动或事件处理完成',
      detail: '当前流程尚未结束，请先看棋子移动和弹窗提示。',
      tone: 'active',
      stepIndex: 1,
    }
  }

  if (input.isCurrentPlayerFrozen) {
    return {
      icon: 'fas fa-snowflake',
      title: `玩家 ${input.currentPlayer} 被石化`,
      action: '点击骰子跳过并解除石化',
      detail: '本回合不会移动，处理后自动轮到下一位玩家。',
      tone: 'warning',
      stepIndex: 0,
    }
  }

  if (input.extraTurnThisRound) {
    return {
      icon: 'fas fa-bolt',
      title: `玩家 ${input.currentPlayer} 额外回合`,
      action: '再次点击骰子继续行动',
      detail: '额外回合只会触发一次，避免无限连锁。',
      tone: 'ready',
      stepIndex: 0,
    }
  }

  return {
    icon: 'fas fa-dice-d20',
    title: `玩家 ${input.currentPlayer} 的回合`,
    action: '点击骰子开始行动',
    detail: '掷骰后先移动，再答题；答对才会触发格子事件。',
    tone: 'ready',
    stepIndex: 0,
  }
}
