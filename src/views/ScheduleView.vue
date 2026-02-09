<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { db, type Schedule } from '@/db'
import { t } from '@/i18n'

const schedules = ref<Schedule[]>([])
const isLoading = ref(true)
const showAddModal = ref(false)
const editingSchedule = ref<Schedule | null>(null)
const notificationPermission = ref<NotificationPermission>('default')

const newSchedule = ref({
  drugName: '',
  dosage: '',
  time: '08:00',
  frequency: 'daily' as 'daily' | 'weekly' | 'asNeeded',
  notes: ''
})

const loadSchedules = async () => {
  isLoading.value = true
  schedules.value = await db.schedules.orderBy('time').toArray()
  isLoading.value = false
}

const checkNotificationPermission = async () => {
  if ('Notification' in window) {
    notificationPermission.value = Notification.permission
  }
}

const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    notificationPermission.value = permission
  }
}

const openAddModal = () => {
  editingSchedule.value = null
  newSchedule.value = {
    drugName: '',
    dosage: '',
    time: '08:00',
    frequency: 'daily',
    notes: ''
  }
  showAddModal.value = true
}

const openEditModal = (schedule: Schedule) => {
  editingSchedule.value = schedule
  newSchedule.value = {
    drugName: schedule.drugName,
    dosage: schedule.dosage,
    time: schedule.time,
    frequency: schedule.frequency,
    notes: schedule.notes || ''
  }
  showAddModal.value = true
}

const saveSchedule = async () => {
  const scheduleData: Omit<Schedule, 'id'> = {
    drugName: newSchedule.value.drugName,
    dosage: newSchedule.value.dosage,
    time: newSchedule.value.time,
    frequency: newSchedule.value.frequency,
    notes: newSchedule.value.notes || undefined,
    enabled: true,
    createdAt: editingSchedule.value?.createdAt || new Date(),
    updatedAt: new Date()
  }

  if (editingSchedule.value?.id) {
    await db.schedules.update(editingSchedule.value.id, scheduleData)
  } else {
    await db.schedules.add(scheduleData)
  }

  showAddModal.value = false
  await loadSchedules()
  scheduleNotification(scheduleData)
}

const deleteSchedule = async (id: number) => {
  await db.schedules.delete(id)
  await loadSchedules()
}

const toggleSchedule = async (schedule: Schedule) => {
  if (schedule.id) {
    await db.schedules.update(schedule.id, { 
      enabled: !schedule.enabled,
      updatedAt: new Date()
    })
    await loadSchedules()
  }
}

const markAsTaken = async (schedule: Schedule) => {
  if (schedule.id) {
    await db.schedules.update(schedule.id, { 
      lastTaken: new Date(),
      updatedAt: new Date()
    })
    await loadSchedules()
  }
}

const scheduleNotification = (schedule: Omit<Schedule, 'id'>) => {
  if (notificationPermission.value !== 'granted') return
  
  const [hours, minutes] = schedule.time.split(':').map(Number)
  const now = new Date()
  const scheduledTime = new Date()
  scheduledTime.setHours(hours, minutes, 0, 0)
  
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1)
  }
  
  const delay = scheduledTime.getTime() - now.getTime()
  
  if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      new Notification('EchoRx Reminder', {
        body: `Time to take ${schedule.drugName} (${schedule.dosage})`,
        icon: '/pwa-192x192.png',
        tag: `schedule-${schedule.drugName}`,
        requireInteraction: true
      })
    }, delay)
  }
}

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

const getFrequencyLabel = (freq: string): string => {
  return t(`schedule.frequencies.${freq}`)
}

const wasRecentlyTaken = (schedule: Schedule): boolean => {
  if (!schedule.lastTaken) return false
  const now = new Date()
  const taken = new Date(schedule.lastTaken)
  const hoursDiff = (now.getTime() - taken.getTime()) / (1000 * 60 * 60)
  return hoursDiff < 4
}

onMounted(async () => {
  await loadSchedules()
  await checkNotificationPermission()
})
</script>

<template>
  <div class="schedule-view">
    <header class="view-header">
      <h2 class="view-title">{{ t('schedule.title') }}</h2>
      <p class="view-subtitle">{{ t('schedule.subtitle') }}</p>
    </header>

    <div 
      v-if="notificationPermission !== 'granted'" 
      class="notification-prompt card"
    >
      <div class="prompt-content">
        <i class="fas fa-bell" aria-hidden="true"></i>
        <div>
          <strong>{{ t('schedule.notifications.enable') }}</strong>
          <p>Get reminders for your medications</p>
        </div>
      </div>
      <button 
        class="btn btn-primary btn-sm"
        @click="requestNotificationPermission"
      >
        Enable
      </button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="schedules.length === 0" class="empty-state">
      <div class="empty-icon">
        <i class="fas fa-clock" aria-hidden="true"></i>
      </div>
      <h3>{{ t('schedule.empty') }}</h3>
      <p>{{ t('schedule.emptyText') }}</p>
      <button class="btn btn-primary" @click="openAddModal">
        <i class="fas fa-plus" aria-hidden="true"></i>
        {{ t('schedule.addReminder') }}
      </button>
    </div>

    <div v-else class="schedules-list">
      <div 
        v-for="schedule in schedules" 
        :key="schedule.id"
        class="schedule-card card"
        :class="{ disabled: !schedule.enabled, taken: wasRecentlyTaken(schedule) }"
      >
        <div class="schedule-main">
          <div class="schedule-time">
            <span class="time-value">{{ formatTime(schedule.time) }}</span>
            <span class="badge" :class="schedule.enabled ? 'badge-success' : 'badge-warning'">
              {{ getFrequencyLabel(schedule.frequency) }}
            </span>
          </div>
          
          <div class="schedule-details">
            <h4 class="drug-name">{{ schedule.drugName }}</h4>
            <p class="drug-dosage">{{ schedule.dosage }}</p>
            <p v-if="schedule.notes" class="drug-notes">{{ schedule.notes }}</p>
          </div>
        </div>

        <div class="schedule-actions">
          <button 
            v-if="!wasRecentlyTaken(schedule)"
            class="btn btn-sm btn-primary"
            @click="markAsTaken(schedule)"
            :aria-label="`Mark ${schedule.drugName} as taken`"
          >
            <i class="fas fa-check" aria-hidden="true"></i>
            {{ t('schedule.markTaken') }}
          </button>
          
          <span v-else class="taken-badge badge badge-success">
            <i class="fas fa-check-circle" aria-hidden="true"></i>
            Taken
          </span>

          <button 
            class="btn-icon-sm"
            @click="toggleSchedule(schedule)"
            :aria-label="schedule.enabled ? 'Disable reminder' : 'Enable reminder'"
          >
            <i :class="schedule.enabled ? 'fas fa-toggle-on' : 'fas fa-toggle-off'" aria-hidden="true"></i>
          </button>

          <button 
            class="btn-icon-sm"
            @click="openEditModal(schedule)"
            :aria-label="`Edit ${schedule.drugName} reminder`"
          >
            <i class="fas fa-edit" aria-hidden="true"></i>
          </button>

          <button 
            class="btn-icon-sm delete"
            @click="deleteSchedule(schedule.id!)"
            :aria-label="`Delete ${schedule.drugName} reminder`"
          >
            <i class="fas fa-trash" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>

    <button 
      v-if="schedules.length > 0"
      class="fab"
      @click="openAddModal"
      aria-label="Add new medication reminder"
    >
      <i class="fas fa-plus" aria-hidden="true"></i>
    </button>

    <div 
      v-if="showAddModal" 
      class="modal-overlay"
      @click.self="showAddModal = false"
    >
      <div class="modal card" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>{{ editingSchedule ? t('schedule.editReminder') : t('schedule.addReminder') }}</h3>
          <button 
            class="btn-icon-sm"
            @click="showAddModal = false"
            aria-label="Close modal"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>

        <form @submit.prevent="saveSchedule" class="modal-form">
          <div class="form-group">
            <label for="drugName">Medication Name</label>
            <input 
              id="drugName"
              v-model="newSchedule.drugName"
              type="text"
              class="input"
              required
              placeholder="e.g., Paracetamol"
            >
          </div>

          <div class="form-group">
            <label for="dosage">Dosage</label>
            <input 
              id="dosage"
              v-model="newSchedule.dosage"
              type="text"
              class="input"
              required
              placeholder="e.g., 500mg, 1 tablet"
            >
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="time">{{ t('schedule.time') }}</label>
              <input 
                id="time"
                v-model="newSchedule.time"
                type="time"
                class="input"
                required
              >
            </div>

            <div class="form-group">
              <label for="frequency">{{ t('schedule.frequency') }}</label>
              <select 
                id="frequency"
                v-model="newSchedule.frequency"
                class="input"
              >
                <option value="daily">{{ t('schedule.frequencies.daily') }}</option>
                <option value="weekly">{{ t('schedule.frequencies.weekly') }}</option>
                <option value="asNeeded">{{ t('schedule.frequencies.asNeeded') }}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="notes">{{ t('schedule.notes') }}</label>
            <textarea 
              id="notes"
              v-model="newSchedule.notes"
              class="input"
              rows="2"
              :placeholder="t('schedule.notesPlaceholder')"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button 
              type="button"
              class="btn btn-secondary"
              @click="showAddModal = false"
            >
              {{ t('common.cancel') }}
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
            >
              {{ t('common.save') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schedule-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding-bottom: 80px;
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

.notification-prompt {
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
  justify-content: center;
  padding: var(--space-2xl);
}

.empty-state {
  text-align: center;
  padding: var(--space-2xl);
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--space-lg);
  background: var(--glass-bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: var(--text-muted);
}

.empty-state h3 {
  margin: 0 0 0.5rem;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0 0 var(--space-lg);
}

.schedules-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.schedule-card {
  transition: opacity 0.2s ease;
}

.schedule-card.disabled {
  opacity: 0.5;
}

.schedule-card.taken {
  border-color: var(--success);
}

.schedule-main {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.schedule-time {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 80px;
}

.time-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--primary);
}

.schedule-details {
  flex: 1;
}

.drug-name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
}

.drug-dosage {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.drug-notes {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0.5rem 0 0;
  font-style: italic;
}

.schedule-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-icon-sm {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon-sm:hover {
  background: var(--glass-bg);
  color: var(--text-primary);
}

.btn-icon-sm.delete:hover {
  color: var(--error);
}

.taken-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.fab {
  position: fixed;
  bottom: 90px;
  right: var(--space-md);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: var(--text-on-primary);
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  transition: transform 0.2s ease;
}

.fab:hover {
  transform: scale(1.1);
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
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}

.modal-header h3 {
  margin: 0;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.modal-actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-md);
}

.modal-actions .btn {
  flex: 1;
}
</style>
