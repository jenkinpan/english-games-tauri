<template>
  <div
    class="box-border flex min-h-screen w-full items-center justify-center bg-linear-to-br from-[#6a11cb] to-[#2575fc] p-5 font-sans"
  >
    <div
      class="fixed top-0 right-0 left-0 z-1000 h-[30px]"
      data-tauri-drag-region
    ></div>
    <div
      class="relative flex w-full max-w-[900px] flex-col rounded-[20px] bg-white p-[30px] shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-colors duration-300"
    >
      <header class="relative mb-5 flex items-center justify-center">
        <router-link
          to="/"
          class="absolute left-0 flex items-center gap-1 rounded-full bg-gray-100 px-4 py-2 font-bold text-gray-700 no-underline transition-colors hover:bg-gray-200"
        >
          <span class="text-lg"><i class="fas fa-home"></i></span> 首页
        </router-link>
        <h1
          class="m-0 mt-0 mb-5 bg-linear-to-r from-[#2575fc] to-[#6a11cb] bg-clip-text text-center text-[28px] font-extrabold text-transparent"
        >
          图片揭秘猜单词 🖼️
        </h1>
      </header>

      <div
        class="mb-[25px] flex flex-wrap items-center justify-center gap-[15px]"
      >
        <button
          class="cursor-pointer rounded-[50px] border-none bg-linear-to-r from-[#00b09b] to-[#96c93d] px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-white shadow-[0_4px_10px_rgba(0,176,155,0.3)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-60"
          @click="startGame"
          :disabled="gameStarted"
        >
          {{ gameStarted ? '游戏进行中' : '开始游戏' }}
        </button>
        <button
          class="cursor-pointer rounded-[50px] border-none bg-linear-to-r from-[#ff416c] to-[#ff4b2b] px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-white shadow-[0_4px_10px_rgba(255,65,108,0.3)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-60"
          @click="resetGame"
        >
          重置
        </button>

        <div
          class="rounded-[10px] bg-[#f0f2f5] px-[15px] py-2 text-[18px] font-extrabold text-[#2c3e50]"
        >
          🏆 分数: {{ score }}
        </div>

        <div
          class="rounded-[10px] bg-[#e3f2fd] px-[15px] py-2 text-[18px] font-extrabold text-[#1565c0]"
        >
          关卡: {{ currentWordIndex + 1 }} / {{ words.length }}
        </div>

        <button
          class="cursor-pointer rounded-[50px] border-none bg-linear-to-r from-[#4facfe] to-[#00f2fe] px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-white shadow-[0_4px_10px_rgba(79,172,254,0.3)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-60"
          @click="playWordAudio"
          :disabled="!gameStarted"
          title="播放发音"
        >
          🔊 提示
        </button>

        <button
          class="cursor-pointer rounded-[50px] border-none bg-linear-to-r from-[#8e2de2] to-[#4a00e0] px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-white shadow-[0_4px_10px_rgba(142,45,226,0.3)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-60"
          @click="showInputSection = !showInputSection"
        >
          {{ showInputSection ? '👀 隐藏词库' : '📝 显示词库' }}
        </button>
      </div>

      <!-- Game Stage -->
      <div class="flex flex-col items-center gap-5" v-if="gameStarted">
        <div
          class="relative aspect-square w-full max-w-[400px] overflow-hidden rounded-[15px] bg-[#eee] shadow-[0_8px_25px_rgba(0,0,0,0.15)]"
        >
          <div
            class="absolute top-0 left-0 h-full w-full bg-cover bg-center"
            :style="{ backgroundImage: `url(${currentImageUrl})` }"
          ></div>

          <div
            class="absolute top-0 left-0 grid h-full w-full grid-cols-4 grid-rows-4"
          >
            <div
              v-for="(isCovered, index) in revealMask"
              :key="index"
              class="flex cursor-pointer items-center justify-center border border-white/10 bg-linear-to-br from-[#43cea2] to-[#185a9d] transition-all duration-300 hover:bg-linear-to-br hover:from-[#5ddfb5] hover:to-[#2672c2]"
              :class="{ 'pointer-events-none scale-50 opacity-0': !isCovered }"
              @click="revealBlock(index)"
            >
              <span class="text-2xl font-bold text-white/30">?</span>
            </div>
          </div>

          <div
            class="absolute top-0 left-0 z-10 flex h-full w-full animate-[fadeIn_0.3s_ease-out] flex-col items-center justify-center bg-[rgba(150,201,61,0.9)] text-white"
            v-if="showSuccessAnim"
          >
            <div class="text-[28px] font-bold">Correct! 🎉</div>
            <div class="mt-2.5 text-[40px] font-black uppercase">
              {{ currentWord }}
            </div>
          </div>
        </div>

        <div class="mt-2.5 flex w-full justify-center gap-2.5">
          <input
            type="text"
            v-model="guessInput"
            placeholder="输入单词..."
            :class="[
              'w-full max-w-[250px] rounded-[50px] border-[3px] border-[#e0e0e0] bg-white px-5 py-3 text-center text-xl text-gray-900 placeholder-gray-400 transition-colors duration-300 outline-none focus:border-[#4facfe]',
              { 'animate-shake border-[#ff4b2b]!': isInputError },
            ]"
            @keyup.enter="submitGuess"
            autocapitalize="off"
            spellcheck="false"
          />
          <button
            class="w-auto min-w-[100px] cursor-pointer rounded-[50px] border-none bg-linear-to-r from-[#fa709a] to-[#fee140] px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-white shadow-[0_4px_10px_rgba(0,176,155,0.3)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-60"
            @click="submitGuess"
          >
            提交 🚀
          </button>
        </div>
      </div>

      <div
        class="mb-5 rounded-[15px] border-2 border-dashed border-[#ddd] p-[30px] text-center text-[#666]"
        v-else
      >
        <h2 class="mt-0 text-[#2c3e50]">准备好了吗？</h2>
        <p class="my-[5px]">1. 确保下方词库中已填好单词。</p>
        <p class="my-[5px]">2. 点击上方“开始游戏”按钮。</p>
        <p class="my-[5px]">3. 点击方块揭开图片，猜出单词！</p>
      </div>

      <!-- Input Section -->
      <div
        v-show="showInputSection"
        class="mt-[30px] rounded-[15px] border border-[#e0e0e0] bg-[#f8f9fa] p-5"
      >
        <div
          class="m-[-20px_-20px_15px_-20px] rounded-t-[15px] border-b border-[#ddd] bg-[#e9ecef] p-[10px_20px_0]"
        >
          <div class="scrollbar-none flex gap-1 overflow-x-auto">
            <div
              v-for="group in groups"
              :key="group.id"
              class="cursor-pointer rounded-t-lg border border-transparent px-4 py-2 text-sm whitespace-nowrap text-[#666] hover:bg-white/50"
              :class="{
                'z-2 -mb-px border-[#ddd] border-b-[#f8f9fa] bg-[#f8f9fa] font-bold text-[#2575fc]':
                  currentGroupId === group.id,
              }"
              @click="selectGroup(group.id)"
            >
              {{ group.name }}
            </div>
            <div
              class="mt-0.5 ml-[5px] flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-white font-bold text-[#888]"
              @click="openSaveGroupModal(null)"
            >
              +
            </div>
          </div>
        </div>

        <div
          class="mb-[15px] flex flex-wrap items-center justify-between gap-2.5 border-b border-[#eee] pb-2.5"
        >
          <h2 style="margin: 0; font-size: 18px; color: #555">词库管理</h2>
          <div class="flex flex-wrap gap-2">
            <button
              v-if="currentGroupId"
              class="cursor-pointer rounded-[50px] border-none bg-[#36d1dc] px-3 py-1.5 text-[13px] font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:opacity-60"
              @click="openSaveGroupModal(currentGroupId)"
            >
              ✎ 重命名
            </button>
            <button
              v-if="currentGroupId"
              class="cursor-pointer rounded-[50px] border-none bg-[#ff4b2b] px-3 py-1.5 text-[13px] font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:opacity-60"
              @click="requestDeleteGroup(currentGroupId)"
            >
              🗑 删除
            </button>
            <button
              class="cursor-pointer rounded-[50px] border-none bg-linear-to-r from-[#00b09b] to-[#96c93d] px-3 py-1.5 text-[13px] font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:opacity-60"
              @click="addWord"
            >
              + 加词
            </button>
            <button
              class="cursor-pointer rounded-[50px] border-none bg-[#f09819] px-3 py-1.5 text-[13px] font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:opacity-60"
              @click="removeWord"
            >
              - 减词
            </button>
            <button
              class="cursor-pointer rounded-[50px] border-none bg-[#fbc2eb] px-3 py-1.5 text-[13px] font-bold text-[#555] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:opacity-60"
              @click="requestClearWords"
            >
              × 清空
            </button>
          </div>
        </div>

        <div
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          <div v-for="(_, index) in words" :key="index" class="flex flex-col">
            <label class="mb-1.5 text-xs font-bold text-[#888]"
              >单词 {{ index + 1 }}</label
            >
            <input
              type="text"
              v-model="words[index]"
              @input="handleWordInput(index)"
              placeholder="输入单词 (如 apple)"
              class="w-full rounded-md border border-gray-300 bg-white p-2.5 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-[#36d1dc] focus:ring-2 focus:ring-[#36d1dc]/20 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div
        v-if="showGroupModal"
        class="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-[3px]"
      >
        <div
          class="w-[300px] animate-[popIn_0.3s_ease-out] rounded-[15px] bg-white p-[25px] text-center text-gray-900 shadow-[0_10px_40px_rgba(0,0,0,0.2)]"
        >
          <h3 class="mb-4 text-[#2c3e50]">
            {{ isRenaming ? '重命名' : '新建分组' }}
          </h3>
          <input
            type="text"
            v-model="groupNameInput"
            placeholder="分组名称"
            class="my-2.5 w-4/5 rounded-md border border-gray-300 bg-white p-2.5 text-base text-gray-900 focus:border-[#36d1dc] focus:ring-2 focus:ring-[#36d1dc]/20 focus:outline-none"
          />
          <div class="mt-5 flex justify-center gap-2.5">
            <button
              class="cursor-pointer rounded-[50px] border-none bg-[#e0e0e0] px-3 py-1.5 text-[13px] font-bold text-[#333] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:opacity-60"
              @click="closeGroupModal"
            >
              取消
            </button>
            <button
              class="cursor-pointer rounded-[50px] border-none bg-linear-to-r from-[#00b09b] to-[#96c93d] px-3 py-1.5 text-[13px] font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:opacity-60"
              @click="saveGroup"
            >
              保存
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showDeleteConfirmModal"
        class="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-[3px]"
      >
        <div
          class="w-[300px] animate-[popIn_0.3s_ease-out] rounded-[15px] bg-white p-[25px] text-center text-gray-900 shadow-[0_10px_40px_rgba(0,0,0,0.2)]"
        >
          <h3 class="mb-4 text-[#2c3e50]">确认删除此分组？</h3>
          <div class="mt-5 flex justify-center gap-2.5">
            <button
              class="cursor-pointer rounded-[50px] border-none bg-[#e0e0e0] px-3 py-1.5 text-[13px] font-bold text-[#333] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:opacity-60"
              @click="cancelDeleteGroup"
            >
              取消
            </button>
            <button
              class="cursor-pointer rounded-[50px] border-none bg-[#ff4b2b] px-3 py-1.5 text-[13px] font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:opacity-60"
              @click="confirmDeleteGroup"
            >
              删除
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showClearModal"
        class="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-[3px]"
      >
        <div
          class="w-[300px] animate-[popIn_0.3s_ease-out] rounded-[15px] bg-white p-[25px] text-center text-gray-900 shadow-[0_10px_40px_rgba(0,0,0,0.2)]"
        >
          <h3 class="mb-4 text-[#2c3e50]">确认清空单词？</h3>
          <div class="mt-5 flex justify-center gap-2.5">
            <button
              class="cursor-pointer rounded-[50px] border-none bg-[#e0e0e0] px-3 py-1.5 text-[13px] font-bold text-[#333] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:opacity-60"
              @click="cancelClearWords"
            >
              取消
            </button>
            <button
              class="cursor-pointer rounded-[50px] border-none bg-[#ff4b2b] px-3 py-1.5 text-[13px] font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:opacity-60"
              @click="confirmClearWords"
            >
              清空
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameLogic } from './script'

// 解构所有需要的变量
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
  showInputSection,
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

<style scoped>
@keyframes shake {
  10%,
  90% {
    transform: translate3d(-1px, 0, 0);
  }

  20%,
  80% {
    transform: translate3d(2px, 0, 0);
  }

  30%,
  50%,
  70% {
    transform: translate3d(-4px, 0, 0);
  }

  40%,
  60% {
    transform: translate3d(4px, 0, 0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes popIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-shake {
  animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}
</style>
