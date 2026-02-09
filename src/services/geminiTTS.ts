
import { getCacheEntry, setCacheEntry } from '@/db'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent'

interface GeminiTTSResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                inlineData?: {
                    mimeType: string
                    data: string
                }
            }>
        }
    }>
    error?: {
        message: string
    }
}

// Available voices from the documentation
export const GEMINI_VOICES = {
    CALM: 'Achernar', // Soft
    WARM: 'Sulafat', // Warm
    EASY_GOING: 'Umbriel', // Easy-going
    SMOOTH: 'Algieba', // Smooth
    GENTLE: 'Vindemiatrix' // Gentle
} as const

export type GeminiVoice = typeof GEMINI_VOICES[keyof typeof GEMINI_VOICES]

async function generateSpeech(
    text: string,
    voice: string = GEMINI_VOICES.CALM
): Promise<ArrayBuffer> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY

    if (!apiKey) {
        throw new Error('Gemini API key not configured')
    }

    // Create a cache key based on text and voice
    // Simple hash for cache key
    const cacheKey = `tts:${voice}:${hashString(text)}`

    // Check cache first
    try {
        const cached = await getCacheEntry(cacheKey)
        if (cached) {
            // The cached value is base64 string
            const pcmBuffer = base64ToArrayBuffer(cached)
            return addWavHeader(pcmBuffer)
        }
    } catch (e) {
        // console.warn('Cache lookup failed', e)
    }

    const requestBody = {
        contents: [{
            parts: [{ text }]
        }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: voice
                    }
                }
            }
        }
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gemini TTS API error: ${response.status} - ${errorText}`)
    }

    const data: any = await response.json() // Using any for loose typing on response

    if (data.error) {
        throw new Error(`Gemini TTS API error: ${data.error.message}`)
    }

    const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data

    if (!audioBase64) {
        throw new Error('No audio data received from Gemini API')
    }

    // Cache the base64 string (raw PCM)
    try {
        await setCacheEntry(cacheKey, audioBase64)
    } catch (e) {
        // console.warn('Cache write failed', e)
    }

    const pcmBuffer = base64ToArrayBuffer(audioBase64)
    return addWavHeader(pcmBuffer)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
}

function addWavHeader(pcmData: ArrayBuffer): ArrayBuffer {
    const numChannels = 1
    const sampleRate = 24000
    const bitsPerSample = 16
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
    const blockAlign = (numChannels * bitsPerSample) / 8
    const dataSize = pcmData.byteLength

    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)

    // RIFF chunk
    writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeString(view, 8, 'WAVE')

    // fmt chunk
    writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true)   // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitsPerSample, true)

    // data chunk
    writeString(view, 36, 'data')
    view.setUint32(40, dataSize, true)

    // Write PCM data
    const pcmView = new Uint8Array(pcmData)
    const wavView = new Uint8Array(buffer, 44)
    wavView.set(pcmView)

    return buffer
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
    }
}

function hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(36)
}

export { generateSpeech }
