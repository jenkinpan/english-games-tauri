export interface Card {
  word: string
  flipped: boolean
  type: 'score' | 'bomb'
  value: number | null
}

export function clampBombCount(bombCount: number, wordCount: number): number {
  return Math.min(Math.max(bombCount, 1), Math.max(1, wordCount - 1))
}

export function buildCards(
  words: string[],
  bombCount: number,
  random: () => number,
): Card[] {
  if (words.length === 0) return []

  const count = clampBombCount(bombCount, words.length)
  const bombIndices = new Set<number>()
  while (bombIndices.size < count) {
    bombIndices.add(Math.floor(random() * words.length))
  }

  return words.map(
    (word, i): Card =>
      bombIndices.has(i)
        ? { word, flipped: false, type: 'bomb', value: null }
        : {
            word,
            flipped: false,
            type: 'score',
            value: Math.floor(random() * 3) + 1,
          },
  )
}
