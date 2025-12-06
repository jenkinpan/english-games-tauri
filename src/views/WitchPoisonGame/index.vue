<template>
  <div class="witch-poison-container" :class="{ shake: isShaking }">
    <div class="title-bar" data-tauri-drag-region></div>
    <router-link to="/" class="back-home-btn">
      <i class="fas fa-home"></i>
    </router-link>

    <header>
      <h1>
        <i class="fas fa-hat-wizard"></i> 女巫的毒药
        <i class="fas fa-flask-poison"></i>
      </h1>
    </header>

    <div class="game-container">
      <div class="control-panel">
        <h2 class="panel-title"><i class="fas fa-cogs"></i> 游戏设置</h2>

        <div class="settings-box">
          <div class="group-selector">
            <select v-model="currentGroupId" :disabled="gameState !== 'setup'">
              <option v-for="g in groups" :key="g.id" :value="g.id">
                {{ g.name }} ({{ g.words.length }})
              </option>
            </select>
          </div>
          <button
            class="btn btn-edit"
            @click="showLibraryModal = true"
            :disabled="gameState !== 'setup'"
          >
            <i class="fas fa-edit"></i> 编辑词库
          </button>

          <div class="divider"></div>

          <button
            class="btn btn-restart"
            :class="{ 'btn-disabled': !canStart }"
            :disabled="!canStart"
            @click="restartGame"
          >
            <i class="fas fa-play"></i>
            {{ gameState === 'setup' ? '开始游戏' : '重新开始' }}
          </button>

          <button
            v-if="gameState !== 'setup'"
            class="btn btn-stop"
            @click="stopGame"
          >
            <i class="fas fa-pencil-alt"></i> 停止并编辑
          </button>
        </div>

        <div class="instructions">
          <h3><i class="fas fa-book-open"></i> 玩法指南：</h3>
          <ul>
            <li>1. 在上方“编辑词库”中输入本课单词。</li>
            <li>2. 点击“开始游戏”。</li>
            <li>3. <strong>第一组</strong>选一个单词藏毒药 (保密)。</li>
            <li>4. <strong>第二组</strong>选一个单词藏毒药 (保密)。</li>
            <li>5. 全班轮流读单词并点击，点到毒药者淘汰！</li>
          </ul>
        </div>
      </div>

      <div class="word-grid-container">
        <h2 class="panel-title"><i class="fas fa-th"></i> 单词魔法阵</h2>

        <div
          class="game-status"
          :style="{ color: statusColor, borderColor: statusColor }"
        >
          {{ gameStatusText }}
        </div>

        <div class="word-grid" :class="gridClass" v-if="words.length > 0">
          <div
            v-for="(word, index) in words"
            :key="index"
            class="word-cell"
            :class="{
              'selected-poison': tempSelectedPoisonIndex === index,
              poisoned: poisonedIndices.includes(index),
              safe: safeIndices.includes(index),
            }"
            @click="handleCellClick(index)"
          >
            {{ word }}
          </div>
        </div>
        <div v-else class="empty-state">
          <i class="fas fa-ghost"></i>
          <p>词库为空，请先添加单词</p>
        </div>
      </div>
    </div>

    <div class="notification" v-if="showNotification">
      <i class="fas fa-skull-crossbones"></i><br />
      <span v-html="notificationText"></span>
    </div>

    <div v-if="showLibraryModal" class="modal-overlay">
      <div class="modal-content library-modal">
        <div class="library-header">
          <h2><i class="fas fa-book-reader"></i> 词库编辑器</h2>
          <button @click="showLibraryModal = false" class="btn-close">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="library-body">
          <div class="group-sidebar">
            <div class="sidebar-header">
              <span>我的分组</span>
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

            <div class="word-list-header">
              <span>单词 (Word)</span>
              <span style="width: 40px"></span>
            </div>

            <div class="word-list-scroll">
              <div
                v-for="word in currentEditingGroup.words"
                :key="word.id"
                class="word-row"
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

    <div v-if="showDeleteConfirm" class="modal-overlay" style="z-index: 2200">
      <div class="modal-content confirm-modal">
        <i class="fas fa-exclamation-triangle warning-icon"></i>
        <h3>确认删除此分组？</h3>
        <p>此操作将永久删除该分组及其单词，无法恢复。</p>
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
  </div>
</template>

<script setup lang="ts">
import { useWitchGame } from './script'

const {
  words,
  gameState,
  tempSelectedPoisonIndex,
  poisonedIndices,
  safeIndices,
  showNotification,
  notificationText,
  isShaking,
  // Library
  groups,
  currentGroupId,
  showLibraryModal,
  editingGroupId,
  currentEditingGroup,
  showDeleteConfirm,
  canStart,
  // Computed
  gridClass,
  gameStatusText,
  statusColor,
  // Methods
  restartGame,
  stopGame, // 导出新方法
  handleCellClick,
  createGroup,
  deleteGroup,
  confirmDeleteGroup,
  cancelDeleteGroup,
  addWord,
  removeWord,
} = useWitchGame()
</script>

<style scoped src="./style.css"></style>
