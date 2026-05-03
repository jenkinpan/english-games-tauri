import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { platform } from '@tauri-apps/plugin-os'

type OsPlatform = 'macos' | 'windows' | 'linux' | 'android' | 'ios' | 'unknown'

const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
const height = ref(typeof window !== 'undefined' ? window.innerHeight : 800)
const osPlatform = ref<OsPlatform>('unknown')
let listenerCount = 0
let onResize: (() => void) | null = null

function detectPlatform() {
  if (osPlatform.value !== 'unknown') return
  try {
    osPlatform.value = platform() as OsPlatform
  } catch {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase()
      if (/iphone|ipad|ipod/.test(ua)) osPlatform.value = 'ios'
      else if (/android/.test(ua)) osPlatform.value = 'android'
      else if (/mac/.test(ua)) osPlatform.value = 'macos'
      else if (/win/.test(ua)) osPlatform.value = 'windows'
      else if (/linux/.test(ua)) osPlatform.value = 'linux'
    }
  }
}

export interface DeviceState {
  width: Ref<number>
  height: Ref<number>
  isPortrait: ComputedRef<boolean>
  isMobile: ComputedRef<boolean>
  isTablet: ComputedRef<boolean>
  isDesktop: ComputedRef<boolean>
  isTouchDevice: ComputedRef<boolean>
  isIOS: ComputedRef<boolean>
  isAndroid: ComputedRef<boolean>
  isMacOS: ComputedRef<boolean>
  isWindows: ComputedRef<boolean>
  isLinux: ComputedRef<boolean>
  isMobileOS: ComputedRef<boolean>
  isOverlayTitleBar: ComputedRef<boolean>
  deviceTag: ComputedRef<'Mobile' | 'Tablet' | 'Desktop'>
}

export function useDevice(): DeviceState {
  onMounted(() => {
    detectPlatform()
    if (listenerCount === 0 && typeof window !== 'undefined') {
      onResize = () => {
        width.value = window.innerWidth
        height.value = window.innerHeight
      }
      window.addEventListener('resize', onResize, { passive: true })
      window.addEventListener('orientationchange', onResize, { passive: true })
    }
    listenerCount++
  })

  onUnmounted(() => {
    listenerCount = Math.max(0, listenerCount - 1)
    if (listenerCount === 0 && onResize && typeof window !== 'undefined') {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      onResize = null
    }
  })

  const isPortrait = computed(() => height.value > width.value)
  const isMobile = computed(() => width.value < 768)
  const isTablet = computed(() => width.value >= 768 && width.value < 1024)
  const isDesktop = computed(() => width.value >= 1024)

  const isTouchDevice = computed(() => {
    if (typeof window === 'undefined') return false
    return (
      'ontouchstart' in window ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
    )
  })

  const isIOS = computed(() => osPlatform.value === 'ios')
  const isAndroid = computed(() => osPlatform.value === 'android')
  const isMacOS = computed(() => osPlatform.value === 'macos')
  const isWindows = computed(() => osPlatform.value === 'windows')
  const isLinux = computed(() => osPlatform.value === 'linux')
  const isMobileOS = computed(() => isIOS.value || isAndroid.value)

  const isOverlayTitleBar = computed(
    () => isMacOS.value && !isMobileOS.value && width.value >= 768,
  )

  const deviceTag = computed<'Mobile' | 'Tablet' | 'Desktop'>(() => {
    if (isMobile.value) return 'Mobile'
    if (isTablet.value) return 'Tablet'
    return 'Desktop'
  })

  return {
    width,
    height,
    isPortrait,
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    isIOS,
    isAndroid,
    isMacOS,
    isWindows,
    isLinux,
    isMobileOS,
    isOverlayTitleBar,
    deviceTag,
  }
}
