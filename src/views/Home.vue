<template>
    <div class="home-container">
        <div class="title-bar" data-tauri-drag-region></div>
        <header>
            <h1>英语互动游戏中心</h1>
            <p class="description">
                选择一个你喜欢的小游戏，进入对应页面开始闯关，用游戏的方式轻松巩固词汇与语法。
            </p>
        </header>

        <main class="grid">
            <GameCard
                path="/bomb"
                title="单词炸弹"
                desc="在倒计时压力下快速输入正确单词，避免炸弹爆炸！"
            />

            <GameCard
                path="/flashcard"
                title="记忆卡片"
                desc="背诵与翻转记忆卡片，加深词汇印象。"
            />

            <GameCard
                path="/millionaire"
                title="魔法大富翁"
                desc="答题闯关赢取金币，冲击终极大奖。"
            />

            <GameCard
                path="/tic-tac-toe"
                title="单词井字棋"
                desc="结合词汇与策略的九宫格对战。"
            />

            <GameCard
                path="/witch-poison"
                title="女巫的毒药"
                desc="在女巫的谜题中选择正确单词，安全逃脱。"
            />

            <GameCard
                path="/lexicon-defense"
                title="词汇塔防"
                desc="错词大军来袭！拼写正确单词才能启动防御炮台。"
            />

            <GameCard
                path="/Whack-a-Mole"
                title="单词打地鼠"
                desc="单词地鼠游戏！快来hit抢单词的地鼠吧！"
            />

            <GameCard
                path="/lucky-one"
                title="谁是幸运儿"
                desc="寻找幸运卡片，赢取高分！"
            />

            <GameCard
                path="/mystery-reveal"
                title="看图猜单词"
                desc="查看缺失的图片，还原丢失的真相！"
            />
        </main>
    </div>
</template>

<script setup lang="ts">
import GameCard from "../components/GameCard.vue";
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
    margin-bottom: 32px;
    -webkit-app-region: no-drag;
}

h1 {
    margin: 0 0 12px;
    font-size: clamp(2rem, 5vw, 3rem);
    letter-spacing: 0.02em;
}

p.description {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.6;
    color: rgba(0, 0, 0, 0.7);
}

main.grid {
    flex: 1;
    -webkit-app-region: no-drag;
}

.grid {
    width: 100%;
    max-width: 1080px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    padding-bottom: 40px;
}

@media (prefers-color-scheme: dark) {
    p.description {
        color: rgba(244, 245, 251, 0.75);
    }
}
</style>
