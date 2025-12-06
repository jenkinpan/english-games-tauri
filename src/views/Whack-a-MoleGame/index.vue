<template>
  <div class="whack-game-container" :class="{ shake: isShaking }">
    <div class="title-bar" data-tauri-drag-region></div>
    <router-link to="/" class="back-home-btn">🏠</router-link>

    <header class="game-header">
      <div class="stat-box">
        <span class="label">得分</span>
        <span class="value">{{ score }}</span>
      </div>

      <div class="target-display" :class="{ pulse: isTargetChanging }">
        <div class="target-label">请寻找:</div>
        <div class="target-word">
          {{ currentTarget ? currentTarget.chinese : '准备...' }}
        </div>
      </div>

      <div class="stat-box">
        <span class="label">时间</span>
        <span class="value time" :class="{ warning: timeLeft <= 10 }"
          >{{ timeLeft }}s</span
        >
      </div>
    </header>

    <div class="game-field" @mouseenter="showHammer" @mouseleave="hideHammer">
      <div class="grid">
        <div
          v-for="(hole, index) in holes"
          :key="index"
          class="hole"
          :ref="(el) => setHoleRef(el, index)"
        >
          <div
            class="mole"
            :class="[hole.state, { 'is-target': hole.isTarget }]"
          >
            <div class="mole-body">
              <div class="mole-face">
                <div class="eyes"></div>
                <div class="nose"></div>
              </div>
              <div class="mole-sign" v-if="hole.word">
                {{ hole.word.english }}
              </div>
            </div>
            <div class="hit-effect" v-if="hole.state === 'hit'">POW!</div>
          </div>
          <div class="dirt-front"></div>
        </div>
      </div>
    </div>

    <div class="controls">
      <button class="btn btn-start" @click="startGame" :disabled="isPlaying">
        {{ isPlaying ? '游戏中...' : gameOver ? '再玩一次' : '开始游戏' }}
      </button>
      <button class="btn btn-end" @click="endGame" :disabled="!isPlaying">
        结束游戏
      </button>
      <button
        class="btn btn-settings"
        @click="openSettings"
        :disabled="isPlaying"
      >
        ⚙️ 词库编辑器
      </button>
    </div>

    <div
      v-show="isHammerVisible"
      class="custom-hammer"
      :class="{ swinging: isSwinging }"
      :style="{ left: hammerX + 'px', top: hammerY + 'px' }"
    >
      <svg width="100" height="100" viewBox="0 0 100 100">
        <rect
          x="45"
          y="40"
          width="10"
          height="50"
          rx="2"
          fill="#8B4513"
          stroke="#5d4037"
          stroke-width="2"
        />
        <rect
          x="20"
          y="20"
          width="60"
          height="30"
          rx="5"
          fill="#ff4757"
          stroke="#880e4f"
          stroke-width="3"
        />
        <path
          d="M25 25 H 75"
          stroke="rgba(255,255,255,0.3)"
          stroke-width="3"
          stroke-linecap="round"
        />
        <circle cx="30" cy="35" r="3" fill="#880e4f" opacity="0.5" />
        <circle cx="70" cy="35" r="3" fill="#880e4f" opacity="0.5" />
      </svg>
    </div>

    <div class="modal" :class="{ show: showResult }">
      <div class="modal-content result-box">
        <h2 class="modal-title">⏰ 游戏结束!</h2>
        <div class="final-score">
          最终得分: <span>{{ score }}</span>
        </div>
        <div class="feedback">{{ getFeedback(score) }}</div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="closeResult">确定</button>
        </div>
      </div>
    </div>

    <div class="modal" :class="{ show: showSettings }">
      <div class="modal-content settings-box">
        <div class="modal-header">
          <h3>词库编辑器</h3>
          <span class="sub-text">系统自动生成错词</span>
        </div>
        <div class="word-list">
          <div
            v-for="(item, index) in tempVocabulary"
            :key="index"
            class="word-row"
          >
            <div class="input-group">
              <input
                type="text"
                v-model="item.english"
                placeholder="English"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
              />
            </div>
            <div class="input-group">
              <input
                type="text"
                v-model="item.chinese"
                placeholder="中文"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
              />
            </div>
            <button class="btn-delete" @click="removeTempWord(index)">×</button>
          </div>
        </div>
        <div class="modal-footer settings-footer">
          <button class="btn btn-outline" @click="addTempWord">+ 添加</button>
          <div class="action-group">
            <button class="btn btn-outline" @click="showSettings = false">
              取消
            </button>
            <button class="btn btn-primary" @click="saveSettings">保存</button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-for="float in floatingTexts"
      :key="float.id"
      class="floating-text"
      :class="float.type"
      :style="{ left: float.x + 'px', top: float.y + 'px' }"
    >
      {{ float.text }}
    </div>

    <div
      v-for="p in particles"
      :key="p.id"
      class="particle"
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

<style scoped src="./style.css"></style>
