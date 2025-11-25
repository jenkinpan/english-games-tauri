import { ref, reactive, computed, onMounted } from "vue";

// --- Types (导出以便在其他地方复用类型) ---
export interface Cell {
  value: string | null;
  isWinning: boolean;
  word: string;
}

export interface RoundResult {
  round: number;
  winnerName: string;
  winnerClass: string;
  icon: string;
}

export interface LocalStorageData {
  words: string[];
  wordCount: number;
  isWordInputHidden: boolean;
}

// --- 逻辑封装 ---
export function useGameLogic() {
  // --- State ---
  const currentPlayer = ref("white");
  const board = ref<Cell[]>(
    Array(9)
      .fill(null)
      .map((): Cell => ({ value: null, isWinning: false, word: "" })),
  );
  const gameOver = ref(false);
  const allWords = ref<string[]>([]);
  const currentRound = ref(0);
  const stats = reactive({ whiteWins: 0, blackWins: 0, draws: 0 });
  const roundResults = ref<RoundResult[]>([]);
  const wordInputs = ref<string[]>(Array(9).fill(""));
  const isWordInputHidden = ref(false);
  const showWinModal = ref(false);
  const winText = ref("");

  // --- Computed ---
  const totalRounds = computed(
    () => stats.whiteWins + stats.blackWins + stats.draws,
  );
  const whitePercent = computed(() =>
    totalRounds.value === 0
      ? 0
      : Math.round((stats.whiteWins / totalRounds.value) * 100),
  );
  const blackPercent = computed(() =>
    totalRounds.value === 0
      ? 0
      : Math.round((stats.blackWins / totalRounds.value) * 100),
  );

  const finalResultHTML = computed(() => {
    // 只有当所有单词都用完（或者超过当前轮次需要的单词量）且有进行过游戏时才显示
    // 注意：如果单词很少，这个条件可能很快满足，但这不影响游戏继续进行
    if (
      totalRounds.value > 0 &&
      (currentRound.value + 1) * 9 >= allWords.value.length &&
      allWords.value.length > 0
    ) {
      let winner;
      if (stats.whiteWins > stats.blackWins) winner = "白棋";
      else if (stats.blackWins > stats.whiteWins) winner = "黑棋";
      else winner = "平局";
      return `🏆 最终获胜方：<span class="highlight">${winner}</span> 🏆`;
    }
    return "";
  });

  // --- Audio ---
  // 使用 Lazy 初始化，避免浏览器自动播放策略限制警告
  let audioContext: AudioContext | null = null;

  function ensureAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  }

  function playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
  ): void {
    ensureAudioContext();
    if (!audioContext) return;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gain.gain.setValueAtTime(0, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration,
    );
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  }

  function playSound(type: string): void {
    if (type === "click") {
      playTone(440, 0.1, "sine");
    } else if (type === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach(
        (freq: number, index: number) => {
          setTimeout(() => playTone(freq, 0.2, "sine"), index * 100);
        },
      );
    } else if (type === "draw") {
      playTone(330, 0.3, "sine");
    }
  }

  // --- Game Logic ---
  function initBoard(): void {
    // 重置格子状态，并移除获胜样式
    board.value = Array(9)
      .fill(null)
      .map((): Cell => ({ value: null, isWinning: false, word: "" }));

    const totalWords = allWords.value.length;
    if (totalWords === 0) return;

    // 填充单词
    for (let i = 0; i < 9; i++) {
      // 循环使用单词库，这样即使单词少于9个也能玩
      const index = (currentRound.value * 9 + i) % totalWords;
      board.value[i].word = allWords.value[index] || "";
    }
  }

  function makeMove(index: number): void {
    if (gameOver.value || board.value[index].value) return;

    board.value[index].value = currentPlayer.value;
    playSound("click");

    const winningPattern = checkWin();
    if (winningPattern) {
      gameOver.value = true;
      const winnerName = currentPlayer.value === "white" ? "白棋" : "黑棋";
      handleWin(winnerName, winningPattern);
      return;
    }

    // 检查平局
    if (board.value.every((cell: Cell) => cell.value)) {
      gameOver.value = true;
      handleDraw();
      return;
    }

    currentPlayer.value = currentPlayer.value === "white" ? "black" : "white";
  }

  function checkWin(): number[] | null {
    const patterns = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // 行
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // 列
      [0, 4, 8],
      [2, 4, 6], // 对角线
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
    if (winnerName === "白棋") stats.whiteWins++;
    else stats.blackWins++;

    pattern.forEach((idx: number) => (board.value[idx].isWinning = true));
    playSound("win");
    createConfetti();

    roundResults.value.push({
      round: currentRound.value + 1,
      winnerName: winnerName,
      winnerClass: winnerName === "白棋" ? "white-win" : "black-win",
      icon: winnerName === "白棋" ? "🥇" : "🥈",
    });

    winText.value = `恭喜${winnerName}获胜！`;
    showWinModal.value = true;
  }

  function handleDraw() {
    stats.draws++;
    playSound("draw");
    roundResults.value.push({
      round: currentRound.value + 1,
      winnerName: "平局",
      winnerClass: "draw",
      icon: "🤝",
    });
    winText.value = "平局！";
    showWinModal.value = true;
  }

  function createConfetti() {
    const colors = [
      "#ffd700",
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#96ceb4",
      "#ffeaa7",
    ];
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const el = document.createElement("div");
        el.className = "confetti";
        if (document.body) document.body.appendChild(el); // Safety check

        // CSS 动画处理
        el.style.left = Math.random() * 100 + "%";
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = Math.random() * 0.5 + "s";
        el.style.width = Math.random() * 10 + 5 + "px";
        el.style.height = el.style.width;

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
    currentPlayer.value = currentRound.value % 2 === 0 ? "white" : "black";
    gameOver.value = false;
    initBoard();
  }

  function nextRound() {
    // ★★★ 修复：只要有单词就可以进入下一回合，移除 < 9 的限制
    if (allWords.value.length === 0) {
      alert("请先添加单词！");
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
    wordInputs.value.push("");
    // 这里不需要调用 updateWords，因为 input 绑定了 v-model 且有 @input 事件
  }

  function removeWordInput() {
    if (wordInputs.value.length <= 1) {
      alert("至少需要保留1个单词输入框！");
      return;
    }
    wordInputs.value.pop();
    updateWords(); // 减少时需立即更新，因为没有触发 input 事件
  }

  function toggleWordInput() {
    isWordInputHidden.value = !isWordInputHidden.value;
    saveToLocalStorage();
  }

  function updateWords(): void {
    // 过滤空单词
    const validWords = wordInputs.value
      .map((w: string) => w.trim())
      .filter((w: string) => w);
    // 去重
    allWords.value = [...new Set(validWords)];

    // 如果有单词，实时更新当前棋盘上的文字（保持棋子状态不变）
    if (allWords.value.length > 0) {
      const totalWords = allWords.value.length;
      for (let i = 0; i < 9; i++) {
        const index = (currentRound.value * 9 + i) % totalWords;
        // 仅更新文字
        board.value[i].word = allWords.value[index] || "";
      }
    }

    saveToLocalStorage();
  }

  // --- Persistence ---
  function saveToLocalStorage(): void {
    const data: LocalStorageData = {
      words: wordInputs.value,
      wordCount: wordInputs.value.length,
      isWordInputHidden: isWordInputHidden.value,
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
          updateWords(); // 载入后更新
        }
        if (typeof data.isWordInputHidden === "boolean")
          isWordInputHidden.value = data.isWordInputHidden;
      }
    } catch (e) {
      console.error(e);
    }
  }

  onMounted(() => {
    loadFromLocalStorage();
    initBoard();
  });

  // ★★★ 关键步骤：返回模板所需的所有变量 ★★★
  return {
    currentPlayer,
    board,
    gameOver,
    allWords,
    stats,
    roundResults,
    wordInputs,
    isWordInputHidden,
    showWinModal,
    winText,
    totalRounds,
    whitePercent,
    blackPercent,
    finalResultHTML,
    makeMove,
    fullRestart,
    nextRound,
    closeWinModal,
    addWordInput,
    removeWordInput,
    toggleWordInput,
    updateWords,
  };
}
