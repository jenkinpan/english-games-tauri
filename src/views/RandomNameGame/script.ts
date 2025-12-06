import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

// --- 音效引擎 ---
const SoundEngine = {
  ctx: null as AudioContext | null,
  init() {
    if (!this.ctx) {
      this.ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )()
    }
  },
  playTick() {
    this.init()
    if (!this.ctx) return
    if (this.ctx.state === 'suspended') this.ctx.resume()

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(
      800 + Math.random() * 200,
      this.ctx.currentTime,
    )
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05)

    osc.start()
    osc.stop(this.ctx.currentTime + 0.05)
  },
  playWin() {
    this.init()
    if (!this.ctx) return
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator()
      const gain = this.ctx!.createGain()
      osc.connect(gain)
      gain.connect(this.ctx!.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime)
      const startTime = this.ctx!.currentTime + i * 0.1
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5)
      osc.start(startTime)
      osc.stop(startTime + 1.5)
    })
  },
}

export interface StudentTag {
  uniqueId: string
  name: string
  style: Record<string, string>
}

export interface Group {
  id: string
  name: string
  students: string[]
}

export function useNamePicker() {
  const groups = ref<Group[]>([])
  const currentGroupId = ref<string>('')
  const showSettings = ref(false)

  // 面板状态
  const newGroupName = ref('')
  const editingGroupId = ref<string | null>(null)
  const editingNameInput = ref('')
  const newStudentInput = ref('')

  // 删除确认
  const showDeleteConfirm = ref(false)
  const groupToDeleteId = ref<string | null>(null)

  // 运行状态
  const isSelecting = ref(false)
  const selectedId = ref('')
  const finalName = ref('')
  const showModal = ref(false)
  const duration = ref(0)
  const records = ref<Array<{ name: string; time: string; duration: number }>>(
    [],
  )
  const lastWinnerName = ref('')

  const sphereRef = ref<HTMLElement | null>(null)
  const screenFlash = ref(false)

  let selectionTimer: number | undefined
  let durationTimer: number | undefined

  // --- JS 物理旋转引擎 ---
  let animationFrameId: number
  let time = 0
  let currentSpeed = 0.01

  const startPhysicsLoop = () => {
    const loop = () => {
      const targetSpeed = isSelecting.value ? 0.08 : 0.01
      currentSpeed += (targetSpeed - currentSpeed) * 0.05
      time += currentSpeed
      const angle = Math.sin(time) * 35

      if (sphereRef.value) {
        sphereRef.value.style.transform = `rotateY(${angle}deg)`
      }

      animationFrameId = requestAnimationFrame(loop)
    }
    loop()
  }

  // --- 公平抽签逻辑 ---
  const pickedStudentsMap = ref<Record<string, string[]>>({})

  const loadPickedData = () => {
    const saved = localStorage.getItem('picker_picked_students')
    if (saved) {
      try {
        pickedStudentsMap.value = JSON.parse(saved)
      } catch (e) {
        pickedStudentsMap.value = {}
      }
    }
  }

  const savePickedData = () => {
    localStorage.setItem(
      'picker_picked_students',
      JSON.stringify(pickedStudentsMap.value),
    )
  }

  const getFairWinner = (): string | null => {
    if (!currentGroup.value) return null
    const groupId = currentGroup.value.id
    const allStudents = currentGroup.value.students

    if (!pickedStudentsMap.value[groupId]) {
      pickedStudentsMap.value[groupId] = []
    }

    let unpicked = allStudents.filter(
      (s) => !pickedStudentsMap.value[groupId].includes(s),
    )

    // 如果所有人都被抽过了，重置（开启新一轮）
    if (unpicked.length === 0) {
      pickedStudentsMap.value[groupId] = []
      unpicked = [...allStudents]
      // 如果人够多，尝试避免上一轮最后一个人在这一轮第一个被抽中
      if (unpicked.length > 1 && lastWinnerName.value) {
        const index = unpicked.indexOf(lastWinnerName.value)
        if (index > -1) {
          // 临时移除上一轮赢家，从剩下的人里抽
          const tempUnpicked = [...unpicked]
          tempUnpicked.splice(index, 1)
          const winner =
            tempUnpicked[Math.floor(Math.random() * tempUnpicked.length)]
          return winner
        }
      }
    }

    if (unpicked.length === 0) return null

    const winner = unpicked[Math.floor(Math.random() * unpicked.length)]
    return winner
  }

  // --- 初始化数据 ---
  const loadData = () => {
    const savedGroups = localStorage.getItem('picker_groups')
    const savedCurrentId = localStorage.getItem('picker_current_group_id')

    if (savedGroups) {
      try {
        groups.value = JSON.parse(savedGroups)
      } catch (e) {
        initDefaultData()
      }
    } else {
      initDefaultData()
    }

    if (savedCurrentId && groups.value.find((g) => g.id === savedCurrentId)) {
      currentGroupId.value = savedCurrentId
    } else if (groups.value.length > 0) {
      currentGroupId.value = groups.value[0].id
    }

    loadPickedData()
  }

  const initDefaultData = () => {
    groups.value = [
      {
        id: Date.now().toString(),
        name: '体验班级',
        students: [
          '陈嘉宇',
          '李沐阳',
          '王浩宇',
          '张亦辰',
          '刘泽安',
          '周瑾轩',
          '吴承宇',
          '郑宇凡',
          '马思远',
          '赵启航',
          '黄昱辰',
          '胡景然',
          '朱奕泽',
          '何明轩',
          '高梓谦',
          '罗子墨',
          '林宇恒',
          '郭浩轩',
          '谢辰宇',
          '韩泽宇',
          '邓博彦',
          '曹景瑜',
          '彭奕霖',
          '任泽熙',
          '石宇辰',
          '宋明哲',
          '卢梓豪',
          '龙思远',
          '陆浩然',
          '方泽宇',
          '陈雨桐',
          '李若曦',
        ],
      },
    ]
  }

  watch(
    [groups, currentGroupId],
    () => {
      localStorage.setItem('picker_groups', JSON.stringify(groups.value))
      localStorage.setItem('picker_current_group_id', currentGroupId.value)
    },
    { deep: true },
  )

  watch(
    pickedStudentsMap,
    () => {
      savePickedData()
    },
    { deep: true },
  )

  const currentGroup = computed(() =>
    groups.value.find((g) => g.id === currentGroupId.value),
  )
  const currentStudentList = computed(() =>
    currentGroup.value ? currentGroup.value.students : [],
  )

  const studentTags = computed<StudentTag[]>(() => {
    let list = [...currentStudentList.value]
    if (list.length === 0) return []

    const MIN_VISUAL_COUNT = 80
    let visualList = [...list]

    if (list.length > 0 && list.length < MIN_VISUAL_COUNT) {
      while (visualList.length < MIN_VISUAL_COUNT) {
        visualList = visualList.concat(list)
      }
    }

    const count = visualList.length
    const radius = 240

    return visualList.map((name, i) => {
      const y = 1 - (i / (count - 1)) * 2
      const radiusAtY = Math.sqrt(1 - y * y)
      const theta = Math.PI * (3 - Math.sqrt(5)) * i

      const x = Math.cos(theta) * radiusAtY
      const z = Math.sin(theta) * radiusAtY

      const translateX = x * radius
      const translateY = y * radius
      const translateZ = z * radius

      return {
        uniqueId: `${name}-${i}`,
        name,
        style: {
          '--tx': `${translateX}px`,
          '--ty': `${translateY}px`,
          '--tz': `${translateZ}px`,
        } as any,
      }
    })
  })

  const addGroup = () => {
    if (!newGroupName.value.trim()) {
      alert('请输入分组名称')
      return
    }
    const newGroup: Group = {
      id: Date.now().toString(),
      name: newGroupName.value.trim(),
      students: [],
    }
    groups.value.push(newGroup)
    currentGroupId.value = newGroup.id
    newGroupName.value = ''
  }

  const deleteGroup = (id: string) => {
    if (groups.value.length <= 1) {
      alert('至少保留一个分组')
      return
    }
    groupToDeleteId.value = id
    showDeleteConfirm.value = true
  }

  const executeDelete = () => {
    if (groupToDeleteId.value) {
      const index = groups.value.findIndex(
        (g) => g.id === groupToDeleteId.value,
      )
      if (index > -1) {
        groups.value.splice(index, 1)
        // Clean up picked data for deleted group
        delete pickedStudentsMap.value[groupToDeleteId.value]
        if (groupToDeleteId.value === currentGroupId.value) {
          currentGroupId.value = groups.value[0].id
        }
      }
    }
    showDeleteConfirm.value = false
    groupToDeleteId.value = null
  }

  const startRename = (group: Group) => {
    editingGroupId.value = group.id
    editingNameInput.value = group.name
  }

  const saveRename = () => {
    if (!editingGroupId.value) return
    const group = groups.value.find((g) => g.id === editingGroupId.value)
    if (group && editingNameInput.value.trim())
      group.name = editingNameInput.value.trim()
    editingGroupId.value = null
    editingNameInput.value = ''
  }

  const addStudent = () => {
    if (!currentGroup.value) return
    const val = newStudentInput.value
    if (val) {
      const newNames = val.split(/[,，\s]+/).filter((n) => n.trim())
      if (newNames.length > 0) {
        currentGroup.value.students.push(...newNames)
        newStudentInput.value = ''
      }
    }
  }

  const removeStudent = (index: number) => {
    if (!currentGroup.value) return
    const studentName = currentGroup.value.students[index]
    currentGroup.value.students.splice(index, 1)

    // Also remove from picked list if present, so we don't track deleted students
    if (currentGroup.value && pickedStudentsMap.value[currentGroup.value.id]) {
      const pIndex =
        pickedStudentsMap.value[currentGroup.value.id].indexOf(studentName)
      if (pIndex > -1) {
        pickedStudentsMap.value[currentGroup.value.id].splice(pIndex, 1)
      }
    }
  }

  const updateDuration = () => {
    duration.value++
  }

  const startSelection = () => {
    if (isSelecting.value) return
    const list = currentStudentList.value
    if (list.length === 0) {
      alert('当前分组没有学生，请先添加学生！')
      showSettings.value = true
      return
    }

    SoundEngine.init()

    isSelecting.value = true
    selectedId.value = ''
    duration.value = 0

    durationTimer = window.setInterval(updateDuration, 1000)

    selectionTimer = window.setInterval(() => {
      const tags = studentTags.value
      if (tags.length > 0) {
        // 视觉上的随机滚动，不影响最终结果
        let randomIndex = Math.floor(Math.random() * tags.length)

        // 简单的视觉去重
        if (
          tags.length > 1 &&
          tags[randomIndex].name === lastWinnerName.value
        ) {
          // slightly try to avoid the same visual immediately
          randomIndex = Math.floor(Math.random() * tags.length)
        }

        selectedId.value = tags[randomIndex].uniqueId
        SoundEngine.playTick()
      }
    }, 100)
  }

  const stopSelection = async () => {
    if (!isSelecting.value) return

    clearInterval(selectionTimer)
    clearInterval(durationTimer)

    isSelecting.value = false

    // --- DETERMINE FAIR WINNER ---
    const fairWinnerName = getFairWinner()

    if (fairWinnerName) {
      finalName.value = fairWinnerName
      lastWinnerName.value = fairWinnerName

      // Record the pick
      if (currentGroup.value) {
        if (!pickedStudentsMap.value[currentGroup.value.id]) {
          pickedStudentsMap.value[currentGroup.value.id] = []
        }
        pickedStudentsMap.value[currentGroup.value.id].push(fairWinnerName)
      }

      // Update visual selection to match the winner
      // We find the first tag that matches the name.
      // Since we have many duplicates for visual effect, any tag with that name is fine.
      const winningTag = studentTags.value.find(
        (t) => t.name === fairWinnerName,
      )
      if (winningTag) {
        selectedId.value = winningTag.uniqueId
      }
    } else {
      // Should not happen if there are students, but fallback just in case
      const selectedTag = studentTags.value.find(
        (t) => t.uniqueId === selectedId.value,
      )
      finalName.value = selectedTag ? selectedTag.name : ''
      if (finalName.value) {
        lastWinnerName.value = finalName.value
      }
    }

    if (finalName.value) {
      records.value.push({
        name: finalName.value,
        duration: duration.value,
        time: new Date().toLocaleTimeString(),
      })

      SoundEngine.playWin()
      screenFlash.value = true
      setTimeout(() => (screenFlash.value = false), 300)

      showModal.value = true
      await nextTick()
      createConfetti()
    }
  }

  const resetSystem = () => {
    stopSelection()
    selectedId.value = ''
    finalName.value = ''
    duration.value = 0
    records.value = []
    showModal.value = false
  }

  // Option to reset fair picking history manually (could be exposed to UI if needed)
  const resetFairHistory = () => {
    if (currentGroup.value) {
      pickedStudentsMap.value[currentGroup.value.id] = []
      alert('已重置当前班级的抽签历史，每个人都有机会再次被抽中！')
    }
  }

  const closeModal = () => (showModal.value = false)
  const toggleSettings = () => (showSettings.value = !showSettings.value)

  const createConfetti = () => {
    const colors = [
      '#ffcc00',
      '#4a6cf9',
      '#8a54f9',
      '#ff6b6b',
      '#4ecdc4',
      '#ffffff',
    ]
    const wrapper =
      document.querySelector('.random-picker-wrapper') || document.body

    const particleCount = 100

    for (let i = 0; i < particleCount; i++) {
      const confetti = document.createElement('div')
      confetti.className = 'rnp-confetti'
      confetti.style.backgroundColor =
        colors[Math.floor(Math.random() * colors.length)]

      const startX = 50
      const startY = 50
      confetti.style.left = startX + '%'
      confetti.style.top = startY + '%'

      const size = Math.random() * 8 + 4
      confetti.style.width = size + 'px'
      confetti.style.height = size + 'px'

      wrapper.appendChild(confetti)

      const angle = Math.random() * 360
      const velocity = Math.random() * 40 + 20
      const endX = Math.cos((angle * Math.PI) / 180) * velocity
      const endY = Math.sin((angle * Math.PI) / 180) * velocity
      const rotate = Math.random() * 720

      setTimeout(() => {
        confetti.style.transition = `all ${Math.random() * 1 + 0.5}s cubic-bezier(0.25, 1, 0.5, 1)`
        confetti.style.opacity = '0'
        confetti.style.transform = `translate(${endX}vw, ${endY}vh) rotate(${rotate}deg)`
        setTimeout(() => confetti.remove(), 2000)
      }, 10)
    }
  }

  const stars = ref<Array<{ style: Record<string, string> }>>([])

  onMounted(() => {
    loadData()
    SoundEngine.init()
    for (let i = 0; i < 200; i++) {
      stars.value.push({
        style: {
          left: Math.random() * 100 + '%',
          top: Math.random() * 100 + '%',
          width: Math.random() * 3 + 'px',
          height: Math.random() * 3 + 'px',
          opacity: (Math.random() * 0.7 + 0.3).toString(),
          animationDuration: Math.random() * 5 + 3 + 's',
          animationDelay: Math.random() * 5 + 's',
        },
      })
    }
    startPhysicsLoop()
  })

  onUnmounted(() => {
    clearInterval(selectionTimer)
    clearInterval(durationTimer)
    cancelAnimationFrame(animationFrameId)
  })

  return {
    groups,
    currentGroupId,
    currentGroup,
    studentTags,
    records,
    isSelecting,
    selectedId,
    finalName,
    showModal,
    showSettings,
    duration,
    sphereRef,
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
    resetFairHistory,
  }
}
