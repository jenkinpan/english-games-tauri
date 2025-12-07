<template>
  <div class="lucky-one-container">
    <div class="title-bar" data-tauri-drag-region></div>
    <router-link to="/" class="back-home-btn">🏠</router-link>
    <div class="container bg-white transition-colors duration-300">
      <header>
        <h1>谁是幸运儿 🍀</h1>
      </header>

      <div class="score-container">
        <button class="btn" @click="startGame" :disabled="(gameStarted && !gameOver) || isAnimating">
          开始游戏
        </button>
        <button class="btn reset" @click="resetGame" :disabled="isAnimating">
          重置
        </button>
        <div style="display: flex; align-items: center; gap: 8px">
          <label for="luckyCountInput" class="font-bold text-[#2c3e50]">幸运儿数量</label>
          <input id="luckyCountInput" type="number" min="1" :max="Math.max(1, words.length)" v-model.number="luckyCount"
            @change="updateLuckyCountConstraints" :disabled="isAnimating"
            class="w-20 p-2 border-2 border-gray-200 rounded-lg text-base scheme-light text-gray-900" />
          <button class="btn" @click="toggleInput" style="
              padding: 8px 16px;
              font-size: 16px;
              background: linear-gradient(90deg, #ffa62e, #ff3c38);
            ">
            {{ isInputHidden ? '显示单词输入' : '隐藏单词输入' }}
          </button>
        </div>
      </div>

      <div class="cards-grid">
        <div v-for="(card, index) in cards" :key="index" class="card" :class="{
          flipped: card.flipped,
          disabled: !gameStarted || gameOver || card.flipped || isAnimating,
        }" @click="handleCardClick(index)">
          <div class="card-inner">
            <div class="card-front">
              <div class="word">{{ card.word }}</div>
            </div>
            <div class="card-back" :class="card.type" ref="cardBackRefs">
              <div v-if="card.flipped && card.type === 'lucky'" class="lucky-content">
                <div class="clover-icon tl">🍀</div>
                <div class="clover-icon tr">🍀</div>
                <div class="clover-icon bl">🍀</div>
                <div class="clover-icon br">🍀</div>
                <div class="score-value">+{{ card.value }}</div>
              </div>
              <div v-if="card.flipped && card.type === 'empty'" class="unlucky-content">
                <div class="skull-icon">💀</div>
                <div class="unlucky-text">You are unlucky.</div>
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
            <div v-for="group in groups" :key="group.id" class="tab-item"
              :class="{ active: currentGroupId === group.id }" @click="selectGroup(group.id)">
              <span class="tab-name">{{ group.name }}</span>
            </div>

            <!-- 添加新分组按钮 -->
            <div class="tab-add-btn" @click="openSaveGroupModal(null)">+</div>
          </div>
        </div>

        <!-- 统一的操作栏和标题 -->
        <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
          ">
          <h2 style="margin: 0; font-size: 20px; color: #333">单词输入</h2>
          <div style="display: flex; gap: 8px; flex-wrap: wrap">
            <!-- 分组操作按钮 -->
            <button v-if="currentGroupId" class="btn" @click="openSaveGroupModal(currentGroupId)" style="
                padding: 8px 16px;
                font-size: 14px;
                background: linear-gradient(90deg, #36d1dc, #5b86e5);
              ">
              ✎ 重命名
            </button>
            <button v-if="currentGroupId" class="btn" @click="requestDeleteGroup(currentGroupId)" style="
                padding: 8px 16px;
                font-size: 14px;
                background: linear-gradient(90deg, #cb2d3e, #ef473a);
              ">
              🗑 删除本组
            </button>

            <!-- 单词操作按钮 -->
            <button class="btn" @click="addWord" :disabled="isAnimating" style="
                padding: 8px 16px;
                font-size: 14px;
                background: linear-gradient(90deg, #4facfe, #00f2fe);
              ">
              + 增加单词
            </button>
            <button class="btn" @click="removeWord" :disabled="isAnimating" style="
                padding: 8px 16px;
                font-size: 14px;
                background: linear-gradient(90deg, #fa709a, #fee140);
              ">
              - 删除单词
            </button>
            <button class="btn" @click="requestClearWords" :disabled="isAnimating" style="
                padding: 8px 16px;
                font-size: 14px;
                background: linear-gradient(90deg, #a18cd1, #fbc2eb);
              ">
              × 清空
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div v-for="(_word, index) in words" :key="index" class="flex flex-col">
            <label class="mb-1.5 font-bold text-[#3498db]">单词 {{ index + 1 }}:</label>
            <input type="text" v-model="words[index]" :placeholder="`输入单词 ${index + 1}`" @input="handleWordInput(index)"
              autocapitalize="off" autocorrect="off" spellcheck="false"
              class="w-full p-3 border-2 border-gray-200 rounded-lg text-base transition-colors focus:outline-none focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/20 bg-white text-gray-900 placeholder-gray-400" />
          </div>
        </div>
      </div>

      <div class="instructions">
        <h3>游戏规则</h3>
        <ol>
          <li>在下方输入框中输入英语单词（每个数字对应一个单词）</li>
          <li>设置"幸运儿数量"</li>
          <li>点击"开始游戏"按钮开始游戏</li>
          <li>点击卡片翻开，如果是幸运儿，将获得1-5分！</li>
          <li>如果不是幸运儿，则没有分数。</li>
          <li>看看谁能找到所有的幸运儿！</li>
        </ol>
      </div>

      <!-- 清空确认弹窗 -->
      <div v-if="showClearModal" class="modal-overlay">
        <div class="modal-content">
          <h3>确认清空？</h3>
          <p>此操作将清空所有已输入的单词，无法撤销。</p>
          <div class="modal-buttons">
            <button class="btn" style="background: #e0e0e0; color: #333; box-shadow: none" @click="cancelClearWords">
              取消
            </button>
            <button class="btn" style="background: linear-gradient(90deg, #ff416c, #ff4b2b)" @click="confirmClearWords">
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
            <button class="btn" style="background: #e0e0e0; color: #333; box-shadow: none" @click="cancelDeleteGroup">
              取消
            </button>
            <button class="btn" style="background: linear-gradient(90deg, #ff416c, #ff4b2b)"
              @click="confirmDeleteGroup">
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
          <input type="text" v-model="groupNameInput" autocapitalize="off" autocorrect="off" spellcheck="false"
            placeholder="输入分组名称" style="
              width: 100%;
              padding: 10px;
              margin: 10px 0;
              border: 1px solid #ddd;
              border-radius: 6px;
              font-size: 16px;
            " @keyup.enter="saveGroup" />
          <div class="modal-buttons">
            <button class="btn" style="background: #e0e0e0; color: #333; box-shadow: none" @click="closeGroupModal">
              取消
            </button>
            <button class="btn" style="background: linear-gradient(90deg, #11998e, #38ef7d)" @click="saveGroup">
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
  luckyCount,
  isInputHidden,
  isAnimating,
  showClearModal,
  groups,
  currentGroupId,
  showGroupModal,
  groupNameInput,
  showDeleteConfirmModal,
  isRenaming,
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
  updateLuckyCountConstraints,
  openSaveGroupModal,
  closeGroupModal,
  saveGroup,
  requestDeleteGroup,
  confirmDeleteGroup,
  cancelDeleteGroup,
  selectGroup,
} = useGameLogic()
</script>

<style scoped src="./style.css"></style>
