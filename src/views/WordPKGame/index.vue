<template>
  <div class="app-container word-pk-game">
    <header class="game-header">
      <div class="header-left">
        <button @click="goBack" class="btn btn-secondary btn-sm">
          <i class="fas fa-arrow-left"></i> 返回
        </button>
        <h1><i class="fas fa-shapes"></i> 单词消消乐 PK</h1>
      </div>

      <div class="controls">
        <div class="group-selector">
          <select v-model="currentGroupId" :disabled="isRunning">
            <option v-for="g in groups" :key="g.id" :value="g.id">
              {{ g.name }} ({{ g.words.length }})
            </option>
          </select>
        </div>

        <button
          @click="showLibraryModal = true"
          class="btn btn-secondary"
          :disabled="isRunning"
        >
          <i class="fas fa-layer-group"></i> 编辑词库
        </button>

        <div class="timer-setting">
          <span>限时(s):</span>
          <input
            type="number"
            v-model="timeLimit"
            :disabled="isRunning"
            min="10"
            max="300"
          />
        </div>

        <button
          @click="startGame"
          class="btn btn-primary"
          :disabled="isRunning"
        >
          <i class="fas fa-play"></i> 开始
        </button>

        <button @click="resetGame" class="btn btn-danger">
          <i class="fas fa-power-off"></i> 重置
        </button>
      </div>
    </header>

    <main class="battle-ground">
      <div class="player-zone player-blue">
        <div class="rotated-content-left">
          <div class="hud">
            <div class="avatar"><i class="fas fa-robot"></i> 蓝方</div>
            <div class="stats">
              <div class="score">{{ players[0].score }}</div>
              <div class="timer" :class="{ urgent: players[0].timeLeft < 10 }">
                {{ players[0].timeLeft }}
              </div>
            </div>
          </div>
          <div class="card-grid">
            <div
              v-for="card in players[0].cards"
              :key="card.id"
              class="card"
              :class="[card.type, card.status]"
              @click="handleCardClick(0, card)"
            >
              {{ card.text }}
            </div>
          </div>
        </div>
      </div>

      <div class="divider">
        <div class="vs-badge">VS</div>
      </div>

      <div class="player-zone player-red">
        <div class="rotated-content-right">
          <div class="hud">
            <div class="avatar"><i class="fas fa-dragon"></i> 红方</div>
            <div class="stats">
              <div class="score">{{ players[1].score }}</div>
              <div class="timer" :class="{ urgent: players[1].timeLeft < 10 }">
                {{ players[1].timeLeft }}
              </div>
            </div>
          </div>
          <div class="card-grid">
            <div
              v-for="card in players[1].cards"
              :key="card.id"
              class="card"
              :class="[card.type, card.status]"
              @click="handleCardClick(1, card)"
            >
              {{ card.text }}
            </div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showLibraryModal" class="modal-overlay">
      <div class="modal-content library-modal">
        <div class="library-header">
          <h2><i class="fas fa-book"></i> 单词库管理</h2>
          <button
            @click="showLibraryModal = false"
            class="btn btn-secondary btn-sm"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="library-body">
          <div class="group-sidebar">
            <div class="sidebar-header">
              <span>我的分组</span>
              <button @click="createGroup" class="btn btn-success btn-xs">
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
                <i
                  class="fas fa-trash delete-icon"
                  @click.stop="deleteGroup(g.id)"
                ></i>
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

            <div class="word-list-header">
              <span>英文 (English)</span>
              <span>中文 (意思)</span>
              <span></span>
            </div>

            <div class="word-list-scroll">
              <div
                v-for="word in currentEditingGroup.words"
                :key="word.id"
                class="word-row"
              >
                <input
                  type="text"
                  v-model="word.english"
                  placeholder="English..."
                  autocapitalize="off"
                  autocorrect="off"
                  spellcheck="false"
                />
                <input
                  type="text"
                  v-model="word.chinese"
                  placeholder="中文意思..."
                  autocapitalize="off"
                  autocorrect="off"
                  spellcheck="false"
                />
                <button @click="removeWord(word.id)" class="btn-icon">
                  <i class="fas fa-times-circle"></i>
                </button>
              </div>
              <button @click="addWord" class="btn-add-row">
                <i class="fas fa-plus"></i> 添加新单词
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="modal-overlay">
      <div class="modal-content confirm-modal">
        <i class="fas fa-exclamation-triangle warning-icon"></i>
        <h3>确认删除分组？</h3>
        <p>此操作将永久删除该分组及其所有单词，无法恢复。</p>
        <div
          style="
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-top: 20px;
          "
        >
          <button @click="cancelDeleteGroup" class="btn btn-secondary">
            取消
          </button>
          <button @click="confirmDeleteGroup" class="btn btn-danger">
            确认删除
          </button>
        </div>
      </div>
    </div>

    <div v-if="showResult" class="modal-overlay">
      <div class="modal-content result-modal">
        <i class="fas fa-trophy trophy-icon"></i>
        <div class="winner-announce">{{ winnerText }}</div>
        <div class="result-detail">
          <span class="p-result blue">蓝方: {{ players[0].score }}</span>
          <span class="p-result red">红方: {{ players[1].score }}</span>
        </div>
        <div style="display: flex; gap: 10px; justify-content: center">
          <button @click="startGame" class="btn btn-success">再来一局</button>
          <button @click="showResult = false" class="btn btn-secondary">
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameLogic } from './script'
import { useRouter } from 'vue-router'
import './style.css'

const router = useRouter()
const goBack = () => {
  router.push('/')
}

const {
  isRunning,
  showResult,
  showDeleteConfirm,
  timeLimit,
  players,
  winnerText,
  startGame,
  resetGame,
  handleCardClick,
  groups,
  currentGroupId,
  showLibraryModal,
  editingGroupId,
  currentEditingGroup,
  createGroup,
  deleteGroup,
  confirmDeleteGroup,
  cancelDeleteGroup,
  addWord,
  removeWord,
} = useGameLogic()
</script>
