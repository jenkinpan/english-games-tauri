<template>
  <router-view></router-view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

function preventContextMenu(e: Event) {
  e.preventDefault()
}

onMounted(() => {
  document.addEventListener('contextmenu', preventContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('contextmenu', preventContextMenu)
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
}

* {
  box-sizing: border-box;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-user-drag: none;
}

input,
textarea {
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
  padding: 40px 16px 80px;
  padding-top: 50px;
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
