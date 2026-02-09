import { ref } from 'vue'
import en from './locales/en.json'
import yo from './locales/yo.json'
import ha from './locales/ha.json'
import ig from './locales/ig.json'

export type LocaleKey = 'en' | 'yo' | 'ha' | 'ig'
type Messages = typeof en

const messages: Record<LocaleKey, Messages> = { en, yo, ha, ig }

export const locale = ref<LocaleKey>('en')

const getNestedValue = (obj: any, path: string): string => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj) || path
}

export const t = (key: string): string => {
    return getNestedValue(messages[locale.value], key)
}

export const i18n = {
    locale,
    t,
    messages
}

export type I18n = typeof i18n

export const setLocale = (newLocale: LocaleKey) => {
    locale.value = newLocale
    localStorage.setItem('echorx-locale', newLocale)
    document.documentElement.lang = newLocale
}

export type SetLocale = typeof setLocale

export const loadSavedLocale = () => {
    const saved = localStorage.getItem('echorx-locale') as LocaleKey | null
    if (saved && messages[saved]) {
        locale.value = saved
        document.documentElement.lang = saved
    }
}

export const availableLocales: { code: LocaleKey; name: string; native: string; flag: string }[] = [
    { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
    { code: 'yo', name: 'Yoruba', native: 'Yorùbá', flag: '🇳🇬' },
    { code: 'ha', name: 'Hausa', native: 'Hausa', flag: '🇳🇬' },
    { code: 'ig', name: 'Igbo', native: 'Igbo', flag: '🇳🇬' }
]
