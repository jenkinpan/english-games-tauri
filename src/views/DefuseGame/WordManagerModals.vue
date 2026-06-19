<template>
  <div>
    <div
      v-if="showWordManagerModal"
      class="animate-fadeIn fixed inset-0 z-1000 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        class="animate-popIn bg-ctp-base flex h-[85vh] w-11/12 max-w-5xl flex-col overflow-hidden rounded-2xl shadow-2xl"
      >
        <div
          class="border-ctp-surface1 flex items-center justify-between border-b px-6 py-4"
        >
          <h2 class="text-ctp-text m-0 text-xl font-bold">
            <i class="fas fa-book mr-2"></i>单词库管理
          </h2>
          <button
            class="text-ctp-subtext1 hover:text-ctp-red transition-colors"
            @click="emit('close-word-manager')"
          >
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <div
            class="border-ctp-surface1 bg-ctp-surface1 rounded-t-xl border-b px-5 pt-4 pb-0"
          >
            <div class="scrollbar-none flex gap-1.5 overflow-x-auto pb-0">
              <div
                v-for="group in groups"
                :key="group.id"
                class="relative top-px mr-1 cursor-pointer rounded-t-xl border border-b-0 border-transparent px-5 py-2.5 text-sm whitespace-nowrap transition-all"
                :class="
                  currentGroupId === group.id
                    ? 'bg-ctp-base text-ctp-blue border-ctp-surface1 border-b-ctp-base z-10 font-semibold'
                    : 'text-ctp-subtext1 hover:text-ctp-text bg-transparent hover:bg-white/50'
                "
                @click="emit('select-group', group.id)"
              >
                <span>{{ group.name }}</span>
              </div>
              <div
                class="text-ctp-subtext1 hover:text-ctp-blue mb-1 ml-1 flex h-8 w-8 cursor-pointer items-center justify-center self-center rounded-full bg-white/50 text-xl transition-all hover:bg-white hover:shadow-md"
                @click="emit('open-save-group-modal', null)"
              >
                +
              </div>
            </div>
          </div>

          <div
            class="bg-ctp-base border-ctp-surface1 rounded-b-xl border border-t-0 p-5 shadow-sm"
          >
            <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap gap-2">
                <button
                  v-if="currentGroupId"
                  class="from-ctp-sky to-ctp-blue text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110"
                  @click="emit('open-save-group-modal', currentGroupId)"
                >
                  ✎ 重命名分组
                </button>
                <button
                  v-if="currentGroupId"
                  class="from-ctp-maroon to-ctp-red text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110"
                  @click="emit('request-delete-group', currentGroupId)"
                >
                  🗑 删除本组
                </button>
              </div>
              <button
                class="from-ctp-mauve to-ctp-pink text-ctp-base inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-bold shadow-sm transition-all hover:brightness-110"
                @click="emit('request-clear-words')"
              >
                × 清空
              </button>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div
                v-for="(_word, index) in words"
                :key="index"
                class="flex flex-col"
              >
                <label class="text-ctp-blue mb-1.5 font-bold">
                  电线 {{ index + 1 }}:
                </label>
                <input
                  type="text"
                  v-model="words[index]"
                  :placeholder="`输入单词 ${index + 1}`"
                  @input="emit('handle-word-input', index)"
                  autocapitalize="off"
                  autocorrect="off"
                  spellcheck="false"
                  class="border-ctp-surface1 dark:bg-ctp-surface0 text-ctp-text placeholder-ctp-overlay1 focus:border-ctp-blue focus:ring-ctp-blue/20 w-full rounded-lg border-2 bg-white p-3 text-base transition-colors focus:ring-2 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          class="border-ctp-surface1 bg-ctp-surface0 flex justify-end border-t px-6 py-4"
        >
          <button
            class="from-ctp-green to-ctp-teal text-ctp-base rounded-lg bg-linear-to-r px-8 py-2.5 font-bold shadow-md transition-all hover:brightness-110"
            @click="emit('close-word-manager')"
          >
            完成
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showClearModal"
      class="animate-fadeIn fixed inset-0 z-2000 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        class="animate-popIn bg-ctp-mantle w-11/12 max-w-md rounded-2xl p-8 text-center shadow-2xl"
      >
        <h3 class="text-ctp-text mt-0 text-2xl font-bold">确认清空？</h3>
        <p class="text-ctp-subtext1 mb-6 text-base">
          此操作将清空所有已输入的单词，无法撤销。
        </p>
        <div class="flex justify-center gap-4">
          <button
            class="bg-ctp-surface1 text-ctp-text rounded-lg px-6 py-2.5 font-bold transition-all hover:brightness-110"
            @click="emit('cancel-clear-words')"
          >
            取消
          </button>
          <button
            class="from-ctp-red to-ctp-maroon text-ctp-base rounded-lg bg-linear-to-r px-6 py-2.5 font-bold shadow-md transition-all hover:brightness-110"
            @click="emit('confirm-clear-words')"
          >
            确定清空
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showDeleteConfirmModal"
      class="animate-fadeIn fixed inset-0 z-2000 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        class="animate-popIn bg-ctp-mantle w-11/12 max-w-md rounded-2xl p-8 text-center shadow-2xl"
      >
        <h3 class="text-ctp-text mt-0 text-2xl font-bold">确认删除分组？</h3>
        <p class="text-ctp-subtext1 mb-6 text-base">
          此操作将永久删除该分组，无法撤销。
        </p>
        <div class="flex justify-center gap-4">
          <button
            class="bg-ctp-surface1 text-ctp-text rounded-lg px-6 py-2.5 font-bold transition-all hover:brightness-110"
            @click="emit('cancel-delete-group')"
          >
            取消
          </button>
          <button
            class="from-ctp-red to-ctp-maroon text-ctp-base rounded-lg bg-linear-to-r px-6 py-2.5 font-bold shadow-md transition-all hover:brightness-110"
            @click="emit('confirm-delete-group')"
          >
            确定删除
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showGroupModal"
      class="animate-fadeIn fixed inset-0 z-2000 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        class="animate-popIn bg-ctp-mantle w-11/12 max-w-md rounded-2xl p-8 text-center shadow-2xl"
      >
        <h3 class="text-ctp-text mt-0 text-2xl font-bold">
          {{ isRenaming ? '重命名分组' : '新建分组' }}
        </h3>
        <p class="text-ctp-subtext1 mb-4 text-base">请输入分组名称：</p>
        <input
          type="text"
          :value="groupNameInput"
          @input="
            emit(
              'update:groupNameInput',
              ($event.target as HTMLInputElement).value,
            )
          "
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          placeholder="输入分组名称"
          class="border-ctp-surface1 dark:bg-ctp-surface0 text-ctp-text focus:border-ctp-blue focus:ring-ctp-blue/20 mb-4 w-full rounded-lg border-2 bg-white p-3 text-base transition-colors focus:ring-2 focus:outline-none"
          @keyup.enter="emit('save-group')"
        />
        <div class="flex justify-center gap-4">
          <button
            class="bg-ctp-surface1 text-ctp-text rounded-lg px-6 py-2.5 font-bold transition-all hover:brightness-110"
            @click="emit('close-group-modal')"
          >
            取消
          </button>
          <button
            class="from-ctp-green to-ctp-teal text-ctp-base rounded-lg bg-linear-to-r px-6 py-2.5 font-bold shadow-md transition-all hover:brightness-110"
            @click="emit('save-group')"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WordGroup } from './script'

defineProps<{
  showWordManagerModal: boolean
  showClearModal: boolean
  showDeleteConfirmModal: boolean
  showGroupModal: boolean
  isRenaming: boolean
  groups: WordGroup[]
  currentGroupId: string | null
  words: string[]
  groupNameInput: string
}>()

const emit = defineEmits<{
  'close-word-manager': []
  'select-group': [id: string]
  'open-save-group-modal': [id: string | null]
  'request-delete-group': [id: string]
  'request-clear-words': []
  'handle-word-input': [index: number]
  'confirm-clear-words': []
  'cancel-clear-words': []
  'confirm-delete-group': []
  'cancel-delete-group': []
  'save-group': []
  'close-group-modal': []
  'update:groupNameInput': [value: string]
}>()
</script>
