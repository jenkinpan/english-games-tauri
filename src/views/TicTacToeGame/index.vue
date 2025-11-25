<template>
  <div class="tictactoe-game-container">
    <div class="title-bar" data-tauri-drag-region></div>
    <router-link to="/" class="back-home-btn">🏠</router-link>
    <h1>英语单词九宫格游戏</h1>

    <div class="container">
      <div class="game-container">
        <!-- Left Panel: Game Board -->
        <div class="left-panel">
          <div class="status">
            <div class="player white" :class="{ active: currentPlayer === 'white' }">
              <span class="indicator"></span><span>白棋回合</span>
            </div>
            <div class="player black" :class="{ active: currentPlayer === 'black' }">
              <span class="indicator"></span><span>黑棋回合</span>
            </div>
          </div>

          <div class="board">
            <div
              v-for="(cell, index) in board"
              :key="index"
              class="cell"
              :class="[cell.value, { winning: cell.isWinning }]"
              :style="gameOver ? { cursor: 'not-allowed', opacity: 0.6 } : {}"
              @click="makeMove(index)"
            >
              {{ cell.word || `单词 ${index + 1}` }}
            </div>
          </div>

          <div class="controls">
            <button class="btn btn-restart" @click="fullRestart">重新开始游戏</button>
            <button class="btn btn-next-round" @click="nextRound" :disabled="allWords.length < 9">下一回合</button>
          </div>
        </div>

        <!-- Right Panel: Scoreboard & Manager -->
        <div class="right-panel">
          <div class="scoreboard">
            <h3>🏆 计分板 🏆</h3>

            <div class="progress-container">
              <div class="progress-title">胜负进度</div>
              <div class="progress-bar">
                <div class="white-progress" :style="{ width: whitePercent + '%' }"></div>
                <div class="black-progress" :style="{ width: blackPercent + '%' }"></div>
              </div>
              <div class="progress-labels">
                <span>白棋: {{ whitePercent }}%</span>
                <span>黑棋: {{ blackPercent }}%</span>
              </div>
            </div>

            <div class="stats-container">
              <div class="stat-card white-stats">
                <div class="stat-label">白棋胜</div>
                <div class="stat-value">{{ stats.whiteWins }}</div>
                <div>回合</div>
              </div>
              <div class="stat-card draw-stats">
                <div class="stat-label">平局</div>
                <div class="stat-value">{{ stats.draws }}</div>
                <div>回合</div>
              </div>
              <div class="stat-card black-stats">
                <div class="stat-label">黑棋胜</div>
                <div class="stat-value">{{ stats.blackWins }}</div>
                <div>回合</div>
              </div>
            </div>

            <ul class="round-results" :class="{ scrollable: roundResults.length > 2 }">
              <li
                v-for="(result, index) in roundResults"
                :key="index"
                :class="result.winnerClass"
                :style="{ animationDelay: index * 0.1 + 's' }"
              >
                <div class="score-icon">{{ result.icon }}</div>
                <div class="score-content">
                  <div class="round">第 {{ result.round }} 回合</div>
                  <div class="winner">{{ result.winnerName }} 获胜</div>
                </div>
              </li>
            </ul>
            <p id="final-result" v-if="finalResultHTML" v-html="finalResultHTML"></p>
          </div>

          <div class="word-manager">
            <div class="word-manager-header">
              <h4 style="margin: 0">📝 添加单词 (至少9个)</h4>
              <div class="word-manager-buttons">
                <button class="btn-toggle-word-input" @click="toggleWordInput">
                  {{ isWordInputHidden ? '显示' : '隐藏' }}
                </button>
                <button class="btn-add-word-input" @click="addWordInput">增加</button>
                <button class="btn-remove-word-input" @click="removeWordInput">减少</button>
              </div>
            </div>
            <div class="word-inputs-container" :class="{ hidden: isWordInputHidden }">
              <div class="word-inputs-grid">
                <div v-for="(word, index) in wordInputs" :key="index" class="word-input-group">
                  <label>单词 {{ index + 1 }}:</label>
                  <input
                    type="text"
                    class="word-input"
                    v-model="wordInputs[index]"
                    :placeholder="`输入单词 ${index + 1}`"
                    @input="updateWords"
                  />
                </div>
              </div>
              <div class="word-count" :class="{ highlight: allWords.length >= 9 }">
                当前单词数: {{ allWords.length }}
              </div>
            </div>
          </div>

          <div class="game-rules">
            <h3>游戏规则说明</h3>
            <p>1. 在下方输入框中添加至少9个英语单词，回合数依单词数而定。</p>
            <p>2. 将学生分为白棋组和黑棋组，学生轮流点击格子下棋。</p>
            <p>3. 下棋前必须准确读出单词并说出中文释义。</p>
            <p>4. 如果连成三个棋子，则当前回合胜出。</p>
            <p>5. 为保证公平，每一回合自动切换先手玩家。</p>
            <p>6. 所有回合结束后，会展示最终获胜方。</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Win Modal -->
    <div class="win-message" :class="{ show: showWinModal }">
      <div class="win-content">
        <h2>游戏结束</h2>
        <p>{{ winText }}</p>
        <button class="btn" @click="closeWinModal">继续游戏</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';

// --- Types ---
interface Cell {
  value: string | null;
  isWinning: boolean;
  word: string;
}

interface RoundResult {
  round: number;
  winnerName: string;
  winnerClass: string;
  icon: string;
}

interface LocalStorageData {
  words: string[];
  wordCount: number;
  isWordInputHidden: boolean;
}

// --- State ---
const currentPlayer = ref('white');
const board = ref<Cell[]>(Array(9).fill(null).map((): Cell => ({ value: null, isWinning: false, word: '' })));
const gameOver = ref(false);
const allWords = ref<string[]>([]);
const currentRound = ref(0);
const stats = reactive({ whiteWins: 0, blackWins: 0, draws: 0 });
const roundResults = ref<RoundResult[]>([]);
const wordInputs = ref<string[]>(Array(9).fill(''));
const isWordInputHidden = ref(false);
const showWinModal = ref(false);
const winText = ref('');

// --- Computed ---
const totalRounds = computed(() => stats.whiteWins + stats.blackWins + stats.draws);
const whitePercent = computed(() => totalRounds.value === 0 ? 0 : Math.round((stats.whiteWins / totalRounds.value) * 100));
const blackPercent = computed(() => totalRounds.value === 0 ? 0 : Math.round((stats.blackWins / totalRounds.value) * 100));

const finalResultHTML = computed(() => {
  if (allWords.value.length <= (currentRound.value + 1) * 9 && totalRounds.value > 0) {
    let winner;
    if (stats.whiteWins > stats.blackWins) winner = '白棋';
    else if (stats.blackWins > stats.whiteWins) winner = '黑棋';
    else winner = '平局';
    return `🏆 最终获胜方：<span class="highlight">${winner}</span> 🏆`;
  }
  return '';
});

// --- Audio ---
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

function ensureAudioContext() {
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine"): void {
  ensureAudioContext();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(0, audioContext.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + duration);
}

function playSound(type: string): void {
  if (type === "click") {
    playTone(440, 0.1, "sine");
  } else if (type === "win") {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq: number, index: number) => {
      setTimeout(() => playTone(freq, 0.2, "sine"), index * 100);
    });
  } else if (type === "draw") {
    playTone(330, 0.3, "sine");
  }
}

// --- Game Logic ---
function initBoard(): void {
  // Reset board cells
  board.value = Array(9).fill(null).map((): Cell => ({ value: null, isWinning: false, word: '' }));
  
  // Assign words
  const totalWords = allWords.value.length;
  if (totalWords === 0) return;

  for (let i = 0; i < 9; i++) {
    const index = (currentRound.value * 9 + i) % totalWords;
    board.value[i].word = allWords.value[index] || '';
  }
}

function makeMove(index: number): void {
  if (gameOver.value || board.value[index].value) return;

  board.value[index].value = currentPlayer.value;
  playSound("click");

  const winningPattern = checkWin();
  if (winningPattern) {
    gameOver.value = true;
    const winnerName = currentPlayer.value === 'white' ? '白棋' : '黑棋';
    handleWin(winnerName, winningPattern);
    return;
  }

  if (board.value.every((cell: Cell) => cell.value)) {
    gameOver.value = true;
    handleDraw();
    return;
  }

  currentPlayer.value = currentPlayer.value === 'white' ? 'black' : 'white';
}

function checkWin(): number[] | null {
  const patterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  for (const pattern of patterns) {
    const [a, b, c] = pattern;
    if (
      board.value[a].value &&
      board.value[a].value === board.value[b].value &&
      board.value[a].value === board.value[c].value
    ) {
      return pattern;
    }
  }
  return null;
}

function handleWin(winnerName: string, pattern: number[]): void {
  if (winnerName === '白棋') stats.whiteWins++;
  else stats.blackWins++;

  pattern.forEach((idx: number) => board.value[idx].isWinning = true);
  playSound("win");
  createConfetti();

  roundResults.value.push({
    round: currentRound.value + 1,
    winnerName: winnerName,
    winnerClass: winnerName === '白棋' ? 'white-win' : 'black-win',
    icon: winnerName === '白棋' ? '🥇' : '🥈'
  });

  winText.value = `恭喜${winnerName}获胜！`;
  showWinModal.value = true;
}

function handleDraw() {
  stats.draws++;
  playSound("draw");
  roundResults.value.push({
    round: currentRound.value + 1,
    winnerName: '平局',
    winnerClass: 'draw',
    icon: '🤝'
  });
  winText.value = '平局！';
  showWinModal.value = true;
}

function createConfetti() {
  const colors = ["#ffd700", "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7"];
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const el = document.createElement("div");
      el.className = "confetti";
      el.style.left = Math.random() * 100 + "%";
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDelay = Math.random() * 0.5 + "s";
      el.style.width = Math.random() * 10 + 5 + "px";
      el.style.height = el.style.width;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }, i * 20);
  }
}

function fullRestart() {
  currentRound.value = 0;
  stats.whiteWins = 0;
  stats.blackWins = 0;
  stats.draws = 0;
  roundResults.value = [];
  resetGame();
}

function resetGame() {
  currentPlayer.value = currentRound.value % 2 === 0 ? 'white' : 'black';
  gameOver.value = false;
  initBoard();
}

function nextRound() {
  if (allWords.value.length < 9) {
    alert("请先添加至少9个单词！");
    return;
  }
  currentRound.value++;
  resetGame();
}

function closeWinModal() {
  showWinModal.value = false;
}

// --- Word Manager ---
function addWordInput() {
  wordInputs.value.push('');
  updateWords();
}

function removeWordInput() {
  if (wordInputs.value.length <= 1) {
    alert("至少需要保留1个单词输入框！");
    return;
  }
  wordInputs.value.pop();
  updateWords();
}

function toggleWordInput() {
  isWordInputHidden.value = !isWordInputHidden.value;
  saveToLocalStorage();
}

function updateWords(): void {
  const words = wordInputs.value.map((w: string) => w.trim()).filter((w: string) => w);
  // Unique words only? Original code checks for duplicates.
  allWords.value = [...new Set(words)];
  
  // Update board if game not started or just to refresh words
  // If we update words mid-game, should the board update?
  // Original code: "更新棋盘显示，使单词变化时棋盘也随之更新"
  if (allWords.value.length > 0) {
    // Only update words on board, preserve game state if possible?
    // Original calls initBoard() which resets board content but keeps game state?
    // Actually initBoard() in original recreates cells.
    // But here we want to keep X/O.
    // Let's just update the words in the existing cells.
    const totalWords = allWords.value.length;
    for (let i = 0; i < 9; i++) {
      const index = (currentRound.value * 9 + i) % totalWords;
      board.value[i].word = allWords.value[index] || '';
    }
  }
  
  saveToLocalStorage();
}

// --- Persistence ---
function saveToLocalStorage(): void {
  const data: LocalStorageData = {
    words: wordInputs.value,
    wordCount: wordInputs.value.length,
    isWordInputHidden: isWordInputHidden.value
  };
  localStorage.setItem("wordGridGame", JSON.stringify(data));
}

function loadFromLocalStorage(): void {
  try {
    const saved = localStorage.getItem("wordGridGame");
    if (saved) {
      const data = JSON.parse(saved) as LocalStorageData;
      if (Array.isArray(data.words)) {
        wordInputs.value = data.words;
        updateWords();
      }
      if (typeof data.isWordInputHidden === 'boolean') isWordInputHidden.value = data.isWordInputHidden;
    }
  } catch (e) {
    console.error(e);
  }
}

onMounted(() => {
  loadFromLocalStorage();
  initBoard();
});
</script>

<style scoped>
.tictactoe-game-container {
  background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  color: white;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  box-sizing: border-box;
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

h1 {
  text-align: center;
  margin-bottom: 20px;
  font-size: 2.5rem;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.back-home-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a2a6c;
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
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
  transition: all 0.3s ease;
  z-index: 1000;
  opacity: 0.5;
}

.back-home-btn:hover {
  opacity: 1;
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(255, 215, 0, 0.6);
}

.container {
  max-width: 1200px;
  width: 100%;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  margin-top: 20px;
}

.game-container {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  justify-content: center;
}

.left-panel {
  flex: 1.5;
  min-width: 400px;
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
}

.right-panel {
  flex: 1;
  min-width: 300px;
}

.status {
  display: flex;
  justify-content: space-around;
  margin: 20px 0;
  padding: 15px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
}

.player {
  text-align: center;
  padding: 10px 20px;
  border-radius: 10px;
  min-width: 120px;
}

.player.active {
  background: rgba(255, 215, 0, 0.2);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
  border: 2px solid #ffd700;
}

.player .indicator {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 10px;
  vertical-align: middle;
}

.player.white .indicator {
  background: white;
  box-shadow: 0 0 8px white;
}

.player.black .indicator {
  background: black;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
  border: 1px solid #555;
}

.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 12px;
  max-width: 500px;
  margin: 0 auto;
}

.cell {
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
  text-align: center;
  padding: 15px;
  word-break: keep-all;
}

.cell:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-3px);
}

.cell.white {
  background: #ffffff;
  color: #333;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
}

.cell.black {
  background: #222;
  color: #fff;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.8);
}

.cell.winning {
  animation: winPulse 0.6s ease-in-out infinite;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
  transform: scale(1.1);
}

@keyframes winPulse {
  0% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); transform: scale(1.1); }
  50% { box-shadow: 0 0 40px rgba(255, 215, 0, 1); transform: scale(1.15); }
  100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); transform: scale(1.1); }
}

.controls {
  display: flex;
  gap: 15px;
  margin-top: 20px;
  justify-content: center;
}

.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(90deg, #ff8a00, #ff0080);
  color: white;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.4);
}

.btn-restart {
  background: linear-gradient(90deg, #00c9ff, #92fe9d);
}

.btn-next-round {
  background: linear-gradient(90deg, #9b59b6, #3498db);
}

.scoreboard {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
  margin-top: 20px;
}

.scoreboard h3 {
  color: #ffd700;
  margin-bottom: 15px;
  text-align: center;
  font-size: 1.5rem;
  position: relative;
  display: inline-block;
  padding: 0 20px;
  left: 50%;
  transform: translateX(-50%);
}

.progress-container {
  margin: 25px 0;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 15px;
}

.progress-title {
  text-align: center;
  margin-bottom: 15px;
  color: #ffd700;
}

.progress-bar {
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
  display: flex;
}

.white-progress {
  height: 100%;
  background: linear-gradient(90deg, #f0f0f0, #ffffff);
  transition: width 1s ease;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.black-progress {
  height: 100%;
  background: linear-gradient(90deg, #333, #000);
  transition: width 1s ease;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 0.9rem;
}

.stats-container {
  display: flex;
  justify-content: space-between;
  margin: 20px 0;
  gap: 15px;
}

.stat-card {
  flex: 1;
  text-align: center;
  padding: 15px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.3);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.stat-card.white-stats { border: 2px solid rgba(255, 255, 255, 0.3); }
.stat-card.black-stats { border: 2px solid rgba(0, 0, 0, 0.5); }
.stat-card.draw-stats { border: 2px solid rgba(150, 150, 150, 0.5); }

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  margin: 10px 0;
  color: #ffd700;
}

.stat-label {
  font-size: 0.9rem;
  color: #ccc;
}

.round-results {
  list-style: none;
  padding: 0;
  margin: 20px 0;
}

.round-results.scrollable {
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 10px;
}

.round-results li {
  margin-bottom: 15px;
  padding: 12px 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  display: flex;
  align-items: center;
  animation: slideIn 0.5s ease forwards;
  opacity: 0;
  transform: translateY(20px);
  position: relative;
  overflow: hidden;
}

.round-results li:before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 5px;
  height: 100%;
}

.round-results li.white-win:before { background: white; box-shadow: 0 0 10px white; }
.round-results li.black-win:before { background: black; box-shadow: 0 0 10px rgba(0, 0, 0, 0.8); }
.round-results li.draw:before { background: linear-gradient(to bottom, white 50%, black 50%); }

.score-icon {
  margin-right: 12px;
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.white-win .score-icon { background: white; color: #333; box-shadow: 0 0 10px rgba(255, 255, 255, 0.5); }
.black-win .score-icon { background: #222; color: white; box-shadow: 0 0 10px rgba(0, 0, 0, 0.5); }
.draw .score-icon { background: linear-gradient(135deg, #555, #888); color: white; }

.score-content { flex-grow: 1; }
.score-content .round { font-weight: bold; color: #ffd700; margin-bottom: 5px; }
.score-content .winner { font-size: 1.1rem; }

#final-result {
  text-align: center;
  padding: 15px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 10px;
  margin-top: 20px;
  font-size: 1.3rem;
  font-weight: bold;
  color: #ffd700;
  animation: pulse 2s infinite;
  border: 2px solid rgba(255, 215, 0, 0.3);
}

.word-manager {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 10px;
  margin-top: 20px;
  margin-bottom: 20px;
}

.word-manager h4 {
  color: #ffd700;
  margin-bottom: 15px;
  text-align: center;
}

.word-manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.word-manager-buttons {
  display: flex;
  gap: 10px;
}

.word-inputs-container {
  transition: max-height 0.5s ease, padding 0.5s ease, margin 0.5s ease;
  max-height: 1000px;
  overflow: hidden;
}

.word-inputs-container.hidden {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin-top: 0;
  margin-bottom: 0;
}

.btn-toggle-word-input,
.btn-add-word-input,
.btn-remove-word-input {
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.btn-toggle-word-input { background: linear-gradient(90deg, #ffa62e, #ff3c38); }
.btn-add-word-input { background: linear-gradient(90deg, #4facfe, #00f2fe); }
.btn-remove-word-input { background: linear-gradient(90deg, #fa709a, #fee140); }

.word-inputs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.word-input-group {
  display: flex;
  flex-direction: column;
}

.word-input-group label {
  margin-bottom: 5px;
  font-weight: bold;
  color: #ffd700;
  font-size: 0.9rem;
}

.word-input {
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid #ffd700;
  border-radius: 5px;
  color: white;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  width: 100%;
  box-sizing: border-box;
}

.word-input:focus {
  outline: none;
  border-color: #ffd700;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  background: rgba(255, 255, 255, 0.15);
}

.word-count {
  text-align: center;
  color: #ccc;
  font-size: 0.9rem;
  margin-top: 15px;
}

.word-count.highlight {
  color: #ffd700;
  font-weight: bold;
}

.game-rules {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
  margin-top: 20px;
}

.game-rules h3 {
  color: #ffd700;
  margin-bottom: 10px;
}

.win-message {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease;
}

.win-message.show {
  opacity: 1;
  pointer-events: all;
}

.win-content {
  background: linear-gradient(135deg, #1a2a6c, #b21f1f);
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 0 40px rgba(255, 215, 0, 0.8);
  transform: scale(0.8);
  transition: transform 0.5s ease;
}

.win-message.show .win-content {
  transform: scale(1);
}

.win-content h2 {
  font-size: 3rem;
  margin-bottom: 20px;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
}

.win-content p {
  font-size: 1.5rem;
  margin-bottom: 30px;
}

:deep(.confetti) {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #ffd700;
  animation: confettiFall 3s linear forwards;
}

@keyframes confettiFall {
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

@keyframes slideIn {
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
  50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
  100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
}
</style>
