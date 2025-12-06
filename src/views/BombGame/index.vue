<template>
  <div class="bomb-game-container">
    <div class="title-bar" data-tauri-drag-region></div>
    <router-link to="/" class="back-home-btn">🏠</router-link>
    <div class="container">
      <header>
        <h1>单词炸弹游戏 💣</h1>
      </header>

      <div class="score-container">
        <button
          class="btn"
          @click="startGame"
          :disabled="(gameStarted && !gameOver) || isAnimatingBomb"
        >
          开始游戏
        </button>
        <button
          class="btn reset"
          @click="resetGame"
          :disabled="isAnimatingBomb"
        >
          重置
        </button>
        <div style="display: flex; align-items: center; gap: 8px">
          <label for="bombCountInput" style="font-weight: bold; color: #2c3e50"
            >炸弹数量</label
          >
          <input
            id="bombCountInput"
            type="number"
            min="1"
            :max="Math.max(1, words.length - 1)"
            v-model.number="bombCount"
            @change="updateBombCountConstraints"
            :disabled="isAnimatingBomb"
            style="
              width: 80px;
              padding: 8px;
              border: 2px solid #e0e0e0;
              border-radius: 8px;
              font-size: 16px;
            "
          />
          <button
            class="btn"
            @click="toggleInput"
            style="
              padding: 8px 16px;
              font-size: 16px;
              background: linear-gradient(90deg, #ffa62e, #ff3c38);
            "
          >
            {{ isInputHidden ? '显示单词输入' : '隐藏单词输入' }}
          </button>
        </div>
      </div>

      <div class="game-over" :class="{ show: gameOver }">你踩到了炸弹💣</div>

      <div class="cards-grid">
        <div
          v-for="(card, index) in cards"
          :key="index"
          class="card"
          :class="{
            flipped: card.flipped,
            disabled:
              !gameStarted || gameOver || card.flipped || isAnimatingBomb,
          }"
          @click="handleCardClick(index)"
        >
          <div class="card-inner">
            <div class="card-front">
              <div class="word">{{ card.word }}</div>
            </div>
            <div class="card-back" :class="card.type" ref="cardBackRefs">
              <div
                v-if="card.flipped && card.type === 'bomb'"
                class="bomb-icon"
              >
                💣
              </div>
              <div
                v-if="card.flipped && card.type === 'score'"
                class="score-value"
              >
                +{{ card.value }}
              </div>
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
          <h2 style="margin: 0; font-size: 20px; color: #333">单词输入</h2>
          <div style="display: flex; gap: 8px; flex-wrap: wrap">
            <!-- 分组操作按钮 -->
            <button
              v-if="currentGroupId"
              class="btn"
              @click="openSaveGroupModal(currentGroupId)"
              style="
                padding: 8px 16px;
                font-size: 14px;
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
                padding: 8px 16px;
                font-size: 14px;
                background: linear-gradient(90deg, #cb2d3e, #ef473a);
              "
            >
              🗑 删除本组
            </button>

            <!-- 单词操作按钮 -->
            <button
              class="btn"
              @click="addWord"
              :disabled="isAnimatingBomb"
              style="
                padding: 8px 16px;
                font-size: 14px;
                background: linear-gradient(90deg, #4facfe, #00f2fe);
              "
            >
              + 增加单词
            </button>
            <button
              class="btn"
              @click="removeWord"
              :disabled="isAnimatingBomb"
              style="
                padding: 8px 16px;
                font-size: 14px;
                background: linear-gradient(90deg, #fa709a, #fee140);
              "
            >
              - 删除单词
            </button>
            <button
              class="btn"
              @click="requestClearWords"
              :disabled="isAnimatingBomb"
              style="
                padding: 8px 16px;
                font-size: 14px;
                background: linear-gradient(90deg, #a18cd1, #fbc2eb);
              "
            >
              × 清空
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
        <h3>游戏规则</h3>
        <ol>
          <li>在下方输入框中输入英语单词（每个数字对应一个单词）</li>
          <li>点击"开始游戏"按钮开始游戏</li>
          <li>点击卡片翻开，可能会显示：积分（+1到+3）或炸弹💣</li>
          <li>翻开积分卡片代表安全</li>
          <li>翻开炸弹卡片会提示“踩到炸弹”，但游戏继续</li>
          <li>每轮游戏中有多个炸弹（上方“炸弹数量”可配置）</li>
          <li>点击"重置"按钮可以重新开始游戏</li>
        </ol>
      </div>

      <!-- 清空确认弹窗 -->
      <div v-if="showClearModal" class="modal-overlay">
        <div class="modal-content">
          <h3>确认清空？</h3>
          <p>此操作将清空所有已输入的单词，无法撤销。</p>
          <div class="modal-buttons">
            <button
              class="btn"
              style="background: #e0e0e0; color: #333; box-shadow: none"
              @click="cancelClearWords"
            >
              取消
            </button>
            <button
              class="btn"
              style="background: linear-gradient(90deg, #ff416c, #ff4b2b)"
              @click="confirmClearWords"
            >
              确定清空
            </button>
          </div>
        </div>
      </div>

      <!-- 删除分组确认弹窗 -->
      <div v-if="showDeleteConfirmModal" class="modal-overlay">
        <div class="modal-content">
          <h3>确认删除分组？</h3>
          <p>此操作将永久删除该分组，无法撤销。</p>
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

      <!-- 分组名称输入弹窗 (新建/重命名) -->
      <div v-if="showGroupModal" class="modal-overlay">
        <div class="modal-content">
          <h3>{{ isRenaming ? '重命名分组' : '新建分组' }}</h3>
          <p>请输入分组名称：</p>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameLogic } from './script'

const {
  words,
  cards,
  gameStarted,
  gameOver,
  bombCount,
  isInputHidden,
  isAnimatingBomb,
  showClearModal,
  groups,
  currentGroupId,
  showGroupModal,
  groupNameInput,
  showDeleteConfirmModal, // 新增
  isRenaming, // 新增
  startGame,
  resetGame,
  handleCardClick,
  addWord,
  removeWord,
  requestClearWords,
  confirmClearWords,
  cancelClearWords,
  toggleInput,
  handleWordInput,
  updateBombCountConstraints,
  openSaveGroupModal,
  closeGroupModal,
  saveGroup,
  requestDeleteGroup, // 新增
  confirmDeleteGroup, // 新增
  cancelDeleteGroup, // 新增
  selectGroup,
} = useGameLogic()
</script>

<style scoped src="./style.css"></style>
