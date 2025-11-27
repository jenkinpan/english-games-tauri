import { ref, computed, onMounted, onUnmounted } from "vue";

// --- Types ---
export interface Card {
  displayWord: string;
  flipped: boolean;
}

export interface WordGroup {
  id: string;
  name: string;
  words: string[];
}

interface LocalStorageData {
  words: string[];
  wordCount: number;
  isInputHidden: boolean;
  groups?: WordGroup[];
  currentGroupId?: string | null;
}

export function useFlashcardGame() {
  // --- State ---
  const words = ref<string[]>(Array(9).fill(""));
  const cards = ref<Card[]>([]);
  const timeLeft = ref(60);
  const timerRunning = ref(false);
  const isInputHidden = ref(false);
  let timerInterval: NodeJS.Timeout | null = null;

  // [新增] 分组管理状态
  const groups = ref<WordGroup[]>([]);
  const currentGroupId = ref<string | null>(null);
  const showGroupModal = ref(false);
  const groupNameInput = ref("");
  const showDeleteConfirmModal = ref(false);
  const isRenaming = ref(false);
  const renamingGroupId = ref<string | null>(null);
  const groupToDeleteId = ref<string | null>(null);

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
    // 实时同步到当前分组
    if (currentGroupId.value) {
      const group = groups.value.find(g => g.id === currentGroupId.value);
      if (group) {
        group.words[index] = words.value[index];
      }
    }

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
      groups: groups.value,
      currentGroupId: currentGroupId.value,
    };
    localStorage.setItem("wordMemoryCards", JSON.stringify(data));
  }

  function loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem("wordMemoryCards");
      if (saved) {
        const data = JSON.parse(saved) as LocalStorageData;

        // 恢复分组
        if (Array.isArray(data.groups) && data.groups.length > 0) {
          groups.value = data.groups;
        } else {
          // 如果没有分组,创建一个默认分组
          const defaultGroup: WordGroup = {
            id: Date.now().toString(),
            name: "默认分组",
            words: Array.isArray(data.words) ? data.words : Array(9).fill(""),
          };
          groups.value = [defaultGroup];
        }

        // 恢复选中状态
        if (data.currentGroupId && groups.value.some(g => g.id === data.currentGroupId)) {
          currentGroupId.value = data.currentGroupId;
        } else {
          currentGroupId.value = groups.value[0].id;
        }

        // 恢复单词 (从当前分组加载,确保一致性)
        const currentGroup = groups.value.find(g => g.id === currentGroupId.value);
        if (currentGroup) {
          words.value = [...currentGroup.words];
          cards.value = words.value.map(
            (): Card => ({ displayWord: "", flipped: false }),
          );
        }

        if (typeof data.isInputHidden === "boolean")
          isInputHidden.value = data.isInputHidden;
      } else {
        // 首次加载,创建默认分组
        const defaultGroup: WordGroup = {
          id: Date.now().toString(),
          name: "默认分组",
          words: Array(9).fill(""),
        };
        groups.value = [defaultGroup];
        currentGroupId.value = defaultGroup.id;
        words.value = [...defaultGroup.words];
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- Group Management ---
  function openSaveGroupModal(renameId: string | null = null): void {
    if (renameId) {
      isRenaming.value = true;
      renamingGroupId.value = renameId;
      const group = groups.value.find((g) => g.id === renameId);
      groupNameInput.value = group ? group.name : "";
    } else {
      isRenaming.value = false;
      renamingGroupId.value = null;
      groupNameInput.value = "";
    }
    showGroupModal.value = true;
  }

  function closeGroupModal(): void {
    showGroupModal.value = false;
    isRenaming.value = false;
    renamingGroupId.value = null;
  }

  function saveGroup(): void {
    const name = groupNameInput.value.trim();
    if (!name) {
      alert("请输入分组名称");
      return;
    }

    if (isRenaming.value && renamingGroupId.value) {
      // 重命名逻辑
      const group = groups.value.find((g) => g.id === renamingGroupId.value);
      if (group) {
        group.name = name;
        saveToLocalStorage();
      }
    } else {
      // 新建逻辑 - 创建空白单词数组
      const newGroup: WordGroup = {
        id: Date.now().toString(),
        name: name,
        words: Array(9).fill(""), // 新分组使用空白单词
      };
      groups.value.push(newGroup);
      currentGroupId.value = newGroup.id;
      words.value = [...newGroup.words]; // 切换到新分组的空白单词
      initCards(); // 更新卡片显示
    }

    saveToLocalStorage();
    closeGroupModal();
  }

  function requestDeleteGroup(id: string): void {
    groupToDeleteId.value = id;
    showDeleteConfirmModal.value = true;
  }

  function confirmDeleteGroup(): void {
    if (!groupToDeleteId.value) return;

    groups.value = groups.value.filter((g) => g.id !== groupToDeleteId.value);

    // 如果删除后没有分组了,创建一个默认分组
    if (groups.value.length === 0) {
      const defaultGroup: WordGroup = {
        id: Date.now().toString(),
        name: "默认分组",
        words: Array(9).fill(""),
      };
      groups.value.push(defaultGroup);
      currentGroupId.value = defaultGroup.id;
      words.value = [...defaultGroup.words];
    } else if (currentGroupId.value === groupToDeleteId.value) {
      // 如果删除了当前选中的分组,选中第一个
      currentGroupId.value = groups.value[0].id;
      words.value = [...groups.value[0].words];
    }

    initCards();
    saveToLocalStorage();
    showDeleteConfirmModal.value = false;
    groupToDeleteId.value = null;
  }

  function cancelDeleteGroup(): void {
    showDeleteConfirmModal.value = false;
    groupToDeleteId.value = null;
  }

  function selectGroup(id: string): void {
    const group = groups.value.find((g) => g.id === id);
    if (group) {
      currentGroupId.value = id;
      words.value = [...group.words];
      initCards();
      saveToLocalStorage();
    }
  }


  onMounted(() => {
    loadFromLocalStorage();
    initCards();
  });

  onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval);
    // audioContext is a const, so it exists, but we should check state or try/catch if needed, 
    // though close() is generally safe on a valid context.
    // However, since it's defined at the top level of the composable, 
    // we should make sure we are closing the one created for this instance.
    audioContext.close();
  });

  // Return everything needed by the template
  return {
    words,
    cards,
    formattedTime,
    timerStyle,
    timerRunning,
    isInputHidden,
    groups,
    currentGroupId,
    showGroupModal,
    groupNameInput,
    showDeleteConfirmModal,
    isRenaming,
    startTimer,
    resetTimer,
    toggleInput,
    handleCardClick,
    handleWordInput,
    addWord,
    removeWord,
    openSaveGroupModal,
    closeGroupModal,
    saveGroup,
    requestDeleteGroup,
    confirmDeleteGroup,
    cancelDeleteGroup,
    selectGroup,
  };
}
