<template>
  <div
    class="flex min-h-screen cursor-default flex-col items-center overflow-hidden font-['Comic_Sans_MS','Bubblegum_Sans',cursive,sans-serif] select-none"
    :class="{ 'animate-screenShake': isShaking }"
    style="
      background: #78c948;
      background-image:
        radial-gradient(#89d659 15%, transparent 16%),
        radial-gradient(#89d659 15%, transparent 16%);
      background-size: 60px 60px;
      background-position:
        0 0,
        30px 30px;
    "
  >
    <div class="title-bar" data-tauri-drag-region></div>
    <router-link
      to="/"
      class="text-decoration-none fixed right-5 bottom-5 z-2000 flex h-[60px] w-[60px] cursor-pointer items-center justify-center rounded-full border-4 border-gray-800 bg-white text-3xl opacity-30 shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition-all duration-300 ease-in-out hover:scale-110 hover:rotate-[-10deg] hover:opacity-100 hover:shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
    >
      <i class="fas fa-home text-green-400"></i>
    </router-link>

    <header
      class="mt-5 flex cursor-default items-center gap-5 rounded-[50px] border-4 border-white bg-white/90 p-4 shadow-[0_8px_0_rgba(0,0,0,0.1)] sm:p-8"
    >
      <div class="flex flex-col items-center">
        <span class="text-[1.2rem] font-bold text-gray-600">得分</span>
        <span class="text-[3rem] font-black text-gray-800">{{ score }}</span>
      </div>

      <div
        class="min-w-[200px] rounded-[15px] border-4 border-dashed border-[#f59f00] bg-[#ffec99] px-[30px] py-1 text-center transition-transform duration-100"
        :class="{ 'scale-110': isTargetChanging }"
      >
        <div class="text-[1.5rem] text-[#e67700]">请寻找:</div>
        <div class="text-[4rem] font-bold text-[#d9480f]">
          {{ currentTarget ? currentTarget.chinese : '准备...' }}
        </div>
      </div>

      <div class="flex flex-col items-center">
        <span class="text-[1.2rem] font-bold text-gray-600">时间</span>
        <span
          class="w-[60px] text-center text-[3rem] font-black text-gray-800 transition-colors"
          :class="{ 'animate-pulse text-[#ff4757]': timeLeft <= 10 }"
          >{{ timeLeft }}s</span
        >
      </div>
    </header>

    <div
      class="mt-5 cursor-none rounded-[30px] bg-black/10 p-10"
      @mouseenter="showHammer"
      @mouseleave="hideHammer"
    >
      <div class="grid grid-cols-3 gap-[60px]">
        <div
          v-for="(hole, index) in holes"
          :key="index"
          class="relative h-[180px] w-[180px] cursor-none overflow-hidden rounded-full shadow-[inset_0_10px_20px_rgba(0,0,0,0.8)]"
          :ref="(el) => setHoleRef(el, index)"
          style="
            background: radial-gradient(
              circle at 50% 100%,
              #3e2723 20%,
              #212121 80%
            );
          "
        >
          <div
            class="mole group absolute left-[5px] z-10 flex h-[180px] w-[170px] cursor-none justify-center transition-[bottom] duration-200 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]"
            :class="{
              'bottom-0': hole.state === 'up' || hole.state === 'miss',
              '-bottom-10 scale-90 brightness-125 grayscale-[0.2]':
                hole.state === 'hit',
              'bottom-[-190px]': hole.state === 'down',
              'animate-shake': hole.state === 'miss',
            }"
          >
            <img
              :src="moleImg"
              class="h-full w-full object-contain drop-shadow-xl"
              draggable="false"
            />

            <div
              class="absolute bottom-6 left-1/2 w-[120px] -translate-x-1/2 -rotate-2 rounded-md border-2 border-[#5d4037] bg-white px-1 py-0.5 text-center text-[1.3rem] font-bold text-gray-800 shadow-md transition-transform group-[.is-target]:scale-110 group-[.is-target]:border-yellow-500 group-[.is-target]:shadow-yellow-500/50"
              v-if="hole.word"
            >
              {{ hole.word.english }}
            </div>

            <div
              class="absolute -top-10 left-0 z-50 w-full animate-[popOut_0.3s_forwards] text-center text-[2.5rem] font-black text-yellow-400 text-shadow-[3px_3px_0_#f00]"
              v-if="hole.state === 'hit'"
            >
              POW!
            </div>
          </div>

          <div
            class="pointer-events-none absolute -bottom-2.5 left-0 z-20 h-10 w-full"
            style="
              background: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 40%22 preserveAspectRatio=%22none%22><path d=%22M0,40 Q50,0 100,40 Z%22 fill=%22%235d4037%22/></svg>')
                center bottom no-repeat;
              background-size: cover;
            "
          ></div>
        </div>
      </div>
    </div>

    <div class="mt-8 flex cursor-default gap-4">
      <button
        class="cursor-pointer rounded-xl border-none bg-[#40c057] px-6 py-3 text-base font-bold text-white shadow-[0_4px_#2b8a3e] transition-all duration-200 active:translate-y-1 active:shadow-none disabled:transform-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        @click="startGame"
        :disabled="isPlaying"
      >
        {{ isPlaying ? '游戏中...' : gameOver ? '再玩一次' : '开始游戏' }}
      </button>
      <button
        class="cursor-pointer rounded-xl border-none bg-[#ff6b6b] px-6 py-3 text-base font-bold text-white shadow-[0_4px_#c92a2a] transition-all duration-200 active:translate-y-1 active:shadow-none disabled:transform-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        @click="endGame"
        :disabled="!isPlaying"
      >
        结束游戏
      </button>
      <button
        class="cursor-pointer rounded-xl border-none bg-[#fab005] px-6 py-3 text-base font-bold text-white shadow-[0_4px_#e67700] transition-all duration-200 active:translate-y-1 active:shadow-none disabled:transform-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        @click="openSettings"
        :disabled="isPlaying"
      >
        ⚙️ 词库编辑器
      </button>
    </div>

    <Teleport to="body">
      <div
        v-show="isHammerVisible"
        class="origin-bottom-center pointer-events-none fixed z-9999 mt-[-90px] ml-[-50px] flex h-[180px] w-[180px] rotate-[-20deg] items-center justify-center transition-transform duration-[0.05s] will-change-['transform,left,top']"
        :class="{ 'animate-hammerSwing': isSwinging }"
        :style="{ left: hammerX + 'px', top: hammerY + 'px' }"
      >
        <img
          :src="hammerImg"
          alt="hammer"
          class="pointer-events-none h-full w-full object-contain select-none"
          style="transform-origin: bottom center"
        />
      </div>
    </Teleport>

    <div
      v-if="showResult"
      class="fixed inset-0 z-1000 flex h-full w-full cursor-default items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div
        class="animate-bounceIn flex max-h-[85vh] w-[90%] max-w-[600px] flex-col rounded-xl border border-[#334155] bg-[#0f172a] p-6 text-[#f8fafc] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.5)]"
      >
        <h2 class="mt-0 text-center text-[#f8fafc]">⏰ 游戏结束!</h2>
        <div class="my-5 text-center text-[1.5rem] text-[#cbd5e1]">
          最终得分:
          <span class="text-[3rem] font-bold text-[#38bdf8]">{{ score }}</span>
        </div>
        <div class="mb-5 text-center text-[1.1rem] text-[#94a3b8]">
          {{ getFeedback(score) }}
        </div>
        <div
          class="modal-footer mt-5 flex justify-center border-t border-[#334155] pt-4"
        >
          <button
            class="rounded-xl bg-[#38bdf8] px-5 py-2.5 text-base text-[#0f172a] hover:bg-[#7dd3fc]"
            @click="closeResult"
          >
            确定
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showSettings"
      class="fixed inset-0 z-1000 flex h-full w-full cursor-default items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div
        class="animate-bounceIn flex max-h-[85vh] w-[90%] max-w-[600px] flex-col rounded-xl border border-[#334155] bg-[#0f172a] p-6 text-[#f8fafc] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.5)]"
      >
        <div
          class="mb-4 flex items-baseline justify-between border-b border-[#334155] pb-4"
        >
          <h3 class="m-0 text-[1.5rem] text-[#f8fafc]">词库编辑器</h3>
          <span class="text-[0.85rem] text-[#94a3b8]">系统自动生成错词</span>
        </div>
        <div class="flex grow flex-col gap-3 overflow-y-auto pr-2">
          <div
            v-for="(item, index) in tempVocabulary"
            :key="index"
            class="flex items-center gap-3"
          >
            <div class="flex-1">
              <input
                type="text"
                v-model="item.english"
                placeholder="English"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                class="box-border w-full rounded-lg border border-[#334155] bg-[#1e293b] p-3 text-base text-[#f8fafc] transition-colors duration-200 outline-none placeholder:text-[#64748b] focus:border-[#38bdf8] sm:p-4"
              />
            </div>
            <div class="flex-1">
              <input
                type="text"
                v-model="item.chinese"
                placeholder="中文"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                class="box-border w-full rounded-lg border border-[#334155] bg-[#1e293b] p-3 text-base text-[#f8fafc] transition-colors duration-200 outline-none placeholder:text-[#64748b] focus:border-[#38bdf8] sm:p-4"
              />
            </div>
            <button
              class="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-red-500/20 text-2xl text-red-600 transition-all duration-200 hover:bg-red-600 hover:text-white"
              @click="removeTempWord(index)"
            >
              ×
            </button>
          </div>
        </div>
        <div class="mt-5 flex justify-between border-t border-[#334155] pt-4">
          <button
            class="rounded-xl border border-[#94a3b8] bg-transparent px-5 py-2.5 text-base text-[#f8fafc] hover:border-[#f8fafc] hover:bg-white/10"
            @click="addTempWord"
          >
            + 添加
          </button>
          <div class="flex gap-3">
            <button
              class="rounded-xl border border-[#94a3b8] bg-transparent px-5 py-2.5 text-base text-[#f8fafc] hover:border-[#f8fafc] hover:bg-white/10"
              @click="showSettings = false"
            >
              取消
            </button>
            <button
              class="rounded-xl bg-[#38bdf8] px-5 py-2.5 text-base text-[#0f172a] hover:bg-[#7dd3fc]"
              @click="saveSettings"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-for="float in floatingTexts"
      :key="float.id"
      class="pointer-events-none fixed z-999 animate-[floatUp_0.8s_forwards] text-[1.5rem] font-bold"
      :class="{
        'text-yellow-300 text-shadow-[2px_2px_0_#e67700]':
          float.type === 'score-up',
        'text-red-500 text-shadow-[2px_2px_0_#c92a2a]':
          float.type === 'score-down',
      }"
      :style="{ left: float.x + 'px', top: float.y + 'px' }"
    >
      {{ float.text }}
    </div>

    <div
      v-for="p in particles"
      :key="p.id"
      class="animate-particleFly pointer-events-none fixed z-998 h-2 w-2 rounded-full"
      :style="{
        left: p.x + 'px',
        top: p.y + 'px',
        backgroundColor: p.color,
        '--angle': p.angle + 'deg',
        '--speed': p.speed + 'px',
      }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { useWhackGame } from './script'
import hammerImg from '../../assets/images/hammer.png'
// 引入地鼠图片，请确保路径下有 mole.png 文件
import moleImg from '../../assets/images/mole.png'

const {
  score,
  timeLeft,
  isPlaying,
  gameOver,
  currentTarget,
  holes,
  showResult,
  showSettings,
  tempVocabulary,
  floatingTexts,
  isTargetChanging,
  isShaking,
  isSwinging,
  isHammerVisible,
  hammerX,
  hammerY,
  particles,
  startGame,
  endGame,
  closeResult,
  openSettings,
  saveSettings,
  addTempWord,
  removeTempWord,
  getFeedback,
  showHammer,
  hideHammer,
  setHoleRef,
} = useWhackGame()
</script>

<style scoped>
/* 屏幕震动效果 */
.animate-screenShake {
  animation: screenShake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes screenShake {
  10%,
  90% {
    transform: translate3d(-2px, 0, 0);
  }

  20%,
  80% {
    transform: translate3d(4px, 0, 0);
  }

  30%,
  50%,
  70% {
    transform: translate3d(-6px, 0, 0);
  }

  40%,
  60% {
    transform: translate3d(6px, 0, 0);
  }
}

/* 优化后的锤子动画: 迅速下砸，无蓄力，有回弹 */
.animate-hammerSwing {
  animation: hammerSwing 0.2s cubic-bezier(0.1, 0.7, 1, 0.1) forwards;
}

@keyframes hammerSwing {
  0% {
    transform: rotate(-20deg);
  }

  30% {
    transform: rotate(45deg) scale(1.1);
  }

  60% {
    transform: rotate(-25deg);
  }

  100% {
    transform: rotate(-20deg);
  }
}

/* 粒子特效动画 */
.animate-particleFly {
  animation: particleFly 0.5s forwards ease-out;
}

@keyframes particleFly {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }

  100% {
    transform: translate(
        calc(cos(var(--angle)) * var(--speed) * 10),
        calc(sin(var(--angle)) * var(--speed) * 10)
      )
      scale(0);
    opacity: 0;
  }
}

/* 地鼠未击中抖动 */
.animate-shake {
  animation: shake 0.3s;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-5px);
  }

  75% {
    transform: translateX(5px);
  }
}

/* 击中效果弹出动画 */
.animate-\[popOut_0\.3s_forwards\] {
  animation: popOut 0.3s forwards;
}

@keyframes popOut {
  0% {
    transform: scale(0);
    opacity: 0;
  }

  50% {
    transform: scale(1.2);
    opacity: 1;
  }

  100% {
    transform: scale(1);
    opacity: 0;
  }
}

/* 浮动文字动画 */
.animate-\[floatUp_0\.8s_forwards\] {
  animation: floatUp 0.8s forwards;
}

@keyframes floatUp {
  0% {
    transform: translateY(0);
    opacity: 1;
  }

  100% {
    transform: translateY(-50px);
    opacity: 0;
  }
}

/* 弹窗进入动画 */
.animate-\[bounceIn_0\.3s\] {
  animation: bounceIn 0.3s;
}

@keyframes bounceIn {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 浮动文字的阴影 */
.text-shadow-\[2px_2px_0_\#e67700\] {
  text-shadow: 2px 2px 0 #e67700;
}

.text-shadow-\[2px_2px_0_\#f00\] {
  text-shadow: 2px 2px 0 #f00;
}

.text-shadow-\[2px_2px_0_\#c92a2a\] {
  text-shadow: 2px 2px 0 #c92a2a;
}
</style>
