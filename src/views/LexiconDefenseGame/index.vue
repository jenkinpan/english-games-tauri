<template>
  <div class="lexicon-defense-container">
    <div class="title-bar" data-tauri-drag-region></div>
    <router-link to="/" class="back-home-btn">🏠</router-link>

    <h1>Lexicon Defense</h1>
    <h2>纠正来袭的错词，守护词汇城墙！</h2>

    <section id="gameShell" class="game-shell" :class="{ shake: isShaking }">
      <div class="hud">
        <span
          >波次：<strong>{{ wave }}/{{ vocabulary.length }}</strong></span
        >
        <span
          >分数：<strong>{{ score }}</strong></span
        >
        <span
          >护盾：<strong :class="{ 'shield-damage': isShieldDamaged }">{{
            shield
          }}</strong></span
        >
        <span
          >倒计时：<strong
            :class="{ 'timer-warning': timer <= 5 && timer > 0 }"
            >{{ timer > 0 ? timer + 's' : '—' }}</strong
          ></span
        >
      </div>

      <div class="battlefield">
        <div class="enemy" v-if="currentWord">
          {{ currentWord.miss }}
        </div>
        <div class="enemy" v-else>
          {{
            isGameActive
              ? '准备作战...'
              : shield > 0 && wave === vocabulary.length && wave > 0
                ? '胜利！'
                : '点击开始以生成敌人'
          }}
        </div>

        <div class="hint" :class="{ 'hint-active': hintActive }">
          {{ hintText }}
        </div>
      </div>

      <div class="interaction-zone">
        <div class="slots-container">
          <div
            v-for="(char, index) in currentSlots"
            :key="'slot-' + index"
            class="letter-slot"
            :class="{ empty: !char }"
            @click="returnLetterToPool(index)"
          >
            {{ char }}
          </div>
        </div>
        <div class="pool-container">
          <div
            v-for="(char, index) in currentPool"
            :key="'pool-' + index"
            class="letter-tile"
            @click="moveLetterToSlot(index)"
          >
            {{ char }}
          </div>
        </div>
        <div class="action-buttons">
          <button
            class="secondary"
            @click="resetInputAll"
            :disabled="!isGameActive || !hasInput"
          >
            重置
          </button>
          <button
            @click="checkAnswer"
            :disabled="!isGameActive || !isFullInput"
          >
            发射
          </button>
        </div>
      </div>

      <div class="log" :class="{ error: logError }">{{ logText }}</div>

      <div class="controls">
        <div class="controls-group">
          <button @click="startGame">开始新一局</button>
          <button
            class="secondary btn-quit"
            @click="quitGame"
            :disabled="!isGameActive"
          >
            结束游戏
          </button>
          <button
            class="secondary"
            @click="openEditor"
            :disabled="isGameActive"
          >
            编辑词库
          </button>
        </div>
        <button
          class="secondary"
          @click="skipWave"
          :disabled="!isGameActive || !currentWord || score <= 0"
        >
          跳过此波 (-1 分)
        </button>
      </div>
    </section>

    <div class="modal-overlay" :class="{ active: showEditor }">
      <div class="editor-window">
        <div class="editor-header">
          <h3>词库编辑器</h3>
          <span style="font-size: 0.85rem; opacity: 0.7; color: var(--accent)"
            >系统自动生成错词</span
          >
        </div>
        <div class="word-list">
          <div
            v-for="(item, index) in editorWords"
            :key="index"
            class="word-item"
          >
            <input
              type="text"
              class="w-correct"
              v-model="item.correct"
              placeholder="正确单词"
            />
            <input
              type="text"
              class="w-clue"
              v-model="item.clue"
              placeholder="线索"
            />
            <button class="btn-icon" @click="removeEditorWord(index)">×</button>
          </div>
        </div>
        <div class="editor-footer">
          <button
            class="secondary"
            @click="addEditorWord"
            style="border-color: var(--text); color: var(--text)"
          >
            + 添加单词
          </button>
          <div style="display: flex; gap: 10px">
            <button class="secondary" @click="closeEditor">取消</button>
            <button @click="saveEditor">保存并关闭</button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-for="vfx in vfxList"
      :key="vfx.id"
      class="vfx-float"
      :class="vfx.type === 'gain' ? 'vfx-up' : 'vfx-down'"
      :style="{ left: vfx.x + 'px', top: vfx.y + 'px' }"
    >
      {{ vfx.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
// 引入我们的逻辑钩子
import { useGameLogic } from './script'

// 显式解构出所有变量，这样 Vue 模板和 TS 就能完美识别类型了
const {
  vocabulary,
  score,
  shield,
  wave,
  timer,
  currentWord,
  currentSlots,
  currentPool,
  isGameActive,
  hintText,
  hintActive,
  isFullInput,
  hasInput,
  logText,
  logError,
  showEditor,
  editorWords,
  isShaking,
  isShieldDamaged,
  vfxList,
  startGame,
  quitGame,
  skipWave,
  resetInputAll,
  checkAnswer,
  moveLetterToSlot,
  returnLetterToPool,
  openEditor,
  closeEditor,
  addEditorWord,
  removeEditorWord,
  saveEditor,
} = useGameLogic()
</script>

<style scoped src="./style.css"></style>
