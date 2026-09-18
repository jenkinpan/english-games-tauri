import test from 'node:test'
import assert from 'node:assert/strict'

import { checkWin } from './winLogic.ts'

function board(marks: Record<number, string>): (string | null)[] {
  return Array.from({ length: 9 }, (_, i) => marks[i] ?? null)
}

test('checkWin: 三行分别获胜', () => {
  assert.deepEqual(
    checkWin(board({ 0: 'white', 1: 'white', 2: 'white' })),
    [0, 1, 2],
  )
  assert.deepEqual(
    checkWin(board({ 3: 'black', 4: 'black', 5: 'black' })),
    [3, 4, 5],
  )
  assert.deepEqual(
    checkWin(board({ 6: 'white', 7: 'white', 8: 'white' })),
    [6, 7, 8],
  )
})

test('checkWin: 三列分别获胜', () => {
  assert.deepEqual(
    checkWin(board({ 0: 'white', 3: 'white', 6: 'white' })),
    [0, 3, 6],
  )
  assert.deepEqual(
    checkWin(board({ 1: 'black', 4: 'black', 7: 'black' })),
    [1, 4, 7],
  )
  assert.deepEqual(
    checkWin(board({ 2: 'white', 5: 'white', 8: 'white' })),
    [2, 5, 8],
  )
})

test('checkWin: 两条对角线获胜', () => {
  assert.deepEqual(
    checkWin(board({ 0: 'white', 4: 'white', 8: 'white' })),
    [0, 4, 8],
  )
  assert.deepEqual(
    checkWin(board({ 2: 'black', 4: 'black', 6: 'black' })),
    [2, 4, 6],
  )
})

test('checkWin: 无胜者时返回 null', () => {
  assert.equal(checkWin(board({ 0: 'white', 1: 'black', 2: 'white' })), null)
})

test('checkWin: 含空格的棋盘不判胜', () => {
  assert.equal(
    checkWin(board({ 0: 'white', 1: 'white', 3: 'black', 4: 'black' })),
    null,
  )
  assert.equal(checkWin(board({})), null)
})

test('checkWin: 满盘无连线返回 null', () => {
  assert.equal(
    checkWin(
      board({
        0: 'white',
        1: 'black',
        2: 'white',
        3: 'white',
        4: 'black',
        5: 'white',
        6: 'black',
        7: 'white',
        8: 'black',
      }),
    ),
    null,
  )
})
