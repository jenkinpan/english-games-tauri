import test from 'node:test'
import assert from 'node:assert/strict'

import { clampBombCount, buildCards } from './bombLogic.ts'

function seq(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

test('clampBombCount: 小于 1 时钳到 1', () => {
  assert.equal(clampBombCount(0, 10), 1)
  assert.equal(clampBombCount(-3, 10), 1)
})

test('clampBombCount: 超过词数上限时钳到 wordCount-1', () => {
  assert.equal(clampBombCount(99, 10), 9)
  assert.equal(clampBombCount(10, 10), 9)
})

test('clampBombCount: 范围内保持不变', () => {
  assert.equal(clampBombCount(1, 10), 1)
  assert.equal(clampBombCount(5, 10), 5)
})

test('clampBombCount: 单词很少时上限至少为 1', () => {
  assert.equal(clampBombCount(5, 1), 1)
  assert.equal(clampBombCount(5, 0), 1)
})

test('buildCards: 空词表返回空数组', () => {
  assert.deepEqual(buildCards([], 3, Math.random), [])
})

test('buildCards: 炸弹数量等于钳制后的数量', () => {
  const words = ['a', 'b', 'c', 'd', 'e']
  const cards = buildCards(words, 2, Math.random)
  const bombs = cards.filter((c) => c.type === 'bomb')
  assert.equal(bombs.length, 2)
  assert.equal(cards.length, 5)
})

test('buildCards: 炸弹 value=null，分数牌 value∈[1,3]，全部未翻开', () => {
  const words = ['a', 'b', 'c', 'd', 'e']
  const cards = buildCards(words, 2, Math.random)
  for (const card of cards) {
    assert.equal(card.flipped, false)
    if (card.type === 'bomb') {
      assert.equal(card.value, null)
    } else {
      assert.ok(card.value! >= 1 && card.value! <= 3)
    }
  }
})

test('buildCards: 注入固定随机序列时落点确定', () => {
  const words = ['a', 'b', 'c', 'd', 'e']
  const cards = buildCards(words, 2, seq([0, 0.4]))

  assert.equal(cards[0].type, 'bomb')
  assert.equal(cards[0].value, null)
  assert.equal(cards[2].type, 'bomb')
  assert.equal(cards[2].value, null)

  assert.equal(cards[1].type, 'score')
  assert.equal(cards[1].value, 1)
  assert.equal(cards[3].type, 'score')
  assert.equal(cards[3].value, 2)
  assert.equal(cards[4].type, 'score')
  assert.equal(cards[4].value, 1)
})
