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
            @click="toggleInput"
          >
            <i :class="isInputHidden ? 'fas fa-eye' : 'fas fa-eye-slash'"></i>
            {{ isInputHidden ? '显示输入' : '隐藏输入' }}
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
        class="bg-ctp-surface0 mx-8 mt-8 overflow-hidden rounded-2xl p-5 shadow-inner transition-all duration-500"
        :class="
          isInputHidden ? 'hidden max-h-0 p-0 opacity-0' : 'max-h-[500px]'
        "
      >
        <!-- 分组管理区域 (Excel-like Tabs) -->
        <div
          class="border-ctp-surface1 bg-ctp-surface1 -mx-5 -mt-5 mb-0 rounded-t-2xl border-b px-5 pt-4 pb-0"
        >
          <div class="scrollbar-none flex gap-1.5 overflow-x-auto pb-0">
            <!-- 分组标签 -->
            <div
              v-for="group in groups"
              :key="group.id"
              class="relative top-px mr-1 cursor-pointer rounded-t-xl border border-b-0 border-transparent px-5 py-2.5 text-sm whitespace-nowrap transition-all"
              :class="
                currentGroupId === group.id
                  ? 'bg-ctp-surface0 text-ctp-blue border-ctp-surface1 border-b-ctp-surface0 z-10 font-semibold'
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

        <!-- 统一的操作栏和标题 -->
        <div
          class="border-ctp-surface1 mb-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
        >
          <h2 class="text-ctp-text m-0 text-xl font-bold">单词输入</h2>
          <div class="flex flex-wrap gap-2">
            <!-- 分组操作按钮 -->
            <button
              v-if="currentGroupId"
              class="from-ctp-sky to-ctp-blue text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110"
              @click="openSaveGroupModal(currentGroupId)"
            >
              ✎ 重命名
            </button>
            <button
              v-if="currentGroupId"
              class="from-ctp-maroon to-ctp-red text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110"
              @click="requestDeleteGroup(currentGroupId)"
            >
              🗑 删除本组
            </button>

            <!-- 单词操作按钮 -->
            <button
              class="from-ctp-sapphire to-ctp-sky text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              @click="addWord"
              :disabled="isAnimatingBomb"
            >
              + 增加单词
            </button>
            <button
              class="from-ctp-pink to-ctp-yellow text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              @click="removeWord"
              :disabled="isAnimatingBomb"
            >
              - 删除单词
            </button>
            <button
              class="from-ctp-mauve to-ctp-pink text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              @click="requestClearWords"
              :disabled="isAnimatingBomb"
            >
              × 清空
            </button>
          </div>
        </div>

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

      <div
        class="border-ctp-blue bg-ctp-surface0 text-ctp-text mx-8 mt-2 mb-8 rounded-lg border-l-4 p-4 text-sm"
      >
        <h3 class="text-ctp-blue mt-0">游戏规则</h3>
        <ol class="mb-0 list-decimal pl-5">
          <li class="mb-2">
            在下方输入框中输入英语单词（每个数字对应一个单词）
          </li>
          <li class="mb-2">点击"开始游戏"按钮开始游戏</li>
          <li class="mb-2">点击卡片翻开，可能会显示：积分（+1到+3）或炸弹💣</li>
          <li class="mb-2">翻开积分卡片代表安全</li>
          <li class="mb-2">翻开炸弹卡片会提示"踩到炸弹"，但游戏继续</li>
          <li class="mb-2">每轮游戏中有多个炸弹（上方"炸弹数量"可配置）</li>
          <li class="mb-2">点击"重置"按钮可以重新开始游戏</li>
        </ol>
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
