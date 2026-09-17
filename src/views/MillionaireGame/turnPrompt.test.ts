import test from 'node:test'
import assert from 'node:assert/strict'

import { buildTurnFlowPrompt } from './turnPrompt.ts'

test('prompts the active player to roll when the turn is idle', () => {
  const prompt = buildTurnFlowPrompt({
    currentPlayer: 2,
    gameActive: true,
    isTurnProcessing: false,
    isRolling: false,
    isCurrentPlayerFrozen: false,
    extraTurnThisRound: false,
    showSettings: false,
    showShop: false,
    gameModalShown: false,
    chestModalShown: false,
    chestPhase: 'pick',
    isTimerActive: false,
  })

  assert.equal(prompt.title, '玩家 2 的回合')
  assert.equal(prompt.action, '点击骰子开始行动')
  assert.equal(prompt.stepIndex, 0)
})

test('explains that a frozen player will skip after rolling', () => {
  const prompt = buildTurnFlowPrompt({
    currentPlayer: 1,
    gameActive: true,
    isTurnProcessing: false,
    isRolling: false,
    isCurrentPlayerFrozen: true,
    extraTurnThisRound: false,
    showSettings: false,
    showShop: false,
    gameModalShown: false,
    chestModalShown: false,
    chestPhase: 'pick',
    isTimerActive: false,
  })

  assert.equal(prompt.title, '玩家 1 被石化')
  assert.equal(prompt.action, '点击骰子跳过并解除石化')
  assert.equal(prompt.tone, 'warning')
})

test('shows question guidance while a timed modal is active', () => {
  const prompt = buildTurnFlowPrompt({
    currentPlayer: 3,
    gameActive: true,
    isTurnProcessing: true,
    isRolling: false,
    isCurrentPlayerFrozen: false,
    extraTurnThisRound: false,
    showSettings: false,
    showShop: false,
    gameModalShown: true,
    chestModalShown: false,
    chestPhase: 'pick',
    isTimerActive: true,
  })

  assert.equal(prompt.title, '智慧试炼中')
  assert.equal(prompt.action, '答题、看答案或等待倒计时')
  assert.equal(prompt.stepIndex, 2)
})

test('tracks the chest selection phase', () => {
  const prompt = buildTurnFlowPrompt({
    currentPlayer: 4,
    gameActive: true,
    isTurnProcessing: true,
    isRolling: false,
    isCurrentPlayerFrozen: false,
    extraTurnThisRound: false,
    showSettings: false,
    showShop: false,
    gameModalShown: false,
    chestModalShown: true,
    chestPhase: 'pick',
    isTimerActive: false,
  })

  assert.equal(prompt.title, '命运宝箱')
  assert.equal(prompt.action, '选择 1 个宝箱揭晓事件')
  assert.equal(prompt.stepIndex, 3)
})

test('shows completion guidance after the game ends', () => {
  const prompt = buildTurnFlowPrompt({
    currentPlayer: 1,
    gameActive: false,
    isTurnProcessing: false,
    isRolling: false,
    isCurrentPlayerFrozen: false,
    extraTurnThisRound: false,
    showSettings: false,
    showShop: false,
    gameModalShown: false,
    chestModalShown: false,
    chestPhase: 'pick',
    isTimerActive: false,
  })

  assert.equal(prompt.title, '本局已结束')
  assert.equal(prompt.action, '查看结果或点击重置再来一局')
  assert.equal(prompt.stepIndex, 4)
})
