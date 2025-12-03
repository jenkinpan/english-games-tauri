<template>
    <div class="home-container">
        <div class="title-bar" data-tauri-drag-region></div>
        <header>
            <h1>英语互动游戏中心</h1>
            <p class="description">
                选择一个你喜欢的小游戏，进入对应页面开始闯关，用游戏的方式轻松巩固词汇与语法。
            </p>

            <div class="search-wrapper">
                <i class="fas fa-search search-icon"></i>
                <input
                    type="text"
                    v-model="searchQuery"
                    placeholder="输入中文或拼音搜索 (如: zd, danci)"
                    class="search-input"
                />
                <i
                    v-if="searchQuery"
                    class="fas fa-times clear-icon"
                    @click="searchQuery = ''"
                >
                </i>
            </div>
        </header>

        <main class="grid-container">
            <div class="grid">
                <GameCard
                    v-for="game in filteredGames"
                    :key="game.path"
                    :path="game.path"
                    :title="game.title"
                    :desc="game.desc"
                    :tags="game.tags"
                />
            </div>

            <div v-if="filteredGames.length === 0" class="no-results">
                <i class="fas fa-ghost"></i>
                <p>哎呀，找不到匹配的游戏...</p>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import GameCard from "../components/GameCard.vue";
// @ts-ignore
import PinyinMatch from "pinyin-match";
// 注意：如果不想用 @ts-ignore，请参考下文的“类型声明”步骤

// 原始游戏数据（不需要手动加 pinyin 字段了）
const games = [
    {
        path: "/bomb",
        title: "单词炸弹",
        desc: "在倒计时压力下快速输入正确单词，避免炸弹爆炸！",
        tags: ["Desktop", "Tablet", "Mobile"],
    },
    {
        path: "/flashcard",
        title: "记忆卡片",
        desc: "背诵与翻转记忆卡片，加深词汇印象。",
        tags: ["Mobile", "Tablet", "Desktop"],
    },
    {
        path: "/millionaire",
        title: "魔法大富翁",
        desc: "答题闯关赢取金币，冲击终极大奖。",
        tags: ["Desktop", "Tablet"],
    },
    {
        path: "/tic-tac-toe",
        title: "单词井字棋",
        desc: "结合词汇与策略的九宫格对战。",
        tags: ["Mobile", "Tablet", "Desktop"],
    },
    {
        path: "/witch-poison",
        title: "女巫的毒药",
        desc: "在女巫的谜题中选择正确单词，安全逃脱。",
        tags: ["Desktop", "Tablet"],
    },
    {
        path: "/lexicon-defense",
        title: "词汇塔防",
        desc: "错词大军来袭！拼写正确单词才能启动防御炮台。",
        tags: ["Desktop"],
    },
    {
        path: "/Whack-a-Mole",
        title: "单词打地鼠",
        desc: "单词地鼠游戏！快来hit抢单词的地鼠吧！",
        tags: ["Desktop", "Tablet"],
    },
    {
        path: "/lucky-one",
        title: "谁是幸运儿",
        desc: "寻找幸运卡片，赢取高分！",
        tags: ["Mobile", "Tablet", "Desktop"],
    },
    {
        path: "/mystery-reveal",
        title: "看图猜单词",
        desc: "查看缺失的图片，还原丢失的真相！",
        tags: ["Desktop", "Tablet"],
    },
    {
        path: "/random-name",
        title: "随机点名",
        desc: "紧张刺激的随机点名！",
        tags: ["Mobile", "Tablet", "Desktop"],
    },
    {
        path: "/word-pk",
        title: "单词消消乐",
        desc: "小组PK，谁是单词大王！",
        tags: ["Mobile", "Tablet"],
    },
    {
        path: "/word-match",
        title: "单词匹配",
        desc: "匹配对应的单词给相应的分组",
        tags: ["Tablet", "Desktop"],
    },
];

const searchQuery = ref("");

// 使用 pinyin-match 进行智能过滤
const filteredGames = computed(() => {
    const query = searchQuery.value.trim();
    if (!query) {
        return games;
    }

    return games.filter((game) => {
        return PinyinMatch.match(game.title, query);
    });
});
</script>

<style scoped>
.home-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.title-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: transparent;
    z-index: 99999;
}

header {
    text-align: center;
    max-width: 640px;
    margin-bottom: 40px;
    -webkit-app-region: no-drag;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

h1 {
    margin: 0 0 16px;
    font-size: clamp(2rem, 5vw, 3rem);
    letter-spacing: 0.02em;
}

p.description {
    margin: 0 0 30px 0;
    font-size: 1.05rem;
    line-height: 1.6;
    color: rgba(0, 0, 0, 0.7);
    max-width: 600px;
}

/* --- 搜索框美化 --- */
.search-wrapper {
    position: relative;
    width: 100%;
    max-width: 480px;
}

.search-icon {
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
    pointer-events: none;
    font-size: 1.1rem;
    opacity: 0.6;
}

.clear-icon {
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 1rem;
    padding: 5px;
    transition: color 0.2s;
}
.clear-icon:hover {
    color: var(--accent-primary);
}

.search-input {
    width: 100%;
    padding: 16px 45px 16px 50px;
    border-radius: 50px;
    border: 2px solid transparent;
    background: var(--bg-card);
    color: var(--text-primary);
    font-size: 1.05rem;
    outline: none;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.search-input:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 8px 30px rgba(137, 180, 250, 0.2);
    background: var(--bg-base);
    transform: translateY(-2px);
}

.search-input::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
}

/* --- 布局样式 --- */
main.grid-container {
    flex: 1;
    width: 100%;
    max-width: 1200px;
    -webkit-app-region: no-drag;
}

.grid {
    display: grid;
    /* ★★★ 核心修复：auto-fill + minmax ★★★
       auto-fill 会在空间足够时保留空白占位，而不是拉伸仅有的卡片。
       minmax(280px, 1fr) 确保卡片不会无限缩小，也不会无限拉大。
    */
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
    padding-bottom: 60px;
}

/* 无结果提示 */
.no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
    color: var(--text-secondary);
    opacity: 0.7;
    animation: fadeIn 0.5s ease-out;
}

.no-results i {
    font-size: 4rem;
    margin-bottom: 20px;
    color: var(--text-secondary);
}

.no-results p {
    font-size: 1.3rem;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 0.7;
        transform: translateY(0);
    }
}

@media (prefers-color-scheme: dark) {
    p.description {
        color: rgba(244, 245, 251, 0.75);
    }
}
</style>
