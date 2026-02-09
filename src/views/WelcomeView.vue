<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { t, setLocale, availableLocales, type LocaleKey } from '@/i18n'
import { usePWAInstall } from '@/composables/usePWAInstall'

const router = useRouter()
const selectedLocale = ref<LocaleKey>('en')
const showRegionNotice = ref(true)

const { isInstallable, isInstalled, installApp } = usePWAInstall()

const selectLanguage = (code: LocaleKey) => {
  selectedLocale.value = code
  setLocale(code)
}

const getStarted = () => {
  localStorage.setItem('echorx-onboarded', 'true')
  router.push('/')
}

const handleInstall = async () => {
  await installApp()
}

const features = [
  { icon: 'fa-camera', key: 'welcome.features.scan' },
  { icon: 'fa-language', key: 'welcome.features.multilingual' },
  { icon: 'fa-bell', key: 'welcome.features.reminders' },
  { icon: 'fa-map-marker-alt', key: 'welcome.features.pharmacies' },
  { icon: 'fa-wifi-slash', key: 'welcome.features.offline' }
]

const upcomingRegions = [
  { name: 'Kenya', flag: '🇰🇪', languages: ['Swahili', 'English'] },
  { name: 'India', flag: '🇮🇳', languages: ['Hindi', 'English'] },
  { name: 'Ghana', flag: '🇬🇭', languages: ['Twi', 'English'] },
  { name: 'Tanzania', flag: '🇹🇿', languages: ['Swahili', 'English'] }
]
</script>

<template>
  <div class="welcome-view">
    <div class="hero-section">
      <div class="hero-bg-pattern"></div>
      
      <div class="hero-content">
        <div class="logo-container">
          <div class="logo-icon">
            <i class="fas fa-pills" aria-hidden="true"></i>
          </div>
          <h1 class="app-name">EchoRx</h1>
          <p class="tagline">{{ t('welcome.tagline') }}</p>
        </div>

        <div v-if="showRegionNotice" class="region-notice">
          <div class="notice-header">
            <span class="flag">🇳🇬</span>
            <strong>{{ t('welcome.nigeriaOnly') }}</strong>
          </div>
          <p>{{ t('welcome.nigeriaOnlyText') }}</p>
          
          <div class="upcoming-regions">
            <span class="coming-soon-label">{{ t('welcome.comingSoon') }}</span>
            <div class="region-badges">
              <span 
                v-for="region in upcomingRegions" 
                :key="region.name"
                class="region-badge"
                :title="region.languages.join(', ')"
              >
                {{ region.flag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="main-content">
      <section class="language-section card">
        <h2>
          <i class="fas fa-language" aria-hidden="true"></i>
          {{ t('welcome.chooseLanguage') }}
        </h2>
        
        <div class="language-grid">
          <button
            v-for="locale in availableLocales"
            :key="locale.code"
            class="language-card"
            :class="{ selected: selectedLocale === locale.code }"
            @click="selectLanguage(locale.code)"
          >
            <span class="lang-native">{{ locale.native }}</span>
            <span class="lang-name">{{ locale.name }}</span>
            <i v-if="selectedLocale === locale.code" class="fas fa-check-circle" aria-hidden="true"></i>
          </button>
        </div>
      </section>

      <section class="features-section">
        <h2>{{ t('welcome.whatYouCanDo') }}</h2>
        
        <div class="features-list">
          <div 
            v-for="feature in features" 
            :key="feature.key"
            class="feature-item"
          >
            <div class="feature-icon">
              <i :class="`fas ${feature.icon}`" aria-hidden="true"></i>
            </div>
            <span class="feature-text">{{ t(feature.key) }}</span>
          </div>
        </div>
      </section>

      <section class="cta-section">
        <button 
          class="btn btn-primary btn-lg btn-block get-started-btn"
          @click="getStarted"
        >
          <span>{{ t('welcome.getStarted') }}</span>
          <i class="fas fa-arrow-right" aria-hidden="true"></i>
        </button>

        <button 
          v-if="isInstallable && !isInstalled"
          class="btn btn-secondary btn-lg btn-block install-app-btn"
          @click="handleInstall"
        >
          <i class="fas fa-download" aria-hidden="true"></i>
          <span>Install App</span>
        </button>
        
        <p class="privacy-note">
          <i class="fas fa-shield-alt" aria-hidden="true"></i>
          {{ t('welcome.privacyNote') }}
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.welcome-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.hero-section {
  position: relative;
  padding: var(--space-2xl) var(--space-md);
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: var(--text-on-primary);
  overflow: hidden;
}

.hero-bg-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
                    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%);
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: var(--max-width);
  margin: 0 auto;
}

.logo-container {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.logo-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--space-md);
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
}

.app-name {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}

.tagline {
  font-size: 1.125rem;
  opacity: 0.9;
  margin: 0;
}

.region-notice {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.notice-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.flag {
  font-size: 1.5rem;
}

.region-notice p {
  margin: 0 0 var(--space-md);
  opacity: 0.9;
  font-size: 0.875rem;
  line-height: 1.5;
}

.upcoming-regions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.coming-soon-label {
  font-size: 0.75rem;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.region-badges {
  display: flex;
  gap: 0.25rem;
}

.region-badge {
  font-size: 1.25rem;
  cursor: help;
  transition: transform 0.2s ease;
}

.region-badge:hover {
  transform: scale(1.2);
}

.main-content {
  flex: 1;
  padding: var(--space-lg) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  max-width: var(--max-width);
  margin: 0 auto;
  width: 100%;
}

.language-section h2,
.features-section h2 {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 var(--space-md);
}

.language-section h2 i {
  color: var(--primary);
}

.language-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-sm);
}

.language-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: var(--space-md);
  background: var(--glass-bg);
  border: 2px solid var(--glass-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.language-card:hover {
  background: var(--glass-bg-strong);
  transform: translateY(-2px);
}

.language-card.selected {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

.language-card .lang-native {
  font-size: 1.125rem;
  font-weight: 600;
}

.language-card .lang-name {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.language-card i {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  color: var(--primary);
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.feature-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.feature-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-on-primary);
  font-size: 1.125rem;
}

.feature-text {
  font-size: 0.9375rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.cta-section {
  margin-top: auto;
  padding-top: var(--space-lg);
}

.get-started-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  font-size: 1.125rem;
  padding: 1rem 2rem;
}

.get-started-btn i {
  transition: transform 0.2s ease;
}

.get-started-btn:hover i {
  transform: translateX(4px);
}

.install-app-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  font-size: 1rem;
  padding: 0.875rem 2rem;
  margin-top: var(--space-sm);
}

.privacy-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  margin-top: var(--space-md);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.privacy-note i {
  color: var(--success);
}
</style>
