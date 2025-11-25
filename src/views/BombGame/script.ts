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
  const score: Ref<number> = ref(0);
  const gameStarted: Ref<boolean> = ref(false);
  const gameOver: Ref<boolean> = ref(false);
  const bombCount: Ref<number> = ref(1);
  const isInputHidden: Ref<boolean> = ref(false);
  const cardBackRefs: Ref<HTMLElement[]> = ref([]);

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
    ensureAudioContext();
    const oscillator: OscillatorNode = audioContext.createOscillator();
    const gainNode: GainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }

  function playBombSound(): void {
    const frequencies: number[] = [100, 80, 60];
    frequencies.forEach((freq: number, index: number) => {
      setTimeout(() => {
        playSound(freq, 0.3, "sawtooth");
      }, index * 50);
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
    if (gameOver.value) return;

    const hasWords: boolean = words.value.some((w: string) => w.trim());
    if (!hasWords) {
      alert("请至少输入一个单词！");
      return;
    }

    updateBombCountConstraints();

    gameStarted.value = true;
    gameOver.value = false;
    score.value = 0;

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
    gameStarted.value = false;
    gameOver.value = false;
    score.value = 0;
    initCards();
  }

  function triggerExplosion(container: HTMLElement): void {
    const boom: HTMLDivElement = document.createElement("div");
    boom.className = "explosion";
    container.appendChild(boom);

    const particles: number = 14;
    for (let i = 0; i < particles; i++) {
      const p: HTMLDivElement = document.createElement("div");
      p.className = "particle";
      const angle: number = Math.random() * Math.PI * 2;
      const distance: number = 40 + Math.random() * 70;
      const tx: number = Math.cos(angle) * distance;
      const ty: number = Math.sin(angle) * distance;
      p.style.setProperty("--tx", tx + "px");
      p.style.setProperty("--ty", ty + "px");
      container.appendChild(p);
    }

    setTimeout(() => {
      boom.remove();
      const addedParticles: NodeListOf<Element> =
        container.querySelectorAll(".particle");
      addedParticles.forEach((el: Element) => el.remove());
    }, 800);
  }

  function handleCardClick(index: number): void {
    const card: Card = cards.value[index];
    if (!gameStarted.value || gameOver.value || card.flipped) return;

    card.flipped = true;

    if (card.type === "bomb") {
      gameOver.value = true;
      playBombSound();
      nextTick(() => {
        const el: HTMLElement | undefined = cardBackRefs.value[index];
        if (el) triggerExplosion(el);
      });
      setTimeout(() => {
        gameOver.value = false;
      }, 1200);
    } else {
      score.value += card.value as number;
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
    words.value.push("");
    initCards();
    updateBombCountConstraints();
    saveToLocalStorage();
  }

  function removeWord(): void {
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
  });

  // 必须返回模板中用到的所有变量和函数
  return {
    words,
    cards,
    score,
    gameStarted,
    gameOver,
    bombCount,
    isInputHidden,
    cardBackRefs,
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
