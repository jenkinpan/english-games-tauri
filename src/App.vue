<template>
  <router-view></router-view>
</template>

<style>
:root {
  color-scheme: light dark;
  font-family:
    "Segoe UI",
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "PingFang SC",
    "Microsoft Yahei",
    sans-serif;
  --accent: #5c6ac4;
  --accent-dark: #4a57a1;
  --bg: #f7f8fc;
  --card: #ffffff;
  --text: #1e1e1e;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  width: 100%;
}

body {
  background: var(--bg);
  color: var(--text);
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
  background: var(--bg);
  background-image:
    radial-gradient(
      circle at 20% 20%,
      rgba(92, 106, 196, 0.08),
      transparent 30%
    ),
    radial-gradient(
      circle at 80% 0%,
      rgba(74, 87, 161, 0.08),
      transparent 25%
    );
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1119;
    --card: #1a1f2f;
    --text: #f4f5fb;
  }
}
</style>
