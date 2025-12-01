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
            <router-link class="card" to="/bomb">
                <h2>单词炸弹</h2>
                <p>在倒计时压力下快速输入正确单词，避免炸弹爆炸！</p>
            </router-link>

            <router-link class="card" to="/flashcard">
                <h2>记忆卡片</h2>
                <p>背诵与翻转记忆卡片，加深词汇印象。</p>
            </router-link>

            <router-link class="card" to="/millionaire">
                <h2>魔法大富翁</h2>
                <p>答题闯关赢取金币，冲击终极大奖。</p>
            </router-link>

            <router-link class="card" to="/tic-tac-toe">
                <h2>单词井字棋</h2>
                <p>结合词汇与策略的九宫格对战。</p>
            </router-link>

            <router-link class="card" to="/witch-poison">
                <h2>女巫的毒药</h2>
                <p>在女巫的谜题中选择正确单词，安全逃脱。</p>
            </router-link>

            <router-link class="card" to="/lexicon-defense">
                <h2>词汇塔防</h2>
                <p>错词大军来袭！拼写正确单词才能启动防御炮台。</p>
            </router-link>

            <router-link class="card" to="/Whack-a-Mole">
                <h2>单词打地鼠</h2>
                <p>单词地鼠游戏！快来快乐地打地鼠吧！</p>
            </router-link>

            <router-link class="card" to="/lucky-one">
                <h2>谁是幸运儿</h2>
                <p>寻找幸运卡片，赢取高分！</p>
            </router-link>
        </main>
    </div>
</template>

<style scoped>
.home-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

/* 顶部标题栏拖动区域 */
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
    /* 主内容区域不可拖动 */
}

.grid {
    width: 100%;
    max-width: 1080px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
}

.card {
    background: var(--card);
    border-radius: 18px;
    padding: 24px;
    text-decoration: none;
    color: inherit;
    box-shadow: 0 15px 45px rgba(51, 64, 97, 0.15);
    transition:
        transform 180ms ease,
        box-shadow 180ms ease;
    border: 1px solid rgba(92, 106, 196, 0.12);
    -webkit-app-region: no-drag;
    /* 卡片区域不可拖动，保持可点击 */
    display: block;
}

.card:hover {
    transform: translateY(-6px);
    box-shadow: 0 22px 55px rgba(51, 64, 97, 0.22);
}

.card h2 {
    margin: 0 0 8px;
    font-size: 1.4rem;
}

.card p {
    margin: 0;
    font-size: 0.98rem;
    color: rgba(0, 0, 0, 0.7);
    line-height: 1.5;
}

@media (prefers-color-scheme: dark) {

    .card p,
    p.description,
    footer {
        color: rgba(244, 245, 251, 0.75);
    }

    .card {
        border-color: rgba(255, 255, 255, 0.08);
    }
}
</style>
