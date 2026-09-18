import test from 'node:test'
import assert from 'node:assert/strict'

import { clampLuckyCount, buildCards } from './luckyLogic.ts'

function seq(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

test('clampLuckyCount: 小于 1 时钳到 1', () => {
  assert.equal(clampLuckyCount(0, 10), 1)
  assert.equal(clampLuckyCount(-2, 10), 1)
})

test('clampLuckyCount: 超过词数时钳到 wordCount', () => {
  assert.equal(clampLuckyCount(99, 10), 10)
  assert.equal(clampLuckyCount(11, 10), 10)
})

test('clampLuckyCount: 范围内保持不变', () => {
  assert.equal(clampLuckyCount(1, 10), 1)
  assert.equal(clampLuckyCount(10, 10), 10)
})

test('clampLuckyCount: 空词表时钳到 1', () => {
  assert.equal(clampLuckyCount(5, 0), 1)
})

test('buildCards: 空词表返回空数组', () => {
  assert.deepEqual(buildCards([], 3, Math.random), [])
})

test('buildCards: 幸运牌数量等于钳制后的数量', () => {
  const words = ['a', 'b', 'c', 'd', 'e']
  const cards = buildCards(words, 2, Math.random)
  const lucky = cards.filter((c) => c.type === 'lucky')
  assert.equal(lucky.length, 2)
  assert.equal(cards.length, 5)
})

test('buildCards: 幸运牌 value∈[1,5]，空牌 value=null，全部未翻开', () => {
  const words = ['a', 'b', 'c', 'd', 'e']
  const cards = buildCards(words, 2, Math.random)
  for (const card of cards) {
    assert.equal(card.flipped, false)
    if (card.type === 'lucky') {
      assert.ok(card.value! >= 1 && card.value! <= 5)
    } else {
      assert.equal(card.value, null)
    }
  }
})

test('buildCards: 注入固定随机序列时落点与分值确定', () => {
  const words = ['a', 'b', 'c', 'd', 'e']
  const cards = buildCards(words, 2, seq([0, 0.4]))

  assert.equal(cards[0].type, 'lucky')
  assert.equal(cards[0].value, 1)
  assert.equal(cards[2].type, 'lucky')
  assert.equal(cards[2].value, 3)

  assert.equal(cards[1].type, 'empty')
  assert.equal(cards[1].value, null)
  assert.equal(cards[3].type, 'empty')
  assert.equal(cards[3].value, null)
})
