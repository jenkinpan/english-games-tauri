<template>
  <div class="listen-pick-container">
    <DragBar />
    <BackHomeButton />

    <div class="listen-pick-card">
      <header class="lp-header">
        <h1>听音辨词 <span class="title-emoji">🎧</span></h1>
        <p class="lp-subtitle">听一听，选出你听到的英文单词</p>
      </header>

      <div v-if="!isPlaying && !isGameOver" class="lp-start">
        <button class="lp-btn lp-btn-primary" @click="startGame">
          开始游戏
        </button>
        <button class="lp-btn lp-btn-ghost" @click="openLibrary">
          <i class="fas fa-book"></i> 词库管理
        </button>
        <p class="lp-current-group" v-if="currentGroup">
          当前词库：{{ currentGroup.name }}
        </p>
      </div>

      <div v-else-if="isPlaying" class="lp-play">
        <div class="lp-status">
          <div class="lp-status-pills">
            <span class="lp-progress"
              >第 {{ questionNumber }} / {{ totalQuestions }} 题</span
            >
            <span class="lp-score">得分 {{ score }}</span>
            <span class="lp-combo" v-if="combo > 1">🔥 连击 ×{{ combo }}</span>
          </div>
          <button class="lp-pause-btn" @click="pauseGame" aria-label="暂停">
            <i class="fas fa-pause"></i>
          </button>
        </div>

        <button
          class="lp-speaker"
          :class="{ 'is-speaking': isSpeaking }"
          @click="replay"
          aria-label="重听单词"
        >
          <span class="lp-speaker-ring"><i class="fas fa-volume-up"></i></span>
          <span class="lp-speaker-label">点我再听一次</span>
        </button>

        <div class="lp-options">
          <button
            v-for="option in options"
            :key="option.word.id"
            class="lp-option"
            :class="option.state"
            :disabled="answered || isPaused"
            @click="selectOption(option)"
          >
            {{ option.word.english }}
          </button>
        </div>
      </div>

      <div v-else class="lp-result">
        <div class="lp-result-emoji">
          {{ score >= totalQuestions * 8 ? '🏆' : '🎉' }}
        </div>
        <h2>本轮结束！</h2>
        <p class="lp-result-score">得分 {{ score }}</p>
        <div class="lp-result-actions">
          <button class="lp-btn lp-btn-primary" @click="startGame">
            再来一局
          </button>
          <button class="lp-btn lp-btn-ghost" @click="resetGame">返回</button>
        </div>
      </div>
    </div>

    <div v-if="showLibrary" class="lp-modal-mask" @click.self="closeLibrary">
      <div class="lp-modal">
        <div class="lp-modal-head">
          <h3>词库管理</h3>
          <button
            class="lp-modal-close"
            @click="closeLibrary"
            aria-label="关闭"
          >
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <div class="lp-modal-body">
          <div class="lp-group-bar">
            <button
              v-for="group in groups"
              :key="group.id"
              class="lp-group-tab"
              :class="{ active: group.id === editingGroupId }"
              @click="selectEditingGroup(group.id)"
            >
              {{ group.name }}
            </button>
            <button class="lp-group-tab lp-group-add" @click="createGroup">
              <i class="fas fa-plus"></i>
            </button>
          </div>

          <div v-if="editingGroup" class="lp-editor">
            <div class="lp-editor-row lp-editor-name">
              <input
                v-model="editingGroup.name"
                class="lp-input"
                placeholder="词库名称"
              />
              <button class="lp-btn-danger" @click="requestDeleteGroup">
                <i class="fas fa-trash"></i> 删除词库
              </button>
            </div>

            <div class="lp-word-list">
              <div
                v-for="word in editingGroup.words"
                :key="word.id"
                class="lp-word-row"
              >
                <input
                  v-model="word.english"
                  class="lp-input"
                  placeholder="English"
                />
                <input
                  v-model="word.chinese"
                  class="lp-input"
                  placeholder="中文"
                />
                <button
                  class="lp-word-remove"
                  @click="removeWord(word.id)"
                  aria-label="删除单词"
                >
                  <i class="fas fa-xmark"></i>
                </button>
              </div>
            </div>

            <button class="lp-btn lp-btn-ghost lp-add-word" @click="addWord">
              <i class="fas fa-plus"></i> 添加单词
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isPaused" class="lp-modal-mask">
      <div class="lp-pause-panel">
        <div class="lp-pause-icon"><i class="fas fa-pause"></i></div>
        <h2>已暂停</h2>
        <p>
          第 {{ questionNumber }} / {{ totalQuestions }} 题 · 当前得分
          {{ score }}
        </p>
        <div class="lp-pause-actions">
          <button class="lp-btn lp-btn-primary" @click="resumeGame">
            继续本局
          </button>
          <button class="lp-btn lp-btn-ghost" @click="exitToStart">
            退出本局
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="lp-modal-mask">
      <div class="lp-confirm">
        <p>确定删除当前词库吗？此操作不可恢复。</p>
        <div class="lp-confirm-actions">
          <button class="lp-btn-danger" @click="confirmDeleteGroup">
            删除
          </button>
          <button class="lp-btn lp-btn-ghost" @click="cancelDeleteGroup">
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DragBar from '@/components/DragBar.vue'
import BackHomeButton from '@/components/BackHomeButton.vue'
import { useListenPickGame } from './script'

const {
  isSpeaking,
  groups,
  currentGroup,
  showLibrary,
  editingGroupId,
  editingGroup,
  showDeleteConfirm,
  isPlaying,
  isPaused,
  isGameOver,
  questionNumber,
  totalQuestions,
  score,
  combo,
  options,
  answered,
  startGame,
  resetGame,
  pauseGame,
  resumeGame,
  exitToStart,
  replay,
  selectOption,
  openLibrary,
  closeLibrary,
  selectEditingGroup,
  createGroup,
  requestDeleteGroup,
  confirmDeleteGroup,
  cancelDeleteGroup,
  addWord,
  removeWord,
} = useListenPickGame()
</script>

<style src="./style.css"></style>
