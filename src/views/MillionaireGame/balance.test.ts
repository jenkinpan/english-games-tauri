import test from 'node:test'
import assert from 'node:assert/strict'

import { coinsForAnswer } from './balance.ts'

test('coinsForAnswer: 难度1-3 分别得 3/6/9 金币', () => {
  assert.equal(coinsForAnswer(10), 3)
  assert.equal(coinsForAnswer(20), 6)
  assert.equal(coinsForAnswer(30), 9)
})
