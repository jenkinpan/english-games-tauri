<template>
    <div class="witch-poison-container" :class="{ shake: isShaking }">
        <div class="title-bar" data-tauri-drag-region></div>
        <router-link to="/" class="back-home-btn">
            <i class="fas fa-home">🏠</i>
        </router-link>

        <header>
            <h1>
                <i class="fas fa-hat-wizard">🧙‍♀️</i> 女巫的毒药
                <i class="fas fa-flask-poison">🧪</i>
            </h1>
        </header>

        <div class="game-container">
            <div class="control-panel">
                <h2 class="panel-title">
                    <i class="fas fa-cogs">⚙️</i> 游戏设置
                </h2>

                <div class="input-area">
                    <button
                        class="btn btn-import-file"
                        @click="handleTauriFileSelect"
                    >
                        <i class="fas fa-file-import">📂</i> 选择 Excel/TXT 文件
                    </button>

                    <textarea
                        v-model="wordInputText"
                        spellcheck="false"
                        placeholder="在此输入单词，每行一个。&#10;或者点击上方按钮导入文件。&#10;系统会自动根据单词数量调整卡片大小。"
                    ></textarea>

                    <button class="btn" @click="importWordsFromTextarea">
                        <i class="fas fa-magic">✨</i> 生成单词卡 (从文本框)
                    </button>

                    <button
                        class="btn btn-restart"
                        :class="{ 'btn-disabled': !canRestart }"
                        :disabled="!canRestart"
                        @click="restartGame"
                    >
                        <i class="fas fa-redo-alt">🔄</i> 重新开始 (换毒药)
                    </button>
                </div>

                <div class="instructions">
                    <h3><i class="fas fa-book-open">📖</i> 玩法指南：</h3>
                    <ul>
                        <li>1. 输入单词或导入 TXT 文件</li>
                        <li>
                            2.
                            <strong>第一组</strong>点击一个单词作为“毒药”(保密)
                        </li>
                        <li>
                            3.
                            <strong>第二组</strong
                            >点击另一个单词作为“毒药”(保密)
                        </li>
                        <li>4. 全班轮流读单词并点击，点到红色毒药者淘汰！</li>
                        <li>5. 点击“重新开始”可保留单词表，仅重置毒药位置</li>
                    </ul>
                </div>
            </div>

            <div class="word-grid-container">
                <h2 class="panel-title">
                    <i class="fas fa-th">🔲</i> 单词魔法阵
                </h2>

                <div class="game-status" :style="{ color: statusColor }">
                    {{ gameStatusText }}
                </div>

                <div class="word-grid" :class="gridClass">
                    <div
                        v-for="(word, index) in words"
                        :key="index"
                        class="word-cell"
                        :class="{
                            'selected-poison':
                                tempSelectedPoisonIndex === index,
                            poisoned: poisonedIndices.includes(index),
                            safe: safeIndices.includes(index),
                        }"
                        @click="handleCellClick(index)"
                    >
                        {{ word }}
                    </div>
                </div>
            </div>
        </div>

        <div class="notification" v-if="showNotification">
            <i class="fas fa-skull-crossbones">☠️</i><br />
            <span v-html="notificationText"></span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useWitchGame } from "./script";

const {
    wordInputText,
    words,
    tempSelectedPoisonIndex,
    poisonedIndices,
    safeIndices,
    showNotification,
    notificationText,
    canRestart,
    gridClass,
    gameStatusText,
    statusColor,
    isShaking,
    handleTauriFileSelect,
    importWordsFromTextarea,
    restartGame,
    handleCellClick,
} = useWitchGame();
</script>

<style scoped src="./style.css"></style>
