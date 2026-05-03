<template>
  <router-view></router-view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useDevice } from '@/composables/useDevice'

const { isDesktop, isMobileOS } = useDevice()

function preventContextMenu(e: Event) {
  e.preventDefault()
}

let contextMenuBound = false

function syncContextMenuListener() {
  const shouldBind = isDesktop.value && !isMobileOS.value
  if (shouldBind && !contextMenuBound) {
    document.addEventListener('contextmenu', preventContextMenu)
    contextMenuBound = true
  } else if (!shouldBind && contextMenuBound) {
    document.removeEventListener('contextmenu', preventContextMenu)
    contextMenuBound = false
  }
}

onMounted(() => {
  syncContextMenuListener()
})

watch([isDesktop, isMobileOS], syncContextMenuListener)

onUnmounted(() => {
  if (contextMenuBound) {
    document.removeEventListener('contextmenu', preventContextMenu)
    contextMenuBound = false
  }
})
</script>

<style>
@import './assets/catppuccin.css';

:root {
  color-scheme: light dark;
  font-family:
    'Nunito',
    'Segoe UI',
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'PingFang SC',
    'Microsoft Yahei',
    sans-serif;

  --accent: var(--accent-primary);
  --accent-dark: var(--accent-secondary);
  --bg: var(--bg-base);
  --card: var(--bg-card);
  --text: var(--text-primary);

  --canvas-pad-x: clamp(0.75rem, 4vw, 2.5rem);
  --game-max-w: min(100%, 1200px);
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}

* {
  box-sizing: border-box;
  -webkit-user-drag: none;
}

*:not(input):not(textarea):not([contenteditable]):not([contenteditable] *) {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

input,
textarea,
[contenteditable] {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
  -webkit-user-drag: auto;
  cursor: text;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  width: 100%;
}

body {
  background: var(--bg-base);
  color: var(--text-primary);
  transition:
    background 0.3s,
    color 0.3s;
  cursor: default;
}

#app {
  min-height: 100vh;
  width: 100%;
}

.home-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: calc(50px + var(--safe-top)) var(--canvas-pad-x)
    calc(40px + var(--safe-bottom));
  min-height: 100vh;
  background: var(--bg-base);
  background-image:
    radial-gradient(
      circle at 20% 20%,
      rgba(137, 180, 250, 0.08),
      /* Blue */ transparent 30%
    ),
    radial-gradient(
      circle at 80% 0%,
      rgba(203, 166, 247, 0.08),
      /* Mauve */ transparent 25%
    );
}
</style>
