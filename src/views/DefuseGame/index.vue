<template>
  <div
    class="bg-ctp-base min-h-screen p-2 pt-[calc(0.5rem_+_var(--titlebar-h,0px))] transition-colors duration-300 sm:p-5 sm:pt-[calc(1.25rem_+_var(--titlebar-h,0px))]"
    style="
      padding-bottom: max(0.5rem, var(--safe-bottom));
      padding-left: max(0.5rem, var(--safe-left));
      padding-right: max(0.5rem, var(--safe-right));
    "
  >
    <DragBar />
    <div
      class="bg-ctp-mantle mx-auto flex min-h-[95vh] max-w-[1400px] flex-col overflow-hidden rounded-2xl shadow-2xl"
    >
      <header
        class="border-ctp-surface1 bg-ctp-surface0 flex flex-wrap items-center justify-center gap-3 rounded-xl border-b-2 px-4 py-3 shadow-md sm:justify-between sm:px-6 sm:py-4"
      >
        <div class="flex items-center gap-4">
          <BackHomeButton variant="inline" />
          <div class="bg-ctp-surface2 h-6 w-0.5"></div>
          <h1
            class="text-ctp-red flex items-center justify-center gap-3 text-2xl font-black tracking-wide"
          >
            <i class="fas fa-scissors"></i> 拆弹专家
          </h1>
        </div>

        <div class="flex items-center gap-2">
          <i
            v-for="n in 3"
            :key="n"
            class="fas text-2xl"
            :class="
              n <= hearts
                ? 'fa-heart text-ctp-red'
                : 'fa-heart-broken text-ctp-overlay0'
            "
          ></i>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="bg-ctp-surface1 flex items-center gap-1 rounded-lg p-1">
            <button
              v-for="opt in difficulties"
              :key="opt.value"
              class="rounded-md px-3 py-1.5 text-sm font-bold transition-all"
              :class="
                difficulty === opt.value
                  ? 'bg-ctp-blue text-ctp-base shadow-sm'
                  : 'text-ctp-subtext1 hover:text-ctp-text'
              "
              :disabled="gameStarted && !gameOver"
              @click="setDifficulty(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
          <button
            class="bg-ctp-green text-ctp-base inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-bold shadow-md transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            @click="startGame"
            :disabled="(gameStarted && !gameOver) || isAnimating"
          >
            <i class="fas fa-play"></i> 开始
          </button>
          <button
            class="bg-ctp-red text-ctp-base inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-bold shadow-md transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            @click="resetGame"
            :disabled="isAnimating"
          >
            <i class="fas fa-redo"></i> 重置
          </button>
          <button
            class="bg-ctp-mauve text-ctp-base inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:brightness-110"
            @click="openWordManager"
          >
            <i class="fas fa-edit"></i> 管理单词
          </button>
        </div>
      </header>

      <div
        class="text-ctp-subtext1 mx-8 mt-5 text-center text-lg font-bold"
        v-if="gameStarted && !gameOver"
      >
        已拆 {{ safeCut }} / 共 {{ safeTotal }} 根安全线 · 炸弹
        {{ bombCount }} 个
      </div>

      <div
        v-if="gameOver"
        class="animate-fadeIn mx-8 mt-5 rounded-2xl p-5 text-center text-2xl font-bold text-white shadow-lg"
        :class="
          gameWon
            ? 'from-ctp-green to-ctp-teal bg-linear-to-br'
            : 'from-ctp-red to-ctp-maroon bg-linear-to-br'
        "
      >
        {{ gameWon ? '🎉 拆弹成功！所有安全线已剪断' : '💥 Boom！拆弹失败' }}
      </div>

      <div class="wires-grid">
        <div
          v-for="(wire, index) in wires"
          :key="index"
          class="wire-cell"
          :class="{
            cut: wire.state === 'cut',
            detonated: wire.state === 'detonated',
            disabled:
              !gameStarted ||
              gameOver ||
              wire.state !== 'intact' ||
              isAnimating,
          }"
          @click="cutWire(index)"
        >
          <div
            class="wire-track"
            :class="wire.state"
            :ref="(el) => setWireRef(el, index)"
          >
            <span
              class="wire-segment left"
              :style="{ background: `var(${wire.color})` }"
            ></span>
            <span class="wire-knot">
              <i
                v-if="wire.state === 'intact'"
                class="fas fa-scissors text-ctp-text/70"
              ></i>
              <i
                v-else-if="wire.state === 'cut'"
                class="fas fa-check text-ctp-green"
              ></i>
              <span v-else class="text-xl">💥</span>
            </span>
            <span
              class="wire-segment right"
              :style="{ background: `var(${wire.color})` }"
            ></span>
          </div>
          <div class="wire-word">{{ wire.word }}</div>
        </div>
      </div>

      <div
        class="border-ctp-blue bg-ctp-surface0 text-ctp-text mx-8 mt-8 mb-8 rounded-lg border-l-4 p-4 text-sm"
      >
        <h3 class="text-ctp-blue mt-0">游戏规则</h3>
        <ol class="mb-0 list-decimal pl-5">
          <li class="mb-2">点击"管理单词"为 9 根电线各输入一个单词</li>
          <li class="mb-2">
            选择难度（简单 2 / 普通 3 / 困难 4 个炸弹），点击"开始"
          </li>
          <li class="mb-2">
            点击电线即剪断：安全线显示 ✓，炸弹线爆炸并扣 1 颗心
          </li>
          <li class="mb-2">剪开全部安全线即获胜；三颗心扣光即失败</li>
          <li class="mb-2">点击"重置"回到准备状态，再次"开始"会重新分布炸弹</li>
        </ol>
      </div>

      <WordManagerModals
        v-if="
          showWordManagerModal ||
          showClearModal ||
          showDeleteConfirmModal ||
          showGroupModal
        "
        :show-word-manager-modal="showWordManagerModal"
        :show-clear-modal="showClearModal"
        :show-delete-confirm-modal="showDeleteConfirmModal"
        :show-group-modal="showGroupModal"
        :is-renaming="isRenaming"
        :groups="groups"
        :current-group-id="currentGroupId"
        :words="words"
        v-model:group-name-input="groupNameInput"
        @close-word-manager="closeWordManager"
        @select-group="selectGroup"
        @open-save-group-modal="openSaveGroupModal"
        @request-delete-group="requestDeleteGroup"
        @request-clear-words="requestClearWords"
        @handle-word-input="handleWordInput"
        @confirm-clear-words="confirmClearWords"
        @cancel-clear-words="cancelClearWords"
        @confirm-delete-group="confirmDeleteGroup"
        @cancel-delete-group="cancelDeleteGroup"
        @save-group="saveGroup"
        @close-group-modal="closeGroupModal"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DragBar from '@/components/DragBar.vue'
import BackHomeButton from '@/components/BackHomeButton.vue'
import WordManagerModals from './WordManagerModals.vue'
import { useDefuseGame, type Difficulty } from './script'

const difficulties: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: '简单' },
  { value: 'normal', label: '普通' },
  { value: 'hard', label: '困难' },
]

const {
  words,
  wires,
  difficulty,
  hearts,
  gameStarted,
  gameOver,
  gameWon,
  isAnimating,
  setWireRef,
  bombCount,
  safeTotal,
  safeCut,
  showWordManagerModal,
  showClearModal,
  groups,
  currentGroupId,
  showGroupModal,
  groupNameInput,
  showDeleteConfirmModal,
  isRenaming,
  startGame,
  resetGame,
  setDifficulty,
  cutWire,
  handleWordInput,
  openWordManager,
  closeWordManager,
  requestClearWords,
  confirmClearWords,
  cancelClearWords,
  openSaveGroupModal,
  closeGroupModal,
  saveGroup,
  requestDeleteGroup,
  confirmDeleteGroup,
  cancelDeleteGroup,
  selectGroup,
} = useDefuseGame()
</script>

<style scoped src="./style.css"></style>
