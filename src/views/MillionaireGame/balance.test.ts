import test from 'node:test'
import assert from 'node:assert/strict'

import { coinsForAnswer, computeWarpTarget } from './balance.ts'

test('coinsForAnswer: 难度1-3 分别得 3/6/9 金币', () => {
  assert.equal(coinsForAnswer(10), 3)
  assert.equal(coinsForAnswer(20), 6)
  assert.equal(coinsForAnswer(30), 9)
})

test('computeWarpTarget: 领先时前进 5 格', () => {
  assert.equal(computeWarpTarget(30, [20, 25], 48), 35)
})

test('computeWarpTarget: 并列领先时前进 5 格', () => {
  assert.equal(computeWarpTarget(30, [30, 20], 48), 35)
})

test('computeWarpTarget: 明显落后(差>2)时反超领先者 1 格', () => {
  assert.equal(computeWarpTarget(10, [20, 15], 48), 21)
})

test('computeWarpTarget: 落后 1~2 格时前进 5 格', () => {
  assert.equal(computeWarpTarget(18, [20, 15], 48), 23)
  assert.equal(computeWarpTarget(19, [20, 15], 48), 24)
})

test('computeWarpTarget: 目标不超过终点前一格', () => {
  assert.equal(computeWarpTarget(10, [46, 40], 48), 47)
  assert.equal(computeWarpTarget(45, [40, 30], 48), 47)
})

test('computeWarpTarget: 无对手时前进 5 格', () => {
  assert.equal(computeWarpTarget(20, [], 48), 25)
})
