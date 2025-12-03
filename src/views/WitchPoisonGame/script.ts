import { ref, computed, watch, onMounted } from "vue";

// --- 类型定义 ---
export interface WordItem {
  id: string;
  text: string;
}

export interface WordGroup {
  id: string;
  name: string;
  words: WordItem[];
}

export function useWitchGame() {
  const STORAGE_KEY = "witch_poison_groups_v2";

  // --- 词库管理状态 ---
  const groups = ref<WordGroup[]>([]);
  const currentGroupId = ref<string>("");
  const showLibraryModal = ref(false);
  const editingGroupId = ref<string>("");

  // 删除确认弹窗
  const showDeleteConfirm = ref(false);
  const groupToDeleteId = ref<string | null>(null);

  // --- 游戏核心状态 ---
  const gameState = ref("setup"); // setup, team1Poison, team2Poison, playing, gameOver

  const team1PoisonIndex = ref<number | null>(null);
  const team2PoisonIndex = ref<number | null>(null);
  const tempSelectedPoisonIndex = ref<number | null>(null);

  const poisonedIndices = ref<number[]>([]);
  const safeIndices = ref<number[]>([]);

  const showNotification = ref(false);
  const notificationText = ref("");
  const isShaking = ref(false);

  // --- 计算属性 ---
  const currentGroup = computed(() =>
    groups.value.find((g) => g.id === currentGroupId.value),
  );

  // 核心：当前游戏的单词列表直接来源于选中的分组
  const words = computed(() => {
    if (!currentGroup.value) return [];
    return currentGroup.value.words
      .map((w) => w.text)
      .filter((t) => t.trim() !== "");
  });

  const canStart = computed(() => words.value.length > 0);

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
        return "准备阶段：请选择或编辑词库，然后点击开始";
      case "team1Poison":
        return "🤫 第一阶段：请第一组派人点击一个单词藏毒药";
      case "team2Poison":
        return "🤫 第二阶段：请第二组派人点击一个单词藏毒药";
      case "playing":
        return "🎮 游戏开始！轮流读单词并点击";
      case "gameOver":
        return "🏆 游戏结束！毒药已清除！";
      default:
        return "";
    }
  });

  const statusColor = computed(() => {
    switch (gameState.value) {
      case "team1Poison":
      case "team2Poison":
        return "#ff9e6b"; // Orange
      case "playing":
        return "#4ecdc4"; // Teal
      case "gameOver":
        return "#ff6b6b"; // Red
      default:
        return "#ccc";
    }
  });

  // 当前正在编辑的分组
  const currentEditingGroup = computed(() =>
    groups.value.find((g) => g.id === editingGroupId.value),
  );

  // --- 监听与持久化 ---
  watch(
    groups,
    () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          groups: groups.value,
          currentGroupId: currentGroupId.value,
        }),
      );
    },
    { deep: true },
  );

  watch(currentGroupId, (newVal) => {
    if (newVal) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          groups: groups.value,
          currentGroupId: newVal,
        }),
      );
      // 切换分组时重置游戏
      resetGameState();
    }
  });

  function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.groups && Array.isArray(data.groups)) {
          groups.value = data.groups;
          currentGroupId.value =
            data.currentGroupId || groups.value[0]?.id || "";
        }
      } catch (e) {
        console.error(e);
      }
    }

    // 如果没有数据，尝试迁移旧数据或创建默认数据
    if (groups.value.length === 0) {
      const oldWords = localStorage.getItem("witchGame_words");
      let initialWords: WordItem[] = [];

      if (oldWords) {
        try {
          const arr = JSON.parse(oldWords);
          if (Array.isArray(arr)) {
            initialWords = arr.map((t, i) => ({
              id: `${Date.now()}-${i}`,
              text: t,
            }));
          }
        } catch (e) {}
      }

      if (initialWords.length === 0) {
        initialWords = [
          "Apple",
          "Banana",
          "Cat",
          "Dog",
          "Elephant",
          "Fish",
        ].map((t, i) => ({ id: `${i}`, text: t }));
      }

      const defaultGroup: WordGroup = {
        id: Date.now().toString(),
        name: "默认词库",
        words: initialWords,
      };
      groups.value = [defaultGroup];
      currentGroupId.value = defaultGroup.id;
    }

    // 确保 editingGroupId 有值
    if (!editingGroupId.value && groups.value.length > 0) {
      editingGroupId.value = groups.value[0].id;
    }
  }

  // --- 词库操作逻辑 ---
  function createGroup() {
    const newGroup: WordGroup = {
      id: Date.now().toString(),
      name: `新分组 ${groups.value.length + 1}`,
      words: [],
    };
    groups.value.push(newGroup);
    editingGroupId.value = newGroup.id;
    if (!currentGroupId.value) currentGroupId.value = newGroup.id;
  }

  function deleteGroup(id: string) {
    if (groups.value.length <= 1) {
      alert("至少保留一个分组！");
      return;
    }
    groupToDeleteId.value = id;
    showDeleteConfirm.value = true;
  }

  function confirmDeleteGroup() {
    if (!groupToDeleteId.value) return;
    const idx = groups.value.findIndex((g) => g.id === groupToDeleteId.value);
    if (idx !== -1) groups.value.splice(idx, 1);

    if (currentGroupId.value === groupToDeleteId.value)
      currentGroupId.value = groups.value[0].id;
    if (editingGroupId.value === groupToDeleteId.value)
      editingGroupId.value = groups.value[0].id;

    showDeleteConfirm.value = false;
    groupToDeleteId.value = null;
  }

  function cancelDeleteGroup() {
    showDeleteConfirm.value = false;
    groupToDeleteId.value = null;
  }

  function addWord() {
    if (!currentEditingGroup.value) return;
    currentEditingGroup.value.words.push({
      id: Date.now().toString(),
      text: "",
    });
  }

  function removeWord(wordId: string) {
    if (!currentEditingGroup.value) return;
    const idx = currentEditingGroup.value.words.findIndex(
      (w) => w.id === wordId,
    );
    if (idx !== -1) currentEditingGroup.value.words.splice(idx, 1);
  }

  // --- 游戏逻辑 ---
  function resetGameState() {
    gameState.value = "setup";
    team1PoisonIndex.value = null;
    team2PoisonIndex.value = null;
    poisonedIndices.value = [];
    safeIndices.value = [];
    showNotification.value = false;
  }

  function restartGame() {
    if (words.value.length === 0) {
      alert("当前分组没有单词，请先编辑添加！");
      return;
    }
    resetGameState();
    playSound("click");
    gameState.value = "team1Poison";
  }

  // ★ 新增：停止游戏并返回准备阶段
  function stopGame() {
    resetGameState(); // 这会将 gameState 设置为 'setup'
    playSound("click");
  }

  // 音效系统
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
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    } else if (type === "safe") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(1200, t + 0.1);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    } else if (type === "poison") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    } else if (type === "win") {
      const freqs = [523.25, 659.25, 783.99, 1046.5];
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

  function highlightSelectionTemporary(index: number, callback: () => void) {
    playSound("click");
    tempSelectedPoisonIndex.value = index;
    setTimeout(() => {
      tempSelectedPoisonIndex.value = null;
      callback();
    }, 500);
  }

  function handleCellClick(index: number) {
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
        gameState.value = "playing";
      });
    } else if (gameState.value === "playing") {
      const isTeam1Poison = team1PoisonIndex.value === index;
      const isTeam2Poison = team2PoisonIndex.value === index;

      if (isTeam1Poison || isTeam2Poison) {
        poisonedIndices.value.push(index);
        playSound("poison");
        triggerShake();

        const totalUniquePoisons =
          team1PoisonIndex.value === team2PoisonIndex.value ? 1 : 2;

        if (poisonedIndices.value.length >= totalUniquePoisons) {
          gameState.value = "gameOver";
          setTimeout(() => {
            playSound("win");
            createConfetti();
          }, 500);
          triggerNotification("毒药清除完毕！<br>游戏结束！", 3000);
        } else {
          triggerNotification("啊！有毒！<br>继续寻找！", 2000);
        }
      } else {
        playSound("safe");
        safeIndices.value.push(index);
      }
    }
  }

  function triggerNotification(html: string, duration: number) {
    notificationText.value = html;
    showNotification.value = true;
    setTimeout(() => {
      showNotification.value = false;
    }, duration);
  }

  onMounted(() => {
    loadData();
  });

  return {
    // State
    words,
    gameState,
    team1PoisonIndex,
    tempSelectedPoisonIndex,
    poisonedIndices,
    safeIndices,
    showNotification,
    notificationText,
    isShaking,
    // Library State
    groups,
    currentGroupId,
    showLibraryModal,
    editingGroupId,
    currentEditingGroup,
    showDeleteConfirm,
    canStart,
    // Computed
    gridClass,
    gameStatusText,
    statusColor,
    // Methods
    restartGame,
    stopGame, // 导出新方法
    handleCellClick,
    createGroup,
    deleteGroup,
    confirmDeleteGroup,
    cancelDeleteGroup,
    addWord,
    removeWord,
  };
}
