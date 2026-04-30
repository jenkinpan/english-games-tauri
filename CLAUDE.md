# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Run Commands

- **Install**: `bun install`
- **Dev**: `bun run dev` (starts Tauri + Vite dev server)
- **Vite only**: `bun run vite:dev` (frontend only, port 1420)
- **Build**: `bun run build` (production Tauri desktop app)
- **Format**: `npx prettier --write .` (Prettier with Tailwind plugin, no semicolons, single quotes)
- **Type check**: `vue-tsc --noEmit` (TypeScript strict mode)

There is no test suite — verify changes by running the dev server and exercising the UI.

## Architecture

Tauri v2 desktop app (Rust backend) + Vue 3 frontend with Vite bundler. Version: **3.2.1**. Product name: **英语游戏中心**. App identifier: `com.englishgames.desktop`.

The Vite root is `src/` and outputs to `../dist`. The window opens at 1200×800 (min 800×600), centered, with `titleBarStyle: "Overlay"` (transparent macOS title bar + `hiddenTitle: true`).

### Frontend (`src/`)

- **`App.vue`**: Root shell — `<router-view>`, disables right-click globally, sets global font stack (Nunito → system-ui → PingFang SC / Microsoft Yahei), disables `user-select` everywhere except `<input>` and `<textarea>`. Imports Catppuccin theme. Defines `.home-container` CSS helper.
- **`main.js`**: Mounts the Vue app with the router.
- **`router/index.js`**: Hash-based routing (no server needed). 1 Home + 12 game routes.
- **`components/GameCard.vue`**: Home-screen card — `router-link` with `title`, `desc`, `path`, `tags[]` props. Tags are color-coded: Desktop = blue (ctp-blue), Tablet = peach (ctp-peach), Mobile = green (ctp-green).
- **`style.css`**: Tailwind v4 `@import 'tailwindcss'`.
- **`assets/catppuccin.css`**: Catppuccin Latte (light) / Mocha (dark) color tokens via `prefers-color-scheme`. Always use these CSS variables for color — never hardcode palette values.
- **`shims-images.d.ts`**: TypeScript module declaration for `*.png` imports.

### Catppuccin CSS Variables

All colors come from `catppuccin.css`. Common variables:
- `--bg-base`, `--bg-card` — backgrounds
- `--text-primary`, `--text-secondary` — text
- `--accent-primary`, `--accent-secondary` — accents (blue / mauve)
- `--border-color`, `--shadow-color` — borders and shadows
- `--ctp-green`, `--ctp-peach`, `--ctp-blue`, `--ctp-red`, `--ctp-yellow`, etc. — raw palette tokens

Global aliases in `App.vue`: `--accent = --accent-primary`, `--card = --bg-card`, `--bg = --bg-base`, `--text = --text-primary`.

### Tauri-Specific UI Patterns

- The top 40px of every game view has a transparent drag region: `<div class="fixed top-0 ..." data-tauri-drag-region></div>`. The rest of the view must have `[-webkit-app-region:no-drag]` to prevent accidental dragging.
- Use `@tauri-apps/plugin-dialog` (ask/message) for native dialogs instead of browser `alert/confirm`.
- Use `@tauri-apps/plugin-shell` (`open`) to open URLs externally.
- Use `@tauri-apps/plugin-os` (`platform`) for platform detection.

### Path Alias

`@/` maps to `src/`. Use it for all cross-directory imports in TypeScript files. Example: `import GameCard from '@/components/GameCard.vue'`.

## Game Views

All 12 games live in `src/views/<GameName>/`. Routes are defined in `src/router/index.js`.

| Route | Folder | Chinese Name | Tags |
|---|---|---|---|
| `/bomb` | `BombGame` | 单词炸弹 | Desktop, Tablet, Mobile |
| `/flashcard` | `FlashcardGame` | 记忆卡片 | Mobile, Tablet, Desktop |
| `/millionaire` | `MillionaireGame` | 魔法大富翁 | Desktop, Tablet |
| `/tic-tac-toe` | `TicTacToeGame` | 单词井字棋 | Mobile, Tablet, Desktop |
| `/witch-poison` | `WitchPoisonGame` | 女巫的毒药 | Desktop, Tablet |
| `/lexicon-defense` | `LexiconDefenseGame` | 词汇塔防 | Desktop |
| `/Whack-a-Mole` | `Whack-a-MoleGame` | 单词打地鼠 | Desktop, Tablet |
| `/lucky-one` | `LuckyOneGame` | 谁是幸运儿 | Mobile, Tablet, Desktop |
| `/mystery-reveal` | `MysteryRevealGame` | 看图猜单词 | Desktop, Tablet |
| `/random-name` | `RandomNameGame` | 随机点名 | Mobile, Tablet, Desktop |
| `/word-pk` | `WordPKGame` | 单词消消乐 | Mobile, Tablet |
| `/word-match` | `WordMatchGame` | 单词匹配 | Tablet, Desktop |

### Game View File Pattern

Each game folder contains:
- `index.vue` — template only; imports and calls the composable in `<script setup>`
- `script.ts` — composable exporting `use<GameName>()` with all state + logic
- `style.css` — scoped styles (optional; some games use inline Tailwind classes only)

The composable function returns all reactive refs and methods consumed by `index.vue`. The `index.vue` template destructures these directly.

### TypeScript Conventions in Scripts

- All composables use `export function use<GameName>()` as the entry point.
- Interfaces for domain types (`Card`, `WordGroup`, `Question`, etc.) are exported from `script.ts`.
- A private `LocalStorageData` interface describes the persisted shape.
- Use `ref<Type>()` generics or explicit `: Ref<Type>` annotations for clarity.
- `strict: true`, `noUnusedLocals`, `noUnusedParameters` are enforced — no unused declarations.
- Target: ES2020; module resolution: bundler mode.

### Common Composable Patterns

**Word Group Management** — BombGame, FlashcardGame, LuckyOneGame (and others) share a word-group system:
- State: `groups: Ref<WordGroup[]>`, `currentGroupId: Ref<string | null>`, `showGroupModal`, `groupNameInput`, `showDeleteConfirmModal`, `isRenaming`, `renamingGroupId`
- CRUD: `openSaveGroupModal(renameId?)`, `closeGroupModal()`, `saveGroup()`, `selectGroup(id)`, `requestDeleteGroup(id)`, `confirmDeleteGroup()`, `cancelDeleteGroup()`
- Groups are saved with the word list to localStorage; switching groups re-loads `words` and re-initializes cards.
- Deleting the last group auto-creates a default group (id = `Date.now().toString()`, name = '默认分组').

**LocalStorage Persistence** — each game has its own key:
- BombGame: `'wordBombGame'`
- FlashcardGame: `'wordMemoryCards'`
- (other games follow similar patterns; check each `script.ts`)
- Pattern: `saveToLocalStorage()` writes full state; `loadFromLocalStorage()` is called in `onMounted` with try/catch.

**Web Audio API** — most games use procedural audio (no audio files):
```ts
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

function ensureAudioContext() {
  if (audioContext.state === 'suspended') audioContext.resume()
}

function playSound(frequency, duration, type: OscillatorType = 'sine') {
  // OscillatorNode → GainNode → destination
  // Ramp gain from 0 → 0.3 → 0.001 for attack/decay envelope
}
```
- On mobile/Safari, resume the AudioContext on the first user gesture: `document.addEventListener('click', ensureAudioContext, { once: true })`.
- Call `audioContext.close()` in `onUnmounted()` to release resources.

**Scroll Lock for Modals** — when full-screen modals open, lock body scroll:
```ts
watch(showModal, (v) => { document.body.style.overflow = v ? 'hidden' : '' })
onUnmounted(() => { document.body.style.overflow = '' })
```

**DOM Manipulation** — particle/explosion effects are created directly via `document.createElement` and appended to card elements, then cleaned up with `setTimeout`.

## Backend (`src-tauri/`)

The Rust layer is intentionally minimal — **no custom Tauri commands**. It is a thin shell that registers plugins and runs:

```rust
tauri::Builder::default()
  .plugin(tauri_plugin_shell::init())
  .plugin(tauri_plugin_dialog::init())
  .plugin(tauri_plugin_fs::init())
  .setup(|app| {
    // tauri_plugin_log in debug builds only
    Ok(())
  })
  .run(tauri::generate_context!())
```

Plugins registered: `shell`, `dialog`, `fs`, `os` (os is in `Cargo.toml` but not in `lib.rs` setup — it auto-initializes). Tauri log is debug-only.

Capabilities (`src-tauri/capabilities/default.json`): `core:default`, `core:window:allow-start-dragging`, `fs:default`, `dialog:default`, `shell:allow-open`, `os:default`.

Minimum Rust version: **1.77.2**. Crate type: `staticlib + cdylib + rlib` (supports mobile targets).

## Styling Conventions

- **Tailwind v4** via `@tailwindcss/vite` plugin — use utility classes directly.
- **Class ordering** is enforced by `prettier-plugin-tailwindcss` — always run Prettier before committing.
- **Color**: always reference Catppuccin CSS variables (`text-(--accent-primary)`, `bg-(--bg-card)`) — not raw hex/palette names unless using `--ctp-*` tokens for specific palette access.
- **Responsive**: use `md:` / `lg:` breakpoints. Home grid: 1 col → `md:2` → `lg:3`.
- **Animations**: defined with `@keyframes` in `<style scoped>` blocks or Tailwind `animate-[]` arbitrary values.
- **Custom CSS** goes in the per-game `style.css` (scoped) or inline `<style>` blocks.

## Code Style

- **No semicolons**, **single quotes** (Prettier enforced).
- **No comments** unless the WHY is non-obvious. No docstrings, no `// TODO`, no change history comments.
- **`<script setup lang="ts">`** for all Vue SFCs.
- **`defineProps<{ ... }>()`** with TypeScript generics — no `withDefaults` unless defaults are needed.
- Prefer `computed()` over manual watchers for derived values.
- Use `nextTick()` when reading DOM state immediately after a reactive change.

## Home Page (`views/Home.vue`)

Inline `<script setup>` (not a separate `script.ts`). Key features:
- **Pinyin search**: `PinyinMatch.match(game.title, query)` — matches Chinese characters or pinyin initials (e.g., "zd" matches "炸弹").
- **Update check**: calls `https://api.github.com/repos/jenkinpan/english-games-tauri/releases/latest`, compares `tag_name` (strip `v` prefix) against `pkg.version` from `package.json`. Uses `ask()` dialog; on Android, finds `.apk` asset; uses `open()` for the download URL.
- **Game list** is a hardcoded array with `path`, `title`, `desc`, `tags`.

## CI/CD (`.github/workflows/`)

- **`release.yml`**: Builds macOS (dmg) + Windows (NSIS installer) on `v*` tag push. Signs with Tauri private key (`TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets).
- **`fast-android-release.yml`**: Builds signed Android APK on `v*` tag push. Targets: `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android`. Signs with Android keystore secrets (`ANDROID_KEYSTORE_FILE`, `ANDROID_KEY_ALIAS`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`). Renames output to `EnglishGames-<tag>.apk` before upload.

Both workflows use `bun install --frozen-lockfile` and `swatinem/rust-cache`.

## Adding a New Game

1. Create `src/views/<NewGame>/index.vue` and `src/views/<NewGame>/script.ts`.
2. Export `useNewGame()` from `script.ts` with all state and methods.
3. Add the route to `src/router/index.js` (import + `{ path: '/route', name: 'NewGame', component }` entry).
4. Add an entry to the `games` array in `src/views/Home.vue` with `path`, `title`, `desc`, `tags`.
5. Include the Tauri drag region div at the top of the template.
6. Use `localStorage` with a unique key for persistence.
