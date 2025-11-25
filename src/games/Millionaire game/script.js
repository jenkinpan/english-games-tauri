// --- 🗺️ 地图布局 (S型全填充布局) ---
// 8列 x 6行 = 48个格子
// 自动生成蜿蜒路径，填满整个棋盘，不留黑洞
const COLS = 8;
const ROWS = 6;
const PATH_MAP = [];

for (let r = 1; r <= ROWS; r++) {
  if (r % 2 !== 0) {
    // 奇数行：从左到右 (1 -> 8)
    for (let c = 1; c <= COLS; c++) {
      PATH_MAP.push({ r: r, c: c });
    }
  } else {
    // 偶数行：从右到左 (8 -> 1)
    for (let c = COLS; c >= 1; c--) {
      PATH_MAP.push({ r: r, c: c });
    }
  }
}

// --- 🔊 音效系统 (Web Audio API) ---
const SFX = {
  ctx: new (window.AudioContext || window.webkitAudioContext)(),
  playTone: function (freq, type, duration) {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      this.ctx.currentTime + duration,
    );
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
      setTimeout(() => SFX.playTone(f, "sine", 0.3), i * 150),
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

// --- 全局状态 ---
const gameState = {
  currentPlayer: 1,
  playerCount: 2,
  positions: [], // 玩家位置索引
  frozenPlayers: new Set(),
  questions: [],
  gameActive: true,
  lastPos: 0,
  gridEvents: {},
};

// --- DOM 元素 ---
const el = {
  board: document.getElementById("gameBoard"),
  cube: document.getElementById("cube"),
  playerList: document.getElementById("playerList"),
  modal: document.getElementById("gameModal"),
  modalTitle: document.getElementById("modalTitle"),
  modalBody: document.getElementById("modalBody"),
  modalFooter: document.getElementById("modalFooter"),
  settingsModal: document.getElementById("settingsModal"),
  editorList: document.getElementById("editorList"),
};

// --- 初始化 ---
function init() {
  loadQuestions();
  resetGame();

  // 绑定事件
  document.querySelector(".scene").addEventListener("click", rollDice);
  document
    .getElementById("settingsBtn")
    .addEventListener("click", openSettings);
  document.getElementById("resetBtn").addEventListener("click", resetGame);
  document
    .getElementById("addPlayerBtn")
    .addEventListener("click", () => changePlayerCount(1));
  document
    .getElementById("removePlayerBtn")
    .addEventListener("click", () => changePlayerCount(-1));
  document
    .getElementById("addQBtn")
    .addEventListener("click", () => addEditorRow());
  document.getElementById("saveQBtn").addEventListener("click", saveQuestions);
}

// --- 修复后的重置游戏 ---
function resetGame() {
  gameState.currentPlayer = 1;
  gameState.positions = new Array(gameState.playerCount).fill(0);
  gameState.frozenPlayers.clear();
  gameState.gameActive = true;

  generateBoard();
  createPlayers();
  updateUI();

  // 重置骰子
  el.cube.style.transform = `translateZ(-50px) rotateX(0deg) rotateY(0deg)`;
  document.getElementById("diceMsg").textContent = "点击骰子开始";

  // 关键修复：关闭弹窗
  closeModal();
  el.settingsModal.classList.remove("show");
}

// --- 3D 骰子逻辑 ---
function rollDice() {
  if (!gameState.gameActive) return;
  if (gameState.frozenPlayers.has(gameState.currentPlayer)) {
    gameState.frozenPlayers.delete(gameState.currentPlayer);
    alert(`玩家 ${gameState.currentPlayer} 正在解冻中，本轮跳过！`);
    nextPlayer();
    return;
  }
  if (el.cube.classList.contains("rolling")) return;

  SFX.roll();
  el.cube.classList.add("rolling");
  document.getElementById("diceMsg").textContent = "命运转动中...";

  setTimeout(() => {
    el.cube.classList.remove("rolling");
    const result = Math.floor(Math.random() * 6) + 1;

    // 3D 旋转计算
    let rx = 0,
      ry = 0;
    switch (result) {
      case 1:
        rx = 0;
        ry = 0;
        break;
      case 2:
        rx = 0;
        ry = -90;
        break;
      case 3:
        rx = 0;
        ry = -180;
        break;
      case 4:
        rx = 0;
        ry = 90;
        break;
      case 5:
        rx = -90;
        ry = 0;
        break;
      case 6:
        rx = 90;
        ry = 0;
        break;
    }

    el.cube.style.transform = `translateZ(-50px) rotateX(${rx + 720}deg) rotateY(${ry + 720}deg)`;
    document.getElementById("diceMsg").textContent = `点数：${result}`;

    setTimeout(() => movePlayer(result), 800);
  }, 1000);
}

// --- 玩家移动 ---
function movePlayer(steps) {
  const pIdx = gameState.currentPlayer - 1;
  gameState.lastPos = gameState.positions[pIdx];

  let target = gameState.positions[pIdx] + steps;
  if (target >= PATH_MAP.length - 1) target = PATH_MAP.length - 1;

  // 步进动画
  let current = gameState.positions[pIdx];
  const timer = setInterval(() => {
    if (current < target) {
      current++;
      gameState.positions[pIdx] = current;
      updatePlayerVisuals();
    } else {
      clearInterval(timer);
      handleLand(target);
    }
  }, 250); // 移动速度
}

// --- 落地处理 ---
function handleLand(posIndex) {
  if (posIndex === PATH_MAP.length - 1) {
    SFX.win();
    showModal(
      "🏆 巅峰时刻",
      `恭喜玩家 ${gameState.currentPlayer} 率先抵达终点！`,
      [{ text: "再来一局", class: "btn-green", action: resetGame }],
    );
    return;
  }

  // 先答题，后触发格子
  showQuestion(posIndex);
}

function showQuestion(posIndex) {
  const q =
    gameState.questions[Math.floor(Math.random() * gameState.questions.length)];

  showModal(
    "❓ 智慧试炼",
    `<div><b>${q.q}</b></div><div id="ansBox" style="display:none;margin-top:15px;color:#ffd700;font-weight:bold;">答案: ${q.a}</div>`,
    [
      {
        text: "👀 看答案",
        class: "btn-yellow",
        action: () =>
          (document.getElementById("ansBox").style.display = "block"),
      },
      {
        text: "❌ 答错",
        class: "btn-red",
        action: () => {
          closeModal();
          handleWrong();
        },
      },
      {
        text: "✅ 答对",
        class: "btn-green",
        action: () => {
          closeModal();
          revealEvent(posIndex);
        },
      },
    ],
  );
}

function handleWrong() {
  SFX.wrong();
  alert(`回答错误！退回原位。`);
  gameState.positions[gameState.currentPlayer - 1] = gameState.lastPos;
  updatePlayerVisuals();
  nextPlayer();
}

function revealEvent(posIndex) {
  const cell = document.getElementById(`cell-${posIndex}`);
  const type = gameState.gridEvents[posIndex] || "normal";

  cell.classList.remove("unknown");

  if (type === "normal") {
    SFX.correct();
    cell.innerHTML = "✅"; // 标记为安全
    setTimeout(nextPlayer, 500);
  } else {
    handleSpecialEvent(type, cell);
  }
}

function handleSpecialEvent(type, cell) {
  SFX.magic();
  let title = "",
    msg = "";

  switch (type) {
    case "lucky":
      cell.classList.add("event-lucky");
      cell.innerHTML = "🍀";
      title = "鸿运当头";
      msg = "发现隐藏捷径，再前进 2 格！";
      showEventModal(title, msg, () => simpleMove(2, true));
      break;
    case "bad":
      cell.classList.add("event-bad");
      cell.innerHTML = "💣";
      title = "踩中地雷";
      msg = "发生爆炸，后退 2 格！";
      showEventModal(title, msg, () => simpleMove(-2, true));
      break;
    case "freeze":
      cell.classList.add("event-freeze");
      cell.innerHTML = "❄️";
      title = "绝对零度";
      msg = "你被寒冰冻结，下回合暂停行动。";
      showEventModal(title, msg, () => {
        gameState.frozenPlayers.add(gameState.currentPlayer);
        nextPlayer();
      });
      break;
    case "again":
      cell.classList.add("event-lucky");
      cell.innerHTML = "🚀";
      title = "能量爆发";
      msg = "获得额外行动机会，再掷一次骰子！";
      showEventModal(title, msg, () => {
        // 不 nextPlayer，直接关闭，从而继续操作
      });
      break;
    case "attack":
      cell.classList.add("event-pvp");
      cell.innerHTML = "⚔️";
      title = "全屏攻击";
      msg = "对其他玩家发动攻击，迫使他们后退 2 格！";
      showEventModal(title, msg, () => {
        gameState.positions.forEach((pos, idx) => {
          if (idx + 1 !== gameState.currentPlayer) {
            gameState.positions[idx] = Math.max(0, pos - 2);
          }
        });
        updatePlayerVisuals();
        nextPlayer();
      });
      break;
  }
}

function simpleMove(steps, endTurn) {
  const pIdx = gameState.currentPlayer - 1;
  let t = gameState.positions[pIdx] + steps;
  if (t < 0) t = 0;
  if (t >= PATH_MAP.length - 1) t = PATH_MAP.length - 1;

  gameState.positions[pIdx] = t;
  updatePlayerVisuals();
  if (endTurn) nextPlayer();
}

function showEventModal(title, msg, callback) {
  showModal(title, msg, [
    {
      text: "确定",
      class: "btn-blue",
      action: () => {
        closeModal();
        callback();
      },
    },
  ]);
}

// --- 辅助功能 ---
function nextPlayer() {
  gameState.currentPlayer++;
  if (gameState.currentPlayer > gameState.playerCount)
    gameState.currentPlayer = 1;
  updateUI();
}

function changePlayerCount(delta) {
  let n = gameState.playerCount + delta;
  if (n < 1 || n > 4) return;
  gameState.playerCount = n;
  resetGame();
}

function generateBoard() {
  el.board.innerHTML = "";
  gameState.gridEvents = {};

  PATH_MAP.forEach((pos, i) => {
    const cell = document.createElement("div");
    cell.className = "cell unknown";
    cell.id = `cell-${i}`;
    cell.style.gridRow = pos.r;
    cell.style.gridColumn = pos.c;
    cell.textContent = i; // 显示数字编号

    if (i === 0) {
      cell.className = "cell start";
      cell.textContent = "起点";
    } else if (i === PATH_MAP.length - 1) {
      cell.className = "cell end";
      cell.textContent = "终点";
    } else {
      // 随机分配事件
      const r = Math.random();
      if (r < 0.15) gameState.gridEvents[i] = "lucky";
      else if (r < 0.3) gameState.gridEvents[i] = "bad";
      else if (r < 0.4) gameState.gridEvents[i] = "freeze";
      else if (r < 0.5) gameState.gridEvents[i] = "attack";
      else if (r < 0.55) gameState.gridEvents[i] = "again";
      else gameState.gridEvents[i] = "normal";
    }
    el.board.appendChild(cell);
  });
}

function createPlayers() {
  document.querySelectorAll(".player-token").forEach((e) => e.remove());

  for (let i = 1; i <= gameState.playerCount; i++) {
    const token = document.createElement("div");
    token.className = `player-token p${i}`;
    token.id = `token-${i}`;
    // 无阴影的简单立体棋子
    token.innerHTML = `<div class="token-body">${i}</div>`;
    el.board.appendChild(token);
  }
  updatePlayerVisuals();
}

function updatePlayerVisuals() {
  for (let i = 1; i <= gameState.playerCount; i++) {
    const posIdx = gameState.positions[i - 1];
    const cell = document.getElementById(`cell-${posIdx}`);
    const token = document.getElementById(`token-${i}`);

    if (cell && token) {
      if (gameState.frozenPlayers.has(i)) token.classList.add("frozen");
      else token.classList.remove("frozen");

      // 居中定位
      const cellRect = cell.getBoundingClientRect();
      const offsetX = (i - 1) * 6 - 9;
      const offsetY = -15;

      const left =
        cell.offsetLeft +
        cell.offsetWidth / 2 -
        token.offsetWidth / 2 +
        offsetX;
      const top =
        cell.offsetTop + cell.offsetHeight / 2 - token.offsetHeight + offsetY;

      token.style.left = `${left}px`;
      token.style.top = `${top}px`;
    }
  }
}

function updateUI() {
  el.playerList.innerHTML = Array.from(
    { length: gameState.playerCount },
    (_, i) => i + 1,
  )
    .map(
      (p) => `
    <div class="player-row ${p === gameState.currentPlayer ? "active" : ""} ${gameState.frozenPlayers.has(p) ? "frozen-row" : ""}">
      <span style="font-size:1.2rem; margin-right:8px;">${p === gameState.currentPlayer ? "👉" : ""}</span>
      <b>玩家 ${p}</b>
      <span style="margin-left:auto; font-size:0.9rem; color:#ddd;">
        ${gameState.frozenPlayers.has(p) ? "❄️ 冰冻" : `位置: ${gameState.positions[p - 1]}`}
      </span>
    </div>
  `,
    )
    .join("");
}

// --- 弹窗与设置 ---
function showModal(title, htmlContent, buttons) {
  el.modalTitle.textContent = title;
  el.modalBody.innerHTML = htmlContent;
  el.modalFooter.innerHTML = "";

  buttons.forEach((btn) => {
    const b = document.createElement("button");
    b.className = `btn ${btn.class}`;
    b.textContent = btn.text;
    b.onclick = btn.action;
    b.style.width = "auto";
    b.style.padding = "8px 20px";
    el.modalFooter.appendChild(b);
  });

  el.modal.classList.add("show");
}
function closeModal() {
  el.modal.classList.remove("show");
}

// 题库逻辑
function loadQuestions() {
  const saved = localStorage.getItem("magicQuestions_v4");
  gameState.questions = saved
    ? JSON.parse(saved)
    : [
        { q: "中国的首都是？", a: "北京" },
        { q: "1 + 1 = ?", a: "2" },
        { q: "水的化学式？", a: "H2O" },
      ];
}
function openSettings() {
  el.editorList.innerHTML = "";
  gameState.questions.forEach((q) => addEditorRow(q.q, q.a));
  el.settingsModal.classList.add("show");
}
function addEditorRow(q = "", a = "") {
  const div = document.createElement("div");
  div.className = "q-row";
  div.innerHTML = `
    <input class="inp-q" placeholder="输入题目" value="${q}">
    <input class="inp-a" placeholder="输入答案" value="${a}">
    <button class="btn btn-red" style="width:40px; margin:0;" onclick="this.parentElement.remove()">🗑️</button>
  `;
  el.editorList.appendChild(div);
  el.editorList.scrollTop = el.editorList.scrollHeight;
}
function saveQuestions() {
  const inputs = document.querySelectorAll(".q-row");
  const res = [];
  inputs.forEach((row) => {
    const q = row.querySelector(".inp-q").value.trim();
    const a = row.querySelector(".inp-a").value.trim();
    if (q && a) res.push({ q, a });
  });
  if (res.length === 0) return alert("至少保留一道题目！");

  gameState.questions = res;
  localStorage.setItem("magicQuestions_v4", JSON.stringify(res));
  alert("保存成功！");
  el.settingsModal.classList.remove("show");
}

// 启动
window.addEventListener("DOMContentLoaded", init);
