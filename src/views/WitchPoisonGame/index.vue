<template>
  <div class="witch-poison-container">
    <div class="title-bar" data-tauri-drag-region></div>
    <router-link to="/" class="back-home-btn">
      <i class="fas fa-home">🏠</i>
    </router-link>
    
    <header>
      <h1>
        <i class="fas fa-hat-wizard">🧙‍♀️</i> 女巫的毒药
        <i class="fas fa-flask-poison">🧪</i>
      </h1>
    </header>

    <div class="game-container">
      <div class="control-panel">
        <h2 class="panel-title"><i class="fas fa-cogs">⚙️</i> 游戏设置</h2>

        <div class="input-area">
          <button class="btn btn-import-file" @click="handleTauriFileSelect">
            <i class="fas fa-file-import">📂</i> 选择 Excel/TXT 文件
          </button>

          <textarea
            v-model="wordInputText"
            spellcheck="false"
            placeholder="在此输入单词，每行一个。&#10;或者点击上方按钮导入文件。&#10;系统会自动根据单词数量调整卡片大小。"
          ></textarea>

          <button class="btn" @click="importWordsFromTextarea">
            <i class="fas fa-magic">✨</i> 生成单词卡 (从文本框)
          </button>

          <button
            class="btn btn-restart"
            :class="{ 'btn-disabled': !canRestart }"
            :disabled="!canRestart"
            @click="restartGame"
          >
            <i class="fas fa-redo-alt">🔄</i> 重新开始 (换毒药)
          </button>
        </div>

        <div class="instructions">
          <h3><i class="fas fa-book-open">📖</i> 玩法指南：</h3>
          <ul>
            <li>1. 输入单词或导入 Excel/TXT 文件</li>
            <li>2. <strong>第一组</strong>点击一个单词作为“毒药”(保密)</li>
            <li>3. <strong>第二组</strong>点击另一个单词作为“毒药”(保密)</li>
            <li>4. 全班轮流读单词并点击，点到红色毒药者淘汰！</li>
            <li>5. 点击“重新开始”可保留单词表，仅重置毒药位置</li>
          </ul>
        </div>
      </div>

      <div class="word-grid-container">
        <h2 class="panel-title"><i class="fas fa-th">🔲</i> 单词魔法阵</h2>

        <div class="game-status" :style="{ color: statusColor }">{{ gameStatusText }}</div>

        <div class="word-grid" :class="gridClass">
          <div
            v-for="(word, index) in words"
            :key="index"
            class="word-cell"
            :class="{
              'selected-poison': tempSelectedPoisonIndex === index,
              'poisoned': poisonedIndices.includes(index),
              'safe': safeIndices.includes(index)
            }"
            @click="handleCellClick(index)"
          >
            {{ word }}
          </div>
        </div>
      </div>
    </div>

    <div class="notification" v-if="showNotification">
      <i class="fas fa-skull-crossbones">☠️</i><br />
      <span v-html="notificationText"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
// Note: XLSX is not imported as a module in the original code, it was a script tag.
// We might need to install it or use a dynamic import if available, or assume it's global if we keep the script tag in index.html (but we are in Vue now).
// For now, let's assume we can't easily use the global XLSX without including it.
// I will try to use a dynamic import or just rely on text import for now, or see if I can add it to package.json later.
// Actually, I should probably check if I can add it. But for now I will implement the text logic and try to handle XLSX if possible or warn.
// Wait, the user environment has `bun`. I can probably just rely on text for now or try to use a library if installed.
// The original code used a CDN link. I can't easily add CDN links to Vue components without modifying index.html.
// I'll stick to text support primarily and try to handle binary if I can, but without the library it's hard.
// I will add a note about XLSX dependency.
// Actually, I can try to use a dynamic import from a CDN if I really want, but that's flaky.
// Better to just support text for now and maybe add XLSX to package.json if the user wants it.
// Or I can try to read the file as text and parse simple CSV/TSV.

// --- State ---
const wordInputText = ref("");
const words = ref<string[]>([]);
const gameState = ref("setup"); // setup, team1Poison, team2Poison, playing, gameOver
const team1PoisonIndex = ref<number | null>(null);
const team2PoisonIndex = ref<number | null>(null);
const tempSelectedPoisonIndex = ref<number | null>(null);
const poisonedIndices = ref<number[]>([]);
const safeIndices = ref<number[]>([]);
const showNotification = ref(false);
const notificationText = ref("");

const STORAGE_KEY = "witchGame_words";

// --- Computed ---
const canRestart = computed(() => words.value.length > 0 && gameState.value !== 'setup');

const gridClass = computed(() => {
  const count = words.value.length;
  if (count <= 4) return "layout-huge";
  if (count <= 12) return "layout-large";
  if (count <= 32) return "layout-medium";
  return "layout-compact";
});

const gameStatusText = computed(() => {
  switch (gameState.value) {
    case 'setup': return "请先导入单词...";
    case 'team1Poison': return "🤫 第一阶段：请第一组派人点击一个单词藏毒药 (其他人闭眼)";
    case 'team2Poison': return "🤫 第二阶段：请第二组派人点击一个单词藏毒药 (其他人闭眼)";
    case 'playing': return "🎮 游戏开始！读单词并点击";
    case 'gameOver': return "🏆 游戏结束！所有毒药已清除！";
    default: return "";
  }
});

const statusColor = computed(() => {
  switch (gameState.value) {
    case 'team1Poison':
    case 'team2Poison': return "#ff9e6b";
    case 'playing': return "#4ecdc4";
    case 'gameOver': return "#ff6b6b";
    default: return "#ff9e6b";
  }
});

// --- Actions ---
onMounted(() => {
  loadWordsFromLocalStorage();
});

function loadWordsFromLocalStorage() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        words.value = parsedData;
        wordInputText.value = words.value.join("\n");
        startPoisonSelection();
      }
    }
  } catch (error) {
    console.error("读取本地存储失败:", error);
  }
}

function importWordsFromTextarea() {
  const input = wordInputText.value.trim();
  if (!input) {
    alert("请输入单词或选择文件！");
    return;
  }
  processTextToWords(input);
  finishImport();
}

function processTextToWords(text: string): void {
  words.value = text
    .split(/[\n,，]/)
    .map((line: string) => line.trim())
    .filter((line: string) => line !== "");
}

function finishImport() {
  if (words.value.length === 0) {
    alert("未检测到有效单词，请检查内容。");
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words.value));
  } catch (error) {
    console.error("无法保存到本地存储:", error);
  }
  wordInputText.value = words.value.join("\n");
  startPoisonSelection();
}

async function handleTauriFileSelect(): Promise<void> {
  try {
    const file = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Word List", extensions: ["xlsx", "xls", "txt"] }],
    });

    if (!file) return;

    const filePath = typeof file === 'string' ? file : (file as any).path || file;

    if (filePath.endsWith(".txt")) {
      const text = await readTextFile(filePath);
      processTextToWords(text);
      finishImport();
    } else {
      // For Excel, we need a library. Since we don't have it installed via npm,
      // we'll alert the user for now or try to read as text if it's CSV.
      // Ideally we should install 'xlsx' package.
      alert("Excel import requires 'xlsx' library. Please use .txt files for now or install the library.");
      // If we were to implement it:
      // const data = await readFile(filePath);
      // ... use XLSX.read(data) ...
    }
  } catch (err) {
    console.error("文件读取失败:", err);
    alert("读取文件失败: " + err);
  }
}

function startPoisonSelection() {
  gameState.value = "team1Poison";
  team1PoisonIndex.value = null;
  team2PoisonIndex.value = null;
  poisonedIndices.value = [];
  safeIndices.value = [];
}

function handleCellClick(index: number): void {
  if (poisonedIndices.value.includes(index) || safeIndices.value.includes(index)) return;

  if (gameState.value === "team1Poison") {
    team1PoisonIndex.value = index;
    highlightSelectionTemporary(index, () => {
      gameState.value = "team2Poison";
    });
  } else if (gameState.value === "team2Poison") {
    team2PoisonIndex.value = index;
    highlightSelectionTemporary(index, () => {
      startGamePlay();
    });
  } else if (gameState.value === "playing") {
    const isTeam1Poison = team1PoisonIndex.value === index;
    const isTeam2Poison = team2PoisonIndex.value === index;
    
    if (isTeam1Poison || isTeam2Poison) {
      handlePoisonFound(index);
    } else {
      markAsSafe(index);
    }
  }
}

function highlightSelectionTemporary(index: number, callback: () => void): void {
  tempSelectedPoisonIndex.value = index;
  setTimeout(() => {
    tempSelectedPoisonIndex.value = null;
    callback();
  }, 500);
}

function startGamePlay(): void {
  gameState.value = "playing";
}

function handlePoisonFound(index: number): void {
  poisonedIndices.value.push(index);
  
  const totalUniquePoisons = (team1PoisonIndex.value === team2PoisonIndex.value) ? 1 : 2;
  
  if (poisonedIndices.value.length >= totalUniquePoisons) {
    gameState.value = "gameOver";
    triggerNotification("毒药清除完毕！<br>游戏结束！", 3000);
  } else {
    triggerNotification("啊！有毒！<br>继续寻找！", 2000);
  }
}

function markAsSafe(index: number): void {
  safeIndices.value.push(index);
}

function triggerNotification(html: string, duration: number): void {
  notificationText.value = html;
  showNotification.value = true;
  setTimeout(() => {
    showNotification.value = false;
  }, duration);
}

function restartGame() {
  if (words.value.length === 0) return;
  startPoisonSelection();
}
</script>

<style scoped>
/* --- Global Reset & Base --- */
.witch-poison-container {
  background: linear-gradient(135deg, #1a2a6c, #b21f1f, #1a2a6c);
  color: #fff;
  min-height: 100vh;
  padding: 20px;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
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

/* --- Back Home Button --- */
.back-home-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: linear-gradient(to right, #4ecdc4, #6fffe9);
  color: #0a0f1e;
  border: none;
  padding: 0;
  font-size: 1.5rem;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 5px 15px rgba(78, 205, 196, 0.4);
  z-index: 1000;
  opacity: 0.5;
}

.back-home-btn:hover {
  opacity: 1;
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(78, 205, 196, 0.6);
}

/* --- Header --- */
header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  border: 2px solid #ff6b6b;
}

h1 {
  font-size: 3rem;
  margin: 0;
  color: #ff9e6b;
  text-shadow: 0 0 10px rgba(255, 158, 107, 0.7);
}

/* --- Layout --- */
.game-container {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  justify-content: center;
  align-items: flex-start;
}

.control-panel,
.word-grid-container {
  background: rgba(20, 30, 48, 0.85);
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
  border: 2px solid #4ecdc4;
}

.control-panel {
  flex: 1;
  min-width: 300px;
  position: sticky;
  top: 20px;
}

.word-grid-container {
  flex: 2;
  min-width: 60%;
}

.panel-title {
  font-size: 1.8rem;
  margin-bottom: 20px;
  color: #4ecdc4;
  text-align: center;
  padding-bottom: 10px;
  border-bottom: 2px solid #ff6b6b;
}

/* --- Input Area --- */
.input-area {
  margin-bottom: 25px;
}

textarea {
  width: 100%;
  height: 150px;
  padding: 15px;
  border-radius: 10px;
  background: rgba(10, 15, 30, 0.7);
  border: 2px solid #ff9e6b;
  color: white;
  font-size: 1.1rem;
  resize: vertical;
  margin-bottom: 15px;
  box-sizing: border-box;
}

textarea::placeholder {
  color: #aaa;
}

/* --- Buttons --- */
.btn {
  background: linear-gradient(to right, #ff6b6b, #ff9e6b);
  color: white;
  border: none;
  padding: 12px 25px;
  font-size: 1.1rem;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  display: block;
  width: 100%;
  margin: 10px 0;
  box-shadow: 0 5px 15px rgba(255, 107, 107, 0.4);
}

.btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(255, 107, 107, 0.6);
}

.btn-import-file {
  background: linear-gradient(to right, #4facfe, #00f2fe);
  margin-bottom: 15px;
}

.btn-restart {
  background: linear-gradient(to right, #4ecdc4, #6fffe9);
  color: #0a0f1e;
  box-shadow: 0 5px 15px rgba(78, 205, 196, 0.4);
}

.btn-restart:hover {
  box-shadow: 0 8px 20px rgba(78, 205, 196, 0.6);
}

.btn-disabled {
  background: #555;
  cursor: not-allowed;
  opacity: 0.7;
  pointer-events: none;
  box-shadow: none;
}

/* --- Instructions --- */
.instructions {
  background: rgba(10, 15, 30, 0.7);
  padding: 20px;
  border-radius: 10px;
  margin-top: 20px;
  font-size: 0.95rem;
  line-height: 1.6;
  border-left: 4px solid #ff6b6b;
}

.instructions h3 {
  color: #ff9e6b;
  margin-bottom: 10px;
}

.instructions ul {
  padding-left: 20px;
}

.instructions li {
  margin-bottom: 8px;
}

/* --- Word Grid --- */
.word-grid {
  display: grid;
  gap: 15px;
  margin: 0 auto;
  width: 100%;
  transition: all 0.5s ease;
}

.word-cell {
  background: linear-gradient(135deg, #3a506b, #1c2541);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  border: 2px solid #4ecdc4;
  user-select: none;
  word-wrap: break-word;
  word-break: break-word;
  color: #fff;
  line-height: 1.3;
}

.word-grid.layout-huge { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.word-grid.layout-huge .word-cell { min-height: 180px; font-size: 2.8rem; border-width: 4px; }

.word-grid.layout-large { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.word-grid.layout-large .word-cell { min-height: 130px; font-size: 1.8rem; border-width: 3px; }

.word-grid.layout-medium { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
.word-grid.layout-medium .word-cell { min-height: 90px; font-size: 1.25rem; }

.word-grid.layout-compact { grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; }
.word-grid.layout-compact .word-cell { min-height: 60px; font-size: 0.95rem; padding: 5px; }

.word-cell:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
  background: linear-gradient(135deg, #4a618b, #2a3a5e);
  z-index: 2;
}

.word-cell.selected-poison {
  background: linear-gradient(135deg, #ff6b6b, #c44545);
  border-color: #ff9e6b;
  box-shadow: 0 0 15px rgba(255, 107, 107, 0.7);
  transform: scale(1.05);
}

.word-cell.poisoned {
  background: linear-gradient(135deg, #8b0000, #4a0000);
  border-color: #ff0000;
  animation: poisonEffect 0.8s ease;
}

.word-cell.safe {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  border-color: #2ecc71;
  opacity: 0.6;
  cursor: not-allowed;
  transform: scale(0.95);
  box-shadow: none;
}

@keyframes poisonEffect {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); box-shadow: 0 0 30px rgba(255, 0, 0, 0.8); }
  100% { transform: scale(1); }
}

.game-status {
  text-align: center;
  font-size: 1.5rem;
  margin: 0 0 25px 0;
  padding: 15px;
  border-radius: 10px;
  background: rgba(10, 15, 30, 0.7);
  border: 2px solid #ff9e6b;
  color: #ff9e6b;
  font-weight: bold;
}

/* --- Notification --- */
.notification {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(178, 31, 31, 0.95);
  color: white;
  padding: 40px 60px;
  border-radius: 20px;
  font-size: 3rem;
  font-weight: bold;
  text-align: center;
  box-shadow: 0 0 50px rgba(255, 0, 0, 0.8);
  z-index: 1000;
  border: 4px solid #fff;
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  from { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

@media (max-width: 768px) {
  .game-container { flex-direction: column; }
  .control-panel, .word-grid-container { width: 100%; min-width: auto; }
  h1 { font-size: 2rem; }
}
</style>
