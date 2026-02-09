import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { loadSavedLocale } from './i18n'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './styles/main.css'

const isOnboarded = () => localStorage.getItem('echorx-onboarded') === 'true'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/welcome',
            name: 'welcome',
            component: () => import('./views/WelcomeView.vue'),
            meta: { title: 'Welcome', hideNav: true }
        },
        {
            path: '/',
            name: 'scan',
            component: () => import('./views/ScanView.vue'),
            meta: { title: 'Scan Medication' },
            beforeEnter: (to, from, next) => {
                if (!isOnboarded()) {
                    next('/welcome')
                } else {
                    next()
                }
            }
        },
        {
            path: '/schedule',
            name: 'schedule',
            component: () => import('./views/ScheduleView.vue'),
            meta: { title: 'My Schedule' }
        },
        {
            path: '/pharmacies',
            name: 'pharmacies',
            component: () => import('./views/PharmaciesView.vue'),
            meta: { title: 'Find Pharmacies' }
        },
        {
            path: '/help',
            name: 'help',
            component: () => import('./views/HelpView.vue'),
            meta: { title: 'Help & Support' }
        },
        {
            path: '/settings',
            name: 'settings',
            component: () => import('./views/SettingsView.vue'),
            meta: { title: 'Settings' }
        }
    ]
})

router.beforeEach((to) => {
    document.title = `${to.meta.title || 'EchoRx'} | EchoRx`
})

const app = createApp(App)

loadSavedLocale()

app.use(router)

app.mount('#app')

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(console.error)
    })
}
