import Dexie, { type Table } from 'dexie'

export interface Drug {
    id?: number
    name: string
    nameYoruba?: string
    dosage: string
    instructions: string
    instructionsYoruba?: string
    warnings?: string
    warningsYoruba?: string
    sideEffects?: string
    sideEffectsYoruba?: string
    imageData?: string
    scannedAt: Date
    source: 'gemini' | 'offline' | 'manual'
}

export interface Schedule {
    id?: number
    drugId?: number
    drugName: string
    dosage: string
    time: string
    frequency: 'daily' | 'weekly' | 'asNeeded'
    days?: number[]
    notes?: string
    enabled: boolean
    lastTaken?: Date
    createdAt: Date
    updatedAt: Date
}

export interface Pharmacy {
    id?: number
    name: string
    address: string
    city: string
    state: string
    latitude: number
    longitude: number
    phone?: string
    hours?: string
    isOpen24Hours?: boolean
}

export interface CacheEntry {
    id?: number
    key: string
    data: string
    size: number
    accessedAt: Date
    createdAt: Date
}

export interface AppSettings {
    id?: number
    key: string
    value: string
}

class EchoRxDatabase extends Dexie {
    drugs!: Table<Drug>
    schedules!: Table<Schedule>
    pharmacies!: Table<Pharmacy>
    cache!: Table<CacheEntry>
    settings!: Table<AppSettings>

    constructor() {
        super('EchoRxDB')

        this.version(1).stores({
            drugs: '++id, name, scannedAt, source',
            schedules: '++id, drugId, drugName, time, enabled, createdAt',
            pharmacies: '++id, name, city, state, [latitude+longitude]',
            cache: '++id, key, accessedAt, createdAt',
            settings: '++id, &key'
        })
    }
}

export const db = new EchoRxDatabase()

const MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024

export async function getCacheEntry(key: string): Promise<string | null> {
    const entry = await db.cache.where('key').equals(key).first()
    if (entry) {
        await db.cache.update(entry.id!, { accessedAt: new Date() })
        return entry.data
    }
    return null
}

export async function setCacheEntry(key: string, data: string): Promise<void> {
    const size = new Blob([data]).size

    await evictCacheIfNeeded(size)

    const existing = await db.cache.where('key').equals(key).first()
    if (existing) {
        await db.cache.update(existing.id!, {
            data,
            size,
            accessedAt: new Date()
        })
    } else {
        await db.cache.add({
            key,
            data,
            size,
            accessedAt: new Date(),
            createdAt: new Date()
        })
    }
}

async function evictCacheIfNeeded(incomingSize: number): Promise<void> {
    const allEntries = await db.cache.toArray()
    let totalSize = allEntries.reduce((sum, e) => sum + e.size, 0)

    if (totalSize + incomingSize <= MAX_CACHE_SIZE_BYTES) return

    const sortedByAccess = allEntries.sort(
        (a, b) => a.accessedAt.getTime() - b.accessedAt.getTime()
    )

    for (const entry of sortedByAccess) {
        if (totalSize + incomingSize <= MAX_CACHE_SIZE_BYTES) break
        await db.cache.delete(entry.id!)
        totalSize -= entry.size
    }
}

export async function clearAllCache(): Promise<void> {
    await db.cache.clear()
}

export async function getStorageUsage(): Promise<{ used: number; total: number }> {
    const entries = await db.cache.toArray()
    const used = entries.reduce((sum, e) => sum + e.size, 0)
    return { used, total: MAX_CACHE_SIZE_BYTES }
}

export async function getSetting(key: string): Promise<string | null> {
    const setting = await db.settings.where('key').equals(key).first()
    return setting?.value ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
    const existing = await db.settings.where('key').equals(key).first()
    if (existing) {
        await db.settings.update(existing.id!, { value })
    } else {
        await db.settings.add({ key, value })
    }
}
