<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { setLocale, locale, t } from './i18n'
import { usePWAInstall } from './composables/usePWAInstall'

const route = useRoute()

const { isInstallable, isInstalled, showInstallBanner, installApp, dismissBanner } = usePWAInstall()

const isOnline = ref(navigator.onLine)

window.addEventListener('online', () => { isOnline.value = true })
window.addEventListener('offline', () => { isOnline.value = false })

const navItems = computed(() => [
  { path: '/', icon: 'fa-camera', label: t('nav.scan') },
  { path: '/schedule', icon: 'fa-clock', label: t('nav.schedule') },
  { path: '/pharmacies', icon: 'fa-map-marker-alt', label: t('nav.pharmacies') },
  { path: '/help', icon: 'fa-question-circle', label: t('nav.help') },
  { path: '/settings', icon: 'fa-cog', label: t('nav.settings') }
])

const toggleLanguage = () => {
  const locales = ['en', 'yo', 'ha', 'ig'] as const
  const currentIndex = locales.indexOf(locale.value)
  const nextIndex = (currentIndex + 1) % locales.length
  setLocale(locales[nextIndex])
}

const currentLocale = computed(() => locale.value)

const hideNav = computed(() => route.meta.hideNav === true)

const handleInstall = async () => {
  await installApp()
}
</script>

<template>
  <div class="app-shell" :class="{ 'no-nav': hideNav }">
    <a href="#main-content" class="skip-link">
      {{ t('accessibility.skipToMain') }}
    </a>

    <Transition name="slide-down">
      <div v-if="showInstallBanner && !isInstalled" class="install-banner">
        <div class="install-content">
          <i class="fas fa-download" aria-hidden="true"></i>
          <div class="install-text">
            <strong>Install EchoRx</strong>
            <span>Quick access, works offline</span>
          </div>
        </div>
        <div class="install-actions">
          <button class="btn btn-primary btn-sm" @click="handleInstall">
            Install
          </button>
          <button class="btn-dismiss" @click="dismissBanner" aria-label="Dismiss">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </Transition>

    <header v-if="!hideNav" class="app-header glass" role="banner">
      <div class="header-content">
        <h1 class="app-logo">
          <i class="fas fa-pills" aria-hidden="true"></i>
          <span>EchoRx</span>
        </h1>
        
        <div class="header-actions">
          <button 
            v-if="isInstallable && !isInstalled"
            class="install-btn btn-icon"
            @click="handleInstall"
            title="Install App"
            aria-label="Install EchoRx app"
          >
            <i class="fas fa-download" aria-hidden="true"></i>
          </button>

          <div 
            class="connection-status"
            :class="{ online: isOnline, offline: !isOnline }"
            role="status"
            :aria-label="isOnline ? t('status.online') : t('status.offline')"
          >
            <i :class="isOnline ? 'fas fa-wifi' : 'fas fa-wifi-slash'" aria-hidden="true"></i>
            <span class="sr-only">{{ isOnline ? t('status.online') : t('status.offline') }}</span>
          </div>

          <button 
            class="lang-toggle btn-icon"
            @click="toggleLanguage"
            :aria-label="t('settings.changeLanguage')"
            :title="t('settings.changeLanguage')"
          >
            <span class="lang-code">{{ currentLocale.toUpperCase() }}</span>
          </button>
        </div>
      </div>
    </header>

    <main id="main-content" class="app-main" role="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <nav v-if="!hideNav" class="app-nav glass" role="navigation" :aria-label="t('nav.main')">
      <ul class="nav-list">
        <li v-for="item in navItems" :key="item.path">
          <router-link 
            :to="item.path"
            class="nav-item"
            :class="{ active: route.path === item.path }"
            :aria-current="route.path === item.path ? 'page' : undefined"
          >
            <i :class="`fas ${item.icon}`" aria-hidden="true"></i>
            <span class="nav-label">{{ item.label }}</span>
          </router-link>
        </li>
      </ul>
    </nav>

    <div 
      v-if="!isOnline && !hideNav" 
      class="offline-banner" 
      role="alert"
      aria-live="polite"
    >
      <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
      <span>{{ t('status.offlineMode') }}</span>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg-gradient);
}

.app-shell.no-nav .app-main {
  padding-bottom: 0;
}

.skip-link {
  position: absolute;
  top: -100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 2rem;
  background: var(--primary);
  color: var(--text-on-primary);
  border-radius: var(--radius-md);
  z-index: 9999;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 1rem;
}

.install-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: 0.75rem var(--space-md);
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: var(--text-on-primary);
  z-index: 200;
  box-shadow: var(--shadow-lg);
}

.install-content {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.install-content i {
  font-size: 1.25rem;
}

.install-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.install-text strong {
  font-size: 0.9375rem;
}

.install-text span {
  font-size: 0.75rem;
  opacity: 0.85;
}

.install-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.install-actions .btn {
  white-space: nowrap;
}

.btn-dismiss {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: var(--text-on-primary);
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-dismiss:hover {
  background: rgba(255, 255, 255, 0.3);
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 1rem var(--space-md);
  border-bottom: 1px solid var(--glass-border);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: var(--max-width);
  margin: 0 auto;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.app-logo i {
  color: var(--primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.install-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: var(--primary);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-on-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  animation: pulse 2s infinite;
}

.install-btn:hover {
  transform: scale(1.05);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.connection-status {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  font-size: 0.875rem;
}

.connection-status.online {
  color: var(--success);
}

.connection-status.offline {
  color: var(--warning);
}

.lang-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.75rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.lang-toggle:hover,
.lang-toggle:focus {
  background: var(--primary);
  color: var(--text-on-primary);
  border-color: var(--primary);
}

.app-main {
  flex: 1;
  padding: var(--space-md);
  padding-bottom: calc(70px + var(--space-md));
  max-width: var(--max-width);
  margin: 0 auto;
  width: 100%;
}

.app-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5rem var(--space-md);
  border-top: 1px solid var(--glass-border);
  z-index: 100;
}

.nav-list {
  display: flex;
  justify-content: space-around;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  max-width: var(--max-width);
  margin: 0 auto;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
  position: relative;
}

.nav-item i {
  font-size: 1.125rem;
}

.nav-label {
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-item:hover,
.nav-item:focus {
  color: var(--primary);
  background: var(--glass-bg);
}

.nav-item.active {
  color: var(--primary);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 2rem;
  height: 3px;
  background: var(--primary);
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
}

.offline-banner {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--warning);
  color: var(--bg-primary);
  border-radius: var(--radius-pill);
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: var(--shadow-lg);
  z-index: 99;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
