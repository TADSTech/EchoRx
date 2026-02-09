const COMMON_MEDICATIONS: Record<string, {
    name: string
    nameYoruba: string
    dosage: string
    instructions: string
    instructionsYoruba: string
}> = {
    'paracetamol': {
        name: 'Paracetamol',
        nameYoruba: 'Paracetamol',
        dosage: '500mg - 1000mg',
        instructions: 'Take 1-2 tablets every 4-6 hours as needed for pain or fever. Do not exceed 8 tablets in 24 hours.',
        instructionsYoruba: 'Mu egbogi 1-2 ni gbogbo wakati 4-6 fun irora tabi iba. Maase ju egbogi 8 lo ni wakati 24.'
    },
    'ibuprofen': {
        name: 'Ibuprofen',
        nameYoruba: 'Ibuprofen',
        dosage: '200mg - 400mg',
        instructions: 'Take with food. 1-2 tablets every 4-6 hours. Do not exceed 6 tablets in 24 hours.',
        instructionsYoruba: 'Mu pelu onje. Egbogi 1-2 ni gbogbo wakati 4-6. Maase ju egbogi 6 lo ni wakati 24.'
    },
    'amoxicillin': {
        name: 'Amoxicillin',
        nameYoruba: 'Amoxicillin',
        dosage: '250mg - 500mg',
        instructions: 'Take every 8 hours. Complete the full course even if you feel better.',
        instructionsYoruba: 'Mu ni gbogbo wakati 8. Pari gbogbo eto paapa ti o ba dara.'
    },
    'metformin': {
        name: 'Metformin',
        nameYoruba: 'Metformin',
        dosage: '500mg - 1000mg',
        instructions: 'Take with meals. Used to control blood sugar in type 2 diabetes.',
        instructionsYoruba: 'Mu pelu onje. A lo lati sakoso suga eje ni atogbe iru 2.'
    },
    'amlodipine': {
        name: 'Amlodipine',
        nameYoruba: 'Amlodipine',
        dosage: '5mg - 10mg',
        instructions: 'Take once daily. Used to treat high blood pressure.',
        instructionsYoruba: 'Mu lemeji lojoojumo. A lo lati toju eje giga.'
    },
    'omeprazole': {
        name: 'Omeprazole',
        nameYoruba: 'Omeprazole',
        dosage: '20mg - 40mg',
        instructions: 'Take before breakfast. Used for stomach acid and ulcers.',
        instructionsYoruba: 'Mu ki o to je onje owuro. A lo fun acid inu ati ọgbẹ.'
    },
    'vitamin': {
        name: 'Multivitamin',
        nameYoruba: 'Vitamin Pupo',
        dosage: '1 tablet',
        instructions: 'Take once daily with food.',
        instructionsYoruba: 'Mu lemeji lojoojumo pelu onje.'
    },
    'chloroquine': {
        name: 'Chloroquine',
        nameYoruba: 'Chloroquine',
        dosage: '250mg',
        instructions: 'Take as prescribed for malaria treatment or prevention.',
        instructionsYoruba: 'Mu bi a ti so fun itoju tabi idena iba.'
    },
    'artemether': {
        name: 'Artemether-Lumefantrine',
        nameYoruba: 'Artemether-Lumefantrine',
        dosage: '20/120mg',
        instructions: 'Take with food. Complete the 3-day course for malaria treatment.',
        instructionsYoruba: 'Mu pelu onje. Pari eto ojo 3 fun itoju iba.'
    }
}

export interface OfflineAnalysisResult {
    drugName: string
    drugNameYoruba?: string
    dosage: string
    instructions: string
    instructionsYoruba?: string
    confidence: number
    isOffline: true
}

export async function analyzeTextOffline(text: string): Promise<OfflineAnalysisResult> {
    const normalizedText = text.toLowerCase().trim()

    for (const [keyword, medication] of Object.entries(COMMON_MEDICATIONS)) {
        if (normalizedText.includes(keyword)) {
            return {
                drugName: medication.name,
                drugNameYoruba: medication.nameYoruba,
                dosage: medication.dosage,
                instructions: medication.instructions,
                instructionsYoruba: medication.instructionsYoruba,
                confidence: 0.7,
                isOffline: true
            }
        }
    }

    return {
        drugName: 'Unknown Medication',
        drugNameYoruba: 'Oogun Ti A Ko Mo',
        dosage: 'Check packaging',
        instructions: 'Could not identify medication offline. Please check the packaging or try when online.',
        instructionsYoruba: 'Ko le damo oogun ni ipo aisinipo. Jowo wo apo tabi gbiyanju nigbati o ba wa lori ayelujara.',
        confidence: 0,
        isOffline: true
    }
}

export async function extractTextFromImage(imageBase64: string): Promise<string> {
    console.log('OCR fallback: Using basic text extraction')
    return ''
}

export function getOfflineMedications(): typeof COMMON_MEDICATIONS {
    return COMMON_MEDICATIONS
}
