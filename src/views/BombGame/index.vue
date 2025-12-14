<template>
  <div class="bg-ctp-base min-h-screen p-5 transition-colors duration-300">
    <div
      class="bg-ctp-mantle mx-auto flex min-h-[95vh] max-w-[1400px] flex-col overflow-hidden rounded-2xl shadow-2xl"
    >
      <header
        class="border-ctp-surface1 bg-ctp-surface0 flex items-center justify-between rounded-xl border-b-2 px-6 py-4 shadow-md"
      >
        <div class="flex items-center gap-4">
          <router-link
            to="/"
            class="bg-ctp-surface1 text-ctp-text inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:brightness-110"
          >
            <i class="fas fa-home"></i> 首页
          </router-link>
          <div class="bg-ctp-surface2 h-6 w-0.5"></div>
          <h1
            class="text-ctp-mauve flex items-center justify-center gap-3 text-2xl font-black tracking-wide"
          >
            <i class="fas fa-bomb"></i> 单词炸弹游戏
          </h1>
        </div>
        <button
          class="bg-ctp-green text-ctp-base inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-bold shadow-md transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          @click="startGame"
          :disabled="(gameStarted && !gameOver) || isAnimatingBomb"
        >
          <i class="fas fa-play"></i> 开始游戏
        </button>
        <button
          class="bg-ctp-red text-ctp-base inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-bold shadow-md transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          @click="resetGame"
          :disabled="isAnimatingBomb"
        >
          <i class="fas fa-redo"></i> 重置
        </button>
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2">
            <label
              for="bombCountInput"
              class="text-ctp-text font-bold whitespace-nowrap"
            >
              炸弹数量
            </label>
            <input
              id="bombCountInput"
              type="number"
              min="1"
              :max="Math.max(1, words.length - 1)"
              v-model.number="bombCount"
              @change="updateBombCountConstraints"
              :disabled="isAnimatingBomb"
              class="border-ctp-surface1 dark:bg-ctp-surface0 text-ctp-text focus:border-ctp-blue focus:ring-ctp-blue/20 w-20 rounded-lg border-2 bg-white p-2 text-base transition-colors focus:ring-2 focus:outline-none"
            />
          </div>
          <button
            class="bg-ctp-mauve text-ctp-base inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:brightness-110"
            @click="openWordManager"
          >
            <i class="fas fa-edit"></i>
            管理单词
          </button>
        </div>
      </header>

      <div
        class="from-ctp-red to-ctp-maroon mx-8 mt-5 rounded-2xl bg-linear-to-br p-5 text-center text-2xl font-bold text-white shadow-lg transition-all duration-500"
        :class="gameOver ? 'animate-fadeIn block' : 'hidden'"
      >
        你踩到了炸弹💣
      </div>

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

      <div
        class="border-ctp-blue bg-ctp-surface0 text-ctp-text mx-8 mt-8 mb-8 rounded-lg border-l-4 p-4 text-sm"
      >
        <h3 class="text-ctp-blue mt-0">游戏规则</h3>
        <ol class="mb-0 list-decimal pl-5">
          <li class="mb-2">
            点击上方"管理单词"输入英语单词（每个数字对应一个单词）
          </li>
          <li class="mb-2">点击"开始游戏"按钮开始游戏</li>
          <li class="mb-2">点击卡片翻开，可能会显示：积分（+1到+3）或炸弹💣</li>
          <li class="mb-2">翻开积分卡片代表安全</li>
          <li class="mb-2">翻开炸弹卡片会提示"踩到炸弹"，但游戏继续</li>
          <li class="mb-2">每轮游戏中有多个炸弹（上方"炸弹数量"可配置）</li>
          <li class="mb-2">点击"重置"按钮可以重新开始游戏</li>
        </ol>
      </div>

      <!-- 单词管理弹窗 -->
      <div
        v-if="showWordManagerModal"
        class="animate-fadeIn fixed inset-0 z-1000 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div
          class="animate-popIn bg-ctp-base flex h-[85vh] w-11/12 max-w-5xl flex-col overflow-hidden rounded-2xl shadow-2xl"
        >
          <!-- 弹窗标题栏 -->
          <div
            class="border-ctp-surface1 flex items-center justify-between border-b px-6 py-4"
          >
            <h2 class="text-ctp-text m-0 text-xl font-bold">
              <i class="fas fa-book mr-2"></i>单词库管理
            </h2>
            <button
              class="text-ctp-subtext1 hover:text-ctp-red transition-colors"
              @click="closeWordManager"
            >
              <i class="fas fa-times text-2xl"></i>
            </button>
          </div>

          <!-- 弹窗内容区域 -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- 分组管理区域 (Excel-like Tabs) -->
            <div
              class="border-ctp-surface1 bg-ctp-surface1 mx-0 mt-0 mb-0 rounded-t-xl border-b px-5 pt-4 pb-0"
            >
              <div class="scrollbar-none flex gap-1.5 overflow-x-auto pb-0">
                <!-- 分组标签 -->
                <div
                  v-for="group in groups"
                  :key="group.id"
                  class="relative top-px mr-1 cursor-pointer rounded-t-xl border border-b-0 border-transparent px-5 py-2.5 text-sm whitespace-nowrap transition-all"
                  :class="
                    currentGroupId === group.id
                      ? 'bg-ctp-base text-ctp-blue border-ctp-surface1 border-b-ctp-base z-10 font-semibold'
                      : 'text-ctp-subtext1 hover:text-ctp-text bg-transparent hover:bg-white/50'
                  "
                  @click="selectGroup(group.id)"
                >
                  <span>{{ group.name }}</span>
                </div>

                <!-- 添加新分组按钮 -->
                <div
                  class="text-ctp-subtext1 hover:text-ctp-blue mb-1 ml-1 flex h-8 w-8 cursor-pointer items-center justify-center self-center rounded-full bg-white/50 text-xl transition-all hover:bg-white hover:shadow-md"
                  @click="openSaveGroupModal(null)"
                >
                  +
                </div>
              </div>
            </div>

            <div
              class="bg-ctp-base border-ctp-surface1 rounded-b-xl border border-t-0 p-5 shadow-sm"
            >
              <!-- 统一的操作栏 -->
              <div
                class="mb-6 flex flex-wrap items-center justify-between gap-3"
              >
                <div class="flex flex-wrap gap-2">
                  <!-- 分组操作按钮 -->
                  <button
                    v-if="currentGroupId"
                    class="from-ctp-sky to-ctp-blue text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110"
                    @click="openSaveGroupModal(currentGroupId)"
                  >
                    ✎ 重命名分组
                  </button>
                  <button
                    v-if="currentGroupId"
                    class="from-ctp-maroon to-ctp-red text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110"
                    @click="requestDeleteGroup(currentGroupId)"
                  >
                    🗑 删除本组
                  </button>
                </div>

                <div class="flex flex-wrap gap-2">
                  <!-- 单词操作按钮 -->
                  <button
                    class="from-ctp-sapphire to-ctp-sky text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110"
                    @click="addWord"
                  >
                    + 增加单词
                  </button>
                  <button
                    class="from-ctp-pink to-ctp-yellow text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110"
                    @click="removeWord"
                  >
                    - 删除单词
                  </button>
                  <button
                    class="from-ctp-mauve to-ctp-pink text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110"
                    @click="requestClearWords"
                  >
                    × 清空
                  </button>
                </div>
              </div>

              <!-- 单词输入网格 -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div
                  v-for="(_word, index) in words"
                  :key="index"
                  class="flex flex-col"
                >
                  <label class="text-ctp-blue mb-1.5 font-bold">
                    单词 {{ index + 1 }}:
                  </label>
                  <input
                    type="text"
                    v-model="words[index]"
                    :placeholder="`输入单词 ${index + 1}`"
                    @input="handleWordInput(index)"
                    autocapitalize="off"
                    autocorrect="off"
                    spellcheck="false"
                    class="border-ctp-surface1 dark:bg-ctp-surface0 text-ctp-text placeholder-ctp-overlay1 focus:border-ctp-blue focus:ring-ctp-blue/20 w-full rounded-lg border-2 bg-white p-3 text-base transition-colors focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 底部按钮 -->
          <div
            class="border-ctp-surface1 bg-ctp-surface0 flex justify-end border-t px-6 py-4"
          >
            <button
              class="from-ctp-green to-ctp-teal text-ctp-base rounded-lg bg-linear-to-r px-8 py-2.5 font-bold shadow-md transition-all hover:brightness-110"
              @click="closeWordManager"
            >
              完成
            </button>
          </div>
        </div>
      </div>

      <!-- 清空确认弹窗 -->
      <div
        v-if="showClearModal"
        class="animate-fadeIn fixed inset-0 z-2000 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div
          class="animate-popIn bg-ctp-mantle w-11/12 max-w-md rounded-2xl p-8 text-center shadow-2xl"
        >
          <h3 class="text-ctp-text mt-0 text-2xl font-bold">确认清空？</h3>
          <p class="text-ctp-subtext1 mb-6 text-base">
            此操作将清空所有已输入的单词，无法撤销。
          </p>
          <div class="flex justify-center gap-4">
            <button
              class="bg-ctp-surface1 text-ctp-text rounded-lg px-6 py-2.5 font-bold shadow-none transition-all hover:brightness-110"
              @click="cancelClearWords"
            >
              取消
            </button>
            <button
              class="from-ctp-red to-ctp-maroon text-ctp-base rounded-lg bg-linear-to-r px-6 py-2.5 font-bold shadow-md transition-all hover:brightness-110"
              @click="confirmClearWords"
            >
              确定清空
            </button>
          </div>
        </div>
      </div>

      <!-- 删除分组确认弹窗 -->
      <div
        v-if="showDeleteConfirmModal"
        class="animate-fadeIn fixed inset-0 z-2000 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div
          class="animate-popIn bg-ctp-mantle w-11/12 max-w-md rounded-2xl p-8 text-center shadow-2xl"
        >
          <h3 class="text-ctp-text mt-0 text-2xl font-bold">确认删除分组？</h3>
          <p class="text-ctp-subtext1 mb-6 text-base">
            此操作将永久删除该分组，无法撤销。
          </p>
          <div class="flex justify-center gap-4">
            <button
              class="bg-ctp-surface1 text-ctp-text rounded-lg px-6 py-2.5 font-bold shadow-none transition-all hover:brightness-110"
              @click="cancelDeleteGroup"
            >
              取消
            </button>
            <button
              class="from-ctp-red to-ctp-maroon text-ctp-base rounded-lg bg-linear-to-r px-6 py-2.5 font-bold shadow-md transition-all hover:brightness-110"
              @click="confirmDeleteGroup"
            >
              确定删除
            </button>
          </div>
        </div>
      </div>

      <!-- 分组名称输入弹窗 (新建/重命名) -->
      <div
        v-if="showGroupModal"
        class="animate-fadeIn fixed inset-0 z-2000 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div
          class="animate-popIn bg-ctp-mantle w-11/12 max-w-md rounded-2xl p-8 text-center shadow-2xl"
        >
          <h3 class="text-ctp-text mt-0 text-2xl font-bold">
            {{ isRenaming ? '重命名分组' : '新建分组' }}
          </h3>
          <p class="text-ctp-subtext1 mb-4 text-base">请输入分组名称：</p>
          <input
            type="text"
            v-model="groupNameInput"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            placeholder="输入分组名称"
            class="border-ctp-surface1 dark:bg-ctp-surface0 text-ctp-text focus:border-ctp-blue focus:ring-ctp-blue/20 mb-4 w-full rounded-lg border-2 bg-white p-3 text-base transition-colors focus:ring-2 focus:outline-none"
            @keyup.enter="saveGroup"
          />
          <div class="flex justify-center gap-4">
            <button
              class="bg-ctp-surface1 text-ctp-text rounded-lg px-6 py-2.5 font-bold shadow-none transition-all hover:brightness-110"
              @click="closeGroupModal"
            >
              取消
            </button>
            <button
              class="from-ctp-green to-ctp-teal text-ctp-base rounded-lg bg-linear-to-r px-6 py-2.5 font-bold shadow-md transition-all hover:brightness-110"
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
  // isInputHidden, // Removed
  isAnimatingBomb,
  showClearModal,
  groups,
  currentGroupId,
  showGroupModal,
  groupNameInput,
  showDeleteConfirmModal, // 新增
  isRenaming, // 新增
  showWordManagerModal, // Added
  startGame,
  resetGame,
  handleCardClick,
  addWord,
  removeWord,
  requestClearWords,
  confirmClearWords,
  cancelClearWords,
  // toggleInput, // Removed
  openWordManager, // Added
  closeWordManager, // Added
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

<style scoped>
/* === 卡片网格布局 === */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  margin-top: 30px;
  padding: 0 30px;
}

/* === 卡片样式 === */
.card {
  height: 240px;
  perspective: 1000px;
  cursor: pointer;
}

.card.flipped {
  cursor: default;
}

.card.disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

/* === 卡片翻转动画 === */
.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s;
  transform-style: preserve-3d;
  border-radius: 15px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.card.flipped .card-inner {
  transform: rotateY(180deg);
}

.card-front,
.card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 15px;
  padding: 20px;
}

/* === 卡片渐变色（保留原有设计）=== */
.card-front {
  background: linear-gradient(135deg, #43cea2, #185a9d);
  color: white;
}

.card-back {
  background: linear-gradient(135deg, #ff7e5f, #feb47b);
  color: white;
  transform: rotateY(180deg);
}

.card-back.bomb {
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  animation: shake 0.5s;
}

.card-back.score {
  background: linear-gradient(135deg, #00b09b, #96c93d);
}

/* === 卡片内容 === */
.word {
  font-size: 42px;
  font-weight: bold;
}

.bomb-icon {
  font-size: 80px;
  margin-bottom: 10px;
}

.score-value {
  font-size: 50px;
  font-weight: bold;
}

/* === 震动动画 === */
@keyframes shake {
  0%,
  100% {
    transform: rotateY(180deg) translateX(0);
  }

  25% {
    transform: rotateY(180deg) translateX(-10px);
  }

  75% {
    transform: rotateY(180deg) translateX(10px);
  }
}

/* === 爆炸动画 === */
:deep(.explosion) {
  position: absolute;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    rgba(255, 230, 120, 0.95) 0%,
    rgba(255, 140, 0, 0.85) 45%,
    rgba(255, 0, 0, 0.6) 70%,
    rgba(255, 0, 0, 0) 72%
  );
  pointer-events: none;
  animation: explode 600ms ease-out forwards;
  filter: blur(0.3px);
}

@keyframes explode {
  0% {
    transform: translate(-50%, -50%) scale(0.2);
    opacity: 0.9;
  }

  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }

  100% {
    transform: translate(-50%, -50%) scale(1.6);
    opacity: 0;
  }
}

/* === 粒子动画 === */
:deep(.particle) {
  position: absolute;
  width: 10px;
  height: 10px;
  background: radial-gradient(circle, #fff59d 0%, #ff9800 60%, #f44336 100%);
  border-radius: 50%;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: fly 720ms ease-out forwards;
}

@keyframes fly {
  0% {
    transform: translate(-50%, -50%) scale(0.7);
    opacity: 1;
  }

  100% {
    transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty)))
      scale(0.4);
    opacity: 0;
  }
}

/* === Tailwind 动画支持 === */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

.animate-popIn {
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* === 响应式设计 === */
@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}

/* === 滚动条隐藏 === */
.scrollbar-none::-webkit-scrollbar {
  display: none;
}

.scrollbar-none {
  scrollbar-width: none;
}
</style>
