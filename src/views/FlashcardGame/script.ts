import { ref, computed, onMounted } from "vue";

// --- Types ---
export interface Card {
  displayWord: string;
  flipped: boolean;
}

interface LocalStorageData {
  words: string[];
  wordCount: number;
  isInputHidden: boolean;
}

export function useFlashcardGame() {
  // --- State ---
  const words = ref<string[]>(Array(9).fill(""));
  const cards = ref<Card[]>([]);
  const timeLeft = ref(60);
  const timerRunning = ref(false);
  const isInputHidden = ref(false);
  let timerInterval: NodeJS.Timeout | null = null;

  // --- Computed ---
  const formattedTime = computed(() => {
    const minutes = Math.floor(timeLeft.value / 60);
    const seconds = timeLeft.value % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  });

  const timerStyle = computed(() => {
    return timeLeft.value <= 10
      ? { background: "linear-gradient(90deg, #ff416c, #ff4b2b)" }
      : { background: "linear-gradient(90deg, #00b09b, #96c93d)" };
  });

  // --- Audio ---
  const audioContext = new (window.AudioContext ||
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
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

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

  function playCountdownSound(): void {
    playSound(800, 0.2, "sine");
  }

  function playFlipSound(): void {
    ensureAudioContext();
    const frequencies = [523.25, 659.25, 783.99, 880.0, 1046.5];
    const baseTime = audioContext.currentTime;

    frequencies.forEach((freq: number, index: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = freq;
      oscillator.type = "sine";
      const startTime = baseTime + index * 0.08;
      const duration = 0.15;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });

    const bassOscillator = audioContext.createOscillator();
    const bassGain = audioContext.createGain();
    bassOscillator.connect(bassGain);
    bassGain.connect(audioContext.destination);
    bassOscillator.frequency.value = 261.63;
    bassOscillator.type = "triangle";
    const bassStartTime = baseTime;
    const bassDuration = 0.4;
    bassGain.gain.setValueAtTime(0, bassStartTime);
    bassGain.gain.linearRampToValueAtTime(0.15, bassStartTime + 0.05);
    bassGain.gain.exponentialRampToValueAtTime(
      0.01,
      bassStartTime + bassDuration,
    );
    bassOscillator.start(bassStartTime);
    bassOscillator.stop(bassStartTime + bassDuration);
  }

  // --- Game Logic ---
  function randomizeCardWords(): void {
    const validWords = words.value.filter((w: string) => w.trim().length > 0);
    // Shuffle
    const shuffled = [...validWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Assign to cards
    cards.value = words.value.map(
      (_: string, i: number): Card => ({
        displayWord: i < shuffled.length ? shuffled[i] : "",
        flipped: false,
      }),
    );
  }

  function initCards(): void {
    randomizeCardWords();
  }

  function handleWordInput(index: number): void {
    saveToLocalStorage();
    if (cards.value[index]) {
      cards.value[index].displayWord = words.value[index];
    }
  }

  function handleCardClick(index: number): void {
    cards.value[index].flipped = !cards.value[index].flipped;
    playFlipSound();
  }

  function startTimer(): void {
    if (timerInterval) clearInterval(timerInterval);
    timeLeft.value = 60;
    timerRunning.value = true;

    timerInterval = setInterval(() => {
      timeLeft.value--;
      if (timeLeft.value <= 10 && timeLeft.value > 0) {
        playCountdownSound();
      }
      if (timeLeft.value <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        timerRunning.value = false;
        cards.value.forEach((c: Card) => (c.flipped = true));
      }
    }, 1000);
  }

  function resetTimer(): void {
    if (timerInterval) clearInterval(timerInterval);
    timeLeft.value = 60;
    timerRunning.value = false;
    cards.value.forEach((c: Card) => (c.flipped = false));
    randomizeCardWords();
  }

  function addWord(): void {
    words.value.push("");
    cards.value.push({ displayWord: "", flipped: false });
    saveToLocalStorage();
  }

  function removeWord(): void {
    if (words.value.length <= 1) {
      alert("至少需要保留1个单词！");
      return;
    }
    words.value.pop();
    cards.value.pop();
    saveToLocalStorage();
  }

  function toggleInput(): void {
    isInputHidden.value = !isInputHidden.value;
    saveToLocalStorage();
  }

  // --- Persistence ---
  function saveToLocalStorage(): void {
    const data: LocalStorageData = {
      words: words.value,
      wordCount: words.value.length,
      isInputHidden: isInputHidden.value,
    };
    localStorage.setItem("wordMemoryCards", JSON.stringify(data));
  }

  function loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem("wordMemoryCards");
      if (saved) {
        const data = JSON.parse(saved) as LocalStorageData;
        if (Array.isArray(data.words)) {
          words.value = data.words;
          cards.value = words.value.map(
            (): Card => ({ displayWord: "", flipped: false }),
          );
        }
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

  // Return everything needed by the template
  return {
    words,
    cards,
    formattedTime,
    timerStyle,
    timerRunning,
    isInputHidden,
    startTimer,
    resetTimer,
    toggleInput,
    handleCardClick,
    handleWordInput,
    addWord,
    removeWord,
  };
}
