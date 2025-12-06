<template>
  <router-link
    :to="path"
    class="relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-[18px] border border-(--border-color) bg-(--bg-card) p-6 text-inherit no-underline shadow-[0_10px_30px_var(--shadow-color)] transition-all duration-200 ease-out select-none [-webkit-app-region:no-drag] hover:-translate-y-1.5 hover:border-(--accent-primary) hover:shadow-[0_15px_40px_var(--shadow-color)]"
  >
    <div class="flex-1">
      <h2 class="m-0 mb-2 text-[1.4rem] font-bold text-(--accent-primary)">
        {{ title }}
      </h2>
      <p class="m-0 text-[0.98rem] leading-normal text-(--text-secondary)">
        {{ desc }}
      </p>
    </div>
    <div
      class="mt-auto flex flex-nowrap gap-1.5 overflow-hidden pt-4"
      v-if="sortedTags && sortedTags.length"
    >
      <span
        v-for="tag in sortedTags"
        :key="tag"
        class="min-w-0 shrink overflow-hidden rounded-[10px] px-2 py-[3px] text-center text-[0.65rem] font-bold tracking-[0.05em] text-ellipsis whitespace-nowrap uppercase"
        :class="getTagClasses(tag)"
      >
        {{ tag }}
      </span>
    </div>
  </router-link>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  desc: string
  path: string
  tags?: string[]
}>()

const sortedTags = computed(() => {
  if (!props.tags) return []
  return [...props.tags].sort()
})

const getTagClasses = (tag: string) => {
  const lowerTag = tag.toLowerCase()
  switch (lowerTag) {
    case 'mobile':
      return 'bg-[rgba(166,227,161,0.15)] text-(--ctp-green)'
    case 'tablet':
      return 'bg-[rgba(250,179,135,0.15)] text-(--ctp-peach)'
    case 'desktop':
      return 'bg-[rgba(137,180,250,0.15)] text-(--ctp-blue)'
    default:
      return 'bg-(--ctp-surface0) text-(--text-secondary)'
  }
}
</script>
