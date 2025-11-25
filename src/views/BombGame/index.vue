<template>
    <div class="bomb-game-container">
        <div class="title-bar" data-tauri-drag-region></div>
        <router-link to="/" class="back-home-btn">🏠</router-link>
        <div class="container">
            <header>
                <h1>单词炸弹游戏 💣</h1>
            </header>

            <div class="score-container">
                <button
                    class="btn"
                    @click="startGame"
                    :disabled="(gameStarted && !gameOver) || isAnimatingBomb"
                >
                    开始游戏
                </button>
                <button
                    class="btn reset"
                    @click="resetGame"
                    :disabled="isAnimatingBomb"
                >
                    重置
                </button>
                <div style="display: flex; align-items: center; gap: 8px">
                    <label
                        for="bombCountInput"
                        style="font-weight: bold; color: #2c3e50"
                        >炸弹数量</label
                    >
                    <input
                        id="bombCountInput"
                        type="number"
                        min="1"
                        :max="Math.max(1, words.length - 1)"
                        v-model.number="bombCount"
                        @change="updateBombCountConstraints"
                        :disabled="isAnimatingBomb"
                        style="
                            width: 80px;
                            padding: 8px;
                            border: 2px solid #e0e0e0;
                            border-radius: 8px;
                            font-size: 16px;
                        "
                    />
                    <button
                        class="btn"
                        @click="toggleInput"
                        style="
                            padding: 8px 16px;
                            font-size: 16px;
                            background: linear-gradient(
                                90deg,
                                #ffa62e,
                                #ff3c38
                            );
                        "
                    >
                        {{ isInputHidden ? "显示单词输入" : "隐藏单词输入" }}
                    </button>
                </div>
            </div>

            <div class="game-over" :class="{ show: gameOver }">
                游戏结束！你踩到了炸弹💣
            </div>

            <div class="cards-grid">
                <div
                    v-for="(card, index) in cards"
                    :key="index"
                    class="card"
                    :class="{
                        flipped: card.flipped,
                        disabled:
                            !gameStarted ||
                            gameOver ||
                            card.flipped ||
                            isAnimatingBomb,
                    }"
                    @click="handleCardClick(index)"
                >
                    <div class="card-inner">
                        <div class="card-front">
                            <div class="word">{{ card.word }}</div>
                        </div>
                        <div
                            class="card-back"
                            :class="card.type"
                            ref="cardBackRefs"
                        >
                            <div
                                v-if="card.flipped && card.type === 'bomb'"
                                class="bomb-icon"
                            >
                                💣
                            </div>
                            <div
                                v-if="card.flipped && card.type === 'score'"
                                class="score-value"
                            >
                                +{{ card.value }}
                            </div>
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
                    <h2 style="margin: 0">单词输入</h2>
                    <div style="display: flex; gap: 10px">
                        <button
                            class="btn"
                            @click="addWord"
                            :disabled="isAnimatingBomb"
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
                            :disabled="isAnimatingBomb"
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
                        <button
                            class="btn"
                            @click="requestClearWords"
                            :disabled="isAnimatingBomb"
                            style="
                                padding: 8px 20px;
                                font-size: 16px;
                                background: linear-gradient(
                                    90deg,
                                    #a18cd1,
                                    #fbc2eb
                                );
                            "
                        >
                            × 清空
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
                            autocapitalize="off"
                            autocorrect="off"
                            spellcheck="false"
                        />
                    </div>
                </div>
            </div>

            <div class="instructions">
                <h3>游戏规则</h3>
                <ol>
                    <li>在下方输入框中输入英语单词（每个数字对应一个单词）</li>
                    <li>点击"开始游戏"按钮开始游戏</li>
                    <li>点击卡片翻开，可能会显示：积分（+1到+3）或炸弹💣</li>
                    <li>翻开积分卡片代表安全</li>
                    <li>翻开炸弹卡片会提示“踩到炸弹”，但游戏继续</li>
                    <li>每轮游戏中有多个炸弹（上方“炸弹数量”可配置）</li>
                    <li>点击"重置"按钮可以重新开始游戏</li>
                </ol>
            </div>

            <div v-if="showClearModal" class="modal-overlay">
                <div class="modal-content">
                    <h3>确认清空？</h3>
                    <p>此操作将清空所有已输入的单词，无法撤销。</p>
                    <div class="modal-buttons">
                        <button
                            class="btn"
                            style="
                                background: #e0e0e0;
                                color: #333;
                                box-shadow: none;
                            "
                            @click="cancelClearWords"
                        >
                            取消
                        </button>
                        <button
                            class="btn"
                            style="
                                background: linear-gradient(
                                    90deg,
                                    #ff416c,
                                    #ff4b2b
                                );
                            "
                            @click="confirmClearWords"
                        >
                            确定清空
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useGameLogic } from "./script";

const {
    words,
    cards,
    gameStarted,
    gameOver,
    bombCount,
    isInputHidden,
    cardBackRefs,
    isAnimatingBomb,
    showClearModal, // 解构新增状态
    startGame,
    resetGame,
    handleCardClick,
    addWord,
    removeWord,
    requestClearWords, // 解构新增函数
    confirmClearWords,
    cancelClearWords,
    toggleInput,
    handleWordInput,
    updateBombCountConstraints,
} = useGameLogic();
</script>

<style scoped src="./style.css"></style>
