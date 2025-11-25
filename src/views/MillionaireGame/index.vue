<template>
  <div class="millionaire-container">
    <router-link to="/" class="back-home-btn">🏠</router-link>

    <div class="container">
      <header>
        <h1>🏰 魔法大富翁：巅峰对决</h1>
      </header>

      <div class="game-container">
        <div class="board-container">
          <div class="board" ref="boardRef">
            <div
              v-for="(cell, index) in boardCells"
              :key="index"
              :ref="(el) => { if (el) cellRefs[index] = el }"
              :class="['cell', cell.status, cell.eventClass]"
              :style="{ gridRow: cell.r, gridColumn: cell.c }"
            >
              {{ cell.content }}
            </div>

            <div
              v-for="player in players"
              :key="player.id"
              :class="['player-token', 'p' + player.id, { frozen: player.frozen }]"
              :style="player.style"
            >
              <div class="token-body">{{ player.id }}</div>
            </div>
          </div>
        </div>

        <div class="control-panel">
          <div class="panel-box">
            <h2 class="panel-title">👥 玩家队伍</h2>
            <div style="display: flex; gap: 5px; margin-bottom: 5px">
              <button class="btn btn-green" @click="changePlayerCount(1)">➕</button>
              <button class="btn btn-red" @click="changePlayerCount(-1)">➖</button>
            </div>
            <div class="player-list">
              <div
                v-for="p in players"
                :key="p.id"
                :class="['player-row', { active: p.id === currentPlayer, 'frozen-row': p.frozen }]"
              >
                <span style="font-size: 1.2rem; margin-right: 8px">{{ p.id === currentPlayer ? "👉" : "" }}</span>
                <b>玩家 {{ p.id }}</b>
                <span style="margin-left: auto; font-size: 0.9rem; color: #ddd">
                  {{ p.frozen ? "❄️ 冰冻" : `位置: ${p.position}` }}
                </span>
              </div>
            </div>
          </div>

          <div class="panel-box">
            <h2 class="panel-title">🎲 命运骰子</h2>
            <div class="scene" @click="rollDice">
              <div class="cube" :class="{ rolling: isRolling }" :style="diceStyle">
                <div class="cube__face cube__face--1">1</div>
                <div class="cube__face cube__face--2">2</div>
                <div class="cube__face cube__face--3">3</div>
                <div class="cube__face cube__face--4">4</div>
                <div class="cube__face cube__face--5">5</div>
                <div class="cube__face cube__face--6">6</div>
              </div>
            </div>
            <p style="text-align: center; margin-top: 5px; color: #ccc; font-size: 0.9rem">
              {{ diceMsg }}
            </p>
          </div>

          <div class="panel-box">
            <h2 class="panel-title">🔧 系统功能</h2>
            <button class="btn btn-yellow" @click="showSettings = true">⚙️ 题库设置</button>
            <button class="btn btn-red" @click="resetGame">🔄 重置游戏</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div class="modal" :class="{ show: showSettings }">
      <div class="modal-content">
        <h2 style="color: #ffd700; margin-bottom: 15px">📝 题库管理</h2>
        <div class="editor-container">
          <div v-for="(q, index) in editingQuestions" :key="index" class="q-row">
            <input class="inp-q" placeholder="输入题目" v-model="q.q">
            <input class="inp-a" placeholder="输入答案" v-model="q.a">
            <button class="btn btn-red" style="width: 40px; margin: 0" @click="removeQuestion(index)">🗑️</button>
          </div>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center">
          <button class="btn btn-green" style="width: auto" @click="addQuestion">➕ 加一题</button>
          <button class="btn btn-blue" style="width: auto" @click="saveQuestions">💾 保存修改</button>
          <button class="btn btn-red" style="width: auto" @click="showSettings = false">❌ 关闭</button>
        </div>
      </div>
    </div>

    <!-- Game Modal -->
    <div class="modal" :class="{ show: gameModal.show }">
      <div class="modal-content">
        <h2 style="color: #ffd700; margin-bottom: 20px">{{ gameModal.title }}</h2>
        <div
          style="font-size: 1.2rem; min-height: 80px; display: flex; flex-direction: column; justify-content: center; align-items: center; line-height: 1.6"
          v-html="gameModal.body"
        ></div>
        <div style="margin-top: 25px; display: flex; gap: 15px; justify-content: center">
          <button
            v-for="(btn, index) in gameModal.buttons"
            :key="index"
            :class="['btn', btn.class]"
            style="width: auto; padding: 8px 20px"
            @click="btn.action"
          >
            {{ btn.text }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch } from 'vue';

// --- Types ---
interface PathCell {
  r: number;
  c: number;
}

interface BoardCell {
  id: number;
  r: number;
  c: number;
  type: string;
  content: string | number;
  status: string;
  eventClass: string;
}

interface Player {
  id: number;
  position: number;
  frozen: boolean;
  style: Record<string, string>;
}

interface Question {
  q: string;
  a: string;
}

interface ModalButton {
  text: string;
  class?: string;
  action?: () => void;
  callback?: () => void;
}

interface GameModal {
  show: boolean;
  title: string;
  body: string;
  buttons: ModalButton[];
}

// --- Constants ---
const COLS = 8;
const ROWS = 6;
const PATH_MAP: PathCell[] = [];
for (let r = 1; r <= ROWS; r++) {
  if (r % 2 !== 0) {
    for (let c = 1; c <= COLS; c++) {
      PATH_MAP.push({ r, c });
    }
  } else {
    for (let c = COLS; c >= 1; c--) {
      PATH_MAP.push({ r, c });
    }
  }
}

// --- State ---
const boardCells = ref<BoardCell[]>([]);
const cellRefs = ref<any[]>([]);
const players = ref<Player[]>([]);
const currentPlayer = ref(1);
const playerCount = ref(2);
const gameActive = ref(true);
const questions = ref<Question[]>([]);
const editingQuestions = ref<Question[]>([]);

const diceMsg = ref("点击骰子开始");
const isRolling = ref(false);
const diceStyle = ref({ transform: 'translateZ(-50px) rotateX(0deg) rotateY(0deg)' });

const showSettings = ref(false);
const gameModal = reactive<GameModal>({
  show: false,
  title: '',
  body: '',
  buttons: []
});

// --- Audio ---
const SFX = {
  ctx: new (window.AudioContext || (window as any).webkitAudioContext)(),
  playTone: function (freq: number, type: OscillatorType, duration: number): void {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },
  roll: () => {
    let count = 0;
    const interval = setInterval(() => {
      SFX.playTone(200 + Math.random() * 100, "square", 0.05);
      count++;
      if (count > 8) clearInterval(interval);
    }, 60);
  },
  win: () => {
    [440, 554, 659, 880].forEach((f, i) =>
      setTimeout(() => SFX.playTone(f, "sine", 0.3), i * 150)
    );
  },
  correct: () => {
    SFX.playTone(600, "sine", 0.1);
    setTimeout(() => SFX.playTone(900, "sine", 0.2), 100);
  },
  wrong: () => {
    SFX.playTone(150, "sawtooth", 0.3);
    setTimeout(() => SFX.playTone(100, "sawtooth", 0.3), 200);
  },
  magic: () => {
    SFX.playTone(1200, "triangle", 0.5);
  },
};

// --- Initialization ---
onMounted(() => {
  loadQuestions();
  resetGame();
  // Sync editing questions
  watch(showSettings, (val) => {
    if (val) {
      editingQuestions.value = JSON.parse(JSON.stringify(questions.value));
    }
  });
});

// --- Game Logic ---
function resetGame() {
  currentPlayer.value = 1;
  gameActive.value = true;
  gameModal.show = false;
  showSettings.value = false;
  diceMsg.value = "点击骰子开始";
  diceStyle.value = { transform: 'translateZ(-50px) rotateX(0deg) rotateY(0deg)' };

  generateBoard();
  createPlayers();
}

function generateBoard(): void {
  boardCells.value = PATH_MAP.map((pos, i) => {
    let type = 'normal';
    let content: string | number = i;
    let status = 'unknown';
    let eventClass = '';

    if (i === 0) {
      status = 'start';
      content = '起点';
    } else if (i === PATH_MAP.length - 1) {
      status = 'end';
      content = '终点';
    } else {
      const r = Math.random();
      if (r < 0.15) type = 'lucky';
      else if (r < 0.3) type = 'bad';
      else if (r < 0.4) type = 'freeze';
      else if (r < 0.5) type = 'attack';
      else if (r < 0.55) type = 'again';
    }

    return {
      id: i,
      r: pos.r,
      c: pos.c,
      type,
      content,
      status,
      eventClass
    };
  });
}

function createPlayers(): void {
  players.value = Array.from({ length: playerCount.value }, (_, idx) => ({
    id: idx + 1,
    position: 0,
    frozen: false,
    style: {}
  }));
  nextTick(updatePlayerVisuals);
}

function updatePlayerVisuals(): void {
  players.value.forEach((p) => {
    const cell = cellRefs.value[p.position];
    if (cell) {
      const offsetX = (p.id - 1) * 6 - 9;
      const offsetY = -15;
      // We need to calculate relative to the board container if possible, or just use absolute positioning within the relative board
      // Since .board is relative and cells are inside, cell.offsetLeft should work relative to board
      const left = cell.offsetLeft + cell.offsetWidth / 2 - 15 + offsetX; // 15 is half token width
      const top = cell.offsetTop + cell.offsetHeight / 2 - 40 + offsetY; // 40 is token height

      p.style = {
        left: `${left}px`,
        top: `${top}px`
      };
    }
  });
}

function changePlayerCount(delta: number): void {
  const n = playerCount.value + delta;
  if (n < 1 || n > 4) return;
  playerCount.value = n;
  resetGame();
}

function rollDice(): void {
  if (!gameActive.value) return;
  const p = players.value.find(p => p.id === currentPlayer.value);
  if (!p) return;
  if (p.frozen) {
    p.frozen = false;
    alert(`玩家 ${currentPlayer.value} 正在解冻中，本轮跳过！`);
    nextPlayer();
    return;
  }
  if (isRolling.value) return;

  SFX.roll();
  isRolling.value = true;
  diceMsg.value = "命运转动中...";

  setTimeout(() => {
    isRolling.value = false;
    const result = Math.floor(Math.random() * 6) + 1;

    let rx = 0, ry = 0;
    switch (result) {
      case 1: rx = 0; ry = 0; break;
      case 2: rx = 0; ry = -90; break;
      case 3: rx = 0; ry = -180; break;
      case 4: rx = 0; ry = 90; break;
      case 5: rx = -90; ry = 0; break;
      case 6: rx = 90; ry = 0; break;
    }

    diceStyle.value = { transform: `translateZ(-50px) rotateX(${rx + 720}deg) rotateY(${ry + 720}deg)` };
    diceMsg.value = `点数：${result}`;

    setTimeout(() => movePlayer(result), 800);
  }, 1000);
}

function movePlayer(steps: number): void {
  const p = players.value.find(p => p.id === currentPlayer.value);
  if (!p) return;
  const lastPos = p.position;
  let target = p.position + steps;
  if (target >= PATH_MAP.length - 1) target = PATH_MAP.length - 1;

  let current = p.position;
  const timer = setInterval(() => {
    if (current < target) {
      current++;
      if (p) p.position = current;
      updatePlayerVisuals();
    } else {
      clearInterval(timer);
      handleLand(target, lastPos);
    }
  }, 250);
}

function handleLand(posIndex: number, lastPos: number): void {
  if (posIndex === PATH_MAP.length - 1) {
    SFX.win();
    showModal(
      "🏆 巅峰时刻",
      `恭喜玩家 ${currentPlayer.value} 率先抵达终点！`,
      [{ text: "再来一局", class: "btn-green", action: resetGame }]
    );
    return;
  }
  showQuestion(posIndex, lastPos);
}

function showQuestion(posIndex: number, lastPos: number): void {
  const q = questions.value[Math.floor(Math.random() * questions.value.length)];
  
  // We need to handle the "Show Answer" logic within the modal body or via a reactive state
  // Since v-html doesn't compile Vue directives, we'll use a simple approach:
  // We can't easily put a button inside v-html that triggers a Vue function.
  // So we'll use a special flag or just simple text for now, OR we can make the modal more complex.
  // For now, let's just show the question and have buttons.
  // To support "Show Answer", we might need to update the modal body content dynamically when the button is clicked.
  
  const showAnswerAction = () => {
    gameModal.body = `<div><b>${q.q}</b></div><div style="margin-top:15px;color:#ffd700;font-weight:bold;">答案: ${q.a}</div>`;
  };

  showModal(
    "❓ 智慧试炼",
    `<div><b>${q.q}</b></div>`,
    [
      {
        text: "👀 看答案",
        class: "btn-yellow",
        action: showAnswerAction
      },
      {
        text: "❌ 答错",
        class: "btn-red",
        action: () => {
          closeModal();
          handleWrong(lastPos);
        }
      },
      {
        text: "✅ 答对",
        class: "btn-green",
        action: () => {
          closeModal();
          revealEvent(posIndex);
        }
      }
    ]
  );
}

function handleWrong(lastPos: number): void {
  SFX.wrong();
  alert(`回答错误！退回原位。`);
  const p = players.value.find(p => p.id === currentPlayer.value);
  if (!p) return;
  p.position = lastPos;
  updatePlayerVisuals();
  nextPlayer();
}

function revealEvent(posIndex: number): void {
  const cell = boardCells.value[posIndex];
  cell.status = ''; // Remove unknown
  
  if (cell.type === 'normal') {
    SFX.correct();
    cell.content = '✅';
    setTimeout(nextPlayer, 500);
  } else {
    handleSpecialEvent(cell);
  }
}

function handleSpecialEvent(cell: BoardCell): void {
  SFX.magic();
  let title = "", msg = "";
  
  switch (cell.type) {
    case "lucky":
      cell.eventClass = "event-lucky";
      cell.content = "🍀";
      title = "鸿运当头";
      msg = "发现隐藏捷径，再前进 2 格！";
      showEventModal(title, msg, () => simpleMove(2, true));
      break;
    case "bad":
      cell.eventClass = "event-bad";
      cell.content = "💣";
      title = "踩中地雷";
      msg = "发生爆炸，后退 2 格！";
      showEventModal(title, msg, () => simpleMove(-2, true));
      break;
    case "freeze":
      cell.eventClass = "event-freeze";
      cell.content = "❄️";
      title = "绝对零度";
      msg = "你被寒冰冻结，下回合暂停行动。";
      showEventModal(title, msg, () => {
        const p = players.value.find(p => p.id === currentPlayer.value);
        if (!p) return;
        p.frozen = true;
        nextPlayer();
      });
      break;
    case "again":
      cell.eventClass = "event-lucky";
      cell.content = "🚀";
      title = "能量爆发";
      msg = "获得额外行动机会，再掷一次骰子！";
      showEventModal(title, msg, () => {
        // Do nothing, just close modal to let player roll again
      });
      break;
    case "attack":
      cell.eventClass = "event-pvp";
      cell.content = "⚔️";
      title = "全屏攻击";
      msg = "对其他玩家发动攻击，迫使他们后退 2 格！";
      showEventModal(title, msg, () => {
        players.value.forEach(p => {
          if (p.id !== currentPlayer.value) {
            p.position = Math.max(0, p.position - 2);
          }
        });
        updatePlayerVisuals();
        nextPlayer();
      });
      break;
  }
}

function simpleMove(steps: number, endTurn: boolean): void {
  const p = players.value.find(p => p.id === currentPlayer.value);
  if (!p) return;
  let t = p.position + steps;
  if (t < 0) t = 0;
  if (t >= PATH_MAP.length - 1) t = PATH_MAP.length - 1;
  
  p.position = t;
  updatePlayerVisuals();
  if (endTurn) nextPlayer();
}

function showEventModal(title: string, msg: string, callback: () => void): void {
  showModal(title, msg, [
    {
      text: "确定",
      class: "btn-blue",
      action: () => {
        closeModal();
        callback();
      }
    }
  ]);
}

function nextPlayer(): void {
  currentPlayer.value++;
  if (currentPlayer.value > playerCount.value) currentPlayer.value = 1;
}

function showModal(title: string, htmlContent: string, buttons: ModalButton[]): void {
  gameModal.title = title;
  gameModal.body = htmlContent;
  gameModal.buttons = buttons;
  gameModal.show = true;
}

function closeModal(): void {
  gameModal.show = false;
}

// --- Question Management ---
function loadQuestions(): void {
  const saved = localStorage.getItem("magicQuestions_v4");
  questions.value = saved
    ? JSON.parse(saved)
    : [
        { q: "中国的首都是？", a: "北京" },
        { q: "1 + 1 = ?", a: "2" },
        { q: "水的化学式？", a: "H2O" },
      ];
}

function addQuestion(): void {
  editingQuestions.value.push({ q: "", a: "" });
}

function removeQuestion(index: number): void {
  editingQuestions.value.splice(index, 1);
}

function saveQuestions(): void {
  const res = editingQuestions.value.filter(q => q.q.trim() && q.a.trim());
  if (res.length === 0) return alert("至少保留一道题目！");
  
  questions.value = res;
  localStorage.setItem("magicQuestions_v4", JSON.stringify(res));
  alert("保存成功！");
  showSettings.value = false;
}
</script>

<style scoped>
/* --- 全局设置 --- */
.millionaire-container {
  color: #fff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  /* 激情的红蓝对决背景 */
  background: radial-gradient(
      circle at center,
      #1a2a6c,
      #b21f1f,
      #fdbb2d
  );
  overflow-x: hidden;
  perspective: 1000px;
  width: 100%;
}

.container {
  max-width: 1300px;
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 95vh;
}

/* --- 顶部标题栏 --- */
header {
  text-align: center;
  margin-bottom: 10px;
  flex: 0 0 auto;
}
h1 {
  font-size: 2.8rem;
  text-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
  font-weight: 900;
  letter-spacing: 2px;
  margin: 0;
  padding-top: 5px;
}

/* --- 游戏主布局 --- */
.game-container {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

/* --- 棋盘容器 --- */
.board-container {
  flex: 3;
  background: rgba(20, 20, 40, 0.5); /* 半透明深色背景 */
  border-radius: 20px;
  padding: 20px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* --- S型网格布局 --- */
.board {
  display: grid;
  grid-template-columns: repeat(8, 1fr); /* 8列 */
  grid-template-rows: repeat(6, 1fr); /* 6行 */
  gap: 8px;
  width: 100%;
  height: 100%;
  position: relative;
}

/* --- 格子样式 --- */
.cell {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  transition: 0.3s;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.4);
}

/* 迷雾状态（默认） */
.cell.unknown {
  background: #2c3e50;
  border: 1px solid #34495e;
}

/* 事件揭晓后的样式 */
.cell.event-lucky {
  background: linear-gradient(135deg, #11998e, #38ef7d);
  color: #fff;
  border: none;
} /* 好运 */
.cell.event-bad {
  background: linear-gradient(135deg, #cb2d3e, #ef473a);
  color: #fff;
  border: none;
} /* 厄运 */
.cell.event-pvp {
  background: linear-gradient(135deg, #8e2de2, #4a00e0);
  color: #fff;
  border: none;
} /* 攻击 */
.cell.event-freeze {
  background: linear-gradient(135deg, #2980b9, #6dd5fa);
  color: #fff;
  border: none;
} /* 冰冻 */

/* 起点和终点 */
.cell.start {
  background: linear-gradient(to right, #f5af19, #f12711);
  color: #fff;
  font-size: 1.1rem;
  z-index: 2;
  border: 2px solid #fff;
}
.cell.end {
  background: linear-gradient(to right, #96c93d, #00b09b);
  color: #fff;
  font-size: 1.1rem;
  z-index: 2;
  border: 2px solid #fff;
}

/* --- 棋子样式 (无阴影扁平风) --- */
.player-token {
  position: absolute;
  width: 30px;
  height: 40px;
  z-index: 50;
  transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1); /* 干脆利落的移动 */
  pointer-events: none; /* 让鼠标穿透，不影响点格子 */
}

/* 棋子主体形状 */
.token-body {
  width: 100%;
  height: 100%;
  /* 使用 clip-path 裁剪出 Pawn (兵卒) 形状 */
  clip-path: polygon(
      20% 0%,
      80% 0%,
      100% 20%,
      100% 100%,
      0% 100%,
      0% 20%
  );
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  color: white;
  padding-bottom: 5px;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.6); /* 增加描边清晰度 */
}

/* 玩家颜色区分 */
.player-token.p1 .token-body {
  background: #ff5e62;
}
.player-token.p2 .token-body {
  background: #00c6ff;
}
.player-token.p3 .token-body {
  background: #a8ff78;
  color: #000;
}
.player-token.p4 .token-body {
  background: #ffd200;
  color: #000;
}

/* 冰冻状态：变灰 */
.player-token.frozen {
  filter: grayscale(1);
  opacity: 0.7;
}

/* --- 右侧控制面板 --- */
.control-panel {
  flex: 1;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 20px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 280px;
  overflow-y: auto; /* 防止小屏幕显示不全 */
}

.panel-box {
  background: rgba(255, 255, 255, 0.08);
  padding: 15px;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.panel-title {
  font-size: 1.1rem;
  color: #ffd700;
  margin-bottom: 5px;
  text-align: center;
  font-weight: bold;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
  padding-bottom: 5px;
}

/* --- 3D 骰子 --- */
.scene {
  width: 100px;
  height: 100px;
  perspective: 400px;
  margin: 10px auto;
  cursor: pointer;
}
.cube {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transform: translateZ(-50px);
  transition: transform 1s;
}
.cube.rolling {
  animation: spinDice 0.5s infinite linear;
}

.cube__face {
  position: absolute;
  width: 100px;
  height: 100px;
  border: 2px solid white;
  line-height: 100px;
  font-size: 40px;
  font-weight: bold;
  color: white;
  text-align: center;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.8);
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
}

.cube__face--1 {
  background: #ff4081;
  transform: rotateY(0deg) translateZ(50px);
}
.cube__face--2 {
  background: #448aff;
  transform: rotateY(90deg) translateZ(50px);
}
.cube__face--3 {
  background: #69f0ae;
  transform: rotateY(180deg) translateZ(50px);
}
.cube__face--4 {
  background: #ffab40;
  transform: rotateY(-90deg) translateZ(50px);
}
.cube__face--5 {
  background: #7c4dff;
  transform: rotateX(90deg) translateZ(50px);
}
.cube__face--6 {
  background: #ff5252;
  transform: rotateX(-90deg) translateZ(50px);
}

@keyframes spinDice {
  0% {
      transform: translateZ(-50px) rotateX(0deg) rotateY(0deg);
  }
  100% {
      transform: translateZ(-50px) rotateX(360deg) rotateY(360deg);
  }
}

/* 玩家列表UI */
.player-row {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  transition: 0.3s;
  margin-bottom: 5px;
}
.player-row.active {
  background: rgba(255, 215, 0, 0.2);
  border: 1px solid #ffd700;
  transform: scale(1.02);
}
.player-row.frozen-row {
  opacity: 0.6;
}

/* 按钮通用样式 */
.btn {
  padding: 10px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: 0.2s;
  color: #fff;
  width: 100%;
}
.btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
}
.btn-blue {
  background: #2980b9;
}
.btn-red {
  background: #c0392b;
}
.btn-green {
  background: #27ae60;
}
.btn-yellow {
  background: #f39c12;
}

/* --- 弹窗样式 --- */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  z-index: 2000;
  display: none;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(5px);
}
.modal.show {
  display: flex;
  animation: fadeIn 0.3s;
}
.modal-content {
  background: #2c3e50;
  border: 2px solid #ffd700;
  width: 90%;
  max-width: 600px;
  padding: 30px;
  border-radius: 20px;
  text-align: center;
  color: #fff;
  box-shadow: 0 0 50px rgba(255, 215, 0, 0.2);
  position: relative;
}

/* 编辑器列表 */
.editor-container {
  max-height: 50vh;
  overflow-y: auto;
  text-align: left;
  padding-right: 5px;
}
.q-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.q-row input {
  flex: 1;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #555;
  color: #fff;
  border-radius: 5px;
}

@keyframes fadeIn {
  from {
      opacity: 0;
      transform: scale(0.95);
  }
  to {
      opacity: 1;
      transform: scale(1);
  }
}

.back-home-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  font-size: 2rem;
  text-decoration: none;
  z-index: 3000;
  filter: drop-shadow(0 0 5px #000);
  opacity: 0.2;
  transition: opacity 0.3s ease;
}

.back-home-btn:hover {
  opacity: 1;
}
</style>
