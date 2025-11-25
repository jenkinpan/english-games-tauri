<template>
    <div class="millionaire-container">
        <router-link to="/" class="back-home-btn">🏠</router-link>

        <div class="container">
            <header>
                <h1>🏰 魔法大富翁：巅峰对决</h1>
            </header>

            <div class="game-container">
                <div class="board-container">
                    <div class="board" ref="boardRef">
                        <div
                            v-for="(cell, index) in boardCells"
                            :key="index"
                            :ref="
                                (el) => {
                                    if (el) cellRefs[index] = el;
                                }
                            "
                            :class="['cell', cell.status, cell.eventClass]"
                            :style="{ gridRow: cell.r, gridColumn: cell.c }"
                        >
                            {{ cell.content }}
                        </div>

                        <div
                            v-for="player in players"
                            :key="player.id"
                            :class="[
                                'player-token',
                                'p' + player.id,
                                { frozen: player.frozen },
                            ]"
                            :style="player.style"
                        >
                            <div class="token-body">
                                {{ getPlayerIcon(player.id) }}
                                <span class="token-base"></span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="control-panel">
                    <div class="panel-box">
                        <h2 class="panel-title">👥 玩家队伍</h2>
                        <div
                            style="display: flex; gap: 5px; margin-bottom: 5px"
                        >
                            <button
                                class="btn btn-green"
                                @click="changePlayerCount(1)"
                            >
                                ➕
                            </button>
                            <button
                                class="btn btn-red"
                                @click="changePlayerCount(-1)"
                            >
                                ➖
                            </button>
                        </div>
                        <div class="player-list">
                            <div
                                v-for="p in players"
                                :key="p.id"
                                :class="[
                                    'player-row',
                                    {
                                        active: p.id === currentPlayer,
                                        'frozen-row': p.frozen,
                                    },
                                ]"
                            >
                                <span
                                    style="
                                        font-size: 1.2rem;
                                        margin-right: 5px;
                                        width: 25px;
                                    "
                                >
                                    {{ p.id === currentPlayer ? "👉" : "" }}
                                </span>

                                <div class="player-info">
                                    <span :class="['mini-icon', 'p' + p.id]">{{
                                        getPlayerIcon(p.id)
                                    }}</span>
                                    <b>玩家 {{ p.id }}</b>
                                </div>

                                <span
                                    style="
                                        margin-left: auto;
                                        font-size: 0.9rem;
                                        color: #ddd;
                                    "
                                >
                                    {{
                                        p.frozen
                                            ? "❄️ 冰冻"
                                            : `位置: ${p.position}`
                                    }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="panel-box">
                        <h2 class="panel-title">🎲 命运骰子</h2>
                        <div class="scene" @click="rollDice">
                            <div
                                class="cube"
                                :class="{ rolling: isRolling }"
                                :style="diceStyle"
                            >
                                <div class="cube__face cube__face--1">1</div>
                                <div class="cube__face cube__face--2">2</div>
                                <div class="cube__face cube__face--3">3</div>
                                <div class="cube__face cube__face--4">4</div>
                                <div class="cube__face cube__face--5">5</div>
                                <div class="cube__face cube__face--6">6</div>
                            </div>
                        </div>
                        <p
                            style="
                                text-align: center;
                                margin-top: 5px;
                                color: #ccc;
                                font-size: 0.9rem;
                            "
                        >
                            {{ diceMsg }}
                        </p>
                    </div>

                    <div class="panel-box">
                        <h2 class="panel-title">🔧 系统功能</h2>
                        <button
                            class="btn btn-yellow"
                            @click="showSettings = true"
                        >
                            ⚙️ 题库设置
                        </button>
                        <button class="btn btn-red" @click="resetGame">
                            🔄 重置游戏
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal" :class="{ show: showSettings }">
            <div class="modal-content">
                <h2 style="color: #ffd700; margin-bottom: 15px">📝 题库管理</h2>
                <div class="editor-container">
                    <div
                        v-for="(q, index) in editingQuestions"
                        :key="index"
                        class="q-row"
                    >
                        <input
                            class="inp-q"
                            placeholder="输入题目"
                            v-model="q.q"
                        />
                        <input
                            class="inp-a"
                            placeholder="输入答案"
                            v-model="q.a"
                        />
                        <button
                            class="btn btn-red"
                            style="width: 40px; margin: 0"
                            @click="removeQuestion(index)"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
                <div
                    style="
                        margin-top: 20px;
                        display: flex;
                        gap: 10px;
                        justify-content: center;
                    "
                >
                    <button
                        class="btn btn-green"
                        style="width: auto"
                        @click="addQuestion"
                    >
                        ➕ 加一题
                    </button>
                    <button
                        class="btn btn-blue"
                        style="width: auto"
                        @click="saveQuestions"
                    >
                        💾 保存修改
                    </button>
                    <button
                        class="btn btn-red"
                        style="width: auto"
                        @click="showSettings = false"
                    >
                        ❌ 关闭
                    </button>
                </div>
            </div>
        </div>

        <div class="modal" :class="{ show: gameModal.show }">
            <div class="modal-content">
                <h2 style="color: #ffd700; margin-bottom: 20px">
                    {{ gameModal.title }}
                </h2>
                <div
                    style="
                        font-size: 1.2rem;
                        min-height: 80px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        line-height: 1.6;
                    "
                    v-html="gameModal.body"
                ></div>
                <div
                    style="
                        margin-top: 25px;
                        display: flex;
                        gap: 15px;
                        justify-content: center;
                    "
                >
                    <button
                        v-for="(btn, index) in gameModal.buttons"
                        :key="index"
                        :class="['btn', btn.class]"
                        style="width: auto; padding: 8px 20px"
                        @click="btn.action"
                    >
                        {{ btn.text }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useGameLogic } from "./script";

const {
    boardCells,
    cellRefs,
    players,
    currentPlayer,
    diceMsg,
    isRolling,
    diceStyle,
    showSettings,
    gameModal,
    editingQuestions,
    resetGame,
    changePlayerCount,
    rollDice,
    addQuestion,
    removeQuestion,
    saveQuestions,
    getPlayerIcon,
} = useGameLogic();
</script>

<style scoped src="./style.css"></style>
