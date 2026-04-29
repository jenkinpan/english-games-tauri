<template>
  <div class="millionaire-container">
    <div class="container">
      <header class="rounded-xl">
        <div class="header-left">
          <router-link to="/" class="btn btn-gray btn-sm back-home-link">
            <i class="fas fa-home"></i> 首页
          </router-link>
          <div class="divider-vertical"></div>
          <h1><i class="fas fa-hat-wizard"></i> 魔法大富翁：巅峰对决</h1>
        </div>

        <div class="header-right">
          <button class="btn btn-mauve btn-sm" @click="showSettings = true">
            <i class="fas fa-book"></i> 题库管理
          </button>
          <button class="btn btn-red btn-sm" @click="resetGame">
            <i class="fas fa-redo"></i> 重置
          </button>
        </div>
      </header>

      <div class="game-container">
        <div class="board-container">
          <div class="board" ref="boardRef">
            <div
              v-for="(cell, index) in boardCells"
              :key="index"
              :ref="
                (el) => {
                  if (el) cellRefs[index] = el
                }
              "
              :class="['cell', cell.status, cell.eventClass]"
              :style="{ gridRow: cell.r, gridColumn: cell.c }"
            >
              <i
                v-if="
                  typeof cell.content === 'string' &&
                  cell.content.startsWith('fas')
                "
                :class="cell.content"
              ></i>
              <span v-else>{{ cell.content }}</span>
            </div>

            <div
              v-for="player in players"
              :key="player.id"
              :class="[
                'player-token',
                'p' + player.id,
                { frozen: player.frozen },
              ]"
              :style="player.style"
            >
              <div class="token-body">
                <i :class="getPlayerIcon(player.id)"></i>
                <span class="token-base"></span>
              </div>
            </div>
          </div>
        </div>

        <div class="control-panel">
          <div class="panel-box">
            <h2 class="panel-title"><i class="fas fa-users"></i> 魔法小队</h2>
            <div
              style="
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-bottom: 10px;
              "
            >
              <button
                class="btn btn-green"
                @click="changePlayerCount(1)"
                title="增加玩家"
                style="width: auto"
              >
                <i class="fas fa-plus"></i>
              </button>
              <button
                class="btn btn-red"
                @click="changePlayerCount(-1)"
                title="减少玩家"
                style="width: auto"
              >
                <i class="fas fa-minus"></i>
              </button>
            </div>
            <div class="player-list">
              <div
                v-for="p in players"
                :key="p.id"
                :class="[
                  'player-row',
                  {
                    active: p.id === currentPlayer,
                    'frozen-row': p.frozen,
                  },
                ]"
              >
                <span
                  style="font-size: 1.2rem; width: 25px; text-align: center"
                >
                  <i
                    v-if="p.id === currentPlayer"
                    class="fas fa-hand-point-right"
                    style="color: var(--ctp-yellow)"
                  ></i>
                </span>
                <div class="player-info">
                  <span :class="['mini-icon', 'p' + p.id]">
                    <i :class="getPlayerIcon(p.id)"></i>
                  </span>
                  <b>玩家 {{ p.id }}</b>
                  <i
                    v-if="p.hasShield"
                    class="fas fa-shield-alt"
                    style="
                      color: var(--ctp-sapphire);
                      margin-left: 8px;
                      font-size: 0.9rem;
                    "
                    title="护盾保护中"
                  ></i>
                </div>
                <span
                  style="
                    margin-left: auto;
                    font-size: 0.9rem;
                    color: var(--ctp-subtext1);
                  "
                >
                  <span v-if="p.frozen" style="color: var(--ctp-blue)">
                    <i class="fas fa-skull"></i> 石化
                  </span>
                  <span v-else>格: {{ p.position }}</span>
                </span>
              </div>
            </div>
          </div>

          <div class="panel-box">
            <h2 class="panel-title">
              <i class="fas fa-dice-d20"></i> 命运骰子
            </h2>

            <div v-if="isCurrentPlayerFrozen" class="frozen-turn-banner">
              <i class="fas fa-skull"></i>
              玩家 {{ currentPlayer }} 石化中，本回合将跳过
            </div>

            <div class="scene" @click="rollDice">
              <div
                class="cube"
                :class="{ rolling: isRolling }"
                :style="diceStyle"
              >
                <div class="cube__face cube__face--1">1</div>
                <div class="cube__face cube__face--2">2</div>
                <div class="cube__face cube__face--3">3</div>
                <div class="cube__face cube__face--4">4</div>
                <div class="cube__face cube__face--5">5</div>
                <div class="cube__face cube__face--6">6</div>
              </div>
            </div>
            <p
              style="
                text-align: center;
                color: var(--ctp-subtext1);
                font-size: 0.9rem;
              "
            >
              {{ diceMsg }}
            </p>
          </div>

          <div class="panel-box log-panel-box">
            <h2 class="panel-title"><i class="fas fa-scroll"></i> 战报</h2>
            <div class="event-log">
              <div
                v-if="gameLog.length === 0"
                style="
                  text-align: center;
                  color: var(--ctp-overlay0);
                  font-size: 0.85rem;
                  margin-top: 8px;
                "
              >
                暂无记录
              </div>
              <div
                v-for="(entry, idx) in gameLog"
                :key="idx"
                class="log-entry"
                :class="{ 'log-entry-latest': idx === 0 }"
              >
                {{ entry }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ──────────── 题库管理 ──────────── -->
    <div class="modal" :class="{ show: showSettings }">
      <div class="modal-content" style="max-width: 900px; height: 600px">
        <h2 style="color: var(--ctp-mauve); margin-bottom: 20px">
          <i class="fas fa-book-reader"></i> 题库管理系统
        </h2>

        <div class="settings-layout">
          <div class="settings-sidebar">
            <div class="sidebar-header">
              <span>我的题库</span>
              <button
                class="btn btn-green"
                style="width: auto; padding: 4px 8px; font-size: 0.8rem"
                @click="createGroup"
              >
                <i class="fas fa-plus"></i>
              </button>
            </div>
            <div class="group-list">
              <div
                v-for="g in questionGroups"
                :key="g.id"
                class="group-item"
                :class="{ active: currentGroupId === g.id }"
                @click="currentGroupId = g.id"
              >
                <span class="group-name-display">{{ g.name }}</span>
                <div
                  v-if="currentGroupId === g.id"
                  style="display: flex; gap: 5px"
                >
                  <i
                    class="fas fa-trash trash-icon"
                    @click.stop="deleteGroup(g.id)"
                    title="删除分组"
                  ></i>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-main" v-if="currentGroup">
            <div class="questions-header">
              <div
                style="flex: 1; display: flex; align-items: center; gap: 15px"
              >
                <input
                  type="text"
                  v-model="currentGroup.name"
                  class="group-name-edit-input"
                  placeholder="分组名称"
                />
                <span
                  style="
                    color: var(--ctp-overlay1);
                    font-size: 0.9rem;
                    font-weight: bold;
                    white-space: nowrap;
                  "
                >
                  {{ currentGroup.questions.length }} 题
                </span>
              </div>
              <button
                class="btn btn-green"
                style="width: auto"
                @click="addQuestion"
              >
                <i class="fas fa-plus"></i> 添加题目
              </button>
            </div>

            <div class="questions-list">
              <div
                v-if="currentGroup.questions.length === 0"
                style="
                  text-align: center;
                  color: var(--ctp-overlay1);
                  margin-top: 50px;
                "
              >
                暂无题目，点击右上角添加
              </div>
              <div
                v-for="(q, idx) in currentGroup.questions"
                :key="q.id"
                class="question-row"
              >
                <span
                  style="
                    font-weight: bold;
                    color: var(--ctp-overlay1);
                    padding-top: 5px;
                  "
                >
                  {{ idx + 1 }}.
                </span>
                <input v-model="q.q" class="inp-q" placeholder="输入题目..." />
                <input v-model="q.a" class="inp-a" placeholder="输入答案..." />
                <button
                  class="btn btn-red"
                  style="width: auto; padding: 5px 10px"
                  @click="removeQuestion(idx)"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
          <div
            class="settings-main"
            v-else
            style="
              justify-content: center;
              align-items: center;
              color: var(--ctp-overlay1);
            "
          >
            请在左侧选择一个分组
          </div>
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: flex-end">
          <button
            class="btn btn-blue"
            style="width: auto"
            @click="showSettings = false"
          >
            <i class="fas fa-check"></i> 完成设置
          </button>
        </div>
      </div>
    </div>

    <!-- ──────────── 通用事件弹窗 ──────────── -->
    <div class="modal" :class="{ show: gameModal.show }">
      <div class="modal-content">
        <div class="modal-header-row">
          <h2
            style="color: var(--ctp-yellow); margin: 0; font-size: 1.8rem"
            v-html="gameModal.title"
          ></h2>

          <div v-if="isTimerActive" class="timer-display-header">
            <i class="fas fa-stopwatch"></i> {{ formattedTime }}s
          </div>
        </div>

        <div
          style="
            font-size: 1.2rem;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            line-height: 1.6;
          "
          v-html="gameModal.body"
        ></div>
        <div
          style="
            margin-top: 25px;
            display: flex;
            gap: 15px;
            justify-content: center;
          "
        >
          <button
            v-for="(btn, index) in gameModal.buttons"
            :key="index"
            :class="['btn', btn.class]"
            style="width: auto; padding: 10px 25px; font-size: 1rem"
            @click="btn.action"
            v-html="btn.text"
          ></button>
        </div>
      </div>
    </div>

    <!-- ──────────── 宝箱选择弹窗 - 三屏设计 ──────────── -->
    <div class="modal chest-scene-modal" :class="{ show: chestModal.show }">
      <div class="chest-scene">
        <!-- star bg -->
        <div class="chest-stars-bg">
          <div
            v-for="n in 40"
            :key="'s' + n"
            class="chest-star-p"
            :style="{
              width: 1.5 + Math.sin(n * 7.3) * 1.2 + 'px',
              height: 1.5 + Math.sin(n * 7.3) * 1.2 + 'px',
              left: 10 + ((n * 17) % 80) + '%',
              top: 5 + ((n * 23) % 90) + '%',
              '--d': 2 + (n % 3) + 's',
              '--dl': (n % 3) * 1.5 + 's',
              background: [
                'var(--ctp-lavender)',
                'var(--ctp-blue)',
                'var(--ctp-teal)',
                'var(--ctp-mauve)',
                'var(--ctp-yellow)',
                'var(--ctp-pink)',
              ][n % 6],
            }"
          ></div>
        </div>
        <div class="chest-ambient"></div>

        <!-- ═══ SCREEN 1: 选择宝箱 ═══ -->
        <div
          class="chest-screen"
          :class="{ 'chest-screen-hidden': chestPhase !== 'pick' }"
        >
          <div class="chest-runes">
            <span class="chest-rune">✦</span><span class="chest-rune">✧</span
            ><span class="chest-rune">✦</span>
          </div>
          <div class="chest-title-main">神秘宝箱</div>
          <p class="chest-title-sub">选择你命运的宝箱，开启魔法奖励</p>

          <div class="chests-row-new">
            <div
              v-for="(_chest, idx) in chestModal.chests"
              :key="idx"
              class="cw-new"
              :class="{
                'cw-selected': selectedChest === idx && chestPhase === 'pick',
                'cw-dimmed':
                  selectedChest >= 0 &&
                  selectedChest !== idx &&
                  chestPhase === 'pick',
              }"
              @click="selectChest(idx)"
            >
              <div
                class="chest-aura-new"
                :style="{
                  background: [
                    'var(--ctp-mauve)',
                    'var(--ctp-yellow)',
                    'var(--ctp-teal)',
                  ][idx],
                }"
              ></div>
              <div class="chest-svg-wrap">
                <!-- Chest SVG: mauve -->
                <svg
                  v-if="idx === 0"
                  width="180"
                  height="194"
                  viewBox="0 0 100 108"
                  fill="none"
                >
                  <ellipse
                    cx="50"
                    cy="104"
                    rx="32"
                    ry="5"
                    fill="var(--ctp-shadow, rgba(0,0,0,.45))"
                  />
                  <g
                    :class="{
                      'chest-lid-open':
                        selectedChest === 0 && chestPhase === 'pick',
                    }"
                    style="
                      transform-origin: 50px 52px;
                      --lid-tx: -28px;
                      --lid-ty: -20px;
                      --lid-rot: -30deg;
                    "
                  >
                    <rect
                      x="12"
                      y="24"
                      width="76"
                      height="30"
                      rx="6"
                      fill="color-mix(in srgb,var(--ctp-mauve) 55%,var(--ctp-base))"
                    />
                    <rect
                      x="12"
                      y="24"
                      width="76"
                      height="30"
                      rx="6"
                      fill="none"
                      stroke="var(--ctp-lavender)"
                      stroke-width="1.2"
                    />
                    <line
                      x1="31"
                      y1="24"
                      x2="31"
                      y2="54"
                      stroke="var(--ctp-mauve)"
                      stroke-width=".8"
                      opacity=".45"
                    />
                    <line
                      x1="50"
                      y1="24"
                      x2="50"
                      y2="54"
                      stroke="var(--ctp-mauve)"
                      stroke-width=".8"
                      opacity=".45"
                    />
                    <line
                      x1="69"
                      y1="24"
                      x2="69"
                      y2="54"
                      stroke="var(--ctp-mauve)"
                      stroke-width=".8"
                      opacity=".45"
                    />
                    <rect
                      x="12"
                      y="36"
                      width="76"
                      height="7"
                      rx="1"
                      fill="var(--ctp-lavender)"
                      opacity=".3"
                    />
                    <ellipse
                      cx="50"
                      cy="23"
                      rx="6"
                      ry="3"
                      fill="var(--ctp-lavender)"
                    />
                  </g>
                  <rect
                    x="12"
                    y="52"
                    width="76"
                    height="48"
                    rx="6"
                    fill="color-mix(in srgb,var(--ctp-mauve) 40%,var(--ctp-surface0))"
                  />
                  <rect
                    x="12"
                    y="52"
                    width="76"
                    height="48"
                    rx="6"
                    fill="none"
                    stroke="var(--ctp-lavender)"
                    stroke-width="1.2"
                  />
                  <line
                    x1="31"
                    y1="52"
                    x2="31"
                    y2="100"
                    stroke="var(--ctp-mauve)"
                    stroke-width=".8"
                    opacity=".35"
                  />
                  <line
                    x1="50"
                    y1="52"
                    x2="50"
                    y2="100"
                    stroke="var(--ctp-mauve)"
                    stroke-width=".8"
                    opacity=".35"
                  />
                  <line
                    x1="69"
                    y1="52"
                    x2="69"
                    y2="100"
                    stroke="var(--ctp-mauve)"
                    stroke-width=".8"
                    opacity=".35"
                  />
                  <rect
                    x="12"
                    y="64"
                    width="76"
                    height="7"
                    rx="1"
                    fill="var(--ctp-lavender)"
                    opacity=".3"
                  />
                  <rect
                    x="39"
                    y="60"
                    width="22"
                    height="14"
                    rx="3"
                    fill="var(--ctp-lavender)"
                  />
                  <path
                    d="M43 60 Q43 54 50 54 Q57 54 57 60"
                    stroke="var(--ctp-surface0)"
                    stroke-width="2"
                    fill="none"
                  />
                  <circle cx="50" cy="67" r="3" fill="var(--ctp-base)" />
                  <circle cx="17" cy="57" r="2.5" fill="var(--ctp-lavender)" />
                  <circle cx="83" cy="57" r="2.5" fill="var(--ctp-lavender)" />
                  <circle cx="17" cy="93" r="2.5" fill="var(--ctp-lavender)" />
                  <circle cx="83" cy="93" r="2.5" fill="var(--ctp-lavender)" />
                </svg>
                <!-- Chest SVG: yellow (bigger) -->
                <svg
                  v-else-if="idx === 1"
                  width="220"
                  height="234"
                  viewBox="0 0 120 128"
                  fill="none"
                >
                  <ellipse
                    cx="60"
                    cy="123"
                    rx="42"
                    ry="6"
                    fill="var(--ctp-shadow, rgba(0,0,0,.45))"
                  />
                  <g
                    :class="{
                      'chest-lid-open':
                        selectedChest === 1 && chestPhase === 'pick',
                    }"
                    style="
                      transform-origin: 60px 62px;
                      --lid-tx: 0px;
                      --lid-ty: -26px;
                      --lid-rot: 0deg;
                    "
                  >
                    <rect
                      x="12"
                      y="24"
                      width="96"
                      height="40"
                      rx="7"
                      fill="color-mix(in srgb,var(--ctp-yellow) 60%,var(--ctp-surface0))"
                    />
                    <rect
                      x="12"
                      y="24"
                      width="96"
                      height="40"
                      rx="7"
                      fill="none"
                      stroke="var(--ctp-yellow)"
                      stroke-width="1.5"
                    />
                    <line
                      x1="38"
                      y1="24"
                      x2="38"
                      y2="64"
                      stroke="var(--ctp-yellow)"
                      stroke-width="1"
                      opacity=".4"
                    />
                    <line
                      x1="60"
                      y1="24"
                      x2="60"
                      y2="64"
                      stroke="var(--ctp-yellow)"
                      stroke-width="1"
                      opacity=".4"
                    />
                    <line
                      x1="82"
                      y1="24"
                      x2="82"
                      y2="64"
                      stroke="var(--ctp-yellow)"
                      stroke-width="1"
                      opacity=".4"
                    />
                    <rect
                      x="12"
                      y="41"
                      width="96"
                      height="9"
                      rx="1"
                      fill="var(--ctp-yellow)"
                      opacity=".35"
                    />
                    <circle
                      cx="24"
                      cy="45"
                      r="2.5"
                      fill="var(--ctp-yellow)"
                      opacity=".9"
                    />
                    <circle
                      cx="96"
                      cy="45"
                      r="2.5"
                      fill="var(--ctp-yellow)"
                      opacity=".9"
                    />
                    <ellipse
                      cx="60"
                      cy="23"
                      rx="8"
                      ry="4"
                      fill="var(--ctp-yellow)"
                    />
                  </g>
                  <rect
                    x="12"
                    y="62"
                    width="96"
                    height="58"
                    rx="7"
                    fill="color-mix(in srgb,var(--ctp-yellow) 40%,var(--ctp-surface0))"
                  />
                  <rect
                    x="12"
                    y="62"
                    width="96"
                    height="58"
                    rx="7"
                    fill="none"
                    stroke="var(--ctp-yellow)"
                    stroke-width="1.5"
                  />
                  <line
                    x1="38"
                    y1="62"
                    x2="38"
                    y2="120"
                    stroke="var(--ctp-yellow)"
                    stroke-width="1"
                    opacity=".3"
                  />
                  <line
                    x1="60"
                    y1="62"
                    x2="60"
                    y2="120"
                    stroke="var(--ctp-yellow)"
                    stroke-width="1"
                    opacity=".3"
                  />
                  <line
                    x1="82"
                    y1="62"
                    x2="82"
                    y2="120"
                    stroke="var(--ctp-yellow)"
                    stroke-width="1"
                    opacity=".3"
                  />
                  <rect
                    x="12"
                    y="78"
                    width="96"
                    height="9"
                    rx="1"
                    fill="var(--ctp-yellow)"
                    opacity=".3"
                  />
                  <rect
                    x="46"
                    y="72"
                    width="28"
                    height="18"
                    rx="4"
                    fill="var(--ctp-yellow)"
                  />
                  <path
                    d="M51 72 Q51 63 60 63 Q69 63 69 72"
                    stroke="var(--ctp-surface0)"
                    stroke-width="2.5"
                    fill="none"
                  />
                  <circle cx="60" cy="81" r="3.5" fill="var(--ctp-base)" />
                  <circle cx="19" cy="68" r="3.5" fill="var(--ctp-yellow)" />
                  <circle cx="101" cy="68" r="3.5" fill="var(--ctp-yellow)" />
                  <circle cx="19" cy="112" r="3.5" fill="var(--ctp-yellow)" />
                  <circle cx="101" cy="112" r="3.5" fill="var(--ctp-yellow)" />
                </svg>
                <!-- Chest SVG: teal -->
                <svg
                  v-else
                  width="180"
                  height="194"
                  viewBox="0 0 100 108"
                  fill="none"
                >
                  <ellipse
                    cx="50"
                    cy="104"
                    rx="32"
                    ry="5"
                    fill="var(--ctp-shadow, rgba(0,0,0,.45))"
                  />
                  <g
                    :class="{
                      'chest-lid-open':
                        selectedChest === 2 && chestPhase === 'pick',
                    }"
                    style="
                      transform-origin: 50px 52px;
                      --lid-tx: 28px;
                      --lid-ty: -20px;
                      --lid-rot: 30deg;
                    "
                  >
                    <rect
                      x="12"
                      y="24"
                      width="76"
                      height="30"
                      rx="6"
                      fill="color-mix(in srgb,var(--ctp-teal) 55%,var(--ctp-surface0))"
                    />
                    <rect
                      x="12"
                      y="24"
                      width="76"
                      height="30"
                      rx="6"
                      fill="none"
                      stroke="var(--ctp-teal)"
                      stroke-width="1.2"
                    />
                    <line
                      x1="31"
                      y1="24"
                      x2="31"
                      y2="54"
                      stroke="var(--ctp-sapphire)"
                      stroke-width=".8"
                      opacity=".4"
                    />
                    <line
                      x1="50"
                      y1="24"
                      x2="50"
                      y2="54"
                      stroke="var(--ctp-sapphire)"
                      stroke-width=".8"
                      opacity=".4"
                    />
                    <line
                      x1="69"
                      y1="24"
                      x2="69"
                      y2="54"
                      stroke="var(--ctp-sapphire)"
                      stroke-width=".8"
                      opacity=".4"
                    />
                    <rect
                      x="12"
                      y="36"
                      width="76"
                      height="7"
                      rx="1"
                      fill="var(--ctp-teal)"
                      opacity=".3"
                    />
                    <ellipse
                      cx="50"
                      cy="23"
                      rx="6"
                      ry="3"
                      fill="var(--ctp-teal)"
                    />
                  </g>
                  <rect
                    x="12"
                    y="52"
                    width="76"
                    height="48"
                    rx="6"
                    fill="color-mix(in srgb,var(--ctp-teal) 40%,var(--ctp-surface0))"
                  />
                  <rect
                    x="12"
                    y="52"
                    width="76"
                    height="48"
                    rx="6"
                    fill="none"
                    stroke="var(--ctp-teal)"
                    stroke-width="1.2"
                  />
                  <line
                    x1="31"
                    y1="52"
                    x2="31"
                    y2="100"
                    stroke="var(--ctp-sapphire)"
                    stroke-width=".8"
                    opacity=".3"
                  />
                  <line
                    x1="50"
                    y1="52"
                    x2="50"
                    y2="100"
                    stroke="var(--ctp-sapphire)"
                    stroke-width=".8"
                    opacity=".3"
                  />
                  <line
                    x1="69"
                    y1="52"
                    x2="69"
                    y2="100"
                    stroke="var(--ctp-sapphire)"
                    stroke-width=".8"
                    opacity=".3"
                  />
                  <rect
                    x="12"
                    y="64"
                    width="76"
                    height="7"
                    rx="1"
                    fill="var(--ctp-teal)"
                    opacity=".3"
                  />
                  <rect
                    x="39"
                    y="60"
                    width="22"
                    height="14"
                    rx="3"
                    fill="var(--ctp-teal)"
                  />
                  <path
                    d="M43 60 Q43 54 50 54 Q57 54 57 60"
                    stroke="var(--ctp-surface0)"
                    stroke-width="2"
                    fill="none"
                  />
                  <circle cx="50" cy="67" r="3" fill="var(--ctp-base)" />
                  <circle cx="17" cy="57" r="2.5" fill="var(--ctp-teal)" />
                  <circle cx="83" cy="57" r="2.5" fill="var(--ctp-teal)" />
                  <circle cx="17" cy="93" r="2.5" fill="var(--ctp-teal)" />
                  <circle cx="83" cy="93" r="2.5" fill="var(--ctp-teal)" />
                </svg>
              </div>
              <div
                class="clabel-new"
                :style="{
                  color: [
                    'var(--ctp-mauve)',
                    'var(--ctp-yellow)',
                    'var(--ctp-teal)',
                  ][idx],
                }"
              >
                {{ ['魔法宝箱', '黄金宝箱', '秘法宝箱'][idx] }}
              </div>
            </div>
          </div>

          <div class="chest-divider"><span>✦ 每回合仅可选择一次 ✦</span></div>
        </div>

        <!-- ═══ SCREEN 2: 开启中 ═══ -->
        <div
          class="chest-screen"
          :class="{ 'chest-screen-hidden': chestPhase !== 'opening' }"
          @click="skipChestOpening"
        >
          <div class="chest-open-stage">
            <div class="chest-open-wrap">
              <!-- Expanding rings -->
              <div
                class="chest-open-ring"
                :style="{
                  borderColor:
                    [
                      'var(--ctp-mauve)',
                      'var(--ctp-yellow)',
                      'var(--ctp-teal)',
                    ][selectedChest] || 'var(--ctp-mauve)',
                }"
              ></div>
              <div
                class="chest-open-ring chest-open-ring-2"
                :style="{
                  borderColor:
                    [
                      'var(--ctp-mauve)',
                      'var(--ctp-yellow)',
                      'var(--ctp-teal)',
                    ][selectedChest] || 'var(--ctp-mauve)',
                }"
              ></div>

              <!-- White flash burst -->
              <div class="chest-open-flash"></div>

              <!-- Sparkle particles -->
              <span
                v-for="n in 24"
                :key="'sp' + n"
                class="chest-burst-spark"
                :style="{
                  '--ang': n * 15 + 'deg',
                  '--dist': 58 + (n % 6) * 22 + 'px',
                  '--dl': (n % 5) * 0.07 + 's',
                  '--sz': 5 + (n % 4) + 'px',
                  background: [
                    'var(--ctp-mauve)',
                    'var(--ctp-yellow)',
                    'var(--ctp-teal)',
                    'var(--ctp-green)',
                    'var(--ctp-lavender)',
                    'var(--ctp-pink)',
                  ][n % 6],
                }"
              ></span>

              <div
                class="chest-open-svg"
                v-html="getBigChestSvg(selectedChest)"
              ></div>
            </div>
            <div class="chest-open-label">✦ 正在开启... ✦</div>
            <div class="chest-open-dots">
              <span class="chest-dot" style="animation-delay: 0s"></span>
              <span class="chest-dot" style="animation-delay: 0.4s"></span>
              <span class="chest-dot" style="animation-delay: 0.8s"></span>
            </div>
            <div class="chest-skip-hint">点击任意处跳过</div>
          </div>
        </div>

        <!-- ═══ SCREEN 3: 奖励展示 ═══ -->
        <div
          class="chest-screen"
          :class="{ 'chest-screen-hidden': chestPhase !== 'reward' }"
        >
          <div
            v-if="chestReward"
            class="chest-reward-card"
            :style="{
              '--rc-glow':
                'color-mix(in srgb,' + chestReward.color + ' 22%,transparent)',
            }"
          >
            <div class="chest-rc-badge">{{ chestReward.icon }}</div>
            <div
              class="chest-rc-type"
              :style="{
                background: chestReward.badgeBg,
                color: chestReward.badgeColor,
              }"
            >
              {{ chestReward.badgeText }}
            </div>
            <div class="chest-rc-name">{{ chestReward.name }}</div>
            <div class="chest-rc-desc">{{ chestReward.desc }}</div>
            <div class="chest-rc-effect">
              <div class="chest-rc-val" :style="{ color: chestReward.color }">
                {{ chestReward.effectVal }}
              </div>
              <div class="chest-rc-unit">{{ chestReward.effectUnit }}</div>
            </div>
            <button
              class="chest-btn-continue"
              :style="{
                color: chestReward.color,
                borderColor: chestReward.color,
              }"
              @click="handleRewardContinue"
            >
              继续前进 ↻
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ──────────── 删除确认弹窗 ──────────── -->
    <div class="modal" :class="{ show: showDeleteGroupConfirm }">
      <div class="modal-content" style="max-width: 400px; text-align: center">
        <h2 style="color: var(--ctp-red)">
          <i class="fas fa-exclamation-triangle"></i> 确认删除?
        </h2>
        <p>此操作将永久删除该分组及其所有题目，无法恢复。</p>
        <div
          style="
            display: flex;
            gap: 20px;
            justify-content: center;
            margin-top: 20px;
          "
        >
          <button class="btn btn-gray" @click="showDeleteGroupConfirm = false">
            取消
          </button>
          <button class="btn btn-red" @click="confirmDeleteGroup">
            确认删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameLogic } from './script'

const {
  boardCells,
  cellRefs,
  players,
  currentPlayer,
  diceMsg,
  isRolling,
  diceStyle,
  showSettings,
  gameModal,
  showDeleteGroupConfirm,

  // 宝箱相关
  chestModal,
  chestPhase,
  chestReward,
  selectedChest,
  selectChest,
  handleRewardContinue,
  skipChestOpening,

  // 题库相关
  questionGroups,
  currentGroupId,
  currentGroup,

  resetGame,
  changePlayerCount,
  rollDice,
  getPlayerIcon,

  createGroup,
  deleteGroup,
  confirmDeleteGroup,
  addQuestion,
  removeQuestion,
  isTimerActive,
  formattedTime,
  isCurrentPlayerFrozen,
  gameLog,
} = useGameLogic()

// 生成开启阶段的大宝箱 SVG
function getBigChestSvg(idx: number): string {
  const themes = [
    {
      color: 'var(--ctp-mauve)',
      accent: 'var(--ctp-lavender)',
      tx: '-26px,-22px',
      rot: '-28deg',
    },
    {
      color: 'var(--ctp-yellow)',
      accent: 'var(--ctp-yellow)',
      tx: '0px,-28px',
      rot: '0deg',
    },
    {
      color: 'var(--ctp-teal)',
      accent: 'var(--ctp-sapphire)',
      tx: '26px,-22px',
      rot: '28deg',
    },
  ]
  const ch = themes[idx] || themes[0]
  const sz = idx === 1 ? 260 : 220
  const vw = sz
  const vh = sz + 10
  const col = `color-mix(in srgb,${ch.color} 50%,var(--ctp-surface0))`
  const colL = `color-mix(in srgb,${ch.color} 65%,var(--ctp-base))`
  const bx = 16
  const bw = vw - 32
  const bodyY = vh * 0.48
  const bodyH = vh * 0.44
  const lidH = vh * 0.3
  const lidY = vh * 0.18
  return `<svg width="${sz}" height="${sz + 10}" viewBox="0 0 ${vw} ${vh}" fill="none">
  <ellipse cx="${vw / 2}" cy="${vh - 4}" rx="${bw / 2 + 2}" ry="5" fill="var(--ctp-shadow, rgba(0,0,0,.45))"/>
  <g style="transform:translate(${ch.tx}) rotate(${ch.rot});transform-origin:${vw / 2}px ${bodyY}px;">
    <rect x="${bx}" y="${lidY}" width="${bw}" height="${lidH}" rx="6" fill="${colL}"/>
    <rect x="${bx}" y="${lidY}" width="${bw}" height="${lidH}" rx="6" fill="none" stroke="${ch.color}" stroke-width="1.3"/>
    <rect x="${bx}" y="${lidY + lidH * 0.45}" width="${bw}" height="${lidH * 0.2}" rx="1" fill="${ch.accent}" opacity=".3"/>
    <ellipse cx="${vw / 2}" cy="${lidY - 1}" rx="7" ry="3.5" fill="${ch.accent}"/>
  </g>
  <rect x="${bx}" y="${bodyY}" width="${bw}" height="${bodyH}" rx="6" fill="${col}"/>
  <rect x="${bx}" y="${bodyY}" width="${bw}" height="${bodyH}" rx="6" fill="none" stroke="${ch.color}" stroke-width="1.3"/>
  <rect x="${bx}" y="${bodyY + bodyH * 0.25}" width="${bw}" height="${bodyH * 0.15}" rx="1" fill="${ch.accent}" opacity=".3"/>
  <rect x="${vw / 2 - 12}" y="${bodyY + bodyH * 0.1}" width="24" height="15" rx="3" fill="${ch.accent}"/>
  <path d="M${vw / 2 - 8} ${bodyY + bodyH * 0.1} Q${vw / 2 - 8} ${bodyY + bodyH * 0.04} ${vw / 2} ${bodyY + bodyH * 0.04} Q${vw / 2 + 8} ${bodyY + bodyH * 0.04} ${vw / 2 + 8} ${bodyY + bodyH * 0.1}" stroke="var(--ctp-surface0)" stroke-width="2" fill="none"/>
  <circle cx="${vw / 2}" cy="${bodyY + bodyH * 0.22}" r="3.5" fill="var(--ctp-base)"/>
  <circle cx="${bx + 5}" cy="${bodyY + 6}" r="3" fill="${ch.accent}"/>
  <circle cx="${bx + bw - 5}" cy="${bodyY + 6}" r="3" fill="${ch.accent}"/>
  <circle cx="${bx + 5}" cy="${bodyY + bodyH - 6}" r="3" fill="${ch.accent}"/>
  <circle cx="${bx + bw - 5}" cy="${bodyY + bodyH - 6}" r="3" fill="${ch.accent}"/>
</svg>`
}
</script>

<style scoped src="./style.css"></style>

<style>
.millionaire-container .q-text {
  font-size: 3rem;
  color: var(--ctp-text);
  font-weight: bold;
  margin-bottom: 25px;
  line-height: 1.1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.millionaire-container .a-text {
  font-size: 4.5rem;
  color: var(--ctp-yellow);
  font-weight: bold;
}
</style>
