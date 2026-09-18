export interface PickResult {
  winner: string | null
  picked: string[]
}

export function pickFairWinner(
  students: string[],
  picked: string[],
  random: () => number,
): PickResult {
  if (students.length === 0) return { winner: null, picked: [] }

  let nextPicked = picked
  let unpicked = students.filter((s) => !picked.includes(s))

  if (unpicked.length === 0) {
    nextPicked = []
    unpicked = [...students]
  }

  const winner = unpicked[Math.floor(random() * unpicked.length)]
  return { winner, picked: [...nextPicked, winner] }
}
