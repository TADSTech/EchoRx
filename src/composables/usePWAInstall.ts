import { ref, onMounted, onUnmounted } from 'vue'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const isInstallable = ref(false)
const isInstalled = ref(false)
const showInstallBanner = ref(false)

export const usePWAInstall = () => {
    const VISIT_COUNT_KEY = 'echorx-visit-count'
    const INSTALL_DISMISSED_KEY = 'echorx-install-dismissed'
    const INSTALL_PROMPT_INTERVAL = 10

    const checkIfInstalled = (): boolean => {
        if (window.matchMedia('(display-mode: standalone)').matches) return true
        if ((window.navigator as any).standalone === true) return true
        return document.referrer.includes('android-app://')
    }

    const incrementVisitCount = (): number => {
        const count = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10)
        const newCount = count + 1
        localStorage.setItem(VISIT_COUNT_KEY, newCount.toString())
        return newCount
    }

    const shouldShowPrompt = (visitCount: number): boolean => {
        const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY)
        if (dismissed) {
            const dismissedTime = parseInt(dismissed, 10)
            const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
            if (daysSinceDismissed < 7) return false
        }

        return visitCount === 1 || visitCount % INSTALL_PROMPT_INTERVAL === 0
    }

    const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault()
        deferredPrompt.value = e as BeforeInstallPromptEvent
        isInstallable.value = true

        const visitCount = incrementVisitCount()
        if (shouldShowPrompt(visitCount)) {
            showInstallBanner.value = true
        }
    }

    const handleAppInstalled = () => {
        isInstalled.value = true
        isInstallable.value = false
        showInstallBanner.value = false
        deferredPrompt.value = null
    }

    const installApp = async (): Promise<boolean> => {
        if (!deferredPrompt.value) return false

        try {
            await deferredPrompt.value.prompt()
            const { outcome } = await deferredPrompt.value.userChoice

            if (outcome === 'accepted') {
                isInstalled.value = true
                showInstallBanner.value = false
            }

            deferredPrompt.value = null
            isInstallable.value = false

            return outcome === 'accepted'
        } catch (error) {
            console.error('Install prompt failed:', error)
            return false
        }
    }

    const dismissBanner = () => {
        showInstallBanner.value = false
        localStorage.setItem(INSTALL_DISMISSED_KEY, Date.now().toString())
    }

    const init = () => {
        isInstalled.value = checkIfInstalled()

        if (!isInstalled.value) {
            window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.addEventListener('appinstalled', handleAppInstalled)
        }
    }

    const cleanup = () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.removeEventListener('appinstalled', handleAppInstalled)
    }

    onMounted(init)
    onUnmounted(cleanup)

    return {
        isInstallable,
        isInstalled,
        showInstallBanner,
        installApp,
        dismissBanner
    }
}
