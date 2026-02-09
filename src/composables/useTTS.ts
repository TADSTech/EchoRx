import { ref, reactive } from 'vue'

export interface TTSState {
    isSupported: boolean
    isSpeaking: boolean
    currentVoice: SpeechSynthesisVoice | null
    rate: number
    pitch: number
}

const getVoiceForLocale = (locale: 'en' | 'yo' | 'ha' | 'ig'): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return null
    }

    const voices = window.speechSynthesis.getVoices()

    const voicePreferences: Record<string, string[]> = {
        'en': ['en-NG', 'en-GB', 'en-US', 'en'],
        'yo': ['yo-NG', 'yo', 'en-NG', 'en-GB'],
        'ha': ['ha-NG', 'ha', 'en-NG', 'en-GB'],
        'ig': ['ig-NG', 'ig', 'en-NG', 'en-GB']
    }

    const prefs = voicePreferences[locale] || voicePreferences['en']

    for (const pref of prefs) {
        const voice = voices.find(v =>
            v.lang.toLowerCase().startsWith(pref.toLowerCase()) ||
            v.lang.toLowerCase() === pref.toLowerCase()
        )
        if (voice) return voice
    }

    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null
}

export const useTTS = () => {
    const state = reactive<TTSState>({
        isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
        isSpeaking: false,
        currentVoice: null,
        rate: 0.85,
        pitch: 1.0
    })

    const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
        return new Promise((resolve) => {
            if (!state.isSupported) {
                resolve([])
                return
            }

            const voices = window.speechSynthesis.getVoices()
            if (voices.length > 0) {
                resolve(voices)
                return
            }

            window.speechSynthesis.onvoiceschanged = () => {
                resolve(window.speechSynthesis.getVoices())
            }

            setTimeout(() => {
                resolve(window.speechSynthesis.getVoices())
            }, 500)
        })
    }

    const speak = async (text: string, locale: 'en' | 'yo' | 'ha' | 'ig' = 'en') => {
        if (!state.isSupported || !text) return

        stop()

        await loadVoices()

        const utterance = new SpeechSynthesisUtterance(text)

        const voice = getVoiceForLocale(locale)
        if (voice) {
            utterance.voice = voice
            state.currentVoice = voice
        }

        utterance.rate = state.rate
        utterance.pitch = state.pitch
        utterance.volume = 1.0

        utterance.onstart = () => {
            state.isSpeaking = true
        }

        utterance.onend = () => {
            state.isSpeaking = false
        }

        utterance.onerror = (event) => {
            console.error('TTS Error:', event.error)
            state.isSpeaking = false
        }

        window.speechSynthesis.speak(utterance)
    }

    const stop = () => {
        if (state.isSupported) {
            window.speechSynthesis.cancel()
            state.isSpeaking = false
        }
    }

    const setRate = (rate: number) => {
        state.rate = Math.max(0.5, Math.min(1.5, rate))
    }

    const setPitch = (pitch: number) => {
        state.pitch = Math.max(0.5, Math.min(2.0, pitch))
    }

    const pause = () => {
        if (state.isSupported) {
            window.speechSynthesis.pause()
        }
    }

    const resume = () => {
        if (state.isSupported) {
            window.speechSynthesis.resume()
        }
    }

    return {
        state,
        speak,
        stop,
        pause,
        resume,
        setRate,
        setPitch,
        loadVoices
    }
}
