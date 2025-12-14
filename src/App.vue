<template>
  <router-view></router-view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

function preventContextMenu(e: Event) {
  // Allow strict mode or dev mode check if needed, but for now disable always as requested
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

  /* Map legacy variables to new Catppuccin semantic variables */
  --accent: var(--accent-primary);
  --accent-dark: var(--accent-secondary);
  --bg: var(--bg-base);
  --card: var(--bg-card);
  --text: var(--text-primary);
}

/* ★ 修改开始：全局禁用选中 ★ */
* {
  box-sizing: border-box;
  /* 禁止文本被选中 (Chrome, Safari, Opera) */
  -webkit-user-select: none;
  /* 禁止文本被选中 (Firefox) */
  -moz-user-select: none;
  /* 禁止文本被选中 (IE 10+) */
  -ms-user-select: none;
  /* 标准语法 */
  user-select: none;
  /* 禁止图片被拖拽 (可选，增加应用感) */
  -webkit-user-drag: none;
}

/* 确保输入框和文本域仍然可以输入和选中文字 */
input,
textarea {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
  -webkit-user-drag: auto;
  cursor: text;
}
/* ★ 修改结束 ★ */

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
  /* 默认光标设为箭头，避免在文本上出现输入光标 */
  cursor: default;
}

#app {
  min-height: 100vh;
  width: 100%;
}

/* Only apply padding and background for Home page */
.home-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px 80px;
  padding-top: 50px;
  min-height: 100vh;
  background: var(--bg-base);
  /* Subtle gradient overlay using Catppuccin colors */
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
