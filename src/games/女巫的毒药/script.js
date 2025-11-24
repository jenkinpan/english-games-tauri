// 引入 Tauri 插件
import { open } from "@tauri-apps/plugin-dialog";
import { readFile, readTextFile } from "@tauri-apps/plugin-fs";

document.addEventListener("DOMContentLoaded", function () {
  // --- 1. 获取 DOM 元素 ---
  const wordInput = document.getElementById("wordInput");
  const importBtn = document.getElementById("importBtn");
  const restartBtn = document.getElementById("restartBtn");
  const selectFileBtn = document.getElementById("selectFileBtn"); // 新按钮
  const wordGrid = document.getElementById("wordGrid");
  const gameStatus = document.getElementById("gameStatus");
  const notification = document.getElementById("notification");

  // --- 2. 游戏状态变量 ---
  let words = [];
  let gameState = "setup";
  let team1PoisonWord = null;
  let team2PoisonWord = null;
  let totalUniquePoisons = 0;
  let foundPoisonsCount = 0;

  const STORAGE_KEY = "witchGame_words";

  // --- 3. 初始化加载 ---
  loadWordsFromLocalStorage();

  // --- 4. 事件监听绑定 ---
  importBtn.addEventListener("click", importWordsFromTextarea);
  restartBtn.addEventListener("click", restartGame);
  // 绑定新按钮事件
  if (selectFileBtn) {
    selectFileBtn.addEventListener("click", handleTauriFileSelect);
  }

  // --- 5. 核心功能函数 ---

  // LocalStorage 加载逻辑 (保持不变)
  function loadWordsFromLocalStorage() {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          words = parsedData;
          wordInput.value = words.join("\n");
          renderWordGrid();
          startPoisonSelection();
        }
      }
    } catch (error) {
      console.error("读取本地存储失败:", error);
    }
  }

  // 【核心修改】使用 Tauri API 处理文件选择和读取
  async function handleTauriFileSelect() {
    try {
      // 1. 打开原生文件选择对话框
      const file = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Word List",
            extensions: ["xlsx", "xls", "txt"],
          },
        ],
      });

      if (!file) return; // 用户取消了选择

      // 2. 根据文件类型读取
      // 注意：Tauri v2 的 open() 返回的是 file object 或 null，包含 path 属性
      // 如果是 Web 环境 fallback，结构可能不同，但在 Tauri App 中 file 就是路径字符串或包含 path 的对象
      // 在 Tauri v2 plugin-dialog 中，返回的是文件路径字符串(如果multiple:false) 或者路径数组

      const filePath = file.path || file; // 兼容处理

      if (filePath.endsWith(".txt")) {
        // 读取文本文件
        const text = await readTextFile(filePath);
        processTextToWords(text);
        finishImport();
      } else {
        // 读取二进制文件 (Excel)
        const data = await readFile(filePath);
        // XLSX 库可以直接处理 Uint8Array
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        words = jsonData
          .flat()
          .map((w) => String(w).trim())
          .filter((w) => w);

        finishImport();
      }
    } catch (err) {
      console.error("文件读取失败:", err);
      alert("读取文件失败: " + err);
    }
  }

  // 从文本框导入 (保持不变)
  function importWordsFromTextarea() {
    const input = wordInput.value.trim();
    if (!input) {
      alert("请输入单词或选择文件！");
      return;
    }
    processTextToWords(input);
    finishImport();
  }

  // 文本处理 (保持不变)
  function processTextToWords(text) {
    words = text
      .split(/[\n,，]/)
      .map((line) => line.trim())
      .filter((line) => line !== "");
  }

  // 完成导入 (保持不变)
  function finishImport() {
    if (words.length === 0) {
      alert("未检测到有效单词，请检查内容。");
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    } catch (error) {
      console.error("无法保存到本地存储:", error);
    }
    wordInput.value = words.join("\n");
    renderWordGrid();
    startPoisonSelection();
  }

  // 渲染网格 (保持不变)
  function renderWordGrid() {
    wordGrid.innerHTML = "";
    wordGrid.className = "word-grid";
    const count = words.length;

    if (count <= 4) {
      wordGrid.classList.add("layout-huge");
    } else if (count <= 12) {
      wordGrid.classList.add("layout-large");
    } else if (count <= 32) {
      wordGrid.classList.add("layout-medium");
    } else {
      wordGrid.classList.add("layout-compact");
    }

    words.forEach((word, index) => {
      const cell = document.createElement("div");
      cell.className = "word-cell";
      cell.textContent = word;
      cell.dataset.index = index;
      cell.addEventListener("click", handleCellClick);
      wordGrid.appendChild(cell);
    });
  }

  // 游戏流程控制 (保持不变)
  function startPoisonSelection() {
    gameState = "team1Poison";
    gameStatus.textContent =
      "🤫 第一阶段：请第一组派人点击一个单词藏毒药 (其他人闭眼)";
    gameStatus.style.color = "#ff9e6b";
    restartBtn.disabled = false;
    restartBtn.classList.remove("btn-disabled");
  }

  function handleCellClick(event) {
    const cell = event.currentTarget;
    const index = parseInt(cell.dataset.index, 10);
    const word = words[index];

    if (cell.classList.contains("poisoned") || cell.classList.contains("safe"))
      return;

    if (gameState === "team1Poison") {
      team1PoisonWord = { index, word };
      highlightSelectionTemporary(cell, () => {
        gameState = "team2Poison";
        gameStatus.textContent =
          "🤫 第二阶段：请第二组派人点击一个单词藏毒药 (其他人闭眼)";
      });
    } else if (gameState === "team2Poison") {
      team2PoisonWord = { index, word };
      highlightSelectionTemporary(cell, () => {
        startGamePlay();
      });
    } else if (gameState === "playing") {
      const isTeam1Poison = team1PoisonWord && team1PoisonWord.index === index;
      const isTeam2Poison = team2PoisonWord && team2PoisonWord.index === index;
      if (isTeam1Poison || isTeam2Poison) {
        handlePoisonFound(cell);
      } else {
        markAsSafe(cell);
      }
    }
  }

  function startGamePlay() {
    gameState = "playing";
    foundPoisonsCount = 0;
    if (team1PoisonWord.index === team2PoisonWord.index) {
      totalUniquePoisons = 1;
    } else {
      totalUniquePoisons = 2;
    }
    gameStatus.textContent = "🎮 游戏开始！读单词并点击";
    gameStatus.style.color = "#4ecdc4";
  }

  function handlePoisonFound(cell) {
    cell.classList.add("poisoned");
    foundPoisonsCount++;
    if (foundPoisonsCount >= totalUniquePoisons) {
      gameState = "gameOver";
      gameStatus.textContent = "🏆 游戏结束！所有毒药已清除！";
      gameStatus.style.color = "#ff6b6b";
      showNotification("毒药清除完毕！<br>游戏结束！");
    } else {
      gameStatus.textContent = "⚠️ 踩中一个毒药！游戏继续！小心...";
      gameStatus.style.color = "#ff9e6b";
      showNotification("啊！有毒！<br>继续寻找！");
    }
  }

  function highlightSelectionTemporary(cell, callback) {
    cell.classList.add("selected-poison");
    setTimeout(() => {
      cell.classList.remove("selected-poison");
      callback();
    }, 500);
  }

  function markAsSafe(cell) {
    cell.classList.add("safe");
  }

  function showNotification(htmlContent) {
    notification.innerHTML = `<i class="fas fa-skull-crossbones"></i><br>${htmlContent}`;
    notification.style.display = "block";
    if (gameState !== "gameOver") {
      setTimeout(() => {
        notification.style.display = "none";
      }, 2000);
    } else {
      setTimeout(() => {
        notification.style.display = "none";
      }, 3000);
    }
  }

  function restartGame() {
    if (words.length === 0) return;
    team1PoisonWord = null;
    team2PoisonWord = null;
    foundPoisonsCount = 0;
    totalUniquePoisons = 0;
    const cells = document.querySelectorAll(".word-cell");
    cells.forEach((cell) => {
      cell.className = "word-cell";
    });
    startPoisonSelection();
  }
});
