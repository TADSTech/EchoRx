<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { db, type Pharmacy } from '@/db'
import { t } from '@/i18n'
import pharmaciesData from '@/data/pharmacies-nigeria.json'

const pharmacies = ref<Pharmacy[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const userLocation = ref<{ lat: number; lng: number } | null>(null)
const locationError = ref('')
const viewMode = ref<'list' | 'map'>('list')
const isOnline = ref(navigator.onLine)

window.addEventListener('online', () => { isOnline.value = true })
window.addEventListener('offline', () => { isOnline.value = false })

const loadPharmacies = async () => {
  isLoading.value = true
  
  let dbPharmacies = await db.pharmacies.toArray()
  
  if (dbPharmacies.length === 0) {
    const features = (pharmaciesData as any).features || []
    for (const feature of features) {
      const pharmacy: Omit<Pharmacy, 'id'> = {
        name: feature.properties.name,
        address: feature.properties.address,
        city: feature.properties.city,
        state: feature.properties.state,
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
        phone: feature.properties.phone,
        hours: feature.properties.hours,
        isOpen24Hours: feature.properties.is24Hours
      }
      await db.pharmacies.add(pharmacy)
    }
    dbPharmacies = await db.pharmacies.toArray()
  }
  
  pharmacies.value = dbPharmacies
  isLoading.value = false
}

const getUserLocation = () => {
  if (!navigator.geolocation) {
    locationError.value = 'Geolocation not supported'
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation.value = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
      locationError.value = ''
    },
    (error) => {
      locationError.value = error.message
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const filteredPharmacies = computed(() => {
  let filtered = pharmacies.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.address.toLowerCase().includes(query) ||
      p.city.toLowerCase().includes(query)
    )
  }

  if (userLocation.value) {
    filtered = filtered.map(p => ({
      ...p,
      distance: calculateDistance(
        userLocation.value!.lat,
        userLocation.value!.lng,
        p.latitude,
        p.longitude
      )
    })).sort((a, b) => (a as any).distance - (b as any).distance)
  }

  return filtered
})

const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

const isOpenNow = (pharmacy: Pharmacy): boolean => {
  if (pharmacy.isOpen24Hours) return true
  return true
}

const getDirections = (pharmacy: Pharmacy) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`
  window.open(url, '_blank')
}

const callPharmacy = (phone: string) => {
  window.location.href = `tel:${phone}`
}

onMounted(async () => {
  await loadPharmacies()
  getUserLocation()
})
</script>

<template>
  <div class="pharmacies-view">
    <header class="view-header">
      <h2 class="view-title">{{ t('pharmacies.title') }}</h2>
      <p class="view-subtitle">{{ t('pharmacies.subtitle') }}</p>
    </header>

    <div v-if="!isOnline" class="offline-notice card">
      <i class="fas fa-wifi-slash" aria-hidden="true"></i>
      <span>{{ t('pharmacies.offlineData') }}</span>
    </div>

    <div class="search-bar">
      <i class="fas fa-search" aria-hidden="true"></i>
      <input 
        v-model="searchQuery"
        type="search"
        class="input search-input"
        :placeholder="t('pharmacies.search')"
        aria-label="Search pharmacies"
      >
    </div>

    <div class="view-controls">
      <button 
        class="view-toggle"
        :class="{ active: viewMode === 'list' }"
        @click="viewMode = 'list'"
        aria-label="Switch to list view"
      >
        <i class="fas fa-list" aria-hidden="true"></i>
        {{ t('pharmacies.listView') }}
      </button>
      <button 
        class="view-toggle"
        :class="{ active: viewMode === 'map' }"
        @click="viewMode = 'map'"
        aria-label="Switch to map view"
      >
        <i class="fas fa-map" aria-hidden="true"></i>
        {{ t('pharmacies.mapView') }}
      </button>
    </div>

    <div 
      v-if="!userLocation && !locationError" 
      class="location-prompt card"
    >
      <div class="prompt-content">
        <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
        <div>
          <strong>{{ t('pharmacies.locationRequired') }}</strong>
          <p>{{ t('pharmacies.locationRequiredText') }}</p>
        </div>
      </div>
      <button 
        class="btn btn-primary btn-sm"
        @click="getUserLocation"
      >
        {{ t('pharmacies.enableLocation') }}
      </button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading pharmacies...</p>
    </div>

    <div v-else-if="viewMode === 'list'" class="pharmacies-list">
      <div class="results-count">
        <span>{{ filteredPharmacies.length }} pharmacies found</span>
      </div>

      <div v-if="filteredPharmacies.length === 0" class="empty-state">
        <i class="fas fa-store-slash" aria-hidden="true"></i>
        <p>{{ t('pharmacies.noResults') }}</p>
      </div>

      <div 
        v-for="pharmacy in filteredPharmacies" 
        :key="pharmacy.id"
        class="pharmacy-card card"
      >
        <div class="pharmacy-header">
          <div class="pharmacy-info">
            <h3 class="pharmacy-name">{{ pharmacy.name }}</h3>
            <p class="pharmacy-address">{{ pharmacy.address }}, {{ pharmacy.city }}</p>
          </div>
          
          <div v-if="(pharmacy as any).distance" class="pharmacy-distance">
            <span class="distance-value">{{ formatDistance((pharmacy as any).distance) }}</span>
          </div>
        </div>

        <div class="pharmacy-meta">
          <span 
            class="status-badge"
            :class="isOpenNow(pharmacy) ? 'open' : 'closed'"
          >
            <i :class="isOpenNow(pharmacy) ? 'fas fa-door-open' : 'fas fa-door-closed'" aria-hidden="true"></i>
            {{ isOpenNow(pharmacy) ? t('pharmacies.open') : t('pharmacies.closed') }}
          </span>
          
          <span v-if="pharmacy.hours" class="pharmacy-hours">
            <i class="fas fa-clock" aria-hidden="true"></i>
            {{ pharmacy.hours }}
          </span>
        </div>

        <div class="pharmacy-actions">
          <button 
            class="btn btn-primary btn-sm"
            @click="getDirections(pharmacy)"
            :aria-label="`Get directions to ${pharmacy.name}`"
          >
            <i class="fas fa-directions" aria-hidden="true"></i>
            {{ t('pharmacies.getDirections') }}
          </button>
          
          <button 
            v-if="pharmacy.phone"
            class="btn btn-secondary btn-sm"
            @click="callPharmacy(pharmacy.phone!)"
            :aria-label="`Call ${pharmacy.name}`"
          >
            <i class="fas fa-phone" aria-hidden="true"></i>
            {{ t('pharmacies.call') }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="map-placeholder card">
      <div class="map-icon">
        <i class="fas fa-map-marked-alt" aria-hidden="true"></i>
      </div>
      <h3>Map View</h3>
      <p>Map view coming soon! For now, use list view to find pharmacies.</p>
      <button class="btn btn-secondary" @click="viewMode = 'list'">
        Switch to List
      </button>
    </div>
  </div>
</template>

<style scoped>
.pharmacies-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.view-header {
  text-align: center;
}

.view-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
}

.view-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.offline-notice {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: rgba(245, 158, 11, 0.1);
  border-color: var(--warning);
}

.offline-notice i {
  color: var(--warning);
}

.search-bar {
  position: relative;
}

.search-bar i {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-input {
  padding-left: 2.5rem;
}

.view-controls {
  display: flex;
  gap: var(--space-sm);
}

.view-toggle {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-toggle:hover {
  background: var(--glass-bg-strong);
}

.view-toggle.active {
  background: var(--primary);
  color: var(--text-on-primary);
  border-color: var(--primary);
}

.location-prompt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.prompt-content {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.prompt-content i {
  font-size: 1.5rem;
  color: var(--primary);
}

.prompt-content p {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl);
  gap: var(--space-md);
}

.loading-state p {
  color: var(--text-secondary);
  margin: 0;
}

.results-count {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.empty-state {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--text-muted);
}

.empty-state i {
  font-size: 2rem;
  margin-bottom: var(--space-md);
}

.pharmacies-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.pharmacy-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.pharmacy-header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
}

.pharmacy-info {
  flex: 1;
}

.pharmacy-name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  color: var(--text-primary);
}

.pharmacy-address {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.pharmacy-distance {
  text-align: right;
}

.distance-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--primary);
}

.pharmacy-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.open {
  background: rgba(34, 197, 94, 0.2);
  color: var(--success);
}

.status-badge.closed {
  background: rgba(239, 68, 68, 0.2);
  color: var(--error);
}

.pharmacy-hours {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.pharmacy-actions {
  display: flex;
  gap: var(--space-sm);
}

.map-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-2xl);
  text-align: center;
}

.map-icon {
  width: 80px;
  height: 80px;
  background: var(--glass-bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: var(--text-muted);
}

.map-placeholder p {
  color: var(--text-secondary);
  max-width: 300px;
}
</style>
