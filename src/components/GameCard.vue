<template>
    <router-link :to="path" class="card">
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
    </router-link>
</template>

<script setup lang="ts">
// 这里相当于 React 组件的 props 定义
defineProps<{
    title: string; // 对应原来的 <h2> 内容
    description: string; // 对应原来的 <p> 内容
    path: string; // 对应 router-link 的 to 属性
}>();
</script>

<style scoped>
/* 直接把原来的 .card 样式移到这里，实现样式隔离 */
.card {
    background: var(--card, #ffffff);
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
    display: block;
    cursor: pointer;
}

.card:hover {
    transform: translateY(-6px);
    box-shadow: 0 22px 55px rgba(51, 64, 97, 0.22);
}

.card h2 {
    margin: 0 0 8px;
    font-size: 1.4rem;
    color: #2c3e50;
}

.card p {
    margin: 0;
    font-size: 0.98rem;
    color: rgba(0, 0, 0, 0.7);
    line-height: 1.5;
}

/* 暗黑模式支持 */
@media (prefers-color-scheme: dark) {
    .card {
        background: #2b2d31; /* 给个默认暗色背景，或者移除这行依赖父级变量 */
        border-color: rgba(255, 255, 255, 0.08);
    }
    .card h2 {
        color: #f4f5fb;
    }
    .card p {
        color: rgba(244, 245, 251, 0.75);
    }
}
</style>
