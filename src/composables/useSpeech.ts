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

const supported =
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  'SpeechSynthesisUtterance' in window

const isSpeaking = ref(false)

let cachedVoice: SpeechSynthesisVoice | null = null
let voicesResolved = false
let usageCount = 0
let onVoicesChanged: (() => void) | null = null

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

export function useSpeech(): SpeechState {
  if (supported) {
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

  const speak = (text: string, options: SpeakOptions = {}) => {
    if (!supported || !text.trim()) return

    window.speechSynthesis.cancel()

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

  const cancel = () => {
    if (!supported) return
    window.speechSynthesis.cancel()
    isSpeaking.value = false
  }

  onUnmounted(() => {
    if (!supported) return
    cancel()
    usageCount = Math.max(0, usageCount - 1)
    if (usageCount === 0 && onVoicesChanged) {
      window.speechSynthesis.removeEventListener(
        'voiceschanged',
        onVoicesChanged,
      )
      onVoicesChanged = null
    }
  })

  return {
    isSupported: computed(() => supported),
    isSpeaking,
    speak,
    cancel,
  }
}
