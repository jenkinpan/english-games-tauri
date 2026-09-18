export interface Card {
  word: string
  flipped: boolean
  type: 'lucky' | 'empty'
  value: number | null
}

export function clampLuckyCount(luckyCount: number, wordCount: number): number {
  return Math.min(Math.max(luckyCount, 1), Math.max(1, wordCount))
}

export function buildCards(
  words: string[],
  luckyCount: number,
  random: () => number,
): Card[] {
  if (words.length === 0) return []

  const count = clampLuckyCount(luckyCount, words.length)
  const luckyIndices = new Set<number>()
  while (luckyIndices.size < count) {
    luckyIndices.add(Math.floor(random() * words.length))
  }

  return words.map(
    (word, i): Card =>
      luckyIndices.has(i)
        ? {
            word,
            flipped: false,
            type: 'lucky',
            value: Math.floor(random() * 5) + 1,
          }
        : { word, flipped: false, type: 'empty', value: null },
  )
}
