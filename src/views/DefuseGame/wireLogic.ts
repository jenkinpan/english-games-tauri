export type Difficulty = 'easy' | 'normal' | 'hard'
export type WireState = 'intact' | 'cut' | 'detonated'

export interface Wire {
  word: string
  state: WireState
  isBomb: boolean
  color: string
}

export const WIRE_COUNT = 9
export const MAX_HEARTS = 3
export const BOMB_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 2,
  normal: 3,
  hard: 4,
}
export const WIRE_COLORS = [
  '--ctp-red',
  '--ctp-peach',
  '--ctp-yellow',
  '--ctp-green',
  '--ctp-teal',
  '--ctp-sky',
  '--ctp-blue',
  '--ctp-mauve',
  '--ctp-pink',
]

export function normalizeWords(arr: unknown): string[] {
  const base = Array.isArray(arr) ? arr.map((w) => String(w ?? '')) : []
  const out = base.slice(0, WIRE_COUNT)
  while (out.length < WIRE_COUNT) out.push('')
  return out
}

export function buildWires(
  words: string[],
  bombCount: number,
  random: () => number,
): Wire[] {
  if (words.length === 0) return []

  const count = Math.min(Math.max(bombCount, 0), words.length)
  const bombIndices = new Set<number>()
  while (bombIndices.size < count) {
    bombIndices.add(Math.floor(random() * words.length))
  }

  return words.map(
    (word, i): Wire => ({
      word,
      state: 'intact',
      isBomb: bombIndices.has(i),
      color: WIRE_COLORS[i % WIRE_COLORS.length],
    }),
  )
}
