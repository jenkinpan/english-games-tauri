<template>
    <div class="flashcard-game-container">
        <div class="title-bar" data-tauri-drag-region></div>
        <router-link to="/" class="back-home-btn">🏠</router-link>
        <div class="container">
            <header>
                <h1>英语单词记忆卡片</h1>
            </header>

            <div class="timer-container">
                <div class="timer" id="timer" :style="timerStyle">
                    {{ formattedTime }}
                </div>
                <button
                    class="btn"
                    @click="startTimer"
                    :disabled="timerRunning"
                >
                    开始记忆
                </button>
                <button class="btn reset" @click="resetTimer">重置</button>
                <button class="btn toggle-btn" @click="toggleInput">
                    {{ isInputHidden ? "显示输入" : "隐藏输入" }}
                </button>
            </div>

            <div class="cards-grid">
                <div
                    v-for="(card, index) in cards"
                    :key="index"
                    class="card"
                    :class="{ flipped: card.flipped }"
                    @click="handleCardClick(index)"
                >
                    <div class="card-inner">
                        <div class="card-front">
                            <div class="number">{{ index + 1 }}</div>
                            <div class="word">{{ card.displayWord }}</div>
                        </div>
                        <div class="card-back">
                            <div class="number">{{ index + 1 }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="input-section" :class="{ hidden: isInputHidden }">
                <div
                    style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 15px;
                    "
                >
                    <h2 style="margin: 0">教师单词输入</h2>
                    <div style="display: flex; gap: 10px">
                        <button
                            class="btn"
                            @click="addWord"
                            style="
                                padding: 8px 20px;
                                font-size: 16px;
                                background: linear-gradient(
                                    90deg,
                                    #4facfe,
                                    #00f2fe
                                );
                            "
                        >
                            + 增加单词
                        </button>
                        <button
                            class="btn"
                            @click="removeWord"
                            style="
                                padding: 8px 20px;
                                font-size: 16px;
                                background: linear-gradient(
                                    90deg,
                                    #fa709a,
                                    #fee140
                                );
                            "
                        >
                            - 删除单词
                        </button>
                    </div>
                </div>
                <div class="word-inputs">
                    <div
                        v-for="(_word, index) in words"
                        :key="index"
                        class="input-group"
                    >
                        <label>单词 {{ index + 1 }}:</label>
                        <input
                            type="text"
                            v-model="words[index]"
                            :placeholder="`输入单词 ${index + 1}`"
                            @input="handleWordInput(index)"
                        />
                    </div>
                </div>
            </div>

            <div class="instructions">
                <h3>使用说明</h3>
                <ol>
                    <li>
                        在下方输入框中输入英语单词（每个数字对应一个单词），可以点击"增加单词"或"删除单词"按钮调整数量
                    </li>
                    <li>点击"开始记忆"按钮开始1分钟倒计时</li>
                    <li>学生需要在1分钟内记住所有单词</li>
                    <li>倒计时结束后，所有卡片将自动翻面，只显示数字</li>
                    <li>点击卡片可以查看单词（教师可控制显示）</li>
                    <li>点击"重置"按钮可重新开始练习</li>
                    <li>点击"隐藏输入"按钮可以隐藏或显示教师单词输入部分</li>
                </ol>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useFlashcardGame } from "./script";

// 使用解构获取所有逻辑和状态
const {
    words,
    cards,
    formattedTime,
    timerStyle,
    timerRunning,
    isInputHidden,
    startTimer,
    resetTimer,
    toggleInput,
    handleCardClick,
    handleWordInput,
    addWord,
    removeWord,
} = useFlashcardGame();
</script>

<style scoped src="./style.css"></style>
