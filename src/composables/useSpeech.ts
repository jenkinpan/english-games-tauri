import { ref, computed, onUnmounted } from 'vue'
import type { Ref, ComputedRef } from 'vue'

export interface SpeakOptions {
  rate?: number
  pitch?: number
  volume?: number
  lang?: string
}

export interface SpeechState {
  isSupported: ComputedRef<boolean>
  isSpeaking: Ref<boolean>
  speak: (text: string, options?: SpeakOptions) => void
  cancel: () => void
}

const localSupported =
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  'SpeechSynthesisUtterance' in window

const audioSupported = typeof window !== 'undefined' && 'Audio' in window

const isSpeaking = ref(false)

let cachedVoice: SpeechSynthesisVoice | null = null
let voicesResolved = false
let usageCount = 0
let onVoicesChanged: (() => void) | null = null

let fallbackAudio: HTMLAudioElement | null = null

function pickEnglishVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null

  const target = lang.toLowerCase()
  return (
    voices.find((v) => v.lang.toLowerCase() === target) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
    voices.find((v) => /english/i.test(v.name)) ||
    voices[0]
  )
}

function resolveVoice(lang: string) {
  if (voicesResolved) return
  const voice = pickEnglishVoice(lang)
  if (voice) {
    cachedVoice = voice
    voicesResolved = true
  }
}

function youdaoUrl(text: string, lang: string): string {
  const type = lang.toLowerCase().startsWith('en-gb') ? 1 : 2
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=${type}`
}

function speakWithFallback(text: string, options: SpeakOptions) {
  if (!audioSupported) return

  if (!fallbackAudio) fallbackAudio = new Audio()
  const audio = fallbackAudio

  audio.pause()
  audio.src = youdaoUrl(text, options.lang ?? 'en-US')
  audio.playbackRate = options.rate ?? 0.9
  audio.volume = options.volume ?? 1

  audio.onplaying = () => {
    isSpeaking.value = true
  }
  audio.onended = () => {
    isSpeaking.value = false
  }
  audio.onerror = () => {
    isSpeaking.value = false
  }

  const playPromise = audio.play()
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      isSpeaking.value = false
    })
  }
}

export function useSpeech(): SpeechState {
  if (localSupported) {
    usageCount++
    if (!voicesResolved && !onVoicesChanged) {
      resolveVoice('en-US')
      if (!voicesResolved) {
        onVoicesChanged = () => resolveVoice('en-US')
        window.speechSynthesis.addEventListener(
          'voiceschanged',
          onVoicesChanged,
        )
      }
    }
  }

  const cancel = () => {
    if (localSupported) window.speechSynthesis.cancel()
    if (fallbackAudio) fallbackAudio.pause()
    isSpeaking.value = false
  }

  const speak = (text: string, options: SpeakOptions = {}) => {
    if (!text.trim()) return

    cancel()

    if (!localSupported) {
      speakWithFallback(text, options)
      return
    }

    const lang = options.lang ?? 'en-US'
    if (!voicesResolved) resolveVoice(lang)

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = options.rate ?? 0.85
    utterance.pitch = options.pitch ?? 1
    utterance.volume = options.volume ?? 1
    if (cachedVoice) utterance.voice = cachedVoice

    utterance.onstart = () => {
      isSpeaking.value = true
    }
    utterance.onend = () => {
      isSpeaking.value = false
    }
    utterance.onerror = () => {
      isSpeaking.value = false
    }

    window.speechSynthesis.speak(utterance)
  }

  onUnmounted(() => {
    cancel()
    if (localSupported) {
      usageCount = Math.max(0, usageCount - 1)
      if (usageCount === 0 && onVoicesChanged) {
        window.speechSynthesis.removeEventListener(
          'voiceschanged',
          onVoicesChanged,
        )
        onVoicesChanged = null
      }
    }
  })

  return {
    isSupported: computed(() => localSupported || audioSupported),
    isSpeaking,
    speak,
    cancel,
  }
}
