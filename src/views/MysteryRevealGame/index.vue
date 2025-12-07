<template>
  <div class="bomb-game-container">
    <div class="title-bar" data-tauri-drag-region></div>
    <div class="container bg-white transition-colors duration-300">
      <header class="relative flex justify-center items-center mb-5">
        <router-link to="/"
          class="absolute left-0 flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors no-underline font-bold">
          <span class="text-lg"><i class="fas fa-home"></i></span> 首页
        </router-link>
        <h1
          class="m-0 text-3xl font-extrabold bg-linear-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          图片揭秘猜单词 🖼️
        </h1>
      </header>

      <div class="score-container">
        <button class="btn" @click="startGame" :disabled="gameStarted">
          {{ gameStarted ? '游戏进行中' : '开始游戏' }}
        </button>
        <button class="btn reset" @click="resetGame">重置</button>

        <div class="score-badge">🏆 分数: {{ score }}</div>

        <div class="score-badge level-badge">
          关卡: {{ currentWordIndex + 1 }} / {{ words.length }}
        </div>

        <button class="btn sound-btn" @click="playWordAudio" :disabled="!gameStarted" title="播放发音">
          🔊 提示
        </button>
      </div>

      <div class="game-stage" v-if="gameStarted">
        <div class="image-wrapper">
          <div class="target-image" :style="{ backgroundImage: `url(${currentImageUrl})` }"></div>

          <div class="mask-grid">
            <div v-for="(isCovered, index) in revealMask" :key="index" class="mask-block"
              :class="{ revealed: !isCovered }" @click="revealBlock(index)">
              <span class="mask-icon">?</span>
            </div>
          </div>

          <div class="success-overlay" v-if="showSuccessAnim">
            <div class="success-text">Correct! 🎉</div>
            <div class="success-word">{{ currentWord }}</div>
          </div>
        </div>

        <div class="guess-input-area">
          <input type="text" v-model="guessInput" placeholder="输入单词..." :class="{ 'error-shake': isInputError }"
            @keyup.enter="submitGuess" autocapitalize="off" spellcheck="false" />
          <button class="btn submit-btn" @click="submitGuess">提交 🚀</button>
        </div>
      </div>

      <div class="welcome-screen" v-else>
        <h2>准备好了吗？</h2>
        <p>1. 确保下方词库中已填好单词。</p>
        <p>2. 点击上方“开始游戏”按钮。</p>
        <p>3. 点击方块揭开图片，猜出单词！</p>
      </div>

      <div class="input-section">
        <div class="group-tabs-container">
          <div class="tabs-scroll-area">
            <div v-for="group in groups" :key="group.id" class="tab-item"
              :class="{ active: currentGroupId === group.id }" @click="selectGroup(group.id)">
              {{ group.name }}
            </div>
            <div class="tab-add-btn" @click="openSaveGroupModal(null)">+</div>
          </div>
        </div>

        <div class="controls-bar">
          <h2 style="margin: 0; font-size: 18px; color: #555">词库管理</h2>
          <div class="btn-group">
            <button v-if="currentGroupId" class="btn sm info" @click="openSaveGroupModal(currentGroupId)">
              ✎ 重命名
            </button>
            <button v-if="currentGroupId" class="btn sm danger" @click="requestDeleteGroup(currentGroupId)">
              🗑 删除
            </button>
            <button class="btn sm" @click="addWord">+ 加词</button>
            <button class="btn sm warn" @click="removeWord">- 减词</button>
            <button class="btn sm danger-light" @click="requestClearWords">
              × 清空
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div v-for="(_, index) in words" :key="index" class="flex flex-col">
            <label class="mb-1.5 font-bold text-[#888] text-xs">单词 {{ index + 1 }}</label>
            <input type="text" v-model="words[index]" @input="handleWordInput(index)" placeholder="输入单词 (如 apple)"
              class="w-full p-2.5 border border-gray-300 rounded-md text-base transition-colors focus:outline-none focus:border-[#36d1dc] focus:ring-2 focus:ring-[#36d1dc]/20 bg-white text-gray-900 placeholder-gray-400" />
          </div>
        </div>
      </div>

      <div v-if="showGroupModal" class="modal-overlay">
        <div class="modal-content bg-white text-gray-900">
          <h3 class="text-[#2c3e50] mb-4">{{ isRenaming ? '重命名' : '新建分组' }}</h3>
          <input type="text" v-model="groupNameInput" placeholder="分组名称"
            class="w-4/5 p-2.5 my-2.5 border border-gray-300 rounded-md text-base bg-white text-gray-900 focus:outline-none focus:border-[#36d1dc] focus:ring-2 focus:ring-[#36d1dc]/20" />
          <div class="modal-buttons">
            <button class="btn gray" @click="closeGroupModal">取消</button>
            <button class="btn" @click="saveGroup">保存</button>
          </div>
        </div>
      </div>

      <div v-if="showDeleteConfirmModal" class="modal-overlay">
        <div class="modal-content bg-white text-gray-900">
          <h3 class="text-[#2c3e50] mb-4">确认删除此分组？</h3>
          <div class="modal-buttons">
            <button class="btn gray" @click="cancelDeleteGroup">取消</button>
            <button class="btn danger" @click="confirmDeleteGroup">删除</button>
          </div>
        </div>
      </div>

      <div v-if="showClearModal" class="modal-overlay">
        <div class="modal-content bg-white text-gray-900">
          <h3 class="text-[#2c3e50] mb-4">确认清空单词？</h3>
          <div class="modal-buttons">
            <button class="btn gray" @click="cancelClearWords">取消</button>
            <button class="btn danger" @click="confirmClearWords">清空</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameLogic } from './script'

// 解构所有需要的变量，修复了 TS 缺失属性的报错
const {
  words,
  groups,
  currentGroupId,
  gameStarted,
  score,
  revealMask,
  guessInput,
  showSuccessAnim,
  isInputError,
  currentWordIndex,
  currentImageUrl,
  currentWord,
  showGroupModal,
  groupNameInput,
  isRenaming,
  showDeleteConfirmModal,
  showClearModal,
  startGame,
  resetGame,
  revealBlock,
  submitGuess,
  playWordAudio,
  addWord,
  removeWord,
  handleWordInput,
  requestClearWords,
  confirmClearWords,
  selectGroup,
  openSaveGroupModal,
  saveGroup,
  closeGroupModal,
  requestDeleteGroup,
  confirmDeleteGroup,
  cancelDeleteGroup,
  cancelClearWords,
} = useGameLogic()
</script>

<style scoped src="./style.css"></style>
