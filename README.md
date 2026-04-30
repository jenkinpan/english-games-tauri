# English Interactive Games Hub

> A collection of interactive English-learning games built with Tauri v2 + Vue 3.

[中文文档](./README_CN.md)

---

## Games

| Game | Description |
|---|---|
| **Millionaire** 魔法大富翁 | Up to 4-player local board game. Roll a 3D die, land on event squares (treasures, traps, portals, shields), and answer vocabulary questions to open chests and advance. |
| **Bomb** 单词炸弹 | Flip cards one by one and read each English word aloud to score points — but hidden bombs end the round instantly. |
| **Flashcard** 记忆卡片 | 60-second flip-card memory game. Words are shuffled face-down; flip and recall as many as you can before time runs out. |
| **Tic Tac Toe** 单词井字棋 | Two-player tic-tac-toe where each cell is locked behind a vocabulary challenge. Claim the cell only after reading or translating the word correctly. |
| **Witch Poison** 女巫的毒药 | Two teams secretly poison a word, then take turns reading from the list. Say the poisoned word and your team loses. |
| **Lexicon Defense** 词汇塔防 | Tower-defense typing game. Enemies march toward your wall; type the correct English spelling from the Chinese clue within 18 seconds to defeat them. |
| **Whack-a-Mole** 单词打地鼠 | Word pairs pop out of holes. Tap the correct English or Chinese word as fast as possible; accuracy affects your score. |
| **Lucky One** 谁是幸运儿 | Hidden lucky-card hunt. Read each word aloud when flipping — find the lucky card to win. |
| **Mystery Reveal** 看图猜单词 | Type English words to uncover a hidden image tile by tile. Every correct answer removes one more mask. |
| **Random Name** 随机点名 | Classroom roll-call tool. Names spin on a rotating sphere and land on a random student. |
| **Word PK** 单词消消乐 | Two-player speed match. Each player has their own set of English–Chinese card pairs; first to clear all pairs wins. |
| **Word Match** 单词匹配 | Drag-and-drop classification game. Sort shuffled word cards into the correct category buckets. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 |
| Frontend | Vue 3 + Vite |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + Catppuccin theme |
| Icons | Font Awesome 7 |
| Pinyin search | pinyin-match |
| Package manager | Bun |

---

## Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- [Rust](https://rustup.rs/) >= 1.77.2
- Tauri v2 system dependencies — see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

---

## Getting Started

```bash
# Install dependencies
bun install

# Start the Tauri dev server (Rust + Vite hot-reload)
bun run dev

# Frontend only (no Tauri, runs on http://localhost:1420)
bun run vite:dev
```

---

## Building

```bash
# Production desktop build (outputs to src-tauri/target/release/bundle/)
bun run build
```

Targets bundled: **macOS** (.dmg + .app), **Windows** (NSIS installer).

---

## Releases

Pre-built binaries are published automatically when a `v*` tag is pushed:

- **Desktop** (macOS dmg, Windows NSIS) — via `.github/workflows/release.yml`
- **Android APK** (signed universal APK) — via `.github/workflows/fast-android-release.yml`

Download the latest release from the [Releases page](https://github.com/jenkinpan/english-games-tauri/releases).

---

## License

MIT
