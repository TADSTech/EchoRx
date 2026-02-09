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

const GEMINI_3_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent'
const GEMINI_2_5_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const ANALYSIS_PROMPT = `You are a medical assistant helping identify medications. Analyze this image of a pill or medication package.

Return ONLY a valid JSON object with the following structure (do NOT use markdown code blocks):
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
- Return purely valid JSON text. Do NOT wrap in \`\`\`json ... \`\`\`.
- If you cannot identify the medication, set confidence to 0 and drugName to "Unknown".
- Focus on what is visible in the image.
- Include common Nigerian brand names if recognized.`

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

    let result: GeminiAnalysisResult

    try {
        // Try Gemini 3 (Primary)
        result = await callGeminiAPI(GEMINI_3_URL, apiKey, base64Data, true)
    } catch (err) {
        console.warn('Gemini 3 analysis failed, attempting fallback to Gemini 2.5...', err)
        try {
            // Fallback to Gemini 2.5 (No thinking config)
            result = await callGeminiAPI(GEMINI_2_5_URL, apiKey, base64Data, false)
        } catch (fallbackErr: any) {
            // If fallback also fails, throw the original error or a meaningful message
            console.error('Gemini 2.5 fallback failed:', fallbackErr)
            throw new Error(`Medication analysis failed: ${fallbackErr.message || 'Service unavailable'}`)
        }
    }

    await setCacheEntry(cacheKey, JSON.stringify(result))

    return result
}

async function callGeminiAPI(
    url: string,
    apiKey: string,
    base64Data: string,
    useThinking: boolean
): Promise<GeminiAnalysisResult> {
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
            temperature: useThinking ? 1.0 : 0.1,
            topK: 32,
            topP: 1,
            maxOutputTokens: 16000,
            ...(useThinking ? { thinkingConfig: { thinkingLevel: "high" } } : {})
        }
    }

    const response = await fetch(`${url}?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Gemini API error: ${response.status}`
        try {
            const errorJson = JSON.parse(errorText)
            if (errorJson.error && errorJson.error.message) {
                errorMessage += ` - ${errorJson.error.message}`
            }
        } catch {
            errorMessage += ` - ${errorText}`
        }
        throw new Error(errorMessage)
    }

    const data: GeminiResponse = await response.json()

    if (data.error) {
        throw new Error(`Gemini API error: ${data.error.message}`)
    }

    // With thinkingConfig enabled, parts[0] may be the "thought" part.
    // Iterate all parts to find the one containing a JSON object.
    const parts = data.candidates?.[0]?.content?.parts ?? []
    let textContent: string | undefined 

    for (const part of parts) {
        if (part.text && part.text.includes('{')) {
            textContent = part.text
        }
    }

    // Fallback: just grab the first part with any text
    if (!textContent) {
        textContent = parts.find(p => p.text)?.text
    }

    if (!textContent) {
        throw new Error('No response from Gemini API')
    }

    // Clean the response: strip markdown code fences if present
    let cleaned = textContent.trim()
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')

    // Extract JSON from the response (find first { and last })
    const startIndex = cleaned.indexOf('{')
    const endIndex = cleaned.lastIndexOf('}')

    if (startIndex === -1 || endIndex === -1) {
        console.error('No JSON object found in response:', textContent)
        throw new Error('Invalid response format: No JSON object found')
    }

    let jsonString = cleaned.slice(startIndex, endIndex + 1)

    // Clean up common JSON errors from LLMs
    jsonString = jsonString.replace(/,(\s*})/g, '$1')
    jsonString = jsonString.replace(/[\u200B-\u200D\uFEFF]/g, '')

    try {
        return JSON.parse(jsonString)
    } catch (e) {
        console.error('Failed to parse Gemini response as JSON. Original text:', textContent)
        console.error('Slice attempted:', jsonString)
        throw new Error('Invalid response format from medication analysis')
    }
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

