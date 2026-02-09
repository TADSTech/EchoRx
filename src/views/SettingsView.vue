<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTTS } from '@/composables/useTTS'
import { usePWAInstall } from '@/composables/usePWAInstall'
import { clearAllCache, getStorageUsage } from '@/db'
import { t, locale, setLocale, availableLocales, type LocaleKey } from '@/i18n'

const router = useRouter()
const currentLocale = computed(() => locale.value)

const { state: ttsState, speak, stop, setRate } = useTTS()
const { isInstallable, isInstalled, installApp } = usePWAInstall()

const storageUsed = ref(0)
const storageTotal = ref(0)
const isClearing = ref(false)
const showClearConfirm = ref(false)
const ttsEnabled = ref(true)
const notificationsEnabled = ref(false)

const storagePercentage = computed(() => {
  if (storageTotal.value === 0) return 0
  return Math.round((storageUsed.value / storageTotal.value) * 100)
})

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const loadStorageInfo = async () => {
  const usage = await getStorageUsage()
  storageUsed.value = usage.used
  storageTotal.value = usage.total
}

const handleClearCache = async () => {
  isClearing.value = true
  await clearAllCache()
  await loadStorageInfo()
  isClearing.value = false
  showClearConfirm.value = false
}

const handleLanguageChange = (localeCode: LocaleKey) => {
  setLocale(localeCode)
}

const handleSpeedChange = (event: Event) => {
  const value = parseFloat((event.target as HTMLInputElement).value)
  ttsSpeed.value = value
  setRate(value)
}

const testTTS = () => {
  if (ttsState.isSpeaking) {
    stop()
    return
  }
  
  const testTexts: Record<LocaleKey, string> = {
    'en': 'Welcome to EchoRx. I will read medication instructions slowly and clearly for you.',
    'yo': 'Kaabo si EchoRx. Emi yoo ka awon itosona oogun fun o ni irọrun.',
    'ha': 'Barka da zuwa EchoRx. Zan karanta umarnin magani a hankali a gare ku.',
    'ig': 'Nnọọ na EchoRx. M ga-agụ ntuziaka ọgwụ nwayọọ ma doro anya nye gị.'
  }
  
  speak(testTexts[currentLocale.value] || testTexts['en'], currentLocale.value)
}

const checkNotificationPermission = async () => {
  if ('Notification' in window) {
    notificationsEnabled.value = Notification.permission === 'granted'
  }
}

const toggleNotifications = async () => {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      notificationsEnabled.value = !notificationsEnabled.value
    } else {
      const permission = await Notification.requestPermission()
      notificationsEnabled.value = permission === 'granted'
    }
  }
}

const resetOnboarding = () => {
  localStorage.removeItem('echorx-onboarded')
  router.push('/welcome')
}

onMounted(async () => {
  await loadStorageInfo()
  await checkNotificationPermission()
})
</script>

<template>
  <div class="settings-view">
    <header class="view-header">
      <h2 class="view-title">{{ t('settings.title') }}</h2>
    </header>

    <section class="settings-section card">
      <h3 class="section-title">
        <i class="fas fa-language" aria-hidden="true"></i>
        {{ t('settings.language') }}
      </h3>
      
      <div class="language-options">
        <button
          v-for="loc in availableLocales"
          :key="loc.code"
          class="language-option"
          :class="{ active: currentLocale === loc.code }"
          @click="handleLanguageChange(loc.code)"
          :aria-pressed="currentLocale === loc.code"
        >
          <span class="lang-flag">{{ loc.flag }}</span>
          <span class="lang-name">{{ loc.name }}</span>
          <span class="lang-native">{{ loc.native }}</span>
          <i v-if="currentLocale === loc.code" class="fas fa-check" aria-hidden="true"></i>
        </button>
      </div>
    </section>

    <section class="settings-section card">
      <h3 class="section-title">
        <i class="fas fa-bell" aria-hidden="true"></i>
        {{ t('settings.notifications') }}
      </h3>
      
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Push Notifications</span>
          <span class="setting-description">Get reminders for your medications</span>
        </div>
        <button 
          class="toggle-switch"
          :class="{ active: notificationsEnabled }"
          @click="toggleNotifications"
          role="switch"
          :aria-checked="notificationsEnabled"
        >
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
        </button>
      </div>
    </section>

    <section class="settings-section card">
      <h3 class="section-title">
        <i class="fas fa-universal-access" aria-hidden="true"></i>
        {{ t('settings.accessibility') }}
      </h3>
      
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">{{ t('settings.tts') }}</span>
          <span class="setting-description">Read instructions aloud</span>
        </div>
        <div class="setting-actions">
          <button 
            class="toggle-switch"
            :class="{ active: ttsEnabled }"
            @click="ttsEnabled = !ttsEnabled"
            role="switch"
            :aria-checked="ttsEnabled"
          >
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </button>
        </div>
      </div>

      <div v-if="ttsEnabled && ttsState.isSupported" class="tts-settings">


        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ t('settings.ttsTest') }}</span>
            <span class="setting-description">Test the voice output</span>
          </div>
          <button 
            class="btn btn-secondary btn-sm"
            @click="testTTS"
          >
            <i :class="ttsState.isSpeaking ? 'fas fa-stop' : 'fas fa-play'" aria-hidden="true"></i>
            {{ ttsState.isSpeaking ? 'Stop' : 'Test' }}
          </button>
        </div>
      </div>

      <div v-if="!ttsState.isSupported" class="warning-message">
        <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
        <span>Text-to-speech is not supported on this device</span>
      </div>
    </section>

    <section class="settings-section card">
      <h3 class="section-title">
        <i class="fas fa-database" aria-hidden="true"></i>
        {{ t('settings.data') }}
      </h3>
      
      <div class="storage-info">
        <div class="storage-header">
          <span class="setting-label">{{ t('settings.storageUsed') }}</span>
          <span class="storage-value">{{ formatBytes(storageUsed) }} / {{ formatBytes(storageTotal) }}</span>
        </div>
        <div class="storage-bar">
          <div 
            class="storage-fill" 
            :style="{ width: `${storagePercentage}%` }"
            :class="{ warning: storagePercentage > 80 }"
          ></div>
        </div>
      </div>

      <button 
        class="btn btn-secondary btn-block"
        @click="showClearConfirm = true"
      >
        <i class="fas fa-trash" aria-hidden="true"></i>
        {{ t('settings.clearCache') }}
      </button>
    </section>

    <section class="settings-section card">
      <h3 class="section-title">
        <i class="fas fa-info-circle" aria-hidden="true"></i>
        {{ t('settings.about') }}
      </h3>
      
      <div class="about-info">
        <div class="app-brand">
          <i class="fas fa-pills" aria-hidden="true"></i>
          <div>
            <strong>EchoRx</strong>
            <span>{{ t('settings.version') }} 1.0.0</span>
          </div>
        </div>
        <p class="about-description">
          Offline-first medication scanning and reminder app for Nigeria.
          Supports Yoruba, Hausa, Igbo and English languages.
        </p>
        
        <div class="about-actions">
          <router-link to="/help" class="btn btn-secondary btn-sm">
            <i class="fas fa-question-circle" aria-hidden="true"></i>
            {{ t('settings.help') }}
          </router-link>
          
          <button class="btn btn-secondary btn-sm" @click="resetOnboarding">
            <i class="fas fa-redo" aria-hidden="true"></i>
            View Welcome
          </button>
        </div>
      </div>
    </section>

    <section class="settings-section card install-section">
      <h3 class="section-title">
        <i class="fas fa-mobile-alt" aria-hidden="true"></i>
        Install App
      </h3>
      
      <div v-if="isInstalled" class="install-status installed">
        <i class="fas fa-check-circle" aria-hidden="true"></i>
        <div>
          <strong>App Installed</strong>
          <p>EchoRx is installed on your device</p>
        </div>
      </div>
      
      <div v-else-if="isInstallable" class="install-status">
        <div class="install-info">
          <i class="fas fa-download" aria-hidden="true"></i>
          <div>
            <strong>Install EchoRx</strong>
            <p>Add to your home screen for quick access and offline use</p>
          </div>
        </div>
        <button class="btn btn-primary btn-block" @click="installApp">
          <i class="fas fa-download" aria-hidden="true"></i>
          Install Now
        </button>
      </div>
      
      <div v-else class="install-status not-available">
        <i class="fas fa-info-circle" aria-hidden="true"></i>
        <div>
          <strong>Installation</strong>
          <p>Open EchoRx in Chrome, Safari, or Edge on your phone to install it as an app</p>
        </div>
      </div>
    </section>

    <div 
      v-if="showClearConfirm" 
      class="modal-overlay"
      @click.self="showClearConfirm = false"
    >
      <div class="modal card" role="alertdialog" aria-modal="true">
        <div class="modal-content">
          <i class="fas fa-exclamation-triangle warning-icon" aria-hidden="true"></i>
          <h3>{{ t('settings.clearCache') }}</h3>
          <p>{{ t('settings.clearCacheConfirm') }}</p>
        </div>
        <div class="modal-actions">
          <button 
            class="btn btn-secondary"
            @click="showClearConfirm = false"
          >
            {{ t('common.cancel') }}
          </button>
          <button 
            class="btn btn-primary"
            @click="handleClearCache"
            :disabled="isClearing"
          >
            <span v-if="isClearing" class="loading-spinner small"></span>
            {{ isClearing ? 'Clearing...' : t('common.ok') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.view-header {
  text-align: center;
  margin-bottom: var(--space-sm);
}

.view-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.section-title i {
  color: var(--primary);
}

.language-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.language-option {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.language-option:hover {
  background: var(--glass-bg-strong);
}

.language-option.active {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

.lang-flag {
  font-size: 1.25rem;
}

.lang-name {
  font-weight: 600;
}

.lang-native {
  color: var(--text-secondary);
  margin-left: auto;
}

.language-option i {
  color: var(--primary);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.setting-label {
  font-weight: 500;
}

.setting-description {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.toggle-switch {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.toggle-track {
  display: block;
  width: 48px;
  height: 28px;
  background: var(--glass-border);
  border-radius: var(--radius-pill);
  position: relative;
  transition: background 0.2s ease;
}

.toggle-switch.active .toggle-track {
  background: var(--primary);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  background: var(--text-primary);
  border-radius: 50%;
  transition: transform 0.2s ease;
}

.toggle-switch.active .toggle-thumb {
  transform: translateX(20px);
}

.tts-settings {
  border-top: 1px solid var(--glass-border);
  padding-top: var(--space-md);
  margin-top: var(--space-sm);
}

.speed-slider {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
}

.speed-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  min-width: 40px;
}

.slider {
  flex: 1;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--glass-border);
  appearance: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  border: none;
}

.warning-message {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: rgba(245, 158, 11, 0.1);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  color: var(--warning);
}

.storage-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.storage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.storage-value {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.storage-bar {
  height: 8px;
  background: var(--glass-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.storage-fill {
  height: 100%;
  background: var(--primary);
  border-radius: var(--radius-pill);
  transition: width 0.3s ease;
}

.storage-fill.warning {
  background: var(--warning);
}

.about-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.app-brand {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.app-brand i {
  font-size: 2rem;
  color: var(--primary);
}

.app-brand div {
  display: flex;
  flex-direction: column;
}

.app-brand strong {
  font-size: 1.125rem;
}

.app-brand span {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.about-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}

.about-actions {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
  z-index: 200;
}

.modal {
  width: 100%;
  max-width: 360px;
  text-align: center;
}

.modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.warning-icon {
  font-size: 2.5rem;
  color: var(--warning);
}

.modal-content h3 {
  margin: 0;
}

.modal-content p {
  color: var(--text-secondary);
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: var(--space-md);
}

.modal-actions .btn {
  flex: 1;
}

.loading-spinner.small {
  width: 1rem;
  height: 1rem;
  border-width: 2px;
}

.install-section {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0.02) 100%);
}

.install-status {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.install-status.installed,
.install-status.not-available {
  flex-direction: row;
  align-items: flex-start;
  gap: var(--space-md);
}

.install-status.installed > i {
  font-size: 1.5rem;
  color: var(--success);
}

.install-status.not-available > i {
  font-size: 1.5rem;
  color: var(--text-muted);
}

.install-info {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
}

.install-info > i {
  font-size: 1.5rem;
  color: var(--primary);
}

.install-status strong {
  display: block;
  font-size: 0.9375rem;
}

.install-status p {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.4;
}
</style>
