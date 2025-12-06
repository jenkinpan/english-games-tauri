<template>
  <div class="flashcard-game-container">
    <div class="title-bar" data-tauri-drag-region></div>
    <router-link to="/" class="back-home-btn">🏠</router-link>
    <div class="container">
      <header>
        <h1>英语单词记忆卡片</h1>
      </header>

      <div class="timer-container">
        <div class="timer" id="timer" :style="timerStyle">
          {{ formattedTime }}
        </div>
        <button class="btn" @click="startTimer" :disabled="timerRunning">
          开始记忆
        </button>
        <button class="btn reset" @click="resetTimer">重置</button>
        <button class="btn toggle-btn" @click="toggleInput">
          {{ isInputHidden ? '显示输入' : '隐藏输入' }}
        </button>
      </div>

      <div class="cards-grid">
        <div
          v-for="(card, index) in cards"
          :key="index"
          class="card"
          :class="{ flipped: card.flipped }"
          @click="handleCardClick(index)"
        >
          <div class="card-inner">
            <div class="card-front">
              <div class="word">{{ card.displayWord }}</div>
            </div>
            <div class="card-back">
              <div class="number">{{ index + 1 }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="input-section" :class="{ hidden: isInputHidden }">
        <!-- 分组管理区域 (Excel-like Tabs) -->
        <div class="group-tabs-container">
          <div class="tabs-scroll-area">
            <!-- 分组标签 -->
            <div
              v-for="group in groups"
              :key="group.id"
              class="tab-item"
              :class="{ active: currentGroupId === group.id }"
              @click="selectGroup(group.id)"
            >
              <span class="tab-name">{{ group.name }}</span>
            </div>

            <!-- 添加新分组按钮 -->
            <div class="tab-add-btn" @click="openSaveGroupModal(null)">+</div>
          </div>
        </div>

        <!-- 统一的操作栏和标题 -->
        <div
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
          "
        >
          <h2 style="margin: 0">教师单词输入</h2>
          <div style="display: flex; gap: 10px">
            <!-- 分组操作按钮 -->
            <button
              v-if="currentGroupId"
              class="btn"
              @click="openSaveGroupModal(currentGroupId)"
              style="
                padding: 8px 20px;
                font-size: 16px;
                background: linear-gradient(90deg, #36d1dc, #5b86e5);
              "
            >
              ✎ 重命名
            </button>
            <button
              v-if="currentGroupId"
              class="btn"
              @click="requestDeleteGroup(currentGroupId)"
              style="
                padding: 8px 20px;
                font-size: 16px;
                background: linear-gradient(90deg, #cb2d3e, #ef473a);
              "
            >
              🗑 删除本组
            </button>

            <!-- 单词操作按钮 -->
            <button
              class="btn"
              @click="addWord"
              style="
                padding: 8px 20px;
                font-size: 16px;
                background: linear-gradient(90deg, #4facfe, #00f2fe);
              "
            >
              + 增加单词
            </button>
            <button
              class="btn"
              @click="removeWord"
              style="
                padding: 8px 20px;
                font-size: 16px;
                background: linear-gradient(90deg, #fa709a, #fee140);
              "
            >
              - 删除单词
            </button>
          </div>
        </div>
        <div class="word-inputs">
          <div v-for="(_word, index) in words" :key="index" class="input-group">
            <label>单词 {{ index + 1 }}:</label>
            <input
              type="text"
              v-model="words[index]"
              :placeholder="`输入单词 ${index + 1}`"
              @input="handleWordInput(index)"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
            />
          </div>
        </div>
      </div>

      <div class="instructions">
        <h3>使用说明</h3>
        <ol>
          <li>
            在下方输入框中输入英语单词（每个数字对应一个单词），可以点击"增加单词"或"删除单词"按钮调整数量
          </li>
          <li>点击"开始记忆"按钮开始1分钟倒计时</li>
          <li>学生需要在1分钟内记住所有单词</li>
          <li>倒计时结束后，所有卡片将自动翻面，只显示数字</li>
          <li>点击卡片可以查看单词（教师可控制显示）</li>
          <li>点击"重置"按钮可重新开始练习</li>
          <li>点击"隐藏输入"按钮可以隐藏或显示教师单词输入部分</li>
        </ol>
      </div>

      <!-- 分组名称输入弹窗 (新建/重命名) -->
      <div v-if="showGroupModal" class="modal-overlay">
        <div class="modal-content">
          <h3>{{ isRenaming ? '重命名分组' : '新建分组' }}</h3>
          <p>请输入分组名称:</p>
          <input
            type="text"
            v-model="groupNameInput"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            placeholder="输入分组名称"
            style="
              width: 100%;
              padding: 10px;
              margin: 10px 0;
              border: 1px solid #ddd;
              border-radius: 6px;
              font-size: 16px;
            "
            @keyup.enter="saveGroup"
          />
          <div class="modal-buttons">
            <button
              class="btn"
              style="background: #e0e0e0; color: #333; box-shadow: none"
              @click="closeGroupModal"
            >
              取消
            </button>
            <button
              class="btn"
              style="background: linear-gradient(90deg, #11998e, #38ef7d)"
              @click="saveGroup"
            >
              保存
            </button>
          </div>
        </div>
      </div>

      <!-- 删除分组确认弹窗 -->
      <div v-if="showDeleteConfirmModal" class="modal-overlay">
        <div class="modal-content">
          <h3>确认删除分组?</h3>
          <p>此操作将永久删除该分组,无法撤销。</p>
          <div class="modal-buttons">
            <button
              class="btn"
              style="background: #e0e0e0; color: #333; box-shadow: none"
              @click="cancelDeleteGroup"
            >
              取消
            </button>
            <button
              class="btn"
              style="background: linear-gradient(90deg, #ff416c, #ff4b2b)"
              @click="confirmDeleteGroup"
            >
              确定删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFlashcardGame } from './script'

// 使用解构获取所有逻辑和状态
const {
  words,
  cards,
  formattedTime,
  timerStyle,
  timerRunning,
  isInputHidden,
  groups,
  currentGroupId,
  showGroupModal,
  groupNameInput,
  showDeleteConfirmModal,
  isRenaming,
  startTimer,
  resetTimer,
  toggleInput,
  handleCardClick,
  handleWordInput,
  addWord,
  removeWord,
  openSaveGroupModal,
  closeGroupModal,
  saveGroup,
  requestDeleteGroup,
  confirmDeleteGroup,
  cancelDeleteGroup,
  selectGroup,
} = useFlashcardGame()
</script>

<style scoped src="./style.css"></style>
