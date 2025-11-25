<template>
  <div class="flashcard-game-container">
    <div class="title-bar" data-tauri-drag-region></div>
    <router-link to="/" class="back-home-btn">🏠</router-link>
    <div class="container">
      <header>
        <h1>英语单词记忆卡片</h1>
      </header>

      <div class="timer-container">
        <div class="timer" id="timer" :style="timerStyle">{{ formattedTime }}</div>
        <button class="btn" @click="startTimer" :disabled="timerRunning">开始记忆</button>
        <button class="btn reset" @click="resetTimer">重置</button>
        <button class="btn toggle-btn" @click="toggleInput">{{ isInputHidden ? "显示输入" : "隐藏输入" }}</button>
      </div>

      <div class="cards-grid">
        <div
          v-for="(card, index) in cards"
          :key="index"
          class="card"
          :class="{ flipped: card.flipped }"
          @click="handleCardClick(index)"
        >
          <div class="card-inner">
            <div class="card-front">
              <div class="number">{{ index + 1 }}</div>
              <div class="word">{{ card.displayWord }}</div>
            </div>
            <div class="card-back">
              <div class="number">{{ index + 1 }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="input-section" :class="{ hidden: isInputHidden }">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h2 style="margin: 0">教师单词输入</h2>
          <div style="display: flex; gap: 10px">
            <button
              class="btn"
              @click="addWord"
              style="padding: 8px 20px; font-size: 16px; background: linear-gradient(90deg, #4facfe, #00f2fe);"
            >
              + 增加单词
            </button>
            <button
              class="btn"
              @click="removeWord"
              style="padding: 8px 20px; font-size: 16px; background: linear-gradient(90deg, #fa709a, #fee140);"
            >
              - 删除单词
            </button>
          </div>
        </div>
        <div class="word-inputs">
          <div v-for="(_word, index) in words" :key="index" class="input-group">
            <label>单词 {{ index + 1 }}:</label>
            <input
              type="text"
              v-model="words[index]"
              :placeholder="`输入单词 ${index + 1}`"
              @input="handleWordInput(index)"
            />
          </div>
        </div>
      </div>

      <div class="instructions">
        <h3>使用说明</h3>
        <ol>
          <li>在下方输入框中输入英语单词（每个数字对应一个单词），可以点击"增加单词"或"删除单词"按钮调整数量</li>
          <li>点击"开始记忆"按钮开始1分钟倒计时</li>
          <li>学生需要在1分钟内记住所有单词</li>
          <li>倒计时结束后，所有卡片将自动翻面，只显示数字</li>
          <li>点击卡片可以查看单词（教师可控制显示）</li>
          <li>点击"重置"按钮可重新开始练习</li>
          <li>点击"隐藏输入"按钮可以隐藏或显示教师单词输入部分</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

// --- Types ---
interface Card {
  displayWord: string;
  flipped: boolean;
}

interface LocalStorageData {
  words: string[];
  wordCount: number;
  isInputHidden: boolean;
}

// --- State ---
const words = ref<string[]>(Array(9).fill(''));
const cards = ref<Card[]>([]);
const timeLeft = ref(60);
const timerRunning = ref(false);
const isInputHidden = ref(false);
let timerInterval: NodeJS.Timeout | null = null;

// --- Computed ---
const formattedTime = computed(() => {
  const minutes = Math.floor(timeLeft.value / 60);
  const seconds = timeLeft.value % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
});

const timerStyle = computed(() => {
  return timeLeft.value <= 10
    ? { background: "linear-gradient(90deg, #ff416c, #ff4b2b)" }
    : { background: "linear-gradient(90deg, #00b09b, #96c93d)" };
});

// --- Audio ---
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

function ensureAudioContext(): void {
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playSound(frequency: number, duration: number, type: OscillatorType = "sine"): void {
  ensureAudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

function playCountdownSound(): void {
  playSound(800, 0.2, "sine");
}

function playFlipSound(): void {
  ensureAudioContext();
  const frequencies = [523.25, 659.25, 783.99, 880.0, 1046.5];
  const baseTime = audioContext.currentTime;

  frequencies.forEach((freq: number, index: number) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = freq;
    oscillator.type = "sine";
    const startTime = baseTime + index * 0.08;
    const duration = 0.15;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  });

  const bassOscillator = audioContext.createOscillator();
  const bassGain = audioContext.createGain();
  bassOscillator.connect(bassGain);
  bassGain.connect(audioContext.destination);
  bassOscillator.frequency.value = 261.63;
  bassOscillator.type = "triangle";
  const bassStartTime = baseTime;
  const bassDuration = 0.4;
  bassGain.gain.setValueAtTime(0, bassStartTime);
  bassGain.gain.linearRampToValueAtTime(0.15, bassStartTime + 0.05);
  bassGain.gain.exponentialRampToValueAtTime(0.01, bassStartTime + bassDuration);
  bassOscillator.start(bassStartTime);
  bassOscillator.stop(bassStartTime + bassDuration);
}

// --- Game Logic ---
function initCards(): void {
  // Initialize cards based on words length
  // Initially, cards show the words (not flipped)
  // We need to randomize words assignment to cards?
  // Original logic: "randomizeCardWords" is called on reset and init.
  // It shuffles valid words and assigns them to cards.
  randomizeCardWords();
}

function randomizeCardWords(): void {
  const validWords = words.value.filter((w: string) => w.trim().length > 0);
  // Shuffle
  const shuffled = [...validWords];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Assign to cards
  cards.value = words.value.map((_: string, i: number): Card => ({
    displayWord: i < shuffled.length ? shuffled[i] : '',
    flipped: false
  }));
}

function handleWordInput(index: number): void {
  saveToLocalStorage();
  // Update display word immediately if we are in editing mode?
  // Original logic: input event updates display-word element.
  // But wait, randomizeCardWords shuffles them.
  // If I edit word 1, does it update card 1?
  // Original code: input listener updates `display-word-${i}`.
  // BUT `randomizeCardWords` overwrites `display-word-${i}` with shuffled words.
  // So if I edit, it updates the card corresponding to that input index?
  // Let's check original: `input.addEventListener... displayElement.textContent = word`.
  // Yes, direct mapping during input. But `randomizeCardWords` is called on init and reset.
  // So while editing, it shows what you type.
  // I will replicate this: update the card at the same index.
  if (cards.value[index]) {
    cards.value[index].displayWord = words.value[index];
  }
}

function handleCardClick(index: number): void {
  cards.value[index].flipped = !cards.value[index].flipped;
  playFlipSound();
}

function startTimer(): void {
  if (timerInterval) clearInterval(timerInterval);
  timeLeft.value = 60;
  timerRunning.value = true;

  timerInterval = setInterval(() => {
    timeLeft.value--;
    if (timeLeft.value <= 10 && timeLeft.value > 0) {
      playCountdownSound();
    }
    if (timeLeft.value <= 0) {
      if (timerInterval) clearInterval(timerInterval);
      timerRunning.value = false;
      // Flip all cards to back (show numbers only)
      // In CSS: .card.flipped .card-inner { transform: rotateY(180deg); }
      // Front has word, Back has number.
      // Wait, original HTML:
      // Front: Number + Word
      // Back: Number
      // When flipped, it shows Back (Number).
      // So "Flip all cards" means hide words.
      cards.value.forEach((c: Card) => c.flipped = true);
    }
  }, 1000);
}

function resetTimer(): void {
  if (timerInterval) clearInterval(timerInterval);
  timeLeft.value = 60;
  timerRunning.value = false;
  cards.value.forEach((c: Card) => c.flipped = false);
  randomizeCardWords();
}

function addWord(): void {
  words.value.push('');
  cards.value.push({ displayWord: '', flipped: false });
  saveToLocalStorage();
}

function removeWord(): void {
  if (words.value.length <= 1) {
    alert("至少需要保留1个单词！");
    return;
  }
  words.value.pop();
  cards.value.pop();
  saveToLocalStorage();
}

function toggleInput(): void {
  isInputHidden.value = !isInputHidden.value;
  saveToLocalStorage();
}

// --- Persistence ---
function saveToLocalStorage(): void {
  const data: LocalStorageData = {
    words: words.value,
    wordCount: words.value.length,
    isInputHidden: isInputHidden.value
  };
  localStorage.setItem("wordMemoryCards", JSON.stringify(data));
}

function loadFromLocalStorage(): void {
  try {
    const saved = localStorage.getItem("wordMemoryCards");
    if (saved) {
      const data = JSON.parse(saved) as LocalStorageData;
      if (Array.isArray(data.words)) {
        words.value = data.words;
        // Ensure cards match words length
        cards.value = words.value.map((): Card => ({ displayWord: '', flipped: false }));
      }
      if (typeof data.isInputHidden === 'boolean') isInputHidden.value = data.isInputHidden;
    }
  } catch (e) {
    console.error(e);
  }
}

onMounted(() => {
  loadFromLocalStorage();
  initCards();
});
</script>

<style scoped>
.flashcard-game-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  color: white;
  box-sizing: border-box;
}

.container {
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  background-color: white;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 30px;
}

header {
  text-align: center;
  margin-bottom: 20px;
}

h1 {
  color: #2c3e50;
  margin-top: 0;
  font-size: 32px;
  background: linear-gradient(90deg, #2575fc, #6a11cb);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
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

.timer-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  gap: 10px;
}

.timer {
  font-size: 36px;
  font-weight: bold;
  background: linear-gradient(90deg, #ff416c, #ff4b2b);
  color: white;
  padding: 10px 30px;
  border-radius: 50px;
  box-shadow: 0 5px 15px rgba(255, 75, 43, 0.3);
}

.btn {
  background: linear-gradient(90deg, #00b09b, #96c93d);
  color: white;
  border: none;
  padding: 12px 25px;
  font-size: 18px;
  border-radius: 50px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 5px 15px rgba(0, 176, 155, 0.3);
  transition: all 0.3s ease;
}

.btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 176, 155, 0.4);
}

.btn:active {
  transform: translateY(1px);
}

.btn.reset {
  background: linear-gradient(90deg, #ff416c, #ff4b2b);
  box-shadow: 0 5px 15px rgba(255, 75, 43, 0.3);
}

.back-home-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: linear-gradient(90deg, #00b09b, #96c93d);
  color: white;
  border: none;
  padding: 0;
  font-size: 1.5rem;
  border-radius: 50%;
  cursor: pointer;
  font-weight: bold;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 5px 15px rgba(0, 176, 155, 0.3);
  transition: all 0.3s ease;
  z-index: 1000;
  opacity: 0.5;
}

.back-home-btn:hover {
  opacity: 1;
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 176, 155, 0.4);
}

.toggle-btn {
  background: linear-gradient(90deg, #ffa62e, #ff3c38);
  box-shadow: 0 5px 15px rgba(255, 75, 43, 0.3);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 30px;
}

.card {
  height: 180px;
  perspective: 1000px;
  cursor: pointer;
}

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

.card-front {
  background: linear-gradient(135deg, #43cea2, #185a9d);
  color: white;
}

.card-back {
  background: linear-gradient(135deg, #ff7e5f, #feb47b);
  color: white;
  transform: rotateY(180deg);
}

.number {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 5px;
}

.word {
  font-size: 28px;
  font-weight: bold;
}

.input-section {
  background-color: #f8f9fa;
  border-radius: 15px;
  padding: 20px;
  margin-top: 30px;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.05);
  transition: max-height 0.5s ease, padding 0.5s ease, margin 0.5s ease;
  max-height: 500px;
  overflow: hidden;
}

.input-section.hidden {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin-top: 10px;
}

h2 {
  color: #2c3e50;
  margin-top: 0;
  text-align: center;
}

.word-inputs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.input-group {
  display: flex;
  flex-direction: column;
}

label {
  margin-bottom: 5px;
  font-weight: bold;
  color: #3498db;
}

input {
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

input:focus {
  border-color: #3498db;
  outline: none;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.instructions {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
  padding: 15px;
  border-radius: 0 8px 8px 0;
  margin-top: 25px;
  font-size: 15px;
}

.instructions h3 {
  margin-top: 0;
  color: #0d47a1;
}

.instructions ol {
  padding-left: 20px;
  margin-bottom: 0;
}

.instructions li {
  margin-bottom: 8px;
}

@media (max-width: 768px) {
  .cards-grid,
  .word-inputs {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .cards-grid,
  .word-inputs {
    grid-template-columns: 1fr;
  }

  .timer {
    font-size: 28px;
    padding: 8px 20px;
  }

  .btn {
    padding: 10px 20px;
    font-size: 16px;
  }
}
</style>
