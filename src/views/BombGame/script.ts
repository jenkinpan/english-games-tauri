import { ref, onMounted, nextTick, type Ref } from "vue";

// --- Types ---
export interface Card {
  word: string;
  flipped: boolean;
  type: "score" | "bomb";
  value: number | null;
}

interface LocalStorageData {
  words: string[];
  bombCount: number;
  isInputHidden: boolean;
}

// 导出主逻辑函数
export function useGameLogic() {
  // --- State ---
  const words: Ref<string[]> = ref(Array(9).fill(""));
  const cards: Ref<Card[]> = ref([]);
  const gameStarted: Ref<boolean> = ref(false);
  const gameOver: Ref<boolean> = ref(false);
  const bombCount: Ref<number> = ref(1);
  const isInputHidden: Ref<boolean> = ref(false);
  const cardBackRefs: Ref<HTMLElement[]> = ref([]);
  // 状态锁：防止动画期间重复点击
  const isAnimatingBomb: Ref<boolean> = ref(false);

  // --- Audio ---
  const audioContext: AudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();

  function ensureAudioContext(): void {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  }

  function playSound(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
  ): void {
    if (!audioContext) return;
    ensureAudioContext();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.1);
  }

  function playBombSound(): void {
    const frequencies: number[] = [120, 90, 60];
    frequencies.forEach((freq: number, index: number) => {
      setTimeout(() => {
        playSound(freq, 0.4, "sawtooth");
      }, index * 40);
    });
  }

  function playScoreSound(): void {
    const frequencies: number[] = [523.25, 659.25, 783.99];
    frequencies.forEach((freq: number, index: number) => {
      setTimeout(() => {
        playSound(freq, 0.15, "sine");
      }, index * 80);
    });
  }

  // --- Game Logic ---
  function initCards(): void {
    cards.value = words.value.map(
      (w: string): Card => ({
        word: w,
        flipped: false,
        type: "score",
        value: 0,
      }),
    );
  }

  function updateBombCountConstraints(): void {
    const maxAllowed: number = Math.max(1, words.value.length - 1);
    if (bombCount.value < 1) bombCount.value = 1;
    if (bombCount.value > maxAllowed) bombCount.value = maxAllowed;
  }

  function startGame(): void {
    if (gameOver.value || isAnimatingBomb.value) return;

    const hasWords: boolean = words.value.some((w: string) => w.trim());
    if (!hasWords) {
      alert("请至少输入一个单词！");
      return;
    }

    updateBombCountConstraints();

    gameStarted.value = true;
    gameOver.value = false;
    isAnimatingBomb.value = false;

    const maxBombs: number = Math.max(
      1,
      Math.min(bombCount.value, Math.max(1, words.value.length - 1)),
    );
    const bombIndices: Set<number> = new Set();
    while (bombIndices.size < maxBombs) {
      bombIndices.add(Math.floor(Math.random() * words.value.length));
    }

    cards.value = words.value.map((w: string, i: number): Card => {
      if (bombIndices.has(i)) {
        return { word: w, flipped: false, type: "bomb", value: null };
      } else {
        return {
          word: w,
          flipped: false,
          type: "score",
          value: Math.floor(Math.random() * 3) + 1,
        };
      }
    });
  }

  function resetGame(): void {
    if (isAnimatingBomb.value) return;
    gameStarted.value = false;
    gameOver.value = false;
    isAnimatingBomb.value = false;
    initCards();
  }

  // [核心优化 1] 使用 DocumentFragment 优化爆炸特效，杜绝卡顿
  function triggerExplosion(container: HTMLElement): void {
    // 创建文档片段，暂时在内存中操作，不直接操作 DOM
    const fragment = document.createDocumentFragment();

    const boom: HTMLDivElement = document.createElement("div");
    boom.className = "explosion";
    fragment.appendChild(boom);

    const particles: number = 20;
    for (let i = 0; i < particles; i++) {
      const p: HTMLDivElement = document.createElement("div");
      p.className = "particle";
      const angle: number = Math.random() * Math.PI * 2;
      const distance: number = 60 + Math.random() * 90;
      const tx: number = Math.cos(angle) * distance;
      const ty: number = Math.sin(angle) * distance;
      p.style.setProperty("--tx", tx + "px");
      p.style.setProperty("--ty", ty + "px");
      const scale = 0.5 + Math.random() * 0.5;
      p.style.transform = `translate(-50%, -50%) scale(${scale})`;

      fragment.appendChild(p);
    }

    // 仅触发一次重排，性能极高
    container.appendChild(fragment);

    // 这里的 boom 引用依然有效，用于后续删除
    setTimeout(() => {
      boom.remove();
      const addedParticles: NodeListOf<Element> =
        container.querySelectorAll(".particle");
      addedParticles.forEach((el: Element) => el.remove());
    }, 800);
  }

  // [核心优化 2] 微调时间逻辑
  function handleCardClick(index: number): void {
    const card: Card = cards.value[index];
    if (
      !gameStarted.value ||
      gameOver.value ||
      card.flipped ||
      isAnimatingBomb.value
    )
      return;

    card.flipped = true;

    if (card.type === "bomb") {
      isAnimatingBomb.value = true;
      playBombSound(); // 1. 声音：立即播放

      // 2. 特效：延迟 250ms
      // 为什么是 250ms？
      // - 0ms 时：卡片刚开始动，此时爆炸会炸在卡片背面，不好看，且容易卡顿。
      // - 250ms 时：卡片旋转到 90度左右，炸弹图案刚好要露出来。
      // 此时触发爆炸，视觉上感觉是“炸弹露出来的瞬间炸了”，非常跟手，而且避开了动画启动时的性能峰值。
      setTimeout(() => {
        gameOver.value = true;
        const el: HTMLElement | undefined = cardBackRefs.value[index];

        // 使用 requestAnimationFrame 确保在下一帧绘制，进一步保证流畅
        requestAnimationFrame(() => {
          if (el) triggerExplosion(el);
        });

        setTimeout(() => {
          gameOver.value = false;
          isAnimatingBomb.value = false;
        }, 1500);
      }, 250);
    } else {
      playScoreSound();
    }
  }

  // --- Persistence ---
  function saveToLocalStorage(): void {
    const data: LocalStorageData = {
      words: words.value,
      bombCount: bombCount.value,
      isInputHidden: isInputHidden.value,
    };
    localStorage.setItem("wordBombGame", JSON.stringify(data));
  }

  function addWord(): void {
    if (isAnimatingBomb.value) return;
    words.value.push("");
    initCards();
    updateBombCountConstraints();
    saveToLocalStorage();
  }

  function removeWord(): void {
    if (isAnimatingBomb.value) return;
    if (words.value.length <= 1) {
      alert("至少需要保留1个单词！");
      return;
    }
    words.value.pop();
    initCards();
    updateBombCountConstraints();
    saveToLocalStorage();
  }

  function toggleInput(): void {
    isInputHidden.value = !isInputHidden.value;
    saveToLocalStorage();
  }

  function handleWordInput(index: number): void {
    saveToLocalStorage();
    if (cards.value[index]) {
      cards.value[index].word = words.value[index];
    }
  }

  function loadFromLocalStorage(): void {
    try {
      const saved: string | null = localStorage.getItem("wordBombGame");
      if (saved) {
        const data: LocalStorageData = JSON.parse(saved);
        if (Array.isArray(data.words)) words.value = data.words;
        if (data.bombCount) bombCount.value = data.bombCount;
        if (typeof data.isInputHidden === "boolean")
          isInputHidden.value = data.isInputHidden;
      }
    } catch (e) {
      console.error(e);
    }
  }

  onMounted(() => {
    loadFromLocalStorage();
    initCards();
    document.addEventListener("click", ensureAudioContext, { once: true });
  });

  return {
    words,
    cards,
    gameStarted,
    gameOver,
    bombCount,
    isInputHidden,
    cardBackRefs,
    isAnimatingBomb,
    startGame,
    resetGame,
    handleCardClick,
    addWord,
    removeWord,
    toggleInput,
    handleWordInput,
    updateBombCountConstraints,
  };
}
