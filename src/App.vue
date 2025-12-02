<template>
  <router-view></router-view>
</template>

<style>
@import "./assets/catppuccin.css";

:root {
  color-scheme: light dark;
  font-family:
    "Nunito",
    "Segoe UI",
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "PingFang SC",
    "Microsoft Yahei",
    sans-serif;

  /* Map legacy variables to new Catppuccin semantic variables */
  --accent: var(--accent-primary);
  --accent-dark: var(--accent-secondary);
  --bg: var(--bg-base);
  --card: var(--bg-card);
  --text: var(--text-primary);
}

* {
  box-sizing: border-box;
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
  transition: background 0.3s, color 0.3s;
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
    radial-gradient(circle at 20% 20%,
      rgba(137, 180, 250, 0.08),
      /* Blue */
      transparent 30%),
    radial-gradient(circle at 80% 0%,
      rgba(203, 166, 247, 0.08),
      /* Mauve */
      transparent 25%);
}
</style>
