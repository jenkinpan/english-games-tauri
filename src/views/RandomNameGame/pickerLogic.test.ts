import test from 'node:test'
import assert from 'node:assert/strict'

import { pickFairWinner } from './pickerLogic.ts'

test('pickFairWinner: 从未点过的学生中选，并把胜者记入已点名单', () => {
  const result = pickFairWinner(['a', 'b', 'c'], [], () => 0.5)
  assert.equal(result.winner, 'b')
  assert.deepEqual(result.picked, ['b'])
})

test('pickFairWinner: 跳过已点过的学生', () => {
  const result = pickFairWinner(['a', 'b', 'c'], ['a'], () => 0.5)
  assert.equal(result.winner, 'c')
  assert.deepEqual(result.picked, ['a', 'c'])
})

test('pickFairWinner: 全部点过后重置，开启新一轮', () => {
  const result = pickFairWinner(['a', 'b'], ['a', 'b'], () => 0)
  assert.equal(result.winner, 'a')
  assert.deepEqual(result.picked, ['a'])
})

test('pickFairWinner: 空学生列表返回 null', () => {
  const result = pickFairWinner([], [], () => 0.5)
  assert.equal(result.winner, null)
  assert.deepEqual(result.picked, [])
})

test('pickFairWinner: 首轮随机索引取整落点确定', () => {
  const result = pickFairWinner(['a', 'b', 'c', 'd'], [], () => 0.99)
  assert.equal(result.winner, 'd')
})
