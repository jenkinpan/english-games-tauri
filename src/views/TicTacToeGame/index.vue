<template>
    <div class="tictactoe-game-container">
        <div class="title-bar" data-tauri-drag-region></div>
        <router-link to="/" class="back-home-btn">🏠</router-link>
        <h1>英语单词九宫格游戏</h1>

        <div class="container">
            <div class="game-container">
                <div class="left-panel">
                    <div class="status">
                        <div
                            class="player white"
                            :class="{ active: currentPlayer === 'white' }"
                        >
                            <span class="indicator"></span><span>白棋回合</span>
                        </div>
                        <div
                            class="player black"
                            :class="{ active: currentPlayer === 'black' }"
                        >
                            <span class="indicator"></span><span>黑棋回合</span>
                        </div>
                    </div>

                    <div class="board">
                        <div
                            v-for="(cell, index) in board"
                            :key="index"
                            class="cell"
                            :class="[cell.value, { winning: cell.isWinning }]"
                            :style="
                                gameOver
                                    ? { cursor: 'not-allowed', opacity: 0.6 }
                                    : {}
                            "
                            @click="makeMove(index)"
                        >
                            {{ cell.word || `单词 ${index + 1}` }}
                        </div>
                    </div>

                    <div class="controls">
                        <button
                            class="btn btn-restart"
                            @click="fullRestart"
                            :disabled="allWords.length === 0"
                        >
                            重新开始游戏
                        </button>

                        <button
                            class="btn btn-next-round"
                            @click="nextRound"
                            :disabled="allWords.length === 0"
                        >
                            下一回合
                        </button>
                    </div>
                </div>

                <div class="right-panel">
                    <div class="scoreboard">
                        <h3>🏆 计分板 🏆</h3>

                        <div class="progress-container">
                            <div class="progress-title">胜负进度</div>
                            <div class="progress-bar">
                                <div
                                    class="white-progress"
                                    :style="{ width: whitePercent + '%' }"
                                ></div>
                                <div
                                    class="black-progress"
                                    :style="{ width: blackPercent + '%' }"
                                ></div>
                            </div>
                            <div class="progress-labels">
                                <span>白棋: {{ whitePercent }}%</span>
                                <span>黑棋: {{ blackPercent }}%</span>
                            </div>
                        </div>

                        <div class="stats-container">
                            <div class="stat-card white-stats">
                                <div class="stat-label">白棋胜</div>
                                <div class="stat-value">
                                    {{ stats.whiteWins }}
                                </div>
                                <div>回合</div>
                            </div>
                            <div class="stat-card draw-stats">
                                <div class="stat-label">平局</div>
                                <div class="stat-value">{{ stats.draws }}</div>
                                <div>回合</div>
                            </div>
                            <div class="stat-card black-stats">
                                <div class="stat-label">黑棋胜</div>
                                <div class="stat-value">
                                    {{ stats.blackWins }}
                                </div>
                                <div>回合</div>
                            </div>
                        </div>

                        <ul
                            class="round-results"
                            :class="{ scrollable: roundResults.length > 2 }"
                        >
                            <li
                                v-for="(result, index) in roundResults"
                                :key="index"
                                :class="result.winnerClass"
                                :style="{ animationDelay: index * 0.1 + 's' }"
                            >
                                <div class="score-icon">{{ result.icon }}</div>
                                <div class="score-content">
                                    <div class="round">
                                        第 {{ result.round }} 回合
                                    </div>
                                    <div class="winner">
                                        {{ result.winnerName }} 获胜
                                    </div>
                                </div>
                            </li>
                        </ul>
                        <p
                            id="final-result"
                            v-if="finalResultHTML"
                            v-html="finalResultHTML"
                        ></p>
                    </div>

                    <div class="word-manager">
                        <div class="word-manager-header">
                            <h4 style="margin: 0">📝 添加单词 (建议9个以上)</h4>
                            <div class="word-manager-buttons">
                                <button
                                    class="btn-toggle-word-input"
                                    @click="toggleWordInput"
                                >
                                    {{ isWordInputHidden ? "显示" : "隐藏" }}
                                </button>
                                <button
                                    class="btn-add-word-input"
                                    @click="addWordInput"
                                >
                                    增加
                                </button>
                                <button
                                    class="btn-remove-word-input"
                                    @click="removeWordInput"
                                >
                                    减少
                                </button>
                            </div>
                        </div>
                        <div
                            class="word-inputs-container"
                            :class="{ hidden: isWordInputHidden }"
                        >
                            <div class="word-inputs-grid">
                                <div
                                    v-for="(_, index) in wordInputs"
                                    :key="index"
                                    class="word-input-group"
                                >
                                    <label>单词 {{ index + 1 }}:</label>
                                    <input
                                        type="text"
                                        class="word-input"
                                        v-model="wordInputs[index]"
                                        :placeholder="`输入单词 ${index + 1}`"
                                        @input="updateWords"
                                        autocapitalize="off"
                                        autocorrect="off"
                                        spellcheck="false"
                                    />
                                </div>
                            </div>
                            <div
                                class="word-count"
                                :class="{ highlight: allWords.length >= 9 }"
                            >
                                当前单词数: {{ allWords.length }}
                            </div>
                        </div>
                    </div>

                    <div class="game-rules">
                        <h3>游戏规则说明</h3>
                        <p>
                            1.
                            在下方输入框中添加英语单词，如果不足9个会循环使用。
                        </p>
                        <p>
                            2. 将学生分为白棋组和黑棋组，学生轮流点击格子下棋。
                        </p>
                        <p>3. 下棋前必须准确读出单词并说出中文释义。</p>
                        <p>4. 如果连成三个棋子，则当前回合胜出。</p>
                        <p>5. 为保证公平，每一回合自动切换先手玩家。</p>
                        <p>6. 所有回合结束后，会展示最终获胜方。</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="win-message" :class="{ show: showWinModal }">
            <div class="win-content">
                <h2>游戏结束</h2>
                <p>{{ winText }}</p>
                <button class="btn" @click="closeWinModal">继续游戏</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useGameLogic } from "./script";

// 解构逻辑，使模板可以访问
const {
    currentPlayer,
    board,
    gameOver,
    allWords,
    stats,
    roundResults,
    wordInputs,
    isWordInputHidden,
    showWinModal,
    winText,
    whitePercent,
    blackPercent,
    finalResultHTML,
    makeMove,
    fullRestart,
    nextRound,
    closeWinModal,
    addWordInput,
    removeWordInput,
    toggleWordInput,
    updateWords,
} = useGameLogic();
</script>

<style scoped src="./style.css"></style>
