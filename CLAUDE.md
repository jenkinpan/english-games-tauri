# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Run Commands

- **Install**: `bun install`
- **Dev**: `bun run dev` (starts Tauri + Vite dev server)
- **Vite only**: `bun run vite:dev` (frontend only, port 1420)
- **Build**: `bun run build` (production Tauri desktop app)
- **Format**: `npx prettier --write .` (Prettier with Tailwind plugin, no semicolons, single quotes)
- **Type check**: `vue-tsc --noEmit` (TypeScript strict mode)
- **Test**: `bun test` (Node built-in `node:test` runner; covers pure-function modules, e.g. `MillionaireGame`)

UI-level behavior is verified by running the dev server and exercising the UI; logic-level behavior is covered by `bun test`.

## Architecture

Tauri v2 desktop app (Rust backend) + Vue 3 frontend with Vite bundler. Version: **3.6.0**. Product name: **英语游戏中心**. App identifier: `com.jenkinpan.englishgames`.

The Vite root is `src/` (entry `src/index.html`) and outputs to `../dist`. The window opens at 1200×800, centered. Window config is split per platform: `tauri.conf.json` holds the shared base (size, center, `withGlobalTauri: true`), while `tauri.macos.conf.json` adds `minWidth/minHeight` 800×600 and `titleBarStyle: "Overlay"` + `hiddenTitle: true` (transparent macOS title bar); `tauri.windows.conf.json` / `tauri.linux.conf.json` set min size without the overlay bar; `tauri.android.conf.json` (`minSdkVersion 24`) and `tauri.ios.conf.json` (`minimumSystemVersion 14.0`) cover mobile.

Design docs and implementation plans live in `docs/` (`docs/specs/` for feature specs, `docs/superpowers/` for plans and designs).

### Frontend (`src/`)

- **`App.vue`**: Root shell — `<router-view>`, disables right-click globally (desktop only), sets global font stack (Nunito → system-ui → PingFang SC / Microsoft Yahei), disables `user-select` everywhere except `<input>`, `<textarea>`, and `[contenteditable]`, and syncs the `--titlebar-h` CSS variable from `useDevice().isOverlayTitleBar`. Imports Catppuccin theme. Defines `.home-container` CSS helper and safe-area CSS vars (`--safe-top/right/bottom/left`).
- **`main.js`**: Mounts the Vue app with the router; also imports Font Awesome (`@fortawesome/fontawesome-free/css/all.min.css`), used via `fas` icon classes across the UI.
- **`router/index.js`**: Hash-based routing (no server needed). 1 Home + 15 game routes. **All route components are imported eagerly** (static `import`, not lazy `() => import()`), so every game's non-scoped `style.css` is injected globally at app startup — see the CSS namespacing rule below.
- **`components/GameCard.vue`**: Home-screen card — `router-link` with `title`, `desc`, `path`, `tags[]` props. Tags are color-coded: Desktop = blue (ctp-blue), Tablet = peach (ctp-peach), Mobile = green (ctp-green).
- **`components/DragBar.vue`**: Shared titlebar component — renders the transparent drag region (`data-tauri-drag-region`, top 40px) when `useDevice().isOverlayTitleBar` (macOS desktop ≥768px), or a safe-area spacer on mobile OS. Prefer this over hand-writing the drag div.
- **`components/BackHomeButton.vue`**: "返回首页" button — `variant` `floating` (fixed bottom-right circle) or `inline`.
- **`composables/useDevice.ts`**: Device/platform detection (window size + `platform()` from plugin-os + touch support). Exposes `isMobile/isTablet/isDesktop`, `isIOS/isAndroid/isMacOS/isWindows/isLinux`, `isOverlayTitleBar`, and `deviceTag` (`'Mobile' | 'Tablet' | 'Desktop'`) used by Home to filter games by device.
- **`composables/useSpeech.ts`**: English TTS via Web Speech `speechSynthesis`, with a 有道在线发音 (`dict.youdao.com/dictvoice`) fallback when speech synthesis is unavailable (e.g. Android WebView). Exposes `speak/cancel/isSpeaking/isSupported`.
- **`style.css`**: Tailwind v4 `@import 'tailwindcss'`, a `@theme` block mapping Catppuccin tokens to Tailwind utilities (`--color-ctp-*`), and the `scrollbar-none` utility. Also imports `catppuccin.css`.
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

- The transparent drag region is provided by the shared `DragBar` component (top 40px on macOS desktop, safe-area spacer on mobile). The rest of the view must have `[-webkit-app-region:no-drag]` to prevent accidental dragging.
- Use `@tauri-apps/plugin-dialog` (ask/message) for native dialogs instead of browser `alert/confirm`.
- Use `@tauri-apps/plugin-shell` (`open`) to open URLs externally.
- Use `@tauri-apps/plugin-os` (`platform`) for platform detection.

### Path Alias

`@/` maps to `src/`. Use it for all cross-directory imports in TypeScript files. Example: `import GameCard from '@/components/GameCard.vue'`.

## Game Views

All 15 games live in `src/views/<GameName>/`. Routes are defined in `src/router/index.js`.

| Route              | Folder               | Chinese Name | Tags                    |
| ------------------ | -------------------- | ------------ | ----------------------- |
| `/bomb`            | `BombGame`           | 单词炸弹     | Mobile, Tablet, Desktop |
| `/flashcard`       | `FlashcardGame`      | 记忆卡片     | Mobile, Tablet, Desktop |
| `/millionaire`     | `MillionaireGame`    | 魔法大富翁   | Tablet, Desktop         |
| `/tic-tac-toe`     | `TicTacToeGame`      | 单词井字棋   | Mobile, Tablet, Desktop |
| `/witch-poison`    | `WitchPoisonGame`    | 女巫的毒药   | Mobile, Tablet, Desktop |
| `/lexicon-defense` | `LexiconDefenseGame` | 词汇塔防     | Tablet, Desktop         |
| `/Whack-a-Mole`    | `Whack-a-MoleGame`   | 单词打地鼠   | Mobile, Tablet, Desktop |
| `/lucky-one`       | `LuckyOneGame`       | 谁是幸运儿   | Mobile, Tablet, Desktop |
| `/mystery-reveal`  | `MysteryRevealGame`  | 看图猜单词   | Mobile, Tablet, Desktop |
| `/random-name`     | `RandomNameGame`     | 随机点名     | Mobile, Tablet, Desktop |
| `/word-pk`         | `WordPKGame`         | 单词消消乐   | Mobile, Tablet, Desktop |
| `/word-match`      | `WordMatchGame`      | 单词匹配     | Mobile, Tablet, Desktop |
| `/bubble-pop`      | `BubblePop`          | 气泡消消乐   | Mobile, Tablet, Desktop |
| `/defuse`          | `DefuseGame`         | 拆弹专家     | Mobile, Tablet, Desktop |
| `/listen-pick`     | `ListenPickGame`     | 听音辨词     | Mobile, Tablet, Desktop |

### Game View File Pattern

Each game folder contains:

- `index.vue` — template only; imports and calls the composable in `<script setup>`
- `script.ts` — composable exporting `use<GameName>()` with all state + logic
- `style.css` — scoped styles (optional; some games use inline Tailwind classes only)

The composable function returns all reactive refs and methods consumed by `index.vue`. The `index.vue` template destructures these directly.

Exceptions: `MillionaireGame` also ships pure-function modules (`balance.ts`, `turnPrompt.ts`) with matching `node:test` suites (`*.test.ts`); `DefuseGame` splits shared word-group UI into `WordManagerModals.vue`.

### TypeScript Conventions in Scripts

- All composables use `export function use<GameName>()` as the entry point.
- Interfaces for domain types (`Card`, `WordGroup`, `Question`, etc.) are exported from `script.ts`.
- A private `LocalStorageData` interface describes the persisted shape.
- Use `ref<Type>()` generics or explicit `: Ref<Type>` annotations for clarity.
- `strict: true`, `noUnusedLocals`, `noUnusedParameters` are enforced — no unused declarations.
- Target: ES2020; module resolution: bundler mode.
- Extract pure logic into separate `.ts` modules and cover it with `node:test` suites run via `bun test` (see `MillionaireGame`).

### Common Composable Patterns

**Word Group Management** — BombGame, FlashcardGame, LuckyOneGame, ListenPickGame (and others) share a word-group system:

- State: `groups: Ref<WordGroup[]>`, `currentGroupId: Ref<string | null>`, `showGroupModal`, `groupNameInput`, `showDeleteConfirmModal`, `isRenaming`, `renamingGroupId`
- CRUD: `openSaveGroupModal(renameId?)`, `closeGroupModal()`, `saveGroup()`, `selectGroup(id)`, `requestDeleteGroup(id)`, `confirmDeleteGroup()`, `cancelDeleteGroup()`
- Groups are saved with the word list to localStorage; switching groups re-loads `words` and re-initializes cards.
- Deleting the last group auto-creates a default group (id = `Date.now().toString()`, name = '默认分组').

**LocalStorage Persistence** — each game has its own key:

- BombGame: `'wordBombGame'`
- FlashcardGame: `'wordMemoryCards'`
- ListenPickGame: `'listenPickGame'`
- (other games follow similar patterns; check each `script.ts`)
- Pattern: `saveToLocalStorage()` writes full state; `loadFromLocalStorage()` is called in `onMounted` with try/catch.

**Web Audio API** — most games use procedural audio (no audio files):

```ts
const audioContext = new (
  window.AudioContext || (window as any).webkitAudioContext
)()

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
watch(showModal, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})
onUnmounted(() => {
  document.body.style.overflow = ''
})
```

**DOM Manipulation** — particle/explosion effects are created directly via `document.createElement` and appended to card elements, then cleaned up with `setTimeout`.

## Backend (`src-tauri/`)

The Rust layer is intentionally minimal — **no custom Tauri commands**. It registers plugins and has two entry points:

- **`main.rs`** (desktop): builds the app, registers `os`, `shell`, `dialog`, `fs`, and auto-opens DevTools in debug builds.
- **`lib.rs`** (`run()`): mobile entry point (`#[cfg_attr(mobile, tauri::mobile_entry_point)]`); registers `shell`, `dialog`, `fs`, `os`, and adds `tauri_plugin_log` (level `Info`) in debug builds only.

Plugins registered (in `Cargo.toml` + `.init()`): `shell`, `dialog`, `fs`, `os`, `log` (log is debug-only).

Capabilities (`src-tauri/capabilities/default.json`): `core:default`, `core:window:allow-start-dragging`, `fs:default`, `dialog:default`, `shell:allow-open`, `os:default`.

Minimum Rust version: **1.77.2**. Crate type: `staticlib + cdylib + rlib` (supports mobile targets).

## Styling Conventions

- **Tailwind v4** via `@tailwindcss/vite` plugin — use utility classes directly.
- **Class ordering** is enforced by `prettier-plugin-tailwindcss` — always run Prettier before committing.
- **Color**: always reference Catppuccin CSS variables (`text-(--accent-primary)`, `bg-(--bg-card)`) — not raw hex/palette names unless using `--ctp-*` tokens for specific palette access.
- **Responsive**: use `md:` / `lg:` breakpoints. Home grid: 1 col → `md:2` → `lg:3`.
- **Animations**: defined with `@keyframes` in `<style scoped>` blocks or Tailwind `animate-[]` arbitrary values.
- **Custom CSS** goes in the per-game `style.css` (scoped) or inline `<style>` blocks.
- **Namespace every game's `style.css` under a root wrapper class** (`.word-pk-game`, `.word-match-game-container`, `.bubble-pop-game`, …) and write all rules as descendants of it. Because the router imports all game components eagerly, every non-scoped `style.css` is injected globally at startup, so an un-namespaced rule (e.g. `.game-header { position: fixed }`) leaks into and breaks other games. Use a wrapper class rather than Vue's `scoped` attribute when the component creates DOM nodes via JavaScript — `scoped` data-attributes are not added to JS-created nodes.
- When an element's rendered layout contradicts its source CSS, suspect cross-game leakage: read the **computed** style in the browser (CDP / DevTools) to find the real source file rather than grepping the component's own stylesheet.

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
- **Device filtering**: `useDevice().deviceTag` filters the grid to games tagged for the current device (`Mobile`/`Tablet`/`Desktop`); a banner shows the hidden count with a "只看适配 / 显示全部" toggle (`showAll`).
- **Update check**: calls `https://api.github.com/repos/jenkinpan/english-games-tauri/releases/latest`, compares `tag_name` (strip `v` prefix) against `pkg.version` from `package.json`. Uses `ask()` dialog; on Android, finds `.apk` asset; uses `open()` for the download URL.
- **Game list** is a hardcoded array with `path`, `title`, `desc`, `tags` (tags also drive device filtering).
- Uses the shared `DragBar` component for the titlebar drag region.

## CI/CD (`.github/workflows/`)

- **`release.yml`**: Builds macOS (dmg + `.app.tar.gz`) and Windows (NSIS installer), triggered by `v*` tag push or manual `workflow_dispatch`. Signs with Tauri private key (`TAURI_PRIVATE_KEY` / `TAURI_KEY_PASSWORD` secrets) and renames assets to `EnglishGames-v<version>-aarch64.dmg` / `EnglishGames-v<version>-Setup.exe`.
- **`fast-android-release.yml`**: Builds signed Android APK, triggered by `v*` tag push or `workflow_dispatch`. Runs `bun tauri android init` before `bun tauri android build`. Targets: `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android`. Signs with Android keystore secrets (`ANDROID_KEYSTORE_FILE`, `ANDROID_KEY_ALIAS`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`). Renames output to `EnglishGames-<tag>.apk` before upload.

Both workflows use `bun install --frozen-lockfile` and `swatinem/rust-cache`.

## Adding a New Game

1. Create `src/views/<NewGame>/index.vue` and `src/views/<NewGame>/script.ts`.
2. Export `useNewGame()` from `script.ts` with all state and methods.
3. Add the route to `src/router/index.js` (import + `{ path: '/route', name: 'NewGame', component }` entry).
4. Add an entry to the `games` array in `src/views/Home.vue` with `path`, `title`, `desc`, `tags` (tags must be a subset of `Mobile`/`Tablet`/`Desktop` — they drive Home's device filtering).
5. Include the shared `<DragBar />` component at the top of the template.
6. Use `localStorage` with a unique key for persistence.
