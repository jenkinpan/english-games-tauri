import { ref, onMounted, onUnmounted, nextTick } from "vue";

// --- Types ---
export interface WordItem {
  english: string;
  chinese: string;
}

export interface HoleState {
  id: number;
  state: "up" | "down" | "hit" | "miss";
  word: WordItem | null;
  isTarget: boolean;
  timerId: any;
}

export interface FloatingText {
  id: number;
  text: string;
  type: "score-up" | "score-down";
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  speed: number;
}

export function useWhackGame() {
  // --- Constants ---
  const GAME_DURATION = 60;
  const MOLE_STAY_TIME = 1500;
  const SPAWN_INTERVAL = 1000;
  const STORAGE_KEY = "whack_mole_vocab_v1";

  // --- State ---
  const score = ref(0);
  const timeLeft = ref(GAME_DURATION);
  const isPlaying = ref(false);
  const gameOver = ref(false);

  const defaultVocab: WordItem[] = [
    { english: "floor", chinese: "n. 地板" },
    { english: "window", chinese: "n. 窗户" },
    { english: "chair", chinese: "n. 椅子" },
    { english: "table", chinese: "n. 桌子" },
    { english: "sofa", chinese: "n. 沙发" },
    { english: "door", chinese: "n. 门" },
    { english: "phone", chinese: "n. 电话" },
    { english: "clean", chinese: "v. 打扫" },
  ];

  const vocabulary = ref<WordItem[]>([]);
  const tempVocabulary = ref<WordItem[]>([]);
  const currentTarget = ref<WordItem | null>(null);
  const holes = ref<HoleState[]>([]);

  // UI / VFX State
  const isTargetChanging = ref(false);
  const showResult = ref(false);
  const showSettings = ref(false);

  // 锤子位置与动画状态
  const hammerX = ref(0);
  const hammerY = ref(0);
  const isSwinging = ref(false); // 控制挥动动画
  const isShaking = ref(false); // 控制屏幕震动
  const isHammerVisible = ref(false); // ★ 新增：控制锤子是否显示

  const floatingTexts = ref<FloatingText[]>([]);
  const particles = ref<Particle[]>([]);
  let floatIdCounter = 0;
  let particleIdCounter = 0;

  let gameTimer: any = null;
  let spawnTimer: any = null;

  // --- Audio ---
  let audioCtx: AudioContext | null = null;

  function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function playSound(type: "hit" | "miss" | "spawn") {
    ensureAudioContext();
    if (!audioCtx) return;

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "hit") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
    } else if (type === "miss") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.linearRampToValueAtTime(200, t + 0.1);
      osc.frequency.linearRampToValueAtTime(150, t + 0.2);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    } else if (type === "spawn") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  // --- Input Handling (Mouse Tracking) ---
  function updateHammerPosition(e: MouseEvent) {
    hammerX.value = e.clientX;
    hammerY.value = e.clientY;
  }

  function triggerHammerSwing() {
    // 只有当锤子可见时才播放挥动动画
    if (!isHammerVisible.value) return;

    isSwinging.value = false;
    nextTick(() => {
      isSwinging.value = true;
      setTimeout(() => {
        isSwinging.value = false;
      }, 150);
    });
  }

  // ★ 新增：控制锤子显示/隐藏
  function showHammer() {
    isHammerVisible.value = true;
  }
  function hideHammer() {
    isHammerVisible.value = false;
  }

  // --- Game Logic ---
  function initHoles() {
    holes.value = Array.from({ length: 9 }, (_, i) => ({
      id: i,
      state: "down",
      word: null,
      isTarget: false,
      timerId: null,
    }));
  }

  function pickNewTarget() {
    if (vocabulary.value.length === 0) return;
    isTargetChanging.value = true;
    setTimeout(() => (isTargetChanging.value = false), 300);

    const randomIdx = Math.floor(Math.random() * vocabulary.value.length);
    currentTarget.value = vocabulary.value[randomIdx];
  }

  function spawnMole() {
    if (!isPlaying.value || !currentTarget.value) return;

    const availableHoles = holes.value.filter((h) => h.state === "down");
    if (availableHoles.length === 0) return;

    const randomHole =
      availableHoles[Math.floor(Math.random() * availableHoles.length)];
    const holeIndex = holes.value.indexOf(randomHole);

    const isCorrect = Math.random() < 0.4;
    let moleWord = currentTarget.value;

    if (!isCorrect) {
      const distractors = vocabulary.value.filter(
        (w) => w.english !== currentTarget.value?.english,
      );
      if (distractors.length > 0) {
        moleWord = distractors[Math.floor(Math.random() * distractors.length)];
      }
    }

    const hole = holes.value[holeIndex];
    hole.state = "up";
    hole.word = moleWord;
    hole.isTarget = moleWord.english === currentTarget.value.english;

    playSound("spawn");

    if (hole.timerId) clearTimeout(hole.timerId);
    hole.timerId = setTimeout(() => {
      if (hole.state === "up") {
        hole.state = "down";
      }
    }, MOLE_STAY_TIME);
  }

  function startGame() {
    if (vocabulary.value.length < 4) {
      alert("词库单词太少啦！请至少添加4个单词。");
      openSettings();
      return;
    }

    initHoles();
    score.value = 0;
    timeLeft.value = GAME_DURATION;
    isPlaying.value = true;
    gameOver.value = false;
    showResult.value = false;

    pickNewTarget();

    gameTimer = setInterval(() => {
      timeLeft.value--;
      if (timeLeft.value <= 0) {
        endGame();
      }
    }, 1000);

    spawnTimer = setInterval(spawnMole, SPAWN_INTERVAL);
    spawnMole();
  }

  function endGame() {
    isPlaying.value = false;
    gameOver.value = true;
    clearInterval(gameTimer);
    clearInterval(spawnTimer);

    holes.value.forEach((h) => {
      clearTimeout(h.timerId);
      h.state = "down";
    });

    showResult.value = true;
  }

  function whack(index: number, event: MouseEvent) {
    triggerHammerSwing();

    if (!isPlaying.value) return;
    const hole = holes.value[index];

    // 只有当地鼠处于 'up' 状态时，点击才有效
    if (hole.state !== "up") return;

    if (hole.isTarget) {
      score.value += 10;
      hole.state = "hit";
      playSound("hit");
      spawnFloatingText(event.clientX, event.clientY, "+10", "score-up");
      spawnParticles(event.clientX, event.clientY, "#ffd700");
      triggerScreenShake();
      setTimeout(pickNewTarget, 200);
    } else {
      score.value = Math.max(0, score.value - 5);
      hole.state = "miss";
      playSound("miss");
      spawnFloatingText(event.clientX, event.clientY, "-5", "score-down");
      spawnParticles(event.clientX, event.clientY, "#ff4757");
    }

    if (hole.timerId) clearTimeout(hole.timerId);
    hole.timerId = setTimeout(() => {
      hole.state = "down";
    }, 500);
  }

  function triggerScreenShake() {
    isShaking.value = true;
    setTimeout(() => (isShaking.value = false), 300);
  }

  function spawnParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      const id = particleIdCounter++;
      particles.value.push({
        id,
        x,
        y,
        color,
        angle: Math.random() * 360,
        speed: Math.random() * 5 + 2,
      });
      setTimeout(() => {
        particles.value = particles.value.filter((p) => p.id !== id);
      }, 500);
    }
  }

  function spawnFloatingText(
    x: number,
    y: number,
    text: string,
    type: "score-up" | "score-down",
  ) {
    const id = floatIdCounter++;
    floatingTexts.value.push({ id, text, type, x, y });
    setTimeout(() => {
      floatingTexts.value = floatingTexts.value.filter((f) => f.id !== id);
    }, 800);
  }

  function getFeedback(score: number): string {
    if (score >= 200) return "🌟 单词大师！简直神速！";
    if (score >= 100) return "👍 非常棒！继续保持！";
    if (score >= 50) return "🙂 不错哦，再接再厉！";
    return "💪 加油！多背几个单词再来！";
  }

  function openSettings() {
    tempVocabulary.value = JSON.parse(JSON.stringify(vocabulary.value));
    if (tempVocabulary.value.length === 0) addTempWord();
    showSettings.value = true;
  }
  function closeResult() {
    showResult.value = false;
  }
  function addTempWord() {
    tempVocabulary.value.push({ english: "", chinese: "" });
  }
  function removeTempWord(index: number) {
    tempVocabulary.value.splice(index, 1);
  }
  function saveSettings() {
    const validWords = tempVocabulary.value.filter(
      (w) => w.english.trim() !== "" && w.chinese.trim() !== "",
    );
    if (validWords.length < 4) {
      if (!confirm("单词数量较少（建议至少4个），确定要保存吗？")) return;
    }
    vocabulary.value = validWords;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vocabulary.value));
    showSettings.value = false;
  }
  function loadVocabulary() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        vocabulary.value = JSON.parse(saved);
      } catch (e) {
        vocabulary.value = JSON.parse(JSON.stringify(defaultVocab));
      }
    } else {
      vocabulary.value = JSON.parse(JSON.stringify(defaultVocab));
    }
  }

  onMounted(() => {
    loadVocabulary();
    window.addEventListener("mousemove", updateHammerPosition);
    window.addEventListener("mousedown", triggerHammerSwing);
  });

  onUnmounted(() => {
    // 清理事件监听器
    window.removeEventListener("mousemove", updateHammerPosition);
    window.removeEventListener("mousedown", triggerHammerSwing);

    // 清理定时器
    if (gameTimer) clearInterval(gameTimer);
    if (spawnTimer) clearInterval(spawnTimer);

    // 清理所有地鼠洞的定时器
    holes.value.forEach((h) => {
      if (h.timerId) clearTimeout(h.timerId);
    });

    // 关闭音频上下文
    if (audioCtx) {
      audioCtx.close();
    }
  });

  return {
    // Data
    score,
    timeLeft,
    isPlaying,
    gameOver,
    currentTarget,
    holes,
    vocabulary,
    tempVocabulary,
    // UI State
    showResult,
    showSettings,
    isTargetChanging,
    isShaking,
    // VFX State
    hammerX,
    hammerY,
    isSwinging,
    isHammerVisible,
    floatingTexts,
    particles, // ★ 导出 isHammerVisible
    // Methods
    startGame,
    endGame,
    whack,
    closeResult,
    openSettings,
    saveSettings,
    addTempWord,
    removeTempWord,
    getFeedback,
    showHammer,
    hideHammer, // ★ 导出鼠标移入移出控制
  };
}
