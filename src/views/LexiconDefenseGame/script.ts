import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";

// --- Types (移到外部以便复用) ---
export interface VocabularyItem {
  correct: string;
  clue: string;
}

export interface WordWithMiss extends VocabularyItem {
  miss: string;
}

export interface VFXItem {
  id: number;
  text: string;
  type: string;
  x: number;
  y: number;
}

// --- Composable Logic ---
export function useGameLogic() {
  // --- Constants ---
  const ANSWER_TIME = 18;
  const defaultVocabulary: VocabularyItem[] = [
    { correct: "floor", clue: "n. 地板" },
    { correct: "window", clue: "n. 窗户" },
    { correct: "chair", clue: "n. 椅子" },
    { correct: "table", clue: "n. 桌子" },
    { correct: "sofa", clue: "n. 沙发" },
    { correct: "door", clue: "n. 门" },
    { correct: "phone", clue: "n. 电话" },
    { correct: "clean", clue: "v. 打扫" },
    { correct: "please", clue: "int. 请" },
    { correct: "television", clue: "n. 电视" },
  ];

  // --- State ---
  const vocabulary = ref<VocabularyItem[]>([]);
  const queue = ref<WordWithMiss[]>([]);
  const currentWord = ref<WordWithMiss | null>(null);
  const score = ref(0);
  const shield = ref(3);
  const wave = ref(0);
  const timer = ref(0);
  const isGameActive = ref(false);
  const currentSlots = ref<(string | null)[]>([]);
  const currentPool = ref<string[]>([]);
  const logText = ref("");
  const logError = ref(false);
  const showEditor = ref(false);
  const editorWords = ref<VocabularyItem[]>([]);
  const isShaking = ref(false);
  const isShieldDamaged = ref(false);
  const vfxList = ref<VFXItem[]>([]);

  let timerInterval: NodeJS.Timeout | null = null;
  let vfxIdCounter = 0;

  // --- Computed ---
  const isFullInput = computed(() =>
    currentSlots.value.every((c) => c !== null),
  );
  const hasInput = computed(() => currentSlots.value.some((c) => c !== null));

  const hintText = computed(() => {
    if (!isGameActive.value) {
      if (shield.value <= 0)
        return `护盾耗尽！答案应为：${currentWord.value ? currentWord.value.correct : "未知"}`;
      if (wave.value === vocabulary.value.length && wave.value > 0)
        return "恭喜！所有错词已被纠正。";
      return "每波会出现一个自动生成的拼写错误，点击下方字母修复它。";
    }
    if (currentWord.value) {
      if (timer.value <= 10) return `提示：${currentWord.value.clue}`;
      return `提示：线索分析中... (${timer.value - 10}s)`;
    }
    return "";
  });

  const hintActive = computed(() => {
    if (!isGameActive.value) return true;
    return timer.value <= 10;
  });

  // --- Audio ---
  // Lazy initialization to avoid browser policy issues until interaction
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
    freq: number,
    type: OscillatorType,
    duration: number,
    vol: number = 0.1,
  ): void {
    ensureAudioContext();
    if (!audioContext) return;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    gain.gain.setValueAtTime(vol, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration,
    );
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  }

  const SoundFX = {
    shoot: () => {
      playTone(600, "square", 0.1, 0.05);
      setTimeout(() => playTone(800, "square", 0.1, 0.05), 50);
    },
    hit: () => {
      playTone(440, "sine", 0.1);
      setTimeout(() => playTone(880, "sine", 0.2), 100);
    },
    error: () => {
      playTone(150, "sawtooth", 0.3, 0.15);
      setTimeout(() => playTone(100, "sawtooth", 0.3, 0.15), 150);
    },
    click: () => {
      playTone(1200, "sine", 0.05, 0.03);
    },
    win: () => {
      [440, 554, 659, 880].forEach((f, i) =>
        setTimeout(() => playTone(f, "square", 0.3, 0.05), i * 100),
      );
    },
    loss: () => {
      [300, 250, 200, 150].forEach((f, i) =>
        setTimeout(() => playTone(f, "sawtooth", 0.4, 0.1), i * 150),
      );
    },
  };

  // --- VFX ---
  function spawnVFX(targetId: string, text: string, type: string): void {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (targetId === "score") {
      x = window.innerWidth * 0.4;
      y = 100;
    }
    if (targetId === "shield") {
      x = window.innerWidth * 0.6;
      y = 100;
    }

    const id = vfxIdCounter++;
    vfxList.value.push({ id, text, type, x, y });
    setTimeout(() => {
      vfxList.value = vfxList.value.filter((v: VFXItem) => v.id !== id);
    }, 1200);
  }

  function triggerShake() {
    isShaking.value = false;
    nextTick(() => {
      isShaking.value = true;
      setTimeout(() => (isShaking.value = false), 400);
    });
  }

  function triggerShieldDamage() {
    isShieldDamaged.value = false;
    nextTick(() => {
      isShieldDamaged.value = true;
      setTimeout(() => (isShieldDamaged.value = false), 500);
    });
  }

  // --- Logic ---
  function scrambleWord(word: string): string {
    if (word.length <= 1) return word;
    const arr = word.split("");
    let limit = 10;
    while (limit > 0) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      const result = arr.join("");
      if (result.toLowerCase() !== word.toLowerCase()) return result;
      limit--;
    }
    return arr.join("");
  }

  function simpleShuffle<T>(arr: T[]): T[] {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }

  function loadData(): VocabularyItem[] {
    const stored = localStorage.getItem("lexicon_vocab");
    if (stored) {
      try {
        return JSON.parse(stored) as VocabularyItem[];
      } catch (e) { }
    }
    return JSON.parse(JSON.stringify(defaultVocabulary));
  }

  function saveData(data: VocabularyItem[]): void {
    localStorage.setItem("lexicon_vocab", JSON.stringify(data));
  }

  function spawnEnemy(): void {
    if (timerInterval) clearInterval(timerInterval);
    if (queue.value.length === 0) {
      victory();
      return;
    }

    currentWord.value = queue.value.shift() || null;
    wave.value++;
    logText.value = "点击字母进行排序...";
    logError.value = false;

    if (currentWord.value) {
      initInputZone(currentWord.value.correct);
    }

    timer.value = ANSWER_TIME;
    timerInterval = setInterval(() => {
      timer.value--;
      if (timer.value <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        damage("倒计时耗尽，护盾 -1。");
      }
    }, 1000);
  }

  function startGame() {
    SoundFX.shoot();
    vocabulary.value = loadData();
    if (vocabulary.value.length === 0) {
      alert("词库为空！请先添加单词。");
      openEditor();
      return;
    }

    const preparedList = vocabulary.value.map((item) => ({
      ...item,
      miss: scrambleWord(item.correct),
    }));

    queue.value = simpleShuffle(preparedList);
    score.value = 0;
    shield.value = 3;
    wave.value = 0;
    currentWord.value = null;
    isGameActive.value = true;
    logText.value = "准备作战！";
    logError.value = false;

    spawnEnemy();
  }

  function initInputZone(correctWord: string): void {
    currentSlots.value = new Array(correctWord.length).fill(null);
    currentPool.value = simpleShuffle(correctWord.split(""));
  }

  function moveLetterToSlot(poolIndex: number): void {
    if (!isGameActive.value) return;
    const emptySlotIndex = currentSlots.value.findIndex(
      (c: string | null) => c === null,
    );
    if (emptySlotIndex === -1) return;

    const char = currentPool.value[poolIndex];
    currentSlots.value[emptySlotIndex] = char;
    currentPool.value.splice(poolIndex, 1);

    SoundFX.click();
  }

  function returnLetterToPool(slotIndex: number): void {
    if (!isGameActive.value) return;
    const char = currentSlots.value[slotIndex];
    if (!char) return;

    currentSlots.value[slotIndex] = null;
    currentPool.value.push(char);

    SoundFX.click();
  }

  function resetInputAll(): void {
    if (!isGameActive.value || !currentWord.value) return;
    currentSlots.value.forEach((char: string | null) => {
      if (char) currentPool.value.push(char);
    });
    currentSlots.value.fill(null);
  }

  function checkAnswer() {
    if (!isGameActive.value || !currentWord.value) return;

    const attempt = currentSlots.value.join("").toLowerCase();

    if (attempt === currentWord.value.correct.toLowerCase()) {
      score.value += 2;
      SoundFX.hit();
      spawnVFX("score", "+2", "gain");
      logText.value = `命中！正确拼写：${currentWord.value.correct}`;
      logError.value = false;
      spawnEnemy();
    } else {
      shield.value--;
      SoundFX.error();
      triggerShake();
      spawnVFX("shield", "-1", "loss");
      triggerShieldDamage();

      logText.value = "拼写错误，护盾 -1！";
      logError.value = true;
      if (shield.value <= 0) gameOver();
    }
  }

  function damage(msg: string): void {
    shield.value--;
    SoundFX.error();
    triggerShake();
    spawnVFX("shield", "-1", "loss");
    triggerShieldDamage();

    logText.value = msg;
    logError.value = true;
    if (shield.value <= 0) {
      gameOver();
    } else {
      spawnEnemy();
    }
  }

  function skipWave(): void {
    if (!isGameActive.value || !currentWord.value || score.value <= 0) return;
    score.value = Math.max(0, score.value - 1);
    SoundFX.shoot();
    spawnVFX("score", "-1", "loss");
    logText.value = `跳过，答案是：${currentWord.value.correct}`;
    logError.value = false;
    spawnEnemy();
  }

  function quitGame(): void {
    if (isGameActive.value) endGame("游戏已手动结束。");
  }

  function victory(): void {
    SoundFX.win();
    endGame("恭喜！所有错词已被纠正。");
  }

  function gameOver(): void {
    SoundFX.loss();
    endGame(
      `护盾耗尽！答案应为：${currentWord.value ? currentWord.value.correct : "未知"}`,
    );
  }

  function endGame(msg: string): void {
    isGameActive.value = false;
    if (timerInterval) clearInterval(timerInterval);
    timer.value = 0;
    logText.value = msg;
    setTimeout(() => {
      logText.value = `${msg} 最终得分：${score.value}`;
    }, 500);
  }

  // --- Editor ---
  function openEditor(): void {
    editorWords.value = JSON.parse(JSON.stringify(loadData()));
    if (editorWords.value.length === 0) addEditorWord();
    showEditor.value = true;
  }

  function closeEditor(): void {
    showEditor.value = false;
  }

  function addEditorWord(): void {
    editorWords.value.push({ correct: "", clue: "" });
  }

  function removeEditorWord(index: number): void {
    editorWords.value.splice(index, 1);
  }

  function saveEditor(): void {
    const newData = editorWords.value.filter(
      (w: VocabularyItem) => w.correct.trim() && w.clue.trim(),
    );
    if (newData.length === 0 && !confirm("词库为空，确定要保存吗？")) return;
    saveData(newData);
    vocabulary.value = newData;
    closeEditor();
    logText.value = "词库已更新，点击“开始新一局”生效。";
  }

  onMounted(() => {
    vocabulary.value = loadData();
  });

  onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval);
    if (audioContext) {
      audioContext.close();
    }
  });

  // ★★★ 显式返回所有变量，解决 TypeScript 识别问题 ★★★
  return {
    vocabulary,
    score,
    shield,
    wave,
    timer,
    currentWord,
    currentSlots,
    currentPool,
    isGameActive,
    hintText,
    hintActive,
    isFullInput,
    hasInput,
    logText,
    logError,
    showEditor,
    editorWords,
    isShaking,
    isShieldDamaged,
    vfxList,
    startGame,
    quitGame,
    skipWave,
    resetInputAll,
    checkAnswer,
    moveLetterToSlot,
    returnLetterToPool,
    openEditor,
    closeEditor,
    addEditorWord,
    removeEditorWord,
    saveEditor,
  };
}
