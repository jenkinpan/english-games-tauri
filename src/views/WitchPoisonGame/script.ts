import { ref, computed, onMounted } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";

// --- Composable Logic ---
export function useWitchGame() {
  // --- State ---
  const wordInputText = ref("");
  const words = ref<string[]>([]);
  const gameState = ref("setup");

  const team1PoisonIndex = ref<number | null>(null);
  const team2PoisonIndex = ref<number | null>(null);
  const tempSelectedPoisonIndex = ref<number | null>(null);

  const poisonedIndices = ref<number[]>([]);
  const safeIndices = ref<number[]>([]);

  const showNotification = ref(false);
  const notificationText = ref("");

  // ★ 新增：特效状态
  const isShaking = ref(false);

  const STORAGE_KEY = "witchGame_words";

  // --- Computed ---
  const canRestart = computed(
    () => words.value.length > 0 && gameState.value !== "setup",
  );

  const gridClass = computed(() => {
    const count = words.value.length;
    if (count <= 4) return "layout-huge";
    if (count <= 12) return "layout-large";
    if (count <= 32) return "layout-medium";
    return "layout-compact";
  });

  const gameStatusText = computed(() => {
    switch (gameState.value) {
      case "setup":
        return "请先导入单词...";
      case "team1Poison":
        return "🤫 第一阶段：请第一组派人点击一个单词藏毒药 (其他人闭眼)";
      case "team2Poison":
        return "🤫 第二阶段：请第二组派人点击一个单词藏毒药 (其他人闭眼)";
      case "playing":
        return "🎮 游戏开始！读单词并点击";
      case "gameOver":
        return "🏆 游戏结束！所有毒药已清除！";
      default:
        return "";
    }
  });

  const statusColor = computed(() => {
    switch (gameState.value) {
      case "team1Poison":
      case "team2Poison":
        return "#ff9e6b";
      case "playing":
        return "#4ecdc4";
      case "gameOver":
        return "#ff6b6b";
      default:
        return "#ff9e6b";
    }
  });

  // --- Audio System (Web Audio API) ---
  let audioCtx: AudioContext | null = null;

  function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function playSound(type: "click" | "safe" | "poison" | "win") {
    ensureAudioContext();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "click") {
      // 短促的点击音
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    } else if (type === "safe") {
      // 魔法安全音 (高音闪烁)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(1200, t + 0.1);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    } else if (type === "poison") {
      // 毒药爆炸音 (低频锯齿波)
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    } else if (type === "win") {
      // 胜利和弦
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C Major
      freqs.forEach((f, i) => {
        const o = audioCtx!.createOscillator();
        const g = audioCtx!.createGain();
        o.connect(g);
        g.connect(audioCtx!.destination);
        o.type = "square";
        o.frequency.setValueAtTime(f, t + i * 0.1);
        g.gain.setValueAtTime(0.1, t + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.4);
        o.start(t + i * 0.1);
        o.stop(t + i * 0.1 + 0.4);
      });
    }
  }

  // --- VFX System ---
  function triggerShake() {
    isShaking.value = true;
    setTimeout(() => (isShaking.value = false), 500);
  }

  function createConfetti() {
    const colors = ["#ff6b6b", "#4ecdc4", "#ffe66d", "#ff9e6b", "#f7f1e3"];
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const el = document.createElement("div");
        el.className = "witch-confetti";
        if (document.body) document.body.appendChild(el);
        el.style.left = Math.random() * 100 + "%";
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = Math.random() * 0.5 + "s";
        setTimeout(() => el.remove(), 3000);
      }, i * 30);
    }
  }

  // --- Actions ---
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

  function importWordsFromTextarea() {
    const input = wordInputText.value.trim();
    if (!input) {
      alert("请输入单词或选择文件！");
      return;
    }
    processTextToWords(input);
    finishImport();
  }

  async function handleTauriFileSelect(): Promise<void> {
    try {
      const file = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Word List", extensions: ["xlsx", "xls", "txt"] }],
      });

      if (!file) return;
      const filePath =
        typeof file === "string" ? file : (file as any).path || file;

      if (filePath.endsWith(".txt")) {
        const text = await readTextFile(filePath);
        processTextToWords(text);
        finishImport();
      } else {
        alert(
          "Excel import requires 'xlsx' library. Please use .txt files for now.",
        );
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

  function highlightSelectionTemporary(
    index: number,
    callback: () => void,
  ): void {
    playSound("click"); // 播放点击音效
    tempSelectedPoisonIndex.value = index;
    setTimeout(() => {
      tempSelectedPoisonIndex.value = null;
      callback();
    }, 500);
  }

  function startGamePlay(): void {
    gameState.value = "playing";
  }

  function triggerNotification(html: string, duration: number): void {
    notificationText.value = html;
    showNotification.value = true;
    setTimeout(() => {
      showNotification.value = false;
    }, duration);
  }

  function handlePoisonFound(index: number): void {
    poisonedIndices.value.push(index);

    // ★ 特效：毒药触发
    playSound("poison");
    triggerShake();

    const totalUniquePoisons =
      team1PoisonIndex.value === team2PoisonIndex.value ? 1 : 2;

    if (poisonedIndices.value.length >= totalUniquePoisons) {
      gameState.value = "gameOver";
      // ★ 特效：胜利
      setTimeout(() => {
        playSound("win");
        createConfetti();
      }, 500);
      triggerNotification("毒药清除完毕！<br>游戏结束！", 3000);
    } else {
      triggerNotification("啊！有毒！<br>继续寻找！", 2000);
    }
  }

  function markAsSafe(index: number): void {
    // ★ 特效：安全点击
    playSound("safe");
    safeIndices.value.push(index);
  }

  function handleCellClick(index: number): void {
    if (
      poisonedIndices.value.includes(index) ||
      safeIndices.value.includes(index)
    )
      return;

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

  function restartGame() {
    playSound("click");
    if (words.value.length === 0) return;
    startPoisonSelection();
  }

  onMounted(() => {
    loadWordsFromLocalStorage();
  });

  return {
    wordInputText,
    words,
    gameState,
    team1PoisonIndex,
    team2PoisonIndex,
    tempSelectedPoisonIndex,
    poisonedIndices,
    safeIndices,
    showNotification,
    notificationText,
    canRestart,
    gridClass,
    gameStatusText,
    statusColor,
    isShaking, // 导出震动状态
    handleTauriFileSelect,
    importWordsFromTextarea,
    restartGame,
    handleCellClick,
  };
}
