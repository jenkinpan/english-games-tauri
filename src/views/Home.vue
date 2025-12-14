<template>
  <div class="relative flex w-full flex-col items-center">
    <div
      class="fixed top-0 right-0 left-0 z-99999 h-10 bg-transparent"
      data-tauri-drag-region
    ></div>

    <!-- Update Button -->
    <button
      @click="checkUpdate"
      class="absolute top-5 right-5 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/80 text-gray-600 shadow-md backdrop-blur-sm transition-transform hover:scale-110 active:scale-95 dark:bg-black/50 dark:text-gray-300"
      title="检查更新"
    >
      <i class="fas fa-sync-alt"></i>
    </button>

    <header
      class="mb-10 flex w-full max-w-[640px] flex-col items-center text-center [-webkit-app-region:no-drag]"
    >
      <h1
        class="m-6 mb-4 text-[clamp(2rem,5vw,3rem)] font-bold tracking-[0.02em]"
      >
        英语互动游戏中心
      </h1>
      <p
        class="m-0 mb-[30px] max-w-[600px] text-[1.05rem] leading-[1.6] text-black/70 dark:text-[#f4f5fb]/75"
      >
        选择一个你喜欢的小游戏，进入对应页面开始闯关，用游戏的方式轻松巩固词汇与语法。
      </p>

      <div class="group relative w-full max-w-[480px]">
        <i
          class="fas fa-search pointer-events-none absolute top-1/2 left-5 z-10 -translate-y-1/2 text-[1.1rem] text-(--text-secondary) opacity-60 transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] group-focus-within:-translate-y-[calc(50%+2px)]"
        ></i>

        <input
          type="text"
          v-model="searchQuery"
          placeholder="输入中文或拼音搜索 (如: zd, danci)"
          class="w-full rounded-[50px] border-2 border-transparent bg-(--bg-card) py-4 pr-[45px] pl-[50px] text-[1.05rem] text-(--text-primary) shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] outline-none placeholder:text-(--text-secondary) placeholder:opacity-60 focus:-translate-y-0.5 focus:border-(--accent-primary) focus:bg-(--bg-base) focus:shadow-[0_8px_30px_rgba(137,180,250,0.2)]"
          autocapitalize="off"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        />

        <i
          v-if="searchQuery"
          class="fas fa-times absolute top-1/2 right-5 -translate-y-1/2 cursor-pointer p-[5px] text-base text-(--text-secondary) transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] group-focus-within:-translate-y-[calc(50%+2px)] hover:text-(--accent-primary)"
          @click="searchQuery = ''"
        >
        </i>
      </div>
    </header>

    <main
      class="w-full max-w-[1200px] flex-1 px-6 [-webkit-app-region:no-drag] md:px-10"
    >
      <div
        class="grid grid-cols-1 gap-6 pb-[60px] md:grid-cols-2 md:gap-8 lg:grid-cols-3"
      >
        <GameCard
          v-for="game in filteredGames"
          :key="game.path"
          :path="game.path"
          :title="game.title"
          :desc="game.desc"
          :tags="game.tags"
        />
      </div>

      <div
        v-if="filteredGames.length === 0"
        class="flex animate-[fadeIn_0.5s_ease-out] flex-col items-center justify-center py-20 text-(--text-secondary) opacity-70"
      >
        <i class="fas fa-ghost mb-5 text-[4rem] text-(--text-secondary)"></i>
        <p class="text-[1.3rem]">哎呀，找不到匹配的游戏...</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import GameCard from '../components/GameCard.vue'
// @ts-ignore
import PinyinMatch from 'pinyin-match'
import { ask, message } from '@tauri-apps/plugin-dialog'
import { open } from '@tauri-apps/plugin-shell'
import { platform } from '@tauri-apps/plugin-os'
import pkg from '../../package.json'

// Setup update check
const currentVersion = pkg.version

async function checkUpdate() {
  try {
    const response = await fetch(
      'https://api.github.com/repos/jenkinpan/english-games-tauri/releases/latest',
    )
    if (!response.ok) {
      throw new Error('无法获取版本信息')
    }
    const data = await response.json()
    const latestVersion = data.tag_name.replace(/^v/, '')

    if (latestVersion !== currentVersion) {
      const yes = await ask(
        `发现新版本 ${latestVersion}，当前版本 ${currentVersion}。\n是否前往下载？`,
        {
          title: '发现更新',
          kind: 'info',
          okLabel: '去下载',
          cancelLabel: '暂不',
        },
      )
      if (yes) {
        // Platform specific logic
        const currentPlatform = platform()
        let downloadUrl = data.html_url

        if (currentPlatform === 'android') {
          // Find apk asset
          const apkAsset = data.assets.find((asset: any) =>
            asset.name.endsWith('.apk'),
          )
          if (apkAsset) {
            downloadUrl = apkAsset.browser_download_url
          }
        }

        await open(downloadUrl)
      }
    } else {
      await message('当前已是最新版本', {
        title: '检查更新',
        kind: 'info',
        okLabel: '确定',
      })
    }
  } catch (e) {
    console.error(e)
    await message(`检查更新失败: ${e}`, {
      title: '错误',
      kind: 'error',
      okLabel: '确定',
    })
  }
}

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
</style>
