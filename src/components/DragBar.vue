<template>
  <div
    v-if="isOverlayTitleBar"
    class="fixed top-0 right-0 left-0 z-99999 h-10 bg-transparent"
    data-tauri-drag-region
  ></div>
  <div
    v-else-if="isMobileOS"
    aria-hidden="true"
    class="w-full shrink-0"
    style="height: env(safe-area-inset-top, 0px)"
  ></div>
</template>

<script setup lang="ts">
import { useDevice } from '@/composables/useDevice'

const { isOverlayTitleBar, isMobileOS } = useDevice()
</script>
