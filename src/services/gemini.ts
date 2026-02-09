import { getCacheEntry, setCacheEntry } from '@/db'

interface GeminiAnalysisResult {
    drugName: string
    drugNameYoruba?: string
    dosage: string
    instructions: string
    instructionsYoruba?: string
    warnings?: string
    warningsYoruba?: string
    sideEffects?: string
    sideEffectsYoruba?: string
    confidence: number
}

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string
            }>
        }
    }>
    error?: {
        message: string
    }
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const ANALYSIS_PROMPT = `You are a medical assistant helping identify medications. Analyze this image of a pill or medication package.

Return a JSON object with the following structure (use empty strings if information is not visible):
{
  "drugName": "The medication name in English",
  "drugNameYoruba": "The medication name in Yoruba (if common)",
  "dosage": "Dosage information (e.g., '500mg', '10mg tablet')",
  "instructions": "Brief usage instructions in English",
  "instructionsYoruba": "Brief usage instructions in Yoruba",
  "warnings": "Important warnings in English",
  "warningsYoruba": "Important warnings in Yoruba",
  "sideEffects": "Common side effects in English",
  "sideEffectsYoruba": "Common side effects in Yoruba",
  "confidence": 0.0 to 1.0 rating of how confident you are in the identification
}

IMPORTANT: 
- Only return valid JSON, no markdown or explanation
- If you cannot identify the medication, set confidence to 0 and drugName to "Unknown"
- Focus on what is visible in the image
- Include common Nigerian brand names if recognized`

export async function analyzeMedicationImage(
    imageBase64: string
): Promise<GeminiAnalysisResult> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY

    if (!apiKey) {
        throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY.')
    }

    const cacheKey = `gemini:${hashString(imageBase64.slice(0, 1000))}`
    const cached = await getCacheEntry(cacheKey)
    if (cached) {
        return JSON.parse(cached)
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    const requestBody = {
        contents: [
            {
                parts: [
                    { text: ANALYSIS_PROMPT },
                    {
                        inlineData: {
                            mimeType: 'image/webp',
                            data: base64Data
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.1,
            topK: 32,
            topP: 1,
            maxOutputTokens: 1024
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
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data: GeminiResponse = await response.json()

    if (data.error) {
        throw new Error(`Gemini API error: ${data.error.message}`)
    }

    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textContent) {
        throw new Error('No response from Gemini API')
    }

    const cleanedJson = textContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

    const result: GeminiAnalysisResult = JSON.parse(cleanedJson)

    await setCacheEntry(cacheKey, JSON.stringify(result))

    return result
}

export function isOnline(): boolean {
    return navigator.onLine
}

function hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
    }
    return hash.toString(36)
}

export function getDefaultResult(): GeminiAnalysisResult {
    return {
        drugName: 'Unknown',
        dosage: '',
        instructions: 'Could not analyze medication. Please try again with a clearer image.',
        instructionsYoruba: 'Ko le se ayewo oogun. Jowo gbiyanju pelu aworan ti o ye.',
        confidence: 0
    }
}
