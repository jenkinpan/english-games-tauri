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
          autocapitalize="off"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        /><i
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
import { ref, computed } from 'vue'
import GameCard from '../components/GameCard.vue'
// @ts-ignore
import PinyinMatch from 'pinyin-match'

const games = [
  {
    path: '/bomb',
    title: '单词炸弹',
    desc: '生死时速！在倒计时结束前拼写单词，拆除即将引爆的炸弹！',
    tags: ['Desktop', 'Tablet', 'Mobile'],
  },
  {
    path: '/flashcard',
    title: '记忆卡片',
    desc: '记忆大师！通过翻转卡片强化记忆，轻松掌握海量词汇。',
    tags: ['Mobile', 'Tablet', 'Desktop'],
  },
  {
    path: '/millionaire',
    title: '魔法大富翁',
    desc: '知识就是财富！挑战英语问答，赢取百万虚拟金币，成为单词大富翁！',
    tags: ['Desktop', 'Tablet'],
  },
  {
    path: '/tic-tac-toe',
    title: '单词井字棋',
    desc: '智勇双全！在经典井字棋中融入词汇对决，策略与知识的双重考验。',
    tags: ['Mobile', 'Tablet', 'Desktop'],
  },
  {
    path: '/witch-poison',
    title: '女巫的毒药',
    desc: '绝境求生！识破女巫的毒药谜题，选对单词才能逃出生天。',
    tags: ['Desktop', 'Tablet'],
  },
  {
    path: '/lexicon-defense',
    title: '词汇塔防',
    desc: '守卫雅典娜！拼写单词激活防御塔，抵御汹涌而来的错词军团！',
    tags: ['Desktop'],
  },
  {
    path: '/Whack-a-Mole',
    title: '单词打地鼠',
    desc: '眼疾手快！敲击携带正确单词的地鼠，练就火眼金睛与神级手速。',
    tags: ['Desktop', 'Tablet'],
  },
  {
    path: '/lucky-one',
    title: '谁是幸运儿',
    desc: '幸运女神眷顾！在众多卡片中寻找隐藏的幸运符，运气与实力的碰撞。',
    tags: ['Mobile', 'Tablet', 'Desktop'],
  },
  {
    path: '/mystery-reveal',
    title: '看图猜单词',
    desc: '真相只有一个！通过残缺线索猜出单词，揭开图片背后的神秘面纱。',
    tags: ['Desktop', 'Tablet'],
  },
  {
    path: '/random-name',
    title: '随机点名',
    desc: '心跳加速！课堂点名不再枯燥，谁会是下一个被选中的幸运儿？',
    tags: ['Mobile', 'Tablet', 'Desktop'],
  },
  {
    path: '/word-pk',
    title: '单词消消乐',
    desc: '巅峰对决！多人在线词汇PK，争夺单词王者的至高荣耀。',
    tags: ['Mobile', 'Tablet'],
  },
  {
    path: '/word-match',
    title: '单词匹配',
    desc: '慧眼识珠！将单词精准分类归位，考验你的逻辑思维与词汇储备。',
    tags: ['Tablet', 'Desktop'],
  },
]

const searchQuery = ref('')

// use pinyin-match filter serach
const filteredGames = computed(() => {
  const query = searchQuery.value.trim()
  if (!query) {
    return games
  }

  return games.filter((game) => {
    return PinyinMatch.match(game.title, query)
  })
})
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
  z-index: 10;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.search-wrapper:focus-within .search-icon,
.search-wrapper:focus-within .clear-icon {
  transform: translateY(calc(-50% - 2px));
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
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  padding-bottom: 60px;
}

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
