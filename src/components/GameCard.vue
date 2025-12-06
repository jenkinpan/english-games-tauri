<template>
  <router-link :to="path" class="card">
    <div class="card-content">
      <h2>{{ title }}</h2>
      <p>{{ desc }}</p>
    </div>
    <div class="tags" v-if="sortedTags && sortedTags.length">
      <span
        v-for="tag in sortedTags"
        :key="tag"
        class="tag"
        :class="tag.toLowerCase()"
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
</script>

<style scoped>
.card {
  background: var(--bg-card);
  border-radius: 18px;
  padding: 24px;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 10px 30px var(--shadow-color);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  border: 1px solid var(--border-color);
  -webkit-app-region: no-drag;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 15px 40px var(--shadow-color);
  border-color: var(--accent-primary);
}

.card-content {
  flex: 1;
}

.card h2 {
  margin: 0 0 8px;
  font-size: 1.4rem;
  color: var(--accent-primary);
  /* Blue */
  font-weight: 700;
}

.card p {
  margin: 0;
  font-size: 0.98rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.tags {
  display: flex;
  gap: 6px;
  margin-top: auto;
  padding-top: 16px;
  flex-wrap: nowrap;
  overflow: hidden;
  /* Hide overflow if it happens, but sizing should prevent it */
}

.tag {
  font-size: 0.65rem;
  padding: 3px 8px;
  border-radius: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--ctp-surface0);
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 1;
  /* Allow shrinking if absolutely necessary, but preferred size should fit */
  min-width: 0;
  /* Allow flex item to shrink below content size if needed */
  text-overflow: ellipsis;
  overflow: hidden;
  text-align: center;
}

.tag.mobile {
  background: rgba(166, 227, 161, 0.15);
  /* Green opacity */
  color: var(--ctp-green);
}

.tag.tablet {
  background: rgba(250, 179, 135, 0.15);
  /* Peach opacity */
  color: var(--ctp-peach);
}

.tag.desktop {
  background: rgba(137, 180, 250, 0.15);
  /* Blue opacity */
  color: var(--ctp-blue);
}
</style>
