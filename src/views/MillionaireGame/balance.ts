export function coinsForAnswer(scoreDelta: number): number {
  return Math.round(scoreDelta * 0.3)
}
