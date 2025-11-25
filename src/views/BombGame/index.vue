<template>
  <div class="bomb-game-container">
    <div class="title-bar" data-tauri-drag-region></div>
    <router-link to="/" class="back-home-btn">🏠</router-link>
    <div class="container">
      <header>
        <h1>单词炸弹游戏 💣</h1>
      </header>

      <div class="score-container">
        <div class="score" v-show="gameStarted || gameOver">积分: {{ score }}</div>
        <button class="btn" @click="startGame" :disabled="gameStarted && !gameOver">开始游戏</button>
        <button class="btn reset" @click="resetGame">重置</button>
        <div style="display: flex; align-items: center; gap: 8px">
          <label for="bombCountInput" style="font-weight: bold; color: #2c3e50">炸弹数量</label>
          <input
            id="bombCountInput"
            type="number"
            min="1"
            :max="Math.max(1, words.length - 1)"
            v-model.number="bombCount"
            @change="updateBombCountConstraints"
            style="width: 80px; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px;"
          />
          <button
            class="btn"
            @click="toggleInput"
            style="padding: 8px 16px; font-size: 16px; background: linear-gradient(90deg, #ffa62e, #ff3c38);"
          >
            {{ isInputHidden ? "显示单词输入" : "隐藏单词输入" }}
          </button>
        </div>
      </div>

      <div class="game-over" :class="{ show: gameOver }">游戏结束！你踩到了炸弹💣</div>

      <div class="cards-grid">
        <div
          v-for="(card, index) in cards"
          :key="index"
          class="card"
          :class="{ flipped: card.flipped, disabled: !gameStarted || gameOver || card.flipped }"
          @click="handleCardClick(index)"
        >
          <div class="card-inner">
            <div class="card-front">
              <div class="word">{{ card.word }}</div>
            </div>
            <div class="card-back" :class="card.type" ref="cardBackRefs">
              <div v-if="card.flipped && card.type === 'bomb'" class="bomb-icon">💣</div>
              <div v-if="card.flipped && card.type === 'score'" class="score-value">+{{ card.value }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="input-section" :class="{ hidden: isInputHidden }">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h2 style="margin: 0">单词输入</h2>
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
              @input="saveToLocalStorage"
            />
          </div>
        </div>
      </div>

      <div class="instructions">
        <h3>游戏规则</h3>
        <ol>
          <li>在下方输入框中输入英语单词（每个数字对应一个单词）</li>
          <li>点击"开始游戏"按钮开始游戏</li>
          <li>点击卡片翻开，可能会显示：积分（+1到+3）或炸弹💣</li>
          <li>翻开积分卡片可以获得相应积分（不显示积分汇总）</li>
          <li>翻开炸弹卡片会提示“踩到炸弹”，但游戏继续</li>
          <li>每轮游戏中有多个炸弹（上方“炸弹数量”可配置）</li>
          <li>点击"重置"按钮可以重新开始游戏</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, type Ref } from 'vue';

// --- Types ---
interface Card {
  word: string;
  flipped: boolean;
  type: 'score' | 'bomb';
  value: number | null;
}

interface LocalStorageData {
  words: string[];
  bombCount: number;
  isInputHidden: boolean;
}

// --- State ---
const words: Ref<string[]> = ref(Array(9).fill(''));
const cards: Ref<Card[]> = ref([]);
const score: Ref<number> = ref(0);
const gameStarted: Ref<boolean> = ref(false);
const gameOver: Ref<boolean> = ref(false);
const bombCount: Ref<number> = ref(1);
const isInputHidden: Ref<boolean> = ref(false);
const cardBackRefs: Ref<HTMLElement[]> = ref([]);

// --- Audio ---
const audioContext: AudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

function ensureAudioContext(): void {
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playSound(frequency: number, duration: number, type: OscillatorType = "sine"): void {
  ensureAudioContext();
  const oscillator: OscillatorNode = audioContext.createOscillator();
  const gainNode: GainNode = audioContext.createGain();

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

function playBombSound(): void {
  const frequencies: number[] = [100, 80, 60];
  frequencies.forEach((freq: number, index: number) => {
    setTimeout(() => {
      playSound(freq, 0.3, "sawtooth");
    }, index * 50);
  });
}

function playScoreSound(): void {
  const frequencies: number[] = [523.25, 659.25, 783.99];
  frequencies.forEach((freq: number, index: number) => {
    setTimeout(() => {
      playSound(freq, 0.15, "sine");
    }, index * 80);
  });
}

// --- Game Logic ---
function initCards(): void {
  cards.value = words.value.map((w: string): Card => ({
    word: w,
    flipped: false,
    type: 'score',
    value: 0
  }));
}

function startGame(): void {
  if (gameOver.value) return;

  const hasWords: boolean = words.value.some((w: string) => w.trim());
  if (!hasWords) {
    alert("请至少输入一个单词！");
    return;
  }

  updateBombCountConstraints();

  gameStarted.value = true;
  gameOver.value = false;
  score.value = 0;

  const maxBombs: number = Math.max(1, Math.min(bombCount.value, Math.max(1, words.value.length - 1)));
  const bombIndices: Set<number> = new Set();
  while (bombIndices.size < maxBombs) {
    bombIndices.add(Math.floor(Math.random() * words.value.length));
  }

  cards.value = words.value.map((w: string, i: number): Card => {
    if (bombIndices.has(i)) {
      return { word: w, flipped: false, type: 'bomb', value: null };
    } else {
      return { word: w, flipped: false, type: 'score', value: Math.floor(Math.random() * 3) + 1 };
    }
  });
}

function resetGame(): void {
  gameStarted.value = false;
  gameOver.value = false;
  score.value = 0;
  initCards();
}

function handleCardClick(index: number): void {
  const card: Card = cards.value[index];
  if (!gameStarted.value || gameOver.value || card.flipped) return;

  card.flipped = true;

  if (card.type === 'bomb') {
    gameOver.value = true;
    playBombSound();
    nextTick(() => {
      const el: HTMLElement | undefined = cardBackRefs.value[index];
      if (el) triggerExplosion(el);
    });
    setTimeout(() => {
      gameOver.value = false;
    }, 1200);
  } else {
    score.value += (card.value as number);
    playScoreSound();
  }
}

function triggerExplosion(container: HTMLElement): void {
  const boom: HTMLDivElement = document.createElement("div");
  boom.className = "explosion";
  container.appendChild(boom);

  const particles: number = 14;
  for (let i = 0; i < particles; i++) {
    const p: HTMLDivElement = document.createElement("div");
    p.className = "particle";
    const angle: number = Math.random() * Math.PI * 2;
    const distance: number = 40 + Math.random() * 70;
    const tx: number = Math.cos(angle) * distance;
    const ty: number = Math.sin(angle) * distance;
    p.style.setProperty("--tx", tx + "px");
    p.style.setProperty("--ty", ty + "px");
    container.appendChild(p);
  }

  setTimeout(() => {
    boom.remove();
    const addedParticles: NodeListOf<Element> = container.querySelectorAll(".particle");
    addedParticles.forEach((el: Element) => el.remove());
  }, 800);
}

function addWord(): void {
  words.value.push('');
  initCards();
  updateBombCountConstraints();
  saveToLocalStorage();
}

function removeWord(): void {
  if (words.value.length <= 1) {
    alert("至少需要保留1个单词！");
    return;
  }
  words.value.pop();
  initCards();
  updateBombCountConstraints();
  saveToLocalStorage();
}

function updateBombCountConstraints(): void {
  const maxAllowed: number = Math.max(1, words.value.length - 1);
  if (bombCount.value < 1) bombCount.value = 1;
  if (bombCount.value > maxAllowed) bombCount.value = maxAllowed;
}

function toggleInput(): void {
  isInputHidden.value = !isInputHidden.value;
  saveToLocalStorage();
}

// --- Persistence ---
function saveToLocalStorage(): void {
  const data: LocalStorageData = {
    words: words.value,
    bombCount: bombCount.value,
    isInputHidden: isInputHidden.value
  };
  localStorage.setItem("wordBombGame", JSON.stringify(data));
}

function loadFromLocalStorage(): void {
  try {
    const saved: string | null = localStorage.getItem("wordBombGame");
    if (saved) {
      const data: LocalStorageData = JSON.parse(saved);
      if (Array.isArray(data.words)) words.value = data.words;
      if (data.bombCount) bombCount.value = data.bombCount;
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
.bomb-game-container {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
  padding: 20px;
  width: 100%;
}

.container {
  max-width: 1400px;
  width: 100%;
  background-color: white;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  padding: 40px;
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

.score-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  gap: 20px;
}

.score {
  font-size: 36px;
  font-weight: bold;
  background: linear-gradient(90deg, #00b09b, #96c93d);
  color: white;
  padding: 10px 30px;
  border-radius: 50px;
  box-shadow: 0 5px 15px rgba(0, 176, 155, 0.3);
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
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
  opacity: 0.2;
}

.back-home-btn:hover {
  opacity: 1;
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 176, 155, 0.4);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  margin-top: 30px;
}

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

.card-back.bomb {
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  animation: shake 0.5s;
}

.card-back.score {
  background: linear-gradient(135deg, #00b09b, #96c93d);
}

@keyframes shake {
  0%, 100% { transform: rotateY(180deg) translateX(0); }
  25% { transform: rotateY(180deg) translateX(-10px); }
  75% { transform: rotateY(180deg) translateX(10px); }
}

/* Explosion Animation */
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
  0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.9; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
}

:deep(.particle) {
  position: absolute;
  width: 10px;
  height: 10px;
  background: radial-gradient(
    circle,
    #fff59d 0%,
    #ff9800 60%,
    #f44336 100%
  );
  border-radius: 50%;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: fly 720ms ease-out forwards;
}

@keyframes fly {
  0% { transform: translate(-50%, -50%) scale(0.7); opacity: 1; }
  100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.4); opacity: 0; }
}

.number {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 5px;
}

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

.game-over {
  text-align: center;
  margin-top: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  color: white;
  border-radius: 15px;
  font-size: 24px;
  font-weight: bold;
  display: none;
}

.game-over.show {
  display: block;
  animation: fadeIn 0.5s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
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

  .score {
    font-size: 28px;
    padding: 8px 20px;
  }

  .btn {
    padding: 10px 20px;
    font-size: 16px;
  }
}
</style>
