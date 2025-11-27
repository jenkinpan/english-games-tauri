# 英语互动游戏中心 - Tauri 版

一个基于 Tauri 和 Vue 3 构建的互动英语学习游戏合集。

## 功能特性

本应用包含以下游戏：

- **炸弹游戏 (Bomb Game)**：紧张刺激的词汇游戏，必须在炸弹爆炸前回答。
- **闪卡游戏 (Flashcard Game)**：经典的单词记忆闪卡。
- **词汇保卫战 (Lexicon Defense Game)**：通过正确拼写单词来保卫基地。
- **百万富翁 (Millionaire Game)**：灵感来自《谁想成为百万富翁》的问答游戏。
- **井字棋 (Tic Tac Toe Game)**：融入英语学习元素的经典游戏。
- **打地鼠 (Whack-a-Mole Game)**：敲击正确答案的地鼠。
- **女巫毒药 (Witch Poison Game)**：选择正确的药水以求生存。

## 技术栈

- **Tauri v2**：用于构建桌面应用。
- **Vue 3**：前端框架。
- **TypeScript**：提供类型安全的代码。
- **Vite**：构建工具。

## 安装说明

1. **安装依赖**：

    ```bash
    npm install
    ```

2. **运行开发模式**：

    ```bash
    npm run dev
    ```

    或者专门用于 Tauri 开发：

    ```bash
    npm run tauri dev
    ```

## 构建说明

构建生产环境应用：

```bash
npm run tauri build
```
