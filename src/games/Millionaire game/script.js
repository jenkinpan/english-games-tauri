// 游戏状态
const gameState = {
  currentPlayer: 1, // 当前玩家编号
  playerPositions: [], // 玩家位置数组
  phrases: [], // 存储短语的数组
  meanings: [], // 存储短语中文释义的数组
  lastPosition: 0, // 记录移动前的位置（用于撤回）
  gameActive: true,
  playerCount: 2, // 玩家数量
  maxPlayers: 4, // 最大玩家数量
  minPlayers: 1, // 最小玩家数量
  playersInGame: [], // 记录仍在游戏中的玩家
};

// DOM 元素
const elements = {
  gameBoard: document.getElementById("gameBoard"),
  dice: document.getElementById("dice"),
  diceResult: document.getElementById("diceResult"),
  importBtn: document.getElementById("importBtn"),
  resetBtn: document.getElementById("resetBtn"),
  fileInput: document.getElementById("fileInput"),
  phraseModal: document.getElementById("phraseModal"),
  phraseText: document.getElementById("phraseText"),
  withdrawBtn: document.getElementById("withdrawBtn"),
  continueBtn: document.getElementById("continueBtn"),
  winModal: document.getElementById("winModal"),
  winText: document.getElementById("winText"),
  winResetBtn: document.getElementById("winResetBtn"),
  playerInfo: document.getElementById("playerInfo"),
  addPlayerBtn: document.getElementById("addPlayerBtn"),
  removePlayerBtn: document.getElementById("removePlayerBtn"),
  meaningBtn: document.getElementById("meaningBtn"),
  continuePlayingBtn: document.getElementById("continuePlayingBtn"),
};

// 初始化游戏
function initGame() {
  createBoard();
  initPlayers();
  updatePlayerPositions();
  updatePlayerUI();
  gameState.playersInGame = Array.from(
    { length: gameState.playerCount },
    (_, i) => i + 1,
  );

  // 清空默认题目
  gameState.phrases = [];
  gameState.meanings = [];

  // 事件监听器
  elements.dice.addEventListener("click", rollDice);
  elements.importBtn.addEventListener("click", () =>
    elements.fileInput.click(),
  );
  elements.fileInput.addEventListener("change", handleFileImport);
  elements.resetBtn.addEventListener("click", resetGame);
  elements.withdrawBtn.addEventListener("click", handleWithdraw);
  elements.continueBtn.addEventListener("click", continueGame);
  elements.winResetBtn.addEventListener("click", resetGame);
  elements.addPlayerBtn.addEventListener("click", addPlayer);
  elements.removePlayerBtn.addEventListener("click", removePlayer);
  elements.meaningBtn.addEventListener("click", showMeaning);
  elements.continuePlayingBtn.addEventListener("click", continuePlaying);
}

// 创建棋盘
function createBoard() {
  // 清空棋盘
  elements.gameBoard.innerHTML = "";

  // 定义棋盘布局 (5x7 网格)
  const gridPositions = [
    // 顶部行 (0-6)
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 1, col: 3 },
    { row: 1, col: 4 },
    { row: 1, col: 5 },
    { row: 1, col: 6 },
    { row: 1, col: 7 },

    // 右侧列 (7-10) - 从上到下
    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },

    // 底部行 (11-16) - 从右到左
    { row: 5, col: 6 },
    { row: 5, col: 5 },
    { row: 5, col: 4 },
    { row: 5, col: 3 },
    { row: 5, col: 2 },
    { row: 5, col: 1 },

    // 左侧列 (17-19) - 从下到上
    { row: 4, col: 1 },
    { row: 3, col: 1 },
    { row: 2, col: 1 },
  ];

  // 创建格子
  for (let i = 0; i < 20; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    if (i === 0) {
      cell.textContent = "起点";
    } else if (i === 19) {
      cell.textContent = "终点";
    } else {
      cell.textContent = i;
    }

    // 特殊样式
    if (i === 0) cell.classList.add("start");
    if (i === 0 || i === 6 || i === 10 || i === 16)
      cell.classList.add("corner");

    // 设置网格位置
    if (gridPositions[i]) {
      cell.style.gridRow = gridPositions[i].row;
      cell.style.gridColumn = gridPositions[i].col;
    }

    elements.gameBoard.appendChild(cell);
  }
}

// 初始化玩家
function initPlayers() {
  gameState.playerPositions = new Array(gameState.playerCount).fill(0);
  for (let i = 1; i <= gameState.playerCount; i++) {
    createPlayerElement(i);
    createPlayerInfoElement(i);
  }
}

// 创建玩家元素
function createPlayerElement(playerNumber) {
  const player = document.createElement("div");
  player.className = `player player-${playerNumber}`;
  player.id = `player${playerNumber}`;
  player.textContent = playerNumber;
  elements.gameBoard.appendChild(player);
}

// 创建玩家信息元素
function createPlayerInfoElement(playerNumber) {
  const playerStatus = document.createElement("div");
  playerStatus.className = "player-status";
  playerStatus.id = `player${playerNumber}Status`;

  const playerIcon = document.createElement("div");
  playerIcon.className = `player-icon player-${playerNumber}-icon`;

  const playerText = document.createElement("div");
  playerText.innerHTML = `玩家 ${playerNumber}: <span id="player${playerNumber}Pos">位置 0</span>`;

  playerStatus.appendChild(playerIcon);
  playerStatus.appendChild(playerText);
  elements.playerInfo.appendChild(playerStatus);
}

// 掷骰子
function rollDice() {
  if (
    !gameState.gameActive ||
    !gameState.playersInGame.includes(gameState.currentPlayer)
  )
    return;

  // 骰子动画
  elements.dice.textContent = "?";
  elements.dice.classList.add("rolling");
  elements.diceResult.textContent = "掷骰子中...";

  setTimeout(() => {
    // 生成随机数 (1-6)
    const roll = Math.floor(Math.random() * 6) + 1;
    elements.dice.textContent = roll;
    elements.dice.classList.remove("rolling");
    elements.diceResult.textContent = `玩家 ${gameState.currentPlayer} 掷出了 ${roll}`;

    // 移动玩家
    movePlayer(roll);
  }, 800);
}

// 移动玩家
function movePlayer(steps) {
  const playerIndex = gameState.currentPlayer - 1;
  gameState.lastPosition = gameState.playerPositions[playerIndex];

  // 计算新位置
  let newPosition = gameState.playerPositions[playerIndex] + steps;

  // 如果超过棋盘最大位置 (19)
  if (newPosition > 19) {
    newPosition = 19;
  }

  // 一格一格移动
  const moveOneStep = () => {
    if (gameState.playerPositions[playerIndex] < newPosition) {
      gameState.playerPositions[playerIndex]++;
      updatePlayerPositions();
      updatePlayerUI();
      setTimeout(moveOneStep, 500); // 每500毫秒移动一格
    } else {
      if (newPosition === 19) {
        gameState.gameActive = false;
        setTimeout(() => {
          showWinModal();
        }, 800); // 等待移动动画完成后显示胜利弹窗
      } else {
        // 显示短语弹窗
        setTimeout(() => {
          showPhrase(newPosition);
        }, 800);
      }
    }
  };

  moveOneStep();
}

// 更新玩家位置（UI）
function updatePlayerPositions() {
  const cells = elements.gameBoard.querySelectorAll(".cell");
  for (let i = 1; i <= gameState.playerCount; i++) {
    const pos = gameState.playerPositions[i - 1];
    const player = document.getElementById(`player${i}`);
    const cell = cells[pos];
    if (cell && player) {
      const rect = cell.getBoundingClientRect();
      const boardRect = elements.gameBoard.getBoundingClientRect();
      const top =
        rect.top - boardRect.top + rect.height / 2 - player.offsetHeight / 2;
      const left =
        rect.left - boardRect.left + rect.width / 2 - player.offsetWidth / 2;
      player.style.top = top + "px";
      player.style.left = left + "px";
    }
  }
}

// 更新玩家UI
function updatePlayerUI() {
  for (let i = 1; i <= gameState.playerCount; i++) {
    const playerPos = document.getElementById(`player${i}Pos`);
    const playerStatus = document.getElementById(`player${i}Status`);
    if (playerPos) {
      playerPos.textContent = `位置 ${gameState.playerPositions[i - 1]}`;
    }
    if (playerStatus) {
      if (
        i === gameState.currentPlayer &&
        gameState.playersInGame.includes(i)
      ) {
        playerStatus.classList.add("current-player");
      } else {
        playerStatus.classList.remove("current-player");
      }
    }
  }
}

// 显示短语弹窗
function showPhrase(position) {
  // 检查游戏是否结束
  if (position === 19) {
    showWinModal();
    return;
  }

  // 显示短语
  const phrase = gameState.phrases[position] || `位置 ${position} 的短语`;
  elements.phraseText.textContent = phrase;
  elements.phraseModal.classList.add("active");
}

// 显示中文释义
function showMeaning() {
  const currentPosition =
    gameState.playerPositions[gameState.currentPlayer - 1];
  const meaning = gameState.meanings[currentPosition] || "暂无释义";
  elements.phraseText.textContent += `\n答案: ${meaning}`;
  // 为了确保换行符生效，将文本内容转换为 HTML 并使用 <br> 标签
  elements.phraseText.innerHTML = elements.phraseText.textContent.replace(
    /\n/g,
    "<br>",
  );
}

// 处理撤回
function handleWithdraw() {
  const playerIndex = gameState.currentPlayer - 1;
  gameState.playerPositions[playerIndex] = gameState.lastPosition;

  // 更新UI
  updatePlayerPositions();

  // 切换到下一个玩家
  nextPlayer();
  elements.phraseModal.classList.remove("active");
}

// 继续游戏
function continueGame() {
  nextPlayer();
  elements.phraseModal.classList.remove("active");
}

// 切换到下一个玩家
function nextPlayer() {
  let nextIndex = gameState.playersInGame.indexOf(gameState.currentPlayer) + 1;
  if (nextIndex >= gameState.playersInGame.length) {
    nextIndex = 0;
  }
  gameState.currentPlayer = gameState.playersInGame[nextIndex];
  updatePlayerUI();
}

// 导入Excel文件
function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      // 获取第一个工作表
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      // 转换为JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // 提取短语和释义
      gameState.phrases = [];
      gameState.meanings = [];
      jsonData.forEach((row) => {
        if (row[0]) {
          gameState.phrases.push(row[0]);
          gameState.meanings.push(row[1] || "暂无释义");
        }
      });

      // 如果导入的短语不足，不进行补充
      alert(`成功导入 ${gameState.phrases.length} 条！`);
    } catch (error) {
      alert(`导入文件失败: ${error.message}`);
    }
  };
  reader.onerror = function () {
    alert("读取文件时发生错误，请重试。");
  };
  reader.readAsArrayBuffer(file);
}

// 重置游戏
function resetGame() {
  gameState.currentPlayer = 1;
  gameState.playerPositions = new Array(gameState.playerCount).fill(0);
  gameState.lastPosition = 0;
  gameState.gameActive = true;
  gameState.playersInGame = Array.from(
    { length: gameState.playerCount },
    (_, i) => i + 1,
  );

  // 更新UI
  updatePlayerPositions();
  updatePlayerUI();

  // 关闭弹窗
  elements.phraseModal.classList.remove("active");
  elements.winModal.classList.remove("active");

  elements.dice.textContent = "?";
  elements.diceResult.textContent = "点击骰子开始游戏";
}

// 添加玩家
function addPlayer() {
  if (gameState.playerCount < gameState.maxPlayers) {
    gameState.playerCount++;
    gameState.playerPositions.push(0);
    gameState.playersInGame.push(gameState.playerCount);
    createPlayerElement(gameState.playerCount);
    createPlayerInfoElement(gameState.playerCount);
    updatePlayerPositions();
    updatePlayerUI();
  } else {
    alert("最多支持4名玩家！");
  }
}

// 移除玩家
function removePlayer() {
  if (gameState.playerCount > gameState.minPlayers) {
    const lastPlayerNumber = gameState.playerCount;
    const playerElement = document.getElementById(`player${lastPlayerNumber}`);
    const playerStatusElement = document.getElementById(
      `player${lastPlayerNumber}Status`,
    );
    if (playerElement) {
      playerElement.remove();
    }
    if (playerStatusElement) {
      playerStatusElement.remove();
    }
    gameState.playerCount--;
    gameState.playerPositions.pop();
    const index = gameState.playersInGame.indexOf(lastPlayerNumber);
    if (index !== -1) {
      gameState.playersInGame.splice(index, 1);
    }
    if (gameState.currentPlayer > gameState.playerCount) {
      gameState.currentPlayer = 1;
    }
    updatePlayerPositions();
    updatePlayerUI();
  } else {
    alert("至少需要1名玩家！");
  }
}

// 显示获胜弹窗
function showWinModal() {
  elements.winText.textContent = `恭喜玩家 ${gameState.currentPlayer} 到达终点！`;
  elements.winModal.classList.add("active");
}

// 继续游戏（获胜玩家退出）
function continuePlaying() {
  const winnerIndex = gameState.playersInGame.indexOf(gameState.currentPlayer);
  if (winnerIndex !== -1) {
    gameState.playersInGame.splice(winnerIndex, 1);
  }

  if (gameState.playersInGame.length === 0) {
    alert("没有玩家继续游戏，游戏结束！");
    resetGame();
  } else {
    gameState.gameActive = true;
    gameState.currentPlayer = gameState.playersInGame[0];
    updatePlayerUI();
    elements.winModal.classList.remove("active");
  }
}

// 初始化游戏
window.addEventListener("DOMContentLoaded", initGame);
