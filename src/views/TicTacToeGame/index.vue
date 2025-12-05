<template>
  <div class="tictactoe-game-container">
    <div class="title-bar" data-tauri-drag-region></div>
    <router-link to="/" class="back-home-btn">
      <i class="fas fa-home"></i>
    </router-link>

    <h1><i class="fas fa-chess-board"></i> 英语单词井字棋</h1>

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
              :style="gameOver ? { cursor: 'not-allowed', opacity: 0.6 } : {}"
              @click="makeMove(index)"
            >
              <div class="cell-content">
                <div class="cell-word">
                  {{ cell.word || `单词${index + 1}` }}
                </div>
              </div>
            </div>
          </div>

          <div class="controls-area">
            <div class="game-buttons">
              <button class="btn btn-restart" @click="fullRestart">
                <i class="fas fa-redo"></i> 重新开始
              </button>
              <button class="btn btn-next-round" @click="nextRound">
                <i class="fas fa-step-forward"></i> 下一回合
              </button>
            </div>
          </div>
        </div>

        <div class="right-panel">
          <div class="scoreboard">
            <h3><i class="fas fa-trophy"></i> 计分板</h3>

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
                <span
                  ><i class="fas fa-circle" style="color: white"></i> 白棋:
                  {{ whitePercent }}%</span
                >
                <span
                  ><i class="fas fa-circle" style="color: #333"></i> 黑棋:
                  {{ blackPercent }}%</span
                >
              </div>
            </div>

            <div class="stats-container">
              <div class="stat-card white-stats">
                <div class="stat-label">白棋胜</div>
                <div class="stat-value">
                  {{ stats.whiteWins }}
                </div>
              </div>
              <div class="stat-card draw-stats">
                <div class="stat-label">平局</div>
                <div class="stat-value">{{ stats.draws }}</div>
              </div>
              <div class="stat-card black-stats">
                <div class="stat-label">黑棋胜</div>
                <div class="stat-value">
                  {{ stats.blackWins }}
                </div>
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
                <div class="score-icon">
                  <i :class="result.icon"></i>
                </div>
                <div class="score-content">
                  <div class="round">第 {{ result.round }} 回合</div>
                  <div class="winner">{{ result.winnerName }} 获胜</div>
                </div>
              </li>
            </ul>
            <p
              id="final-result"
              v-if="finalResultHTML"
              v-html="finalResultHTML"
            ></p>
          </div>

          <div class="settings-panel">
            <h3><i class="fas fa-cogs"></i> 词库设置</h3>

            <div class="settings-controls">
              <div class="group-selector">
                <select v-model="currentGroupId">
                  <option v-for="g in groups" :key="g.id" :value="g.id">
                    {{ g.name }} ({{ g.words.length }}词)
                  </option>
                </select>
              </div>

              <button class="btn btn-edit-lib" @click="showLibraryModal = true">
                <i class="fas fa-edit"></i> 管理分组与单词
              </button>
            </div>
          </div>

          <div class="game-rules">
            <h3><i class="fas fa-info-circle"></i> 玩法说明</h3>
            <p>1. 在上方设置面板中选择词库。</p>
            <p>2. 点击“管理”可添加/修改分组和单词。</p>
            <p>3. 双方轮流下棋，落子前需大声读出单词。</p>
            <p>4. 率先三子连线者获胜！</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showLibraryModal" class="modal-overlay">
      <div class="modal-content library-modal">
        <div class="library-header">
          <h2><i class="fas fa-book"></i> 单词库管理</h2>
          <button @click="showLibraryModal = false" class="btn-close">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="library-body">
          <div class="group-sidebar">
            <div class="sidebar-header">
              <span>分组列表</span>
              <button
                @click="createGroup"
                class="btn-xs btn-green"
                title="新建分组"
              >
                <i class="fas fa-plus"></i>
              </button>
            </div>
            <ul class="group-list">
              <li
                v-for="g in groups"
                :key="g.id"
                :class="{ active: editingGroupId === g.id }"
                @click="editingGroupId = g.id"
              >
                <span class="group-name">{{ g.name }}</span>
                <span class="delete-icon" @click.stop="deleteGroup(g.id)">
                  <i class="fas fa-trash-alt"></i>
                </span>
              </li>
            </ul>
          </div>

          <div class="word-editor" v-if="currentEditingGroup">
            <div class="editor-header">
              <input
                type="text"
                v-model="currentEditingGroup.name"
                class="group-name-input"
                placeholder="分组名称..."
              />
              <span class="word-count"
                >{{ currentEditingGroup.words.length }} 个单词</span
              >
            </div>

            <div class="word-list-header single-col">
              <span>单词 (Word)</span>
              <span style="width: 40px"></span>
            </div>

            <div class="word-list-scroll">
              <div
                v-for="word in currentEditingGroup.words"
                :key="word.id"
                class="word-row single-col"
              >
                <input
                  type="text"
                  v-model="word.text"
                  placeholder="输入单词..."
                />
                <button @click="removeWord(word.id)" class="btn-icon-del">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <button @click="addWord" class="btn-add-row">
                <i class="fas fa-plus"></i> 添加新单词
              </button>
            </div>
          </div>
          <div class="word-editor empty" v-else>请在左侧选择或创建一个分组</div>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="modal-overlay" style="z-index: 2100">
      <div class="modal-content confirm-modal">
        <div class="confirm-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>确认删除此分组？</h3>
        <p>此操作将永久删除该分组及其所有单词，无法恢复。</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" @click="cancelDeleteGroup">
            取消
          </button>
          <button class="btn btn-danger" @click="confirmDeleteGroup">
            确认删除
          </button>
        </div>
      </div>
    </div>

    <div class="win-message" :class="{ show: showWinModal }">
      <div class="win-content">
        <h2><i class="fas fa-flag-checkered"></i> 回合结束</h2>
        <p>{{ winText }}</p>
        <button class="btn" @click="closeWinModal">
          <i class="fas fa-play"></i> 继续游戏
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameLogic } from "./script";

const {
  currentPlayer,
  board,
  gameOver,
  stats,
  roundResults,
  showWinModal,
  winText,
  whitePercent,
  blackPercent,
  finalResultHTML,
  // Library
  groups,
  currentGroupId,
  editingGroupId,
  showLibraryModal,
  currentEditingGroup,
  // Functions
  makeMove,
  fullRestart,
  nextRound,
  closeWinModal,
  createGroup,
  deleteGroup,
  addWord,
  removeWord,
  // Delete Confirm
  showDeleteConfirm,
  confirmDeleteGroup,
  cancelDeleteGroup,
} = useGameLogic();
</script>

<style scoped src="./style.css"></style>
