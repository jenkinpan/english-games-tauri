<template>
    <div class="millionaire-container">
        <router-link to="/" class="back-home-btn">🏠</router-link>

        <div class="container">
            <header>
                <h1><i class="fas fa-chess-rook"></i> 魔法大富翁：巅峰对决</h1>
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
                            <i
                                v-if="
                                    typeof cell.content === 'string' &&
                                    cell.content.startsWith('fas')
                                "
                                :class="cell.content"
                            ></i>
                            <span v-else>{{ cell.content }}</span>
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
                                <i :class="getPlayerIcon(player.id)"></i>
                                <span class="token-base"></span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="control-panel">
                    <div class="panel-box">
                        <h2 class="panel-title">
                            <i class="fas fa-users"></i> 玩家队伍
                        </h2>
                        <div
                            style="display: flex; gap: 5px; margin-bottom: 5px"
                        >
                            <button
                                class="btn btn-green"
                                @click="changePlayerCount(1)"
                            >
                                <i class="fas fa-plus"></i>
                            </button>
                            <button
                                class="btn btn-red"
                                @click="changePlayerCount(-1)"
                            >
                                <i class="fas fa-minus"></i>
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
                                        text-align: center;
                                    "
                                >
                                    <i
                                        v-if="p.id === currentPlayer"
                                        class="fas fa-hand-point-right"
                                    ></i>
                                </span>

                                <div class="player-info">
                                    <span :class="['mini-icon', 'p' + p.id]">
                                        <i :class="getPlayerIcon(p.id)"></i>
                                    </span>
                                    <b>玩家 {{ p.id }}</b>
                                </div>

                                <span
                                    style="
                                        margin-left: auto;
                                        font-size: 0.9rem;
                                        color: #ddd;
                                    "
                                >
                                    <span v-if="p.frozen">
                                        <i class="fas fa-snowflake"></i> 冰冻
                                    </span>
                                    <span v-else>位置: {{ p.position }}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="panel-box">
                        <h2 class="panel-title">
                            <i class="fas fa-dice"></i> 命运骰子
                        </h2>
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
                        <h2 class="panel-title">
                            <i class="fas fa-cogs"></i> 系统功能
                        </h2>
                        <button
                            class="btn btn-yellow"
                            @click="showSettings = true"
                        >
                            <i class="fas fa-edit"></i> 题库设置
                        </button>
                        <button class="btn btn-red" @click="resetGame">
                            <i class="fas fa-redo"></i> 重置游戏
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal" :class="{ show: showSettings }">
            <div class="modal-content">
                <h2 style="color: #ffd700; margin-bottom: 15px">
                    <i class="fas fa-list-alt"></i> 题库管理
                </h2>
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
                            <i class="fas fa-trash"></i>
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
                        <i class="fas fa-plus"></i> 加一题
                    </button>
                    <button
                        class="btn btn-blue"
                        style="width: auto"
                        @click="saveQuestions"
                    >
                        <i class="fas fa-save"></i> 保存修改
                    </button>
                    <button
                        class="btn btn-red"
                        style="width: auto"
                        @click="showSettings = false"
                    >
                        <i class="fas fa-times"></i> 关闭
                    </button>
                </div>
            </div>
        </div>

        <div class="modal" :class="{ show: gameModal.show }">
            <div class="modal-content">
                <h2
                    style="color: #ffd700; margin-bottom: 20px"
                    v-html="gameModal.title"
                ></h2>
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
