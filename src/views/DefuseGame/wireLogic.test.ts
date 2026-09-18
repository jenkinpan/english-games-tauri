import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeWords,
  buildWires,
  WIRE_COUNT,
  BOMB_BY_DIFFICULTY,
  WIRE_COLORS,
} from './wireLogic.ts'

function seq(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

test('normalizeWords: 补齐到 9 个词', () => {
  assert.deepEqual(normalizeWords(['a', 'b']), [
    'a',
    'b',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ])
})

test('normalizeWords: 超过 9 个时截断', () => {
  const many = Array.from({ length: 12 }, (_, i) => `w${i}`)
  assert.equal(normalizeWords(many).length, WIRE_COUNT)
  assert.deepEqual(normalizeWords(many), many.slice(0, WIRE_COUNT))
})

test('normalizeWords: 非数组或空值兜底', () => {
  assert.deepEqual(normalizeWords(null), Array(WIRE_COUNT).fill(''))
  assert.deepEqual(normalizeWords([null, undefined, 5]), [
    '',
    '',
    '5',
    '',
    '',
    '',
    '',
    '',
    '',
  ])
})

test('BOMB_BY_DIFFICULTY: 三档难度炸弹数递增', () => {
  assert.equal(BOMB_BY_DIFFICULTY.easy, 2)
  assert.equal(BOMB_BY_DIFFICULTY.normal, 3)
  assert.equal(BOMB_BY_DIFFICULTY.hard, 4)
})

test('buildWires: 空词表返回空数组', () => {
  assert.deepEqual(buildWires([], 3, Math.random), [])
})

test('buildWires: 炸弹数量与难度一致，全部未剪', () => {
  const words = Array.from({ length: 9 }, (_, i) => `w${i}`)
  const wires = buildWires(words, BOMB_BY_DIFFICULTY.normal, Math.random)
  const bombs = wires.filter((w) => w.isBomb)
  assert.equal(bombs.length, 3)
  assert.equal(wires.length, WIRE_COUNT)
  for (const wire of wires) {
    assert.equal(wire.state, 'intact')
  }
})

test('buildWires: 颜色按 WIRE_COLORS 循环', () => {
  const words = Array.from({ length: 9 }, (_, i) => `w${i}`)
  const wires = buildWires(words, 2, Math.random)
  wires.forEach((wire, i) => {
    assert.equal(wire.color, WIRE_COLORS[i % WIRE_COLORS.length])
  })
})

test('buildWires: 注入固定随机序列时炸弹落点确定', () => {
  const words = Array.from({ length: 9 }, (_, i) => `w${i}`)
  const wires = buildWires(words, 2, seq([0, 0.5]))

  assert.equal(wires[0].isBomb, true)
  assert.equal(wires[4].isBomb, true)
  assert.equal(wires[1].isBomb, false)
  assert.equal(wires[8].isBomb, false)
})
