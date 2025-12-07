<template>
  <div class="millionaire-container">
    <div class="container">
      <header>
        <div class="header-left">
          <router-link to="/" class="btn btn-gray btn-sm back-home-link">
            <i class="fas fa-home"></i> 首页
          </router-link>
          <div class="divider-vertical"></div>
          <h1><i class="fas fa-hat-wizard"></i> 魔法大富翁：巅峰对决</h1>
        </div>

        <div class="header-right">
          <button class="btn btn-mauve btn-sm" @click="showSettings = true">
            <i class="fas fa-book"></i> 题库管理
          </button>
          <button class="btn btn-red btn-sm" @click="resetGame">
            <i class="fas fa-redo"></i> 重置
          </button>
        </div>
      </header>

      <div class="game-container">
        <div class="board-container">
          <div class="board" ref="boardRef">
            <div v-for="(cell, index) in boardCells" :key="index" :ref="(el) => {
              if (el) cellRefs[index] = el
            }
              " :class="['cell', cell.status, cell.eventClass]" :style="{ gridRow: cell.r, gridColumn: cell.c }">
              <i v-if="
                typeof cell.content === 'string' &&
                cell.content.startsWith('fas')
              " :class="cell.content"></i>
              <span v-else>{{ cell.content }}</span>
            </div>

            <div v-for="player in players" :key="player.id" :class="[
              'player-token',
              'p' + player.id,
              { frozen: player.frozen },
            ]" :style="player.style">
              <div class="token-body">
                <i :class="getPlayerIcon(player.id)"></i>
                <span class="token-base"></span>
              </div>
            </div>
          </div>
        </div>

        <div class="control-panel">
          <div class="panel-box">
            <h2 class="panel-title"><i class="fas fa-users"></i> 魔法小队</h2>
            <div style="
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-bottom: 10px;
              ">
              <button class="btn btn-green" @click="changePlayerCount(1)" title="增加玩家" style="width: auto">
                <i class="fas fa-plus"></i>
              </button>
              <button class="btn btn-red" @click="changePlayerCount(-1)" title="减少玩家" style="width: auto">
                <i class="fas fa-minus"></i>
              </button>
            </div>
            <div class="player-list">
              <div v-for="p in players" :key="p.id" :class="[
                'player-row',
                {
                  active: p.id === currentPlayer,
                  'frozen-row': p.frozen,
                },
              ]">
                <span style="font-size: 1.2rem; width: 25px; text-align: center">
                  <i v-if="p.id === currentPlayer" class="fas fa-hand-point-right" style="color: var(--ctp-yellow)"></i>
                </span>
                <div class="player-info">
                  <span :class="['mini-icon', 'p' + p.id]">
                    <i :class="getPlayerIcon(p.id)"></i>
                  </span>
                  <b>玩家 {{ p.id }}</b>
                </div>
                <span style="
                    margin-left: auto;
                    font-size: 0.9rem;
                    color: var(--ctp-subtext1);
                  ">
                  <span v-if="p.frozen" style="color: var(--ctp-blue)">
                    <i class="fas fa-snowflake"></i> 冰冻
                  </span>
                  <span v-else>格: {{ p.position }}</span>
                </span>
              </div>
            </div>
          </div>

          <div class="panel-box">
            <h2 class="panel-title">
              <i class="fas fa-dice-d20"></i> 命运骰子
            </h2>
            <div class="scene" @click="rollDice">
              <div class="cube" :class="{ rolling: isRolling }" :style="diceStyle">
                <div class="cube__face cube__face--1">1</div>
                <div class="cube__face cube__face--2">2</div>
                <div class="cube__face cube__face--3">3</div>
                <div class="cube__face cube__face--4">4</div>
                <div class="cube__face cube__face--5">5</div>
                <div class="cube__face cube__face--6">6</div>
              </div>
            </div>
            <p style="
                text-align: center;
                color: var(--ctp-subtext1);
                font-size: 0.9rem;
              ">
              {{ diceMsg }}
            </p>
          </div>


        </div>
      </div>
    </div>

    <div class="modal" :class="{ show: showSettings }">
      <div class="modal-content" style="max-width: 900px; height: 600px">
        <h2 style="color: var(--ctp-mauve); margin-bottom: 20px">
          <i class="fas fa-book-reader"></i> 题库管理系统
        </h2>

        <div class="settings-layout">
          <div class="settings-sidebar">
            <div class="sidebar-header">
              <span>我的题库</span>
              <button class="btn btn-green" style="width: auto; padding: 4px 8px; font-size: 0.8rem"
                @click="createGroup">
                <i class="fas fa-plus"></i>
              </button>
            </div>
            <div class="group-list">
              <div v-for="g in questionGroups" :key="g.id" class="group-item"
                :class="{ active: currentGroupId === g.id }" @click="currentGroupId = g.id">
                <span class="group-name-display">{{ g.name }}</span>

                <div v-if="currentGroupId === g.id" style="display: flex; gap: 5px">
                  <i class="fas fa-trash trash-icon" @click.stop="deleteGroup(g.id)" title="删除分组"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-main" v-if="currentGroup">
            <div class="questions-header">
              <div style="flex: 1; display: flex; align-items: center; gap: 15px">
                <input type="text" v-model="currentGroup.name" class="group-name-edit-input" placeholder="分组名称" />
                <span style="
                    color: var(--ctp-overlay1);
                    font-size: 0.9rem;
                    font-weight: bold;
                    white-space: nowrap;
                  ">
                  {{ currentGroup.questions.length }} 题
                </span>
              </div>
              <button class="btn btn-green" style="width: auto" @click="addQuestion">
                <i class="fas fa-plus"></i> 添加题目
              </button>
            </div>

            <div class="questions-list">
              <div v-if="currentGroup.questions.length === 0" style="
                  text-align: center;
                  color: var(--ctp-overlay1);
                  margin-top: 50px;
                ">
                暂无题目，点击右上角添加
              </div>
              <div v-for="(q, idx) in currentGroup.questions" :key="q.id" class="question-row">
                <span style="
                    font-weight: bold;
                    color: var(--ctp-overlay1);
                    padding-top: 5px;
                  ">{{ idx + 1 }}.</span>
                <input v-model="q.q" class="inp-q" placeholder="输入题目..." />
                <input v-model="q.a" class="inp-a" placeholder="输入答案..." />
                <button class="btn btn-red" style="width: auto; padding: 5px 10px" @click="removeQuestion(idx)">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="settings-main" v-else style="
              justify-content: center;
              align-items: center;
              color: var(--ctp-overlay1);
            ">
            请在左侧选择一个分组
          </div>
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: flex-end">
          <button class="btn btn-blue" style="width: auto" @click="showSettings = false">
            <i class="fas fa-check"></i> 完成设置
          </button>
        </div>
      </div>
    </div>

    <div class="modal" :class="{ show: gameModal.show }">
      <div class="modal-content">
        <h2 style="
            color: var(--ctp-yellow);
            margin-bottom: 20px;
            font-size: 1.8rem;
          " v-html="gameModal.title"></h2>
        <div style="
            font-size: 1.2rem;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            line-height: 1.6;
          " v-html="gameModal.body"></div>
        <div style="
            margin-top: 25px;
            display: flex;
            gap: 15px;
            justify-content: center;
          ">
          <button v-for="(btn, index) in gameModal.buttons" :key="index" :class="['btn', btn.class]"
            style="width: auto; padding: 10px 25px; font-size: 1rem" @click="btn.action" v-html="btn.text"></button>
        </div>
      </div>
    </div>

    <div class="modal" :class="{ show: showDeleteGroupConfirm }">
      <div class="modal-content" style="max-width: 400px; text-align: center">
        <h2 style="color: var(--ctp-red)">
          <i class="fas fa-exclamation-triangle"></i> 确认删除?
        </h2>
        <p>此操作将永久删除该分组及其所有题目，无法恢复。</p>
        <div style="
            display: flex;
            gap: 20px;
            justify-content: center;
            margin-top: 20px;
          ">
          <button class="btn btn-gray" @click="showDeleteGroupConfirm = false">
            取消
          </button>
          <button class="btn btn-red" @click="confirmDeleteGroup">
            确认删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameLogic } from './script'

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
  showDeleteGroupConfirm,

  // 题库相关
  questionGroups,
  currentGroupId,
  currentGroup,

  resetGame,
  changePlayerCount,
  rollDice,
  getPlayerIcon,

  createGroup,
  deleteGroup,
  confirmDeleteGroup,
  addQuestion,
  removeQuestion,
} = useGameLogic()
</script>

<style scoped src="./style.css"></style>
