<template>
  <div
    class="relative min-h-screen bg-(--bg-base) [-webkit-app-region:no-drag]"
  >
    <DragBar />

    <!-- Header -->
    <header class="game-header">
      <router-link
        to="/"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--bg-card) text-(--text-secondary) transition-transform hover:scale-110"
        title="返回首页"
      >
        <i class="fas fa-arrow-left text-sm"></i>
      </router-link>

      <span class="text-base font-extrabold text-(--accent-primary)"
        >气泡消消乐</span
      >

      <!-- Difficulty pills -->
      <div class="flex gap-1">
        <button
          v-for="d in ['easy', 'medium', 'hard'] as Difficulty[]"
          :key="d"
          class="diff-pill"
          :class="{ active: difficulty === d }"
          :disabled="gamePhase === 'playing'"
          @click="difficulty = d"
        >
          {{ d === 'easy' ? '简单' : d === 'medium' ? '中等' : '困难' }}
        </button>
      </div>

      <!-- Group selector -->
      <select
        v-if="groups.length"
        :value="currentGroupId"
        class="rounded-lg border border-(--border-color) bg-(--bg-card) px-2 py-1 text-sm text-(--text-primary) outline-none"
        :disabled="gamePhase === 'playing'"
        @change="selectGroup(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="g in groups" :key="g.id" :value="g.id">
          {{ g.name }}
        </option>
      </select>

      <!-- Hearts -->
      <div class="flex items-center gap-0.5">
        <span
          v-for="i in 3"
          :key="i"
          class="heart"
          :class="{ lost: i <= lostLives }"
          >{{ i <= lostLives ? '🤍' : '❤️' }}</span
        >
      </div>

      <!-- Score + combo -->
      <div class="flex flex-col items-center leading-tight">
        <span class="text-lg font-extrabold text-(--accent-primary)">{{
          score
        }}</span>
        <span v-if="combo >= 2" class="text-xs font-bold text-(--ctp-yellow)"
          >×{{ comboMultiplier }} 连击</span
        >
      </div>

      <div class="ml-auto flex gap-2">
        <!-- Word manager -->
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full bg-(--bg-card) text-(--text-secondary) transition-transform hover:scale-110"
          title="单词管理"
          @click="openWordManager"
        >
          <i class="fas fa-book-open text-sm"></i>
        </button>

        <!-- Start / Pause / Resume -->
        <button
          v-if="
            gamePhase === 'idle' ||
            gamePhase === 'gameover' ||
            gamePhase === 'win'
          "
          class="rounded-full bg-(--accent-primary) px-4 py-1.5 text-sm font-bold text-white transition-transform hover:scale-105"
          @click="startGame"
        >
          开始
        </button>
        <button
          v-else-if="gamePhase === 'playing'"
          class="rounded-full bg-(--bg-card) px-4 py-1.5 text-sm font-bold text-(--text-secondary) transition-transform hover:scale-105"
          @click="pauseGame"
        >
          暂停
        </button>
        <button
          v-else-if="gamePhase === 'paused'"
          class="rounded-full bg-(--accent-primary) px-4 py-1.5 text-sm font-bold text-white transition-transform hover:scale-105"
          @click="resumeGame"
        >
          继续
        </button>

        <!-- Reset -->
        <button
          v-if="gamePhase !== 'idle'"
          class="flex h-8 w-8 items-center justify-center rounded-full bg-(--bg-card) text-(--text-secondary) transition-transform hover:scale-110"
          title="重置"
          @click="resetGame"
        >
          <i class="fas fa-redo text-sm"></i>
        </button>
      </div>
    </header>

    <!-- Clue banner -->
    <div
      v-if="gamePhase === 'playing' || gamePhase === 'paused'"
      class="clue-banner"
    >
      <span
        class="clue-text"
        :class="{ 'clue-fading': clueFading, 'clue-entering': clueEntering }"
        >{{ currentTarget?.chinese }}</span
      >
    </div>

    <!-- Game arena -->
    <div :ref="(el: Element | null) => setArenaEl(el)" class="game-arena">
      <!-- Bubbles -->
      <div
        v-for="bubble in activeBubbles"
        :key="bubble.id"
        :ref="(el: Element | null) => setBubbleRef(bubble.id, el)"
        class="bubble"
        :class="{
          'is-popping': bubble.isPopping,
          'is-shaking': bubble.isShaking,
        }"
        :style="{
          left: `${bubble.x}%`,
          top: `${bubble.y}px`,
          background: `color-mix(in srgb, ${bubble.color} 30%, var(--bg-card))`,
          color: bubble.color,
          border: `2px solid color-mix(in srgb, ${bubble.color} 60%, transparent)`,
        }"
        @click="handleBubbleClick(bubble.id)"
      >
        <span>{{ bubble.word }}</span>
      </div>

      <!-- Idle overlay -->
      <div v-if="gamePhase === 'idle'" class="idle-overlay">
        <div class="text-5xl">🫧</div>
        <p class="text-lg font-bold text-(--text-secondary)">
          点击「开始」游戏
        </p>
        <p class="text-sm text-(--text-secondary) opacity-70">
          共 {{ validPairs.length }} 个单词对 ·
          {{
            difficulty === 'easy'
              ? '简单'
              : difficulty === 'medium'
                ? '中等'
                : '困难'
          }}
          难度
        </p>
      </div>
    </div>

    <!-- Pause overlay -->
    <div v-if="gamePhase === 'paused'" class="pause-overlay">
      <div class="text-5xl">⏸️</div>
      <p class="text-2xl font-extrabold text-white">已暂停</p>
      <button class="modal-btn primary" @click="resumeGame">继续游戏</button>
    </div>

    <!-- Win modal -->
    <div v-if="gamePhase === 'win'" class="modal-overlay">
      <div class="modal-box">
        <div class="mb-2 text-5xl">🏆</div>
        <h2>太棒了！</h2>
        <p class="score-line">答对了全部 {{ totalCount }} 个单词！</p>
        <div class="score-big">{{ score }}</div>
        <p class="score-line">
          最高记录：<span
            :class="score >= highScore ? 'font-bold text-(--ctp-yellow)' : ''"
            >{{ highScore }}</span
          >
          <span v-if="score >= highScore && score > 0"> 🎉 新纪录！</span>
        </p>
        <div class="mt-6 flex justify-center gap-3">
          <button class="modal-btn primary" @click="startGame">再玩一次</button>
          <router-link to="/" class="modal-btn secondary">回到首页</router-link>
        </div>
      </div>
    </div>

    <!-- Game-over modal -->
    <div v-if="gamePhase === 'gameover'" class="modal-overlay">
      <div class="modal-box">
        <div class="mb-2 text-5xl">💔</div>
        <h2>没关系！</h2>
        <p class="score-line">
          答对了 {{ answeredCount }} / {{ totalCount }} 个单词
        </p>
        <div class="score-big">{{ score }}</div>
        <p class="score-line">最高记录：{{ highScore }}</p>
        <div class="mt-6 flex justify-center gap-3">
          <button class="modal-btn primary" @click="startGame">重新开始</button>
          <router-link to="/" class="modal-btn secondary">回到首页</router-link>
        </div>
      </div>
    </div>

    <!-- Word manager modal -->
    <div v-if="showWordManagerModal" class="word-manager-modal">
      <div class="word-manager-inner">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-extrabold text-(--text-primary)">单词管理</h2>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full bg-(--bg-base) text-(--text-secondary) hover:text-(--ctp-red)"
            @click="closeWordManager"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Group tabs -->
        <div class="group-tabs">
          <button
            v-for="g in groups"
            :key="g.id"
            class="group-tab"
            :class="{ active: g.id === currentGroupId }"
            @click="selectGroup(g.id)"
          >
            {{ g.name }}
          </button>
          <button class="group-tab" title="添加分组" @click="createGroup">
            ＋
          </button>
        </div>

        <!-- Group actions -->
        <div v-if="currentGroup" class="mb-3 flex gap-2">
          <button
            class="rounded-lg bg-(--bg-base) px-3 py-1 text-xs text-(--text-secondary) hover:text-(--accent-primary)"
            @click="openRenameModal(currentGroupId!)"
          >
            <i class="fas fa-edit mr-1"></i>重命名
          </button>
          <button
            v-if="groups.length > 1"
            class="rounded-lg bg-(--bg-base) px-3 py-1 text-xs text-(--ctp-red) hover:bg-(--ctp-red)/10"
            @click="requestDeleteGroup(currentGroupId!)"
          >
            <i class="fas fa-trash mr-1"></i>删除分组
          </button>
        </div>

        <!-- Column headers -->
        <div
          class="mb-1 grid grid-cols-[20px_1fr_1fr_26px] gap-2 px-1 text-xs font-bold text-(--text-secondary)"
        >
          <span>#</span><span>English</span><span>中文</span><span></span>
        </div>

        <!-- Pair rows -->
        <div v-if="currentGroup" class="max-h-64 overflow-y-auto pr-1">
          <div
            v-for="(pair, idx) in currentGroup.pairs"
            :key="pair.id"
            class="pair-row"
          >
            <span class="pair-index">{{ Number(idx) + 1 }}</span>
            <input
              v-model="pair.english"
              class="pair-input"
              placeholder="apple"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              @input="handlePairInput"
            />
            <input
              v-model="pair.chinese"
              class="pair-input"
              placeholder="苹果"
              @input="handlePairInput"
            />
            <button class="remove-btn" @click="removePair(pair.id)">×</button>
          </div>
        </div>

        <button
          class="mt-3 w-full rounded-xl border-2 border-dashed border-(--border-color) py-2 text-sm text-(--text-secondary) transition-colors hover:border-(--accent-primary) hover:text-(--accent-primary)"
          @click="addPair"
        >
          ＋ 添加单词对
        </button>

        <p class="mt-2 text-center text-xs text-(--text-secondary) opacity-60">
          有效单词对：{{ validPairs.length }}（开始游戏至少需要 2 对）
        </p>
      </div>
    </div>

    <!-- Rename modal -->
    <div v-if="showRenameModal" class="rename-modal">
      <div class="rename-box">
        <p class="mb-3 font-bold text-(--text-primary)">重命名分组</p>
        <input
          v-model="renameInput"
          class="pair-input mb-4 w-full"
          placeholder="输入分组名称"
          @keydown.enter="confirmRename"
        />
        <div class="flex gap-2">
          <button class="modal-btn primary flex-1" @click="confirmRename">
            确定
          </button>
          <button class="modal-btn secondary flex-1" @click="cancelRename">
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- Delete group confirm -->
    <div
      v-if="showDeleteConfirmModal"
      class="modal-overlay"
      style="z-index: 500"
    >
      <div class="modal-box">
        <div class="mb-2 text-4xl">🗑️</div>
        <h2 class="text-xl">确认删除？</h2>
        <p class="score-line">此分组内的所有单词对将被删除。</p>
        <div class="mt-5 flex justify-center gap-3">
          <button
            class="modal-btn"
            style="background: var(--ctp-red); color: #fff"
            @click="confirmDeleteGroup"
          >
            删除
          </button>
          <button class="modal-btn secondary" @click="cancelDeleteGroup">
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DragBar from '@/components/DragBar.vue'
import { useBubblePopGame, type Difficulty } from './script'

const {
  gamePhase,
  score,
  combo,
  comboMultiplier,
  lostLives,
  highScore,
  difficulty,
  answeredCount,
  totalCount,
  activeBubbles,
  currentTarget,
  clueFading,
  clueEntering,
  validPairs,
  groups,
  currentGroupId,
  currentGroup,
  showWordManagerModal,
  showRenameModal,
  renameInput,
  showDeleteConfirmModal,
  setArenaEl,
  setBubbleRef,
  handleBubbleClick,
  startGame,
  pauseGame,
  resumeGame,
  resetGame,
  selectGroup,
  createGroup,
  openRenameModal,
  confirmRename,
  cancelRename,
  requestDeleteGroup,
  confirmDeleteGroup,
  cancelDeleteGroup,
  addPair,
  removePair,
  handlePairInput,
  openWordManager,
  closeWordManager,
} = useBubblePopGame()
</script>

<style src="./style.css"></style>
