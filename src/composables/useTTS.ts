
import { reactive } from 'vue'
import { generateSpeech, GEMINI_VOICES, type GeminiVoice } from '@/services/geminiTTS'

export interface TTSState {
    isSupported: boolean
    isSpeaking: boolean
    isLoading: boolean
    voice: GeminiVoice
}

export interface TTSOptions {
    voice?: GeminiVoice
}

let audioContext: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null

const getAudioContext = (): AudioContext => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContext
}

export const useTTS = () => {
    const state = reactive<TTSState>({
        isSupported: typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window),
        isSpeaking: false,
        isLoading: false,
        voice: GEMINI_VOICES.CALM
    })

    const speak = async (text: string, options: TTSOptions = {}) => {
        if (!state.isSupported || !text) return

        stop()
        state.isLoading = true
        state.isSpeaking = true // Indicate speaking/loading state immediately

        try {
            const voice = options.voice || state.voice
            const audioBuffer = await generateSpeech(text, voice)
            await playAudio(audioBuffer)
        } catch (error) {
            console.error('Gemini TTS Error:', error)
            state.isLoading = false
            state.isSpeaking = false
            // Optional: Fallback to browser TTS here if valid
            fallbackBrowserTTS(text)
        } finally {
            state.isLoading = false
        }
    }

    const playAudio = async (buffer: ArrayBuffer) => {
        const ctx = getAudioContext()
        if (ctx.state === 'suspended') {
            await ctx.resume()
        }

        const decodedBuffer = await ctx.decodeAudioData(buffer.slice(0)) // Slice to clone if needed

        // Stop any previous source
        if (currentSource) {
            try { currentSource.stop() } catch { }
        }

        currentSource = ctx.createBufferSource()
        currentSource.buffer = decodedBuffer
        currentSource.connect(ctx.destination)

        currentSource.onended = () => {
            state.isSpeaking = false
            currentSource = null
        }

        currentSource.start(0)
    }

    const stop = () => {
        if (currentSource) {
            try {
                currentSource.stop()
            } catch { }
            currentSource = null
        }
        state.isSpeaking = false
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel()
        }
    }

    const pause = () => {
        if (audioContext && audioContext.state === 'running') {
            audioContext.suspend()
            state.isSpeaking = false
        }
    }

    const resume = () => {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume()
            state.isSpeaking = true
        }
    }

    // Fallback implementation 
    const fallbackBrowserTTS = (text: string) => {
        if (!window.speechSynthesis) return

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9 // Slightly slower
        utterance.pitch = 1.0

        // Try to find a good English voice
        const voices = window.speechSynthesis.getVoices()
        const voice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en-NG')) || voices[0]
        if (voice) utterance.voice = voice

        utterance.onend = () => { state.isSpeaking = false }
        window.speechSynthesis.speak(utterance)
    }

    return {
        state,
        speak,
        stop,
        pause,
        resume
    }
}
