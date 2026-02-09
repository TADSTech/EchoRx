<script setup lang="ts">
import { ref, onUnmounted, computed } from 'vue'
import { useCamera } from '@/composables/useCamera'
import { useTTS } from '@/composables/useTTS'
import { analyzeMedicationImage, isOnline, getDefaultResult } from '@/services/gemini'
import { analyzeTextOffline } from '@/services/ocr-fallback'
import { db } from '@/db'
import { t, locale } from '@/i18n'

const currentLocale = computed(() => locale.value)

const { state: cameraState, videoRef, canvasRef, startCamera, stopCamera, captureImage } = useCamera()
const { speak, stop: stopTTS } = useTTS()

type ScanStep = 'initial' | 'camera' | 'preview' | 'analyzing' | 'result' | 'error'

const step = ref<ScanStep>('initial')
const capturedImage = ref<string | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
const analysisResult = ref<{
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
  isOffline?: boolean
} | null>(null)

const handleStartCamera = async () => {
  step.value = 'camera'
  await startCamera()
}

const handleCapture = async () => {
  const image = await captureImage()
  if (image) {
    capturedImage.value = image
    step.value = 'preview'
    stopCamera()
  }
}

const handleRetake = async () => {
  capturedImage.value = null
  step.value = 'camera'
  await startCamera()
}

const handleAnalyze = async () => {
  if (!capturedImage.value) return
  
  step.value = 'analyzing'
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    let result
    
    if (isOnline()) {
      result = await analyzeMedicationImage(capturedImage.value)
    } else {
      const offlineResult = await analyzeTextOffline('')
      result = { ...offlineResult }
    }
    
    analysisResult.value = result
    step.value = 'result'
    
    await db.drugs.add({
      name: result.drugName,
      nameYoruba: result.drugNameYoruba,
      dosage: result.dosage,
      instructions: result.instructions,
      instructionsYoruba: result.instructionsYoruba,
      warnings: result.warnings,
      warningsYoruba: result.warningsYoruba,
      sideEffects: result.sideEffects,
      sideEffectsYoruba: result.sideEffectsYoruba,
      imageData: capturedImage.value,
      scannedAt: new Date(),
      source: isOnline() ? 'gemini' : 'offline'
    })
    
  } catch (err) {
    console.error('Analysis error:', err)
    
    if (!isOnline()) {
      const offlineResult = await analyzeTextOffline('')
      analysisResult.value = { ...offlineResult }
      step.value = 'result'
    } else {
      analysisResult.value = getDefaultResult()
      step.value = 'result'
    }
  } finally {
    isLoading.value = false
  }
}

const handleSpeakInstructions = () => {
  if (!analysisResult.value) return
  
  const instructions = currentLocale.value === 'yo' 
    ? analysisResult.value.instructionsYoruba || analysisResult.value.instructions
    : analysisResult.value.instructions
  
  speak(instructions, currentLocale.value as 'en' | 'yo')
}

const handleScanAnother = () => {
  step.value = 'initial'
  capturedImage.value = null
  analysisResult.value = null
  errorMessage.value = ''
}

const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      capturedImage.value = e.target?.result as string
      step.value = 'preview'
    }
    reader.readAsDataURL(file)
  }
}

onUnmounted(() => {
  stopCamera()
  stopTTS()
})
</script>

<template>
  <div class="scan-view">
    <header class="view-header">
      <h2 class="view-title">{{ t('scan.title') }}</h2>
      <p class="view-subtitle">{{ t('scan.subtitle') }}</p>
    </header>

    <div v-if="step === 'initial'" class="scan-initial">
      <div class="scan-illustration">
        <div class="scan-icon-wrapper">
          <i class="fas fa-pills" aria-hidden="true"></i>
        </div>
        <div class="scan-icon-ring pulse"></div>
      </div>

      <div class="scan-tips card">
        <h3 class="tips-title">
          <i class="fas fa-lightbulb" aria-hidden="true"></i>
          {{ t('scan.tips.title') }}
        </h3>
        <ul class="tips-list">
          <li>
            <i class="fas fa-sun" aria-hidden="true"></i>
            {{ t('scan.tips.lighting') }}
          </li>
          <li>
            <i class="fas fa-hand-paper" aria-hidden="true"></i>
            {{ t('scan.tips.focus') }}
          </li>
          <li>
            <i class="fas fa-ruler" aria-hidden="true"></i>
            {{ t('scan.tips.distance') }}
          </li>
        </ul>
      </div>

      <div class="scan-actions">
        <button 
          class="btn btn-primary btn-lg btn-block"
          @click="handleStartCamera"
          aria-label="Start camera to scan medication"
        >
          <i class="fas fa-camera" aria-hidden="true"></i>
          {{ t('scan.startCamera') }}
        </button>

        <div class="divider">
          <span>or</span>
        </div>

        <label class="btn btn-secondary btn-block upload-btn">
          <i class="fas fa-upload" aria-hidden="true"></i>
          {{ t('scan.uploadInstead') }}
          <input 
            type="file" 
            accept="image/*"
            class="sr-only"
            @change="handleFileUpload"
            aria-label="Upload image of medication"
          >
        </label>
      </div>
    </div>

    <div v-if="step === 'camera'" class="scan-camera">
      <div class="camera-container">
        <video 
          ref="videoRef" 
          class="camera-preview"
          autoplay 
          playsinline
          muted
          aria-label="Camera preview"
        ></video>
        <canvas ref="canvasRef" class="camera-canvas sr-only"></canvas>
        
        <div class="camera-overlay">
          <div class="camera-frame"></div>
        </div>

        <div v-if="!cameraState.isActive && cameraState.error" class="camera-error card">
          <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
          <p>{{ cameraState.error }}</p>
          <button class="btn btn-secondary" @click="handleScanAnother">
            {{ t('common.back') }}
          </button>
        </div>
      </div>

      <div v-if="cameraState.isActive" class="camera-controls">
        <button 
          class="btn btn-secondary"
          @click="handleScanAnother"
          aria-label="Cancel and go back"
        >
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>

        <button 
          class="btn-capture"
          @click="handleCapture"
          aria-label="Capture photo"
        >
          <span class="capture-ring"></span>
        </button>

        <div class="spacer"></div>
      </div>
    </div>

    <div v-if="step === 'preview'" class="scan-preview">
      <div class="preview-image-container">
        <img 
          :src="capturedImage || ''" 
          alt="Captured medication image"
          class="preview-image"
        >
      </div>

      <div class="preview-actions">
        <button 
          class="btn btn-secondary"
          @click="handleRetake"
          aria-label="Retake photo"
        >
          <i class="fas fa-redo" aria-hidden="true"></i>
          {{ t('scan.retake') }}
        </button>

        <button 
          class="btn btn-primary"
          @click="handleAnalyze"
          aria-label="Analyze medication"
        >
          <i class="fas fa-search" aria-hidden="true"></i>
          {{ t('scan.analyze') }}
        </button>
      </div>

      <div v-if="!isOnline()" class="offline-notice card">
        <i class="fas fa-wifi-slash" aria-hidden="true"></i>
        <p>{{ t('scan.offlineFallback') }}</p>
      </div>
    </div>

    <div v-if="step === 'analyzing'" class="scan-analyzing">
      <div class="analyzing-animation">
        <div class="loading-spinner"></div>
        <p>{{ t('scan.analyzing') }}</p>
      </div>
    </div>

    <div v-if="step === 'result' && analysisResult" class="scan-result">
      <div class="result-header">
        <div class="result-confidence" :class="{ low: analysisResult.confidence < 0.5 }">
          <span class="confidence-value">{{ Math.round(analysisResult.confidence * 100) }}%</span>
          <span class="confidence-label">confidence</span>
        </div>

        <div v-if="analysisResult.isOffline" class="badge badge-warning">
          <i class="fas fa-wifi-slash" aria-hidden="true"></i>
          Offline
        </div>
      </div>

      <div class="result-card card">
        <div class="result-drug-name">
          <h3>{{ currentLocale === 'yo' && analysisResult.drugNameYoruba ? analysisResult.drugNameYoruba : analysisResult.drugName }}</h3>
          <span v-if="analysisResult.dosage" class="drug-dosage">{{ analysisResult.dosage }}</span>
        </div>

        <div class="result-section">
          <h4>
            <i class="fas fa-info-circle" aria-hidden="true"></i>
            {{ t('scan.result.instructions') }}
          </h4>
          <p>{{ currentLocale === 'yo' && analysisResult.instructionsYoruba ? analysisResult.instructionsYoruba : analysisResult.instructions }}</p>
        </div>

        <div v-if="analysisResult.warnings" class="result-section warning">
          <h4>
            <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
            {{ t('scan.result.warnings') }}
          </h4>
          <p>{{ currentLocale === 'yo' && analysisResult.warningsYoruba ? analysisResult.warningsYoruba : analysisResult.warnings }}</p>
        </div>

        <div v-if="analysisResult.sideEffects" class="result-section">
          <h4>
            <i class="fas fa-heartbeat" aria-hidden="true"></i>
            {{ t('scan.result.sideEffects') }}
          </h4>
          <p>{{ currentLocale === 'yo' && analysisResult.sideEffectsYoruba ? analysisResult.sideEffectsYoruba : analysisResult.sideEffects }}</p>
        </div>
      </div>

      <div class="result-actions">
        <button 
          class="btn btn-icon btn-secondary"
          @click="handleSpeakInstructions"
          aria-label="Read instructions aloud"
        >
          <i class="fas fa-volume-up" aria-hidden="true"></i>
        </button>

        <router-link 
          to="/schedule" 
          class="btn btn-primary"
          aria-label="Add to medication schedule"
        >
          <i class="fas fa-clock" aria-hidden="true"></i>
          {{ t('scan.result.addToSchedule') }}
        </router-link>

        <button 
          class="btn btn-secondary"
          @click="handleScanAnother"
          aria-label="Scan another medication"
        >
          <i class="fas fa-redo" aria-hidden="true"></i>
          {{ t('scan.result.scanAnother') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scan-view {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 140px);
  gap: var(--space-lg);
}

.view-header {
  text-align: center;
  margin-bottom: var(--space-md);
}

.view-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.25rem;
}

.view-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.scan-initial {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  align-items: center;
}

.scan-illustration {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-icon-wrapper {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: var(--text-on-primary);
  z-index: 1;
}

.scan-icon-ring {
  position: absolute;
  inset: 0;
  border: 2px solid var(--primary);
  border-radius: 50%;
  opacity: 0.3;
}

.scan-tips {
  width: 100%;
  max-width: 400px;
}

.tips-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 var(--space-md);
  color: var(--accent);
}

.tips-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.tips-list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-secondary);
}

.tips-list i {
  width: 1.25rem;
  color: var(--text-muted);
}

.scan-actions {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.divider {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  color: var(--text-muted);
  font-size: 0.875rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--glass-border);
}

.upload-btn {
  cursor: pointer;
}

.install-prompt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  margin-top: var(--space-md);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%);
  border-color: var(--primary);
}

.install-prompt-content {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.install-prompt-icon {
  width: 40px;
  height: 40px;
  background: var(--primary);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-on-primary);
  font-size: 1.25rem;
  flex-shrink: 0;
}

.install-prompt-text strong {
  display: block;
  font-size: 0.9375rem;
}

.install-prompt-text p {
  margin: 0.125rem 0 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.camera-container {
  position: relative;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  aspect-ratio: 4/3;
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.camera-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.camera-frame {
  position: absolute;
  inset: 15%;
  border: 2px solid var(--primary);
  border-radius: var(--radius-md);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
}

.camera-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  text-align: center;
  background: var(--glass-bg);
}

.camera-error i {
  font-size: 2rem;
  color: var(--error);
}

.camera-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  margin-top: var(--space-md);
}

.btn-capture {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--text-primary);
  border: 4px solid var(--glass-border);
  cursor: pointer;
  position: relative;
  transition: transform 0.2s ease;
}

.btn-capture:hover {
  transform: scale(1.05);
}

.btn-capture:active {
  transform: scale(0.95);
}

.capture-ring {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 2px solid var(--bg-primary);
}

.spacer {
  width: 48px;
}

.preview-image-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: auto;
}

.preview-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  margin-top: var(--space-lg);
}

.offline-notice {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: rgba(245, 158, 11, 0.1);
  border-color: var(--warning);
  margin-top: var(--space-md);
}

.offline-notice i {
  color: var(--warning);
}

.scan-analyzing {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.analyzing-animation {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.analyzing-animation p {
  color: var(--text-secondary);
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.result-confidence {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.confidence-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--success);
}

.result-confidence.low .confidence-value {
  color: var(--warning);
}

.confidence-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.result-card {
  margin-top: var(--space-md);
}

.result-drug-name {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: var(--space-lg);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--glass-border);
}

.result-drug-name h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary);
  margin: 0;
}

.drug-dosage {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.result-section {
  margin-bottom: var(--space-md);
}

.result-section:last-child {
  margin-bottom: 0;
}

.result-section h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}

.result-section h4 i {
  color: var(--primary);
}

.result-section.warning h4 i {
  color: var(--warning);
}

.result-section p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.result-actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-lg);
  flex-wrap: wrap;
}

.result-actions .btn {
  flex: 1;
  min-width: fit-content;
}

.result-actions .btn-icon {
  flex: 0 0 auto;
}
</style>
