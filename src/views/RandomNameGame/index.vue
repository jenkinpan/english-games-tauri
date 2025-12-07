<template>
  <div class="random-picker-wrapper">
    <div class="title-bar" data-tauri-drag-region></div>
    <div class="flash-overlay" :class="{ active: screenFlash }"></div>

    <router-link to="/" class="back-home-btn">🏠</router-link>

    <div
      v-for="(star, index) in stars"
      :key="'star-' + index"
      class="star"
      :style="star.style"
    ></div>

    <div class="header-info">
      <div class="group-label">当前分组</div>
      <div class="group-title">{{ currentGroup?.name || '未选择' }}</div>
    </div>

    <h1 class="main-title">随机点名系统</h1>

    <div class="container">
      <div id="sphere" ref="sphereRef">
        <div
          v-for="tag in studentTags"
          :key="tag.uniqueId"
          class="name-tag"
          :class="{
            selected: tag.uniqueId === selectedId && !finalName,
            winner: tag.uniqueId === selectedId && finalName,
          }"
          :style="tag.style"
        >
          {{ tag.name }}
        </div>
      </div>
    </div>

    <div class="bottom-controls-bar">
      <div class="button-group">
        <button
          class="btn btn-manage"
          @click="toggleSettings"
          :disabled="isSelecting"
        >
          ⚙ 班级管理
        </button>
        <button
          class="btn btn-primary"
          @click="startSelection"
          :disabled="isSelecting"
        >
          开始点名
        </button>
        <button
          class="btn btn-manage"
          @click="stopSelection"
          :disabled="!isSelecting"
        >
          停止
        </button>
        <button class="btn btn-manage" @click="resetSystem">重置</button>
      </div>

      <div class="info-bar">
        <div>
          记录: <span>{{ records.length }}</span>
        </div>
        <div>
          时长: <span>{{ duration }}</span
          >s
        </div>
        <div>
          真实人数:
          <span>{{ currentGroup?.students.length || 0 }}</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showSettings" class="rnp-modal-mask" style="z-index: 2000">
        <div class="rnp-settings-panel">
          <div class="rnp-settings-header">
            <h3>班级与学生管理</h3>
            <button class="rnp-close-btn" @click="toggleSettings">
              关闭 ESC
            </button>
          </div>
          <div class="rnp-settings-content">
            <div class="rnp-settings-sidebar">
              <div class="rnp-sidebar-add-box">
                <input
                  v-model="newGroupName"
                  class="dark-input"
                  style="width: 100%"
                  placeholder="新建分组名称..."
                  @keyup.enter="addGroup"
                />
                <button
                  class="rnp-round-btn"
                  @click="addGroup"
                  title="添加分组"
                >
                  +
                </button>
              </div>
              <div class="rnp-group-list">
                <div
                  v-for="group in groups"
                  :key="group.id"
                  class="rnp-group-item"
                  :class="{
                    active: currentGroupId === group.id,
                  }"
                  @click="currentGroupId = group.id"
                >
                  <span
                    v-if="editingGroupId !== group.id"
                    style="
                      flex: 1;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                    "
                    >{{ group.name }}</span
                  >
                  <input
                    v-else
                    v-model="editingNameInput"
                    class="dark-input"
                    style="width: 100px; padding: 4px"
                    @click.stop
                    @keyup.enter="saveRename"
                  />
                  <div class="rnp-group-actions">
                    <span
                      v-if="editingGroupId === group.id"
                      class="rnp-action-icon"
                      style="color: #2ecc71"
                      @click.stop="saveRename"
                      title="保存"
                      >✓</span
                    >
                    <span
                      v-else
                      class="rnp-action-icon edit-icon"
                      @click.stop="startRename(group)"
                      title="重命名"
                      >✎</span
                    >
                    <span
                      class="rnp-action-icon delete-icon"
                      @click.stop="deleteGroup(group.id)"
                      title="删除"
                      >🗑</span
                    >
                  </div>
                </div>
              </div>
            </div>
            <div class="rnp-settings-main">
              <div v-if="currentGroup">
                <h2 style="color: #4a6cf9; margin-bottom: 20px">
                  {{ currentGroup.name }}
                </h2>
                <div class="main-input-area">
                  <input
                    v-model="newStudentInput"
                    class="dark-input"
                    style="flex: 1"
                    placeholder="输入姓名，多个姓名可用空格或逗号隔开..."
                    @keyup.enter="addStudent"
                  />
                  <button class="btn btn-primary" @click="addStudent">
                    添加学生
                  </button>
                </div>
                <div class="rnp-student-list">
                  <div
                    v-for="(stu, idx) in currentGroup.students"
                    :key="idx"
                    class="rnp-student-tag-edit"
                  >
                    {{ stu }}
                    <span
                      class="delete-icon"
                      style="cursor: pointer; margin-left: 5px"
                      @click="removeStudent(idx)"
                      >×</span
                    >
                  </div>
                  <div
                    v-if="currentGroup.students.length === 0"
                    style="
                      color: #666;
                      width: 100%;
                      text-align: center;
                      margin-top: 50px;
                    "
                  >
                    暂无学生，请在上方输入框添加
                  </div>
                </div>
              </div>
              <div
                v-else
                style="
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100%;
                  color: #666;
                "
              >
                请先在左侧选择或创建一个分组
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="rnp-modal-mask"
        style="z-index: 3000"
        @click.self="showDeleteConfirm = false"
      >
        <div class="rnp-modal-content delete-confirm-box">
          <div
            style="
              font-size: 48px;
              margin-bottom: 20px;
              animation: rnp-float 3s infinite;
            "
          >
            ⚠️
          </div>

          <h3 style="font-size: 24px; margin-bottom: 15px; color: #fff">
            确认删除?
          </h3>

          <p
            style="
              color: #ccc;
              margin-bottom: 35px;
              font-size: 15px;
              line-height: 1.5;
            "
          >
            此操作无法恢复，<br />该分组内的所有名单也将被清空。
          </p>

          <div class="delete-actions">
            <button
              class="rnp-btn btn-cancel"
              @click="showDeleteConfirm = false"
            >
              取消
            </button>
            <button class="rnp-btn btn-confirm" @click="executeDelete">
              确认删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showModal" class="rnp-modal-mask" @click.self="closeModal">
        <div class="rnp-modal-content">
          <div class="rnp-winner-icon">🏆</div>
          <div style="color: #a0a0ff; letter-spacing: 2px; margin-bottom: 10px">
            LUCKY WINNER
          </div>
          <div class="rnp-result-name">{{ finalName }}</div>
          <button class="rnp-modal-btn" @click="closeModal">继续</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useNamePicker } from './script'

const {
  groups,
  currentGroupId,
  currentGroup,
  studentTags,
  isSelecting,
  selectedId,
  finalName,
  showModal,
  showSettings,
  duration,
  records,
  stars,
  newGroupName,
  editingGroupId,
  editingNameInput,
  newStudentInput,
  screenFlash,
  showDeleteConfirm,
  executeDelete,
  startSelection,
  stopSelection,
  resetSystem,
  closeModal,
  toggleSettings,
  addGroup,
  deleteGroup,
  startRename,
  saveRename,
  addStudent,
  removeStudent,
} = useNamePicker()
</script>

<style scoped>
@import './style.css';
</style>
