import { ref, onMounted, type Ref } from "vue";

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
  const isAnimatingBomb: Ref<boolean> = ref(false);

  // [新增] 控制清空确认弹窗的显示
  const showClearModal: Ref<boolean> = ref(false);

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

  function triggerExplosion(container: HTMLElement): void {
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

    container.appendChild(fragment);

    setTimeout(() => {
      boom.remove();
      const addedParticles: NodeListOf<Element> =
        container.querySelectorAll(".particle");
      addedParticles.forEach((el: Element) => el.remove());
    }, 800);
  }

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
      playBombSound();

      setTimeout(() => {
        gameOver.value = true;
        const el: HTMLElement | undefined = cardBackRefs.value[index];

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

  // [修改] 请求清空：不直接清空，而是打开弹窗
  function requestClearWords(): void {
    if (isAnimatingBomb.value) return;
    showClearModal.value = true;
  }

  // [新增] 确认清空：执行清空逻辑并关闭弹窗
  function confirmClearWords(): void {
    words.value = words.value.map(() => "");
    initCards();
    saveToLocalStorage();
    showClearModal.value = false;
  }

  // [新增] 取消清空
  function cancelClearWords(): void {
    showClearModal.value = false;
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
    showClearModal, // 导出状态
    startGame,
    resetGame,
    handleCardClick,
    addWord,
    removeWord,
    requestClearWords, // 导出请求函数
    confirmClearWords, // 导出确认函数
    cancelClearWords, // 导出取消函数
    toggleInput,
    handleWordInput,
    updateBombCountConstraints,
  };
}
