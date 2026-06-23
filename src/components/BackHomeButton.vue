<template>
  <router-link
    to="/"
    class="back-home-button"
    :class="variant === 'inline' ? 'is-inline' : 'is-floating'"
    :aria-label="label"
  >
    <i class="fas fa-home"></i>
    <span v-if="variant === 'inline'" class="back-home-button-label">{{
      label
    }}</span>
  </router-link>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'floating' | 'inline'
    label?: string
  }>(),
  { variant: 'floating', label: '首页' },
)
</script>

<style scoped>
.back-home-button {
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;
}

.back-home-button.is-floating {
  position: fixed;
  right: max(20px, var(--safe-right, 0px));
  bottom: max(20px, var(--safe-bottom, 0px));
  z-index: 1000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: var(--bg-base);
  font-size: 1.4rem;
  box-shadow: 0 4px 12px var(--shadow-color);
}

.back-home-button.is-floating:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
}

.back-home-button.is-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background: var(--ctp-surface1);
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 700;
  box-shadow: 0 1px 3px var(--shadow-color);
}

.back-home-button.is-inline:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
}
</style>
