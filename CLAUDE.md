# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Run Commands

- **Install**: `bun install`
- **Dev**: `bun run dev` (starts Tauri + Vite dev server)
- **Vite only**: `bun run vite:dev` (frontend only, port 1420)
- **Build**: `bun run build` (production Tauri desktop app)
- **Format**: `npx prettier --write .` (Prettier with Tailwind plugin, semicolons off, single quotes)

## Architecture

Tauri v2 desktop app (Rust backend) + Vue 3 frontend with Vite bundler. The Vite root is `src/` and outputs to `../dist`.

### Frontend (`src/`)

- **`App.vue`**: Root shell — just `<router-view>`, disables right-click, imports global styles + Catppuccin theme
- **`router/index.js`**: Hash-based routing to one Home + 12 game views
- **`components/GameCard.vue`**: Reusable card for the home screen game grid
- **`style.css`**: Tailwind v4 `@import 'tailwindcss'` + Catppuccin CSS variable mapping in `@theme`
- **`assets/catppuccin.css`**: Catppuccin Latte (light) / Mocha (dark) color tokens, auto-switched via `prefers-color-scheme`

**Game view pattern** — each game lives in `src/views/<GameName>/`:
- `index.vue` — template only (game UI)
- `script.ts` — composable exporting `use<Game>Logic()` with all state + game logic
- `style.css` — scoped styles (optional, some games inline styles in SFC)

The `script.ts` files typically define TypeScript interfaces for game state (Card, WordGroup, etc.) and export a function like `useGameLogic()` that returns reactive refs and methods consumed by `index.vue`. Data persistence uses `localStorage` for word lists, game settings, and group management.

**Home page** (`views/Home.vue`): Game grid with pinyin-search support (Chinese characters or pinyin initials like "zd" match "炸弹"), update checker using GitHub Releases API, and platform-specific download links.

### Backend (`src-tauri/`)

Minimal Rust layer. `Cargo.toml` pulls in Tauri v2 plugins: `dialog`, `fs`, `shell`, `os`, `log`. The Rust side is a thin shell — all game logic is in the Vue frontend. The Tauri plugins expose OS-level capabilities (file dialogs, shell open for URLs, platform detection) to the frontend via `@tauri-apps/plugin-*` npm packages.

### Key Dependencies

- **Styling**: Tailwind CSS v4 with Catppuccin color palette
- **Icons**: Font Awesome 7 (`@fortawesome/fontawesome-free`)
- **Pinyin search**: `pinyin-match` for searching Chinese game titles by pinyin/initials
- **Routing**: Vue Router with hash history

### CI/CD (`.github/workflows/`)

- `release.yml`: Builds macOS (dmg) + Windows (NSIS installer) on tag push `v*`, signs with Tauri private key
- `fast-android-release.yml`: Builds signed Android APK on tag push
