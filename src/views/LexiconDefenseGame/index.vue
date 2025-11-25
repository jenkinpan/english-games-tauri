<template>
  <div class="lexicon-defense-container">
    <div class="title-bar" data-tauri-drag-region></div>
    <router-link to="/" class="back-home-btn">🏠</router-link>
    
    <h1>Lexicon Defense</h1>
    <h2>纠正来袭的错词，守护词汇城墙！</h2>

    <section id="gameShell" class="game-shell" :class="{ shake: isShaking }">
      <div class="hud">
        <span>波次：<strong>{{ wave }}/{{ vocabulary.length }}</strong></span>
        <span>分数：<strong>{{ score }}</strong></span>
        <span>护盾：<strong :class="{ 'shield-damage': isShieldDamaged }">{{ shield }}</strong></span>
        <span>倒计时：<strong :class="{ 'timer-warning': timer <= 5 && timer > 0 }">{{ timer > 0 ? timer + 's' : '—' }}</strong></span>
      </div>

      <div class="battlefield">
        <div class="enemy" v-if="currentWord">{{ currentWord.miss }}</div>
        <div class="enemy" v-else>{{ isGameActive ? '准备作战...' : (shield > 0 && wave === vocabulary.length && wave > 0 ? '胜利！' : '点击开始以生成敌人') }}</div>
        
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
          <button class="secondary" @click="resetInputAll" :disabled="!isGameActive || !hasInput">重置</button>
          <button @click="checkAnswer" :disabled="!isGameActive || !isFullInput">发射</button>
        </div>
      </div>

      <div class="log" :class="{ error: logError }">{{ logText }}</div>

      <div class="controls">
        <div class="controls-group">
          <button @click="startGame">开始新一局</button>
          <button class="secondary btn-quit" @click="quitGame" :disabled="!isGameActive">结束游戏</button>
          <button class="secondary" @click="openEditor" :disabled="isGameActive">编辑词库</button>
        </div>
        <button class="secondary" @click="skipWave" :disabled="!isGameActive || !currentWord || score <= 0">跳过此波 (-1 分)</button>
      </div>
    </section>

    <!-- Editor Modal -->
    <div class="modal-overlay" :class="{ active: showEditor }">
      <div class="editor-window">
        <div class="editor-header">
          <h3>词库编辑器</h3>
          <span style="font-size: 0.85rem; opacity: 0.7; color: var(--accent)">系统自动生成错词</span>
        </div>
        <div class="word-list">
          <div v-for="(item, index) in editorWords" :key="index" class="word-item">
            <input type="text" class="w-correct" v-model="item.correct" placeholder="正确单词">
            <input type="text" class="w-clue" v-model="item.clue" placeholder="线索">
            <button class="btn-icon" @click="removeEditorWord(index)">×</button>
          </div>
        </div>
        <div class="editor-footer">
          <button class="secondary" @click="addEditorWord" style="border-color: var(--text); color: var(--text)">+ 添加单词</button>
          <div style="display: flex; gap: 10px">
            <button class="secondary" @click="closeEditor">取消</button>
            <button @click="saveEditor">保存并关闭</button>
          </div>
        </div>
      </div>
    </div>

    <!-- VFX Floating Text -->
    <div v-for="vfx in vfxList" :key="vfx.id" class="vfx-float" :class="vfx.type === 'gain' ? 'vfx-up' : 'vfx-down'" :style="{ left: vfx.x + 'px', top: vfx.y + 'px' }">
      {{ vfx.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';

// --- Types ---
interface VocabularyItem {
  correct: string;
  clue: string;
}

interface WordWithMiss extends VocabularyItem {
  miss: string;
}

interface VFXItem {
  id: number;
  text: string;
  type: string;
  x: number;
  y: number;
}

// --- Constants ---
const ANSWER_TIME = 18;
const defaultVocabulary: VocabularyItem[] = [
  { correct: "floor", clue: "n. 地板" },
  { correct: "window", clue: "n. 窗户" },
  { correct: "chair", clue: "n. 椅子" },
  { correct: "table", clue: "n. 桌子" },
  { correct: "sofa", clue: "n. 沙发" },
  { correct: "door", clue: "n. 门" },
  { correct: "phone", clue: "n. 电话" },
  { correct: "clean", clue: "v. 打扫" },
  { correct: "please", clue: "int. 请" },
  { correct: "television", clue: "n. 电视" },
];

// --- State ---
const vocabulary = ref<VocabularyItem[]>([]);
const queue = ref<WordWithMiss[]>([]);
const currentWord = ref<WordWithMiss | null>(null);
const score = ref(0);
const shield = ref(3);
const wave = ref(0);
const timer = ref(0);
const isGameActive = ref(false);
const currentSlots = ref<(string | null)[]>([]);
const currentPool = ref<string[]>([]);
const logText = ref("");
const logError = ref(false);
const showEditor = ref(false);
const editorWords = ref<VocabularyItem[]>([]);
const isShaking = ref(false);
const isShieldDamaged = ref(false);
const vfxList = ref<VFXItem[]>([]);
let timerInterval: NodeJS.Timeout | null = null;
let vfxIdCounter = 0;

// --- Computed ---
const isFullInput = computed(() => currentSlots.value.every(c => c !== null));
const hasInput = computed(() => currentSlots.value.some(c => c !== null));
const hintText = computed(() => {
  if (!isGameActive.value) {
    if (shield.value <= 0) return `护盾耗尽！答案应为：${currentWord.value ? currentWord.value.correct : "未知"}`;
    if (wave.value === vocabulary.value.length && wave.value > 0) return "恭喜！所有错词已被纠正。";
    return "每波会出现一个自动生成的拼写错误，点击下方字母修复它。";
  }
  if (currentWord.value) {
    if (timer.value <= 10) return `提示：${currentWord.value.clue}`;
    return `提示：线索分析中... (${timer.value - 10}s)`;
  }
  return "";
});
const hintActive = computed(() => {
  if (!isGameActive.value) return true; // Show game over/win message actively
  return timer.value <= 10;
});

// --- Audio ---
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

function ensureAudioContext() {
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1): void {
  ensureAudioContext();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioContext.currentTime);
  gain.gain.setValueAtTime(vol, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + duration);
}

const SoundFX = {
  shoot: () => {
    playTone(600, "square", 0.1, 0.05);
    setTimeout(() => playTone(800, "square", 0.1, 0.05), 50);
  },
  hit: () => {
    playTone(440, "sine", 0.1);
    setTimeout(() => playTone(880, "sine", 0.2), 100);
  },
  error: () => {
    playTone(150, "sawtooth", 0.3, 0.15);
    setTimeout(() => playTone(100, "sawtooth", 0.3, 0.15), 150);
  },
  click: () => {
    playTone(1200, "sine", 0.05, 0.03);
  },
  win: () => {
    [440, 554, 659, 880].forEach((f, i) =>
      setTimeout(() => playTone(f, "square", 0.3, 0.05), i * 100),
    );
  },
  loss: () => {
    [300, 250, 200, 150].forEach((f, i) =>
      setTimeout(() => playTone(f, "sawtooth", 0.4, 0.1), i * 150),
    );
  },
};

// --- VFX ---
function spawnVFX(targetId: string, text: string, type: string): void {
  // Simple approximation for target position
  // In a real app we might use refs to elements, but here we can just center it or use fixed positions relative to HUD
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  
  // Try to find element
  // Since we don't have direct DOM access easily without refs, we'll just use approximate positions
  // HUD is at top.
  if (targetId === 'score') { x = window.innerWidth * 0.4; y = 100; }
  if (targetId === 'shield') { x = window.innerWidth * 0.6; y = 100; }

  const id = vfxIdCounter++;
  vfxList.value.push({ id, text, type, x, y });
  setTimeout(() => {
    vfxList.value = vfxList.value.filter((v: VFXItem) => v.id !== id);
  }, 1200);
}

function triggerShake() {
  isShaking.value = false;
  nextTick(() => {
    isShaking.value = true;
    setTimeout(() => isShaking.value = false, 400);
  });
}

function triggerShieldDamage() {
  isShieldDamaged.value = false;
  nextTick(() => {
    isShieldDamaged.value = true;
    setTimeout(() => isShieldDamaged.value = false, 500);
  });
}

// --- Logic ---
function scrambleWord(word: string): string {
  if (word.length <= 1) return word;
  const arr = word.split("");
  let limit = 10;
  while (limit > 0) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const result = arr.join("");
    if (result.toLowerCase() !== word.toLowerCase()) return result;
    limit--;
  }
  return arr.join("");
}

function simpleShuffle<T>(arr: T[]): T[] {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function loadData(): VocabularyItem[] {
  const stored = localStorage.getItem("lexicon_vocab");
  if (stored) {
    try {
      return JSON.parse(stored) as VocabularyItem[];
    } catch (e) {}
  }
  return JSON.parse(JSON.stringify(defaultVocabulary));
}

function saveData(data: VocabularyItem[]): void {
  localStorage.setItem("lexicon_vocab", JSON.stringify(data));
}

function startGame() {
  SoundFX.shoot();
  vocabulary.value = loadData();
  if (vocabulary.value.length === 0) {
    alert("词库为空！请先添加单词。");
    openEditor();
    return;
  }

  const preparedList = vocabulary.value.map((item) => ({
    ...item,
    miss: scrambleWord(item.correct),
  }));

  queue.value = simpleShuffle(preparedList);
  score.value = 0;
  shield.value = 3;
  wave.value = 0;
  currentWord.value = null;
  isGameActive.value = true;
  logText.value = "准备作战！";
  logError.value = false;

  spawnEnemy();
}

function spawnEnemy(): void {
  if (timerInterval) clearInterval(timerInterval);
  if (queue.value.length === 0) {
    victory();
    return;
  }

  currentWord.value = queue.value.shift() || null;
  wave.value++;
  logText.value = "点击字母进行排序...";
  logError.value = false;

  if (currentWord.value) {
    initInputZone(currentWord.value.correct);
  }

  timer.value = ANSWER_TIME;
  timerInterval = setInterval(() => {
    timer.value--;
    if (timer.value <= 0) {
      if (timerInterval) clearInterval(timerInterval);
      damage("倒计时耗尽，护盾 -1。");
    }
  }, 1000);
}

function initInputZone(correctWord: string): void {
  currentSlots.value = new Array(correctWord.length).fill(null);
  currentPool.value = simpleShuffle(correctWord.split(""));
}

function moveLetterToSlot(poolIndex: number): void {
  if (!isGameActive.value) return;
  const emptySlotIndex = currentSlots.value.findIndex((c: string | null) => c === null);
  if (emptySlotIndex === -1) return;

  const char = currentPool.value[poolIndex];
  currentSlots.value[emptySlotIndex] = char;
  currentPool.value.splice(poolIndex, 1);

  SoundFX.click();
}

function returnLetterToPool(slotIndex: number): void {
  if (!isGameActive.value) return;
  const char = currentSlots.value[slotIndex];
  if (!char) return;

  currentSlots.value[slotIndex] = null;
  currentPool.value.push(char);

  SoundFX.click();
}

function resetInputAll(): void {
  if (!isGameActive.value || !currentWord.value) return;
  currentSlots.value.forEach((char: string | null) => {
    if (char) currentPool.value.push(char);
  });
  currentSlots.value.fill(null);
}

function checkAnswer() {
  if (!isGameActive.value || !currentWord.value) return;

  const attempt = currentSlots.value.join("").toLowerCase();

  if (attempt === currentWord.value.correct.toLowerCase()) {
    score.value += 2;
    SoundFX.hit();
    spawnVFX("score", "+2", "gain");
    logText.value = `命中！正确拼写：${currentWord.value.correct}`;
    logError.value = false;
    spawnEnemy();
  } else {
    shield.value--;
    SoundFX.error();
    triggerShake();
    spawnVFX("shield", "-1", "loss");
    triggerShieldDamage();

    logText.value = "拼写错误，护盾 -1！";
    logError.value = true;
    if (shield.value <= 0) gameOver();
  }
}

function damage(msg: string): void {
  shield.value--;
  SoundFX.error();
  triggerShake();
  spawnVFX("shield", "-1", "loss");
  triggerShieldDamage();

  logText.value = msg;
  logError.value = true;
  if (shield.value <= 0) {
    gameOver();
  } else {
    spawnEnemy();
  }
}

function skipWave(): void {
  if (!isGameActive.value || !currentWord.value || score.value <= 0) return;
  score.value = Math.max(0, score.value - 1);
  SoundFX.shoot();
  spawnVFX("score", "-1", "loss");
  logText.value = `跳过，答案是：${currentWord.value.correct}`;
  logError.value = false;
  spawnEnemy();
}

function quitGame(): void {
  if (isGameActive.value) endGame("游戏已手动结束。");
}

function victory(): void {
  SoundFX.win();
  endGame("恭喜！所有错词已被纠正。");
}

function gameOver(): void {
  SoundFX.loss();
  endGame(`护盾耗尽！答案应为：${currentWord.value ? currentWord.value.correct : "未知"}`);
}

function endGame(msg: string): void {
  isGameActive.value = false;
  // currentWord.value = null; // Keep it to show answer
  if (timerInterval) clearInterval(timerInterval);
  timer.value = 0;
  // Show the provided end game message before final score
  logText.value = msg;
  // Append final score after a short timeout
  setTimeout(() => {
    logText.value = `${msg} 最终得分：${score.value}`;
  }, 500);
}


// --- Editor ---
function openEditor(): void {
  editorWords.value = JSON.parse(JSON.stringify(loadData()));
  if (editorWords.value.length === 0) addEditorWord();
  showEditor.value = true;
}

function closeEditor(): void {
  showEditor.value = false;
}

function addEditorWord(): void {
  editorWords.value.push({ correct: '', clue: '' });
  // Scroll to bottom logic would go here
}

function removeEditorWord(index: number): void {
  editorWords.value.splice(index, 1);
}

function saveEditor(): void {
  const newData = editorWords.value.filter((w: VocabularyItem) => w.correct.trim() && w.clue.trim());
  if (newData.length === 0 && !confirm("词库为空，确定要保存吗？")) return;
  saveData(newData);
  vocabulary.value = newData;
  closeEditor();
  logText.value = "词库已更新，点击“开始新一局”生效。";
}

onMounted(() => {
  vocabulary.value = loadData();
});
</script>

<style scoped>
/* Font setup */
.lexicon-defense-container {
  font-family: "Times New Roman", "SimSun", "宋体", serif;
  --bg: #060b23;
  --panel: rgba(12, 21, 54, 0.95);
  --accent: #7cdfff;
  --accent-strong: #57c4ff;
  --alert: #ff7d7d;
  --success: #4caf50;
  --text: #f4f7ff;
  --slot-bg: rgba(255, 255, 255, 0.08);

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px 48px;
  background: radial-gradient(circle at top, #172552, #050812 65%);
  color: var(--text);
  overflow-x: hidden;
  box-sizing: border-box;
}

h1 {
  margin: 0 0 4px;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h2 {
  margin: 8px 0 24px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.75);
}

.back-home-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: var(--accent);
  color: var(--bg);
  border: 1px solid var(--accent-strong);
  padding: 0;
  font-size: 1.5rem;
  border-radius: 50%;
  cursor: pointer;
  font-weight: bold;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(124, 223, 255, 0.3);
  transition: all 0.3s ease;
  z-index: 1000;
  opacity: 0.5;
}

.back-home-btn:hover {
  opacity: 1;
  background: var(--accent-strong);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(124, 223, 255, 0.5);
}

.title-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  z-index: 99999;
  background: transparent;
  cursor: default;
}

.game-shell {
  width: min(900px, 95vw);
  background: var(--panel);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  padding: 28px;
  box-shadow: 0 30px 60px rgba(3, 5, 20, 0.6);
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
}

.shake {
  animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

.hud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  font-size: 0.95rem;
  align-items: center;
}

.hud span {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 8px 16px;
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.timer-warning {
  color: var(--alert) !important;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(255, 125, 125, 0.5);
  animation: panic-pulse 1s infinite ease-in-out;
}

.shield-damage {
  color: var(--alert) !important;
  text-shadow: 0 0 15px var(--alert);
  animation: shield-pulse 0.5s ease-out;
}

@keyframes shield-pulse {
  0% { transform: scale(1); }
  30% { transform: scale(1.8); }
  100% { transform: scale(1); }
}

@keyframes panic-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}

.battlefield {
  border: 2px dashed rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 32px 20px;
  text-align: center;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
  position: relative;
  overflow: hidden;
}

.enemy {
  display: inline-flex;
  padding: 14px 26px;
  border-radius: 40px;
  background: rgba(255, 93, 145, 0.2);
  border: 2px solid rgba(255, 93, 145, 0.6);
  font-size: 1.4rem;
  letter-spacing: 0.08em;
  animation: drift 6s ease-in-out infinite alternate;
  align-self: center;
}

@keyframes drift {
  from { transform: translateY(-8px); }
  to { transform: translateY(10px); }
}

.hint {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
  min-height: 1.5em;
  transition: color 0.3s, text-shadow 0.3s;
}

.hint-active {
  color: var(--accent);
  text-shadow: 0 0 8px rgba(124, 223, 255, 0.4);
}

.interaction-zone {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 10px 0;
}

.slots-container {
  display: flex;
  justify-content: center;
  gap: 8px;
  min-height: 60px;
  flex-wrap: wrap;
}

.letter-slot {
  width: 48px;
  height: 48px;
  border-bottom: 3px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--accent);
  background: var(--slot-bg);
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  transition: all 0.2s;
}

.letter-slot:hover {
  background: rgba(255, 255, 255, 0.15);
}

.letter-slot.empty {
  color: transparent;
}

.pool-container {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  min-height: 50px;
}

.letter-tile {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: linear-gradient(135deg, #2a3b68, #16224a);
  border: 1px solid rgba(124, 223, 255, 0.3);
  color: var(--text);
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.1s, background 0.2s;
}

.letter-tile:hover {
  transform: translateY(-2px);
  background: linear-gradient(135deg, #384c81, #1f2e61);
  border-color: var(--accent);
}

.letter-tile:active {
  transform: scale(0.95);
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
}

button {
  padding: 14px 22px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(120deg, var(--accent), var(--accent-strong));
  color: #041126;
  font-weight: 600;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: transform 120ms ease, filter 120ms ease;
}

button:active {
  transform: scale(0.96);
}

button:disabled {
  filter: grayscale(1);
  cursor: not-allowed;
  opacity: 0.6;
}

.controls {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.controls-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

button.secondary {
  background: transparent;
  color: var(--accent);
  border: 1px solid rgba(124, 223, 255, 0.5);
}

button.btn-quit {
  color: var(--alert);
  border-color: rgba(255, 125, 125, 0.5);
}

button.btn-quit:hover:not(:disabled) {
  background: rgba(255, 125, 125, 0.1);
}

.log {
  min-height: 40px;
  font-size: 0.95rem;
  color: var(--accent);
  text-align: center;
}

.log.error {
  color: var(--alert);
}

.vfx-float {
  position: fixed;
  font-weight: 800;
  font-size: 1.5rem;
  pointer-events: none;
  z-index: 9999;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.vfx-up {
  color: var(--success);
  animation: floatUp 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.vfx-down {
  color: var(--alert);
  animation: floatDown 1.2s ease-in forwards;
}

@keyframes floatUp {
  0% { transform: translateY(0) scale(0.5); opacity: 0; }
  20% { transform: translateY(-10px) scale(1.2); opacity: 1; }
  100% { transform: translateY(-50px) scale(1); opacity: 0; }
}

@keyframes floatDown {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  30% { transform: translateY(10px) scale(1.2); opacity: 1; }
  100% { transform: translateY(60px) scale(0.8); opacity: 0; }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-overlay.active {
  display: flex;
}

.editor-window {
  width: min(800px, 90vw);
  height: min(600px, 90vh);
  background: #0c1536;
  border: 1px solid var(--accent);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.word-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
  overscroll-behavior: contain;
}

.word-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.word-item input {
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  border: 1px solid transparent;
  height: 44px;
}

.word-item input.w-correct {
  flex: 2;
}

.word-item input.w-clue {
  flex: 3;
}

.btn-icon {
  width: 44px;
  height: 44px;
  background: rgba(255, 125, 125, 0.15);
  color: var(--alert);
  border-radius: 8px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-icon:hover {
  background: var(--alert);
  color: white;
  transform: scale(1.05);
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
