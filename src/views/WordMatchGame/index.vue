<template>
  <div class="word-match-game-container">
    <div class="title-bar" data-tauri-drag-region></div>

    <header class="game-header">
      <div class="header-left">
        <router-link to="/" class="btn btn-secondary btn-sm back-home-link">
          <i class="fas fa-home"></i> 首页
        </router-link>

        <div class="divider-vertical"></div>

        <h1><i class="fas fa-th-large"></i> 单词分类大挑战</h1>
      </div>

      <div class="controls">
        <div class="group-selector">
          <select v-model="currentGroupId" :disabled="isPlaying">
            <option v-for="g in groups" :key="g.id" :value="g.id">
              {{ g.name }}
            </option>
          </select>
        </div>

        <button
          class="btn btn-secondary"
          @click="showLibraryModal = true"
          :disabled="isPlaying"
        >
          <i class="fas fa-edit"></i> 词库
        </button>

        <button
          class="btn btn-primary"
          @click="startGame"
          :disabled="isPlaying"
        >
          <i class="fas fa-play"></i> 开始
        </button>

        <button
          class="btn btn-danger"
          @click="resetGame"
          :disabled="!isPlaying"
        >
          <i class="fas fa-redo"></i> 重置
        </button>
      </div>
    </header>

    <main class="game-board">
      <div class="left-panel">
        <div class="panel-header">
          <h2><i class="fas fa-layer-group"></i> 单词池</h2>
          <span class="count-badge" v-if="isPlaying">{{
            poolWords.length
          }}</span>
        </div>

        <div class="word-pool" v-if="isPlaying">
          <transition-group name="list">
            <div
              v-for="word in poolWords"
              :key="word.id"
              class="word-chip"
              :class="{
                selected: selectedWordId === word.id,
                dragging: draggedWord?.id === word.id,
              }"
              draggable="true"
              @click="handleWordClick(word)"
              @dragstart="onDragStart($event, word)"
              @touchstart="onTouchStart($event, word)"
              @touchmove="onTouchMove($event)"
              @touchend="onTouchEnd($event)"
            >
              {{ word.text }}
            </div>
          </transition-group>

          <div v-if="poolWords.length === 0" class="empty-state">
            <i class="fas fa-check-circle"></i>
            <p>所有单词已分类！</p>
          </div>
        </div>

        <div v-else class="welcome-screen">
          <i class="fas fa-gamepad"></i>
          <p>点击上方“开始”按钮启动游戏</p>
        </div>
      </div>

      <div class="right-panel">
        <div class="panel-header">
          <h2><i class="fas fa-folder-open"></i> 分类归纳</h2>
        </div>

        <div class="categories-grid" v-if="isPlaying">
          <div
            v-for="cat in gameCategories"
            :key="cat.id"
            class="category-card"
            :class="{
              'highlight-drop': selectedWordId || draggedWord,
              'shake-error': errorCategoryId === cat.id,
            }"
            :data-cat-id="cat.id"
            @click="handleCategoryClick(cat.id)"
            @dragover.prevent
            @drop="onDrop($event, cat.id)"
          >
            <div class="category-title">{{ cat.name }}</div>
            <div class="category-content">
              <transition-group name="fade">
                <span
                  v-for="w in getCompletedWordsForCategory(cat.id)"
                  :key="w.id"
                  class="mini-word"
                >
                  {{ w.text }}
                </span>
              </transition-group>
            </div>
          </div>
        </div>
        <div v-else class="welcome-screen">
          <p>分类区域将显示在这里</p>
        </div>
      </div>
    </main>

    <div
      v-if="touchGhost.visible"
      class="drag-ghost"
      :style="{
        left: touchGhost.x + 'px',
        top: touchGhost.y + 'px',
      }"
    >
      {{ touchGhost.text }}
    </div>

    <div v-if="showLibraryModal" class="modal-overlay">
      <div class="modal-content library-modal">
        <div class="library-header">
          <h2><i class="fas fa-book"></i> 词库编辑器</h2>
          <button @click="showLibraryModal = false" class="btn-close">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="library-body">
          <div class="group-sidebar">
            <div class="sidebar-header">
              <span>我的词库</span>
              <button @click="createGroup" class="btn-icon-add" title="新建">
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
            <div class="editor-top-bar">
              <input
                type="text"
                v-model="currentEditingGroup.name"
                class="group-name-input"
                placeholder="输入词库名称..."
              />
              <button @click="addCategory" class="btn btn-primary btn-sm">
                <i class="fas fa-folder-plus"></i> 添加新类别
              </button>
            </div>

            <div class="categories-editor-list">
              <div
                v-for="(cat, cIdx) in currentEditingGroup.categories"
                :key="cat.id"
                class="category-edit-block"
              >
                <div class="cat-header">
                  <input
                    type="text"
                    v-model="cat.name"
                    class="cat-name-input"
                    placeholder="输入类别名称 (例如: 水果)"
                  />
                  <button @click="removeCategory(cIdx)" class="btn-text-danger">
                    删除类别
                  </button>
                </div>

                <div class="cat-words-grid">
                  <div
                    v-for="(word, wIdx) in cat.words"
                    :key="word.id"
                    class="word-input-item"
                  >
                    <input
                      type="text"
                      v-model="word.text"
                      placeholder="单词..."
                    />
                    <i
                      class="fas fa-times remove-word-icon"
                      @click="removeWordFromCategory(cIdx, wIdx)"
                    ></i>
                  </div>
                  <button
                    @click="addWordToCategory(cIdx)"
                    class="btn-add-word-dashed"
                  >
                    + 单词
                  </button>
                </div>
              </div>

              <div
                v-if="currentEditingGroup.categories.length === 0"
                class="empty-editor-tip"
              >
                点击右上角“添加新类别”开始编辑
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="modal-overlay" style="z-index: 2200">
      <div class="modal-content confirm-modal">
        <i class="fas fa-exclamation-triangle warning-icon"></i>
        <h3>确认删除?</h3>
        <p>此操作将永久删除该词库。</p>
        <div class="modal-actions">
          <button @click="cancelDeleteGroup" class="btn btn-secondary">
            取消
          </button>
          <button @click="confirmDeleteGroup" class="btn btn-danger">
            确认删除
          </button>
        </div>
      </div>
    </div>

    <div v-if="showWinModal" class="modal-overlay">
      <div class="modal-content win-modal-modern">
        <div class="win-icon-wrapper">
          <i class="fas fa-trophy win-icon"></i>
          <div class="fireworks"></div>
        </div>
        <h2 class="win-title">分类完成!</h2>
        <p class="win-subtitle">你的逻辑思维简直太棒了！</p>
        <div class="win-actions">
          <button @click="showWinModal = false" class="btn btn-outline">
            留在这里
          </button>
          <button @click="startGame" class="btn btn-primary-lg">
            再玩一次
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCategoryGame } from './script'
import './style.css'

const {
  groups,
  currentGroupId,
  editingGroupId,
  showLibraryModal,
  currentEditingGroup,
  showDeleteConfirm,
  isPlaying,
  poolWords,
  gameCategories,
  selectedWordId,
  showWinModal,
  // 导出状态
  draggedWord,
  errorCategoryId,
  touchGhost,
  // 导出方法
  onDragStart,
  onDrop,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  createGroup,
  deleteGroup,
  confirmDeleteGroup,
  cancelDeleteGroup,
  addCategory,
  removeCategory,
  addWordToCategory,
  removeWordFromCategory,
  startGame,
  resetGame,
  handleWordClick,
  handleCategoryClick,
  getCompletedWordsForCategory,
} = useCategoryGame()
</script>
