import { ref, reactive, onMounted, nextTick, watch } from "vue";

// --- Types ---
export interface PathCell {
  r: number;
  c: number;
}

export interface BoardCell {
  id: number;
  r: number;
  c: number;
  type: string;
  content: string | number;
  status: string;
  eventClass: string;
}

export interface Player {
  id: number;
  position: number;
  frozen: boolean;
  style: Record<string, string | number>;
}

export interface Question {
  q: string;
  a: string;
}

export interface ModalButton {
  text: string;
  class?: string;
  action?: () => void;
  callback?: () => void;
}

export interface GameModal {
  show: boolean;
  title: string;
  body: string;
  buttons: ModalButton[];
}

// --- Composable Logic ---
export function useGameLogic() {
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
  const diceStyle = ref({
    transform: "translateZ(-50px) rotateX(0deg) rotateY(0deg)",
  });

  const showSettings = ref(false);
  const gameModal = reactive<GameModal>({
    show: false,
    title: "",
    body: "",
    buttons: [],
  });

  // --- Audio ---
  let audioCtx: AudioContext | null = null;
  const SFX = {
    get ctx() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      return audioCtx;
    },
    playTone: function (
      freq: number,
      type: OscillatorType,
      duration: number,
    ): void {
      if (this.ctx.state === "suspended") this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
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

  // --- Game Logic ---
  // 修改：返回 Font Awesome 类名
  function getPlayerIcon(id: number): string {
    const icons = [
      "fas fa-chess-pawn",
      "fas fa-chess-knight",
      "fas fa-chess-rook",
      "fas fa-chess-queen",
    ];
    return icons[(id - 1) % icons.length];
  }

  function resetGame() {
    currentPlayer.value = 1;
    gameActive.value = true;
    gameModal.show = false;
    showSettings.value = false;
    diceMsg.value = "点击骰子开始";
    diceStyle.value = {
      transform: "translateZ(-50px) rotateX(0deg) rotateY(0deg)",
    };

    generateBoard();
    createPlayers();
  }

  function generateBoard(): void {
    boardCells.value = PATH_MAP.map((pos, i) => {
      let type = "normal";
      let content: string | number = i;
      let status = "unknown";
      let eventClass = "";

      if (i === 0) {
        status = "start";
        // 修改：使用图标类名
        content = "fas fa-flag";
      } else if (i === PATH_MAP.length - 1) {
        status = "end";
        // 修改：使用图标类名
        content = "fas fa-trophy";
      } else {
        const r = Math.random();
        if (r < 0.15) type = "lucky";
        else if (r < 0.3) type = "bad";
        else if (r < 0.4) type = "freeze";
        else if (r < 0.5) type = "attack";
        else if (r < 0.55) type = "again";
      }

      return {
        id: i,
        r: pos.r,
        c: pos.c,
        type,
        content,
        status,
        eventClass,
      };
    });
  }

  function createPlayers(): void {
    players.value = Array.from({ length: playerCount.value }, (_, idx) => ({
      id: idx + 1,
      position: 0,
      frozen: false,
      style: {},
    }));
    nextTick(updatePlayerVisuals);
  }

  function updatePlayerVisuals(): void {
    const offsets = [
      { x: -15, y: -15 },
      { x: 15, y: -15 },
      { x: -15, y: 15 },
      { x: 15, y: 15 },
    ];

    players.value.forEach((p) => {
      const cell = cellRefs.value[p.position];
      if (cell) {
        const offset = offsets[(p.id - 1) % 4];
        const left = cell.offsetLeft + cell.offsetWidth / 2 - 25 + offset.x;
        const top = cell.offsetTop + cell.offsetHeight / 2 - 40 + offset.y;
        const zIndex = Math.floor(top) + 1000 + offset.y;

        p.style = {
          left: `${left}px`,
          top: `${top}px`,
          zIndex: zIndex,
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
    const p = players.value.find((p) => p.id === currentPlayer.value);
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

      diceStyle.value = {
        transform: `translateZ(-50px) rotateX(${rx + 720}deg) rotateY(${ry + 720}deg)`,
      };
      diceMsg.value = `点数：${result}`;

      setTimeout(() => movePlayer(result), 800);
    }, 1000);
  }

  function movePlayer(steps: number): void {
    const p = players.value.find((p) => p.id === currentPlayer.value);
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
      gameActive.value = false;
      showModal(
        '<i class="fas fa-trophy"></i> 巅峰时刻',
        `恭喜玩家 ${currentPlayer.value} 率先抵达终点！`,
        [{ text: "再来一局", class: "btn-green", action: resetGame }],
      );
      return;
    }
    showQuestion(posIndex, lastPos);
  }

  function showQuestion(posIndex: number, lastPos: number): void {
    const q =
      questions.value[Math.floor(Math.random() * questions.value.length)];

    const showAnswerAction = () => {
      gameModal.body = `<div><b>${q.q}</b></div><div style="margin-top:15px;color:#ffd700;font-weight:bold;">答案: ${q.a}</div>`;
    };

    showModal(
      '<i class="fas fa-question-circle"></i> 智慧试炼',
      `<div><b>${q.q}</b></div>`,
      [
        {
          text: "👀 看答案",
          class: "btn-yellow",
          action: showAnswerAction,
        },
        {
          text: "❌ 答错",
          class: "btn-red",
          action: () => {
            closeModal();
            handleWrong(lastPos);
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

  function handleWrong(lastPos: number): void {
    SFX.wrong();
    alert(`回答错误！退回原位。`);
    const p = players.value.find((p) => p.id === currentPlayer.value);
    if (!p) return;
    p.position = lastPos;
    updatePlayerVisuals();
    nextPlayer();
  }

  function revealEvent(posIndex: number): void {
    const cell = boardCells.value[posIndex];
    cell.status = "";

    if (cell.type === "normal") {
      SFX.correct();
      // 修改：使用 check 图标
      cell.content = "fas fa-check";
      setTimeout(nextPlayer, 500);
    } else {
      handleSpecialEvent(cell);
    }
  }

  function handleSpecialEvent(cell: BoardCell): void {
    SFX.magic();
    let title = "",
      msg = "";

    switch (cell.type) {
      case "lucky":
        cell.eventClass = "event-lucky";
        cell.content = "fas fa-gift";
        title = '<i class="fas fa-gift"></i> 鸿运当头';
        msg = "发现隐藏捷径，再前进 2 格！";
        showEventModal(title, msg, () => simpleMove(2, true));
        break;
      case "bad":
        cell.eventClass = "event-bad";
        cell.content = "fas fa-bomb";
        title = '<i class="fas fa-bomb"></i> 踩中地雷';
        msg = "发生爆炸，后退 2 格！";
        showEventModal(title, msg, () => simpleMove(-2, true));
        break;
      case "freeze":
        cell.eventClass = "event-freeze";
        cell.content = "fas fa-snowflake";
        title = '<i class="fas fa-snowflake"></i> 绝对零度';
        msg = "你被寒冰冻结，下回合暂停行动。";
        showEventModal(title, msg, () => {
          const p = players.value.find((p) => p.id === currentPlayer.value);
          if (!p) return;
          p.frozen = true;
          nextPlayer();
        });
        break;
      case "again":
        cell.eventClass = "event-lucky";
        cell.content = "fas fa-rocket";
        title = '<i class="fas fa-rocket"></i> 能量爆发';
        msg = "获得额外行动机会，再掷一次骰子！";
        showEventModal(title, msg, () => {});
        break;
      case "attack":
        cell.eventClass = "event-pvp";
        cell.content = "fas fa-skull-crossbones";
        title = '<i class="fas fa-skull-crossbones"></i> 全屏攻击';
        msg = "对其他玩家发动攻击，迫使他们后退 2 格！";
        showEventModal(title, msg, () => {
          players.value.forEach((p) => {
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
    const p = players.value.find((p) => p.id === currentPlayer.value);
    if (!p) return;
    let t = p.position + steps;
    if (t < 0) t = 0;
    if (t >= PATH_MAP.length - 1) t = PATH_MAP.length - 1;

    p.position = t;
    updatePlayerVisuals();
    if (endTurn) nextPlayer();
  }

  function showEventModal(
    title: string,
    msg: string,
    callback: () => void,
  ): void {
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

  function nextPlayer(): void {
    currentPlayer.value++;
    if (currentPlayer.value > playerCount.value) currentPlayer.value = 1;
  }

  function showModal(
    title: string,
    htmlContent: string,
    buttons: ModalButton[],
  ): void {
    gameModal.title = title;
    gameModal.body = htmlContent;
    gameModal.buttons = buttons;
    gameModal.show = true;
  }

  function closeModal(): void {
    gameModal.show = false;
  }

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
    const res = editingQuestions.value.filter((q) => q.q.trim() && q.a.trim());
    if (res.length === 0) return alert("至少保留一道题目！");

    questions.value = res;
    localStorage.setItem("magicQuestions_v4", JSON.stringify(res));
    alert("保存成功！");
    showSettings.value = false;
  }

  onMounted(() => {
    loadQuestions();
    resetGame();
    watch(showSettings, (val) => {
      if (val) {
        editingQuestions.value = JSON.parse(JSON.stringify(questions.value));
      }
    });
  });

  return {
    boardCells,
    cellRefs,
    players,
    currentPlayer,
    diceMsg,
    isRolling,
    diceStyle,
    showSettings,
    gameModal,
    editingQuestions,
    resetGame,
    changePlayerCount,
    rollDice,
    addQuestion,
    removeQuestion,
    saveQuestions,
    getPlayerIcon,
  };
}
