export function coinsForAnswer(scoreDelta: number): number {
  return Math.round(scoreDelta * 0.3)
}

export function computeWarpTarget(
  position: number,
  othersPositions: number[],
  endIdx: number,
): number {
  const lastSafe = endIdx - 1
  const leader =
    othersPositions.length > 0 ? Math.max(...othersPositions) : position

  const raw = position < leader - 2 ? leader + 1 : position + 5

  return Math.min(raw, lastSafe)
}
