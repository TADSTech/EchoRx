<script setup lang="ts">
import { ref, computed } from 'vue'
import { t, locale } from '@/i18n'

const currentLocale = computed(() => locale.value)
const expandedFaq = ref<number | null>(null)

const toggleFaq = (index: number) => {
  expandedFaq.value = expandedFaq.value === index ? null : index
}

const faqItems = [
  { q: 'help.faq.howToScan.q', a: 'help.faq.howToScan.a' },
  { q: 'help.faq.offlineMode.q', a: 'help.faq.offlineMode.a' },
  { q: 'help.faq.languages.q', a: 'help.faq.languages.a' },
  { q: 'help.faq.accuracy.q', a: 'help.faq.accuracy.a' },
  { q: 'help.faq.privacy.q', a: 'help.faq.privacy.a' },
  { q: 'help.faq.pharmacies.q', a: 'help.faq.pharmacies.a' }
]

const quickTips = [
  { icon: 'fa-sun', tip: 'help.tips.lighting' },
  { icon: 'fa-hand-paper', tip: 'help.tips.steady' },
  { icon: 'fa-crop-alt', tip: 'help.tips.frame' },
  { icon: 'fa-wifi-slash', tip: 'help.tips.offline' },
  { icon: 'fa-volume-up', tip: 'help.tips.audio' }
]

const contactOptions = [
  { icon: 'fa-envelope', label: 'Email Support', action: 'mailto:support@echorx.app' },
  { icon: 'fa-whatsapp', label: 'WhatsApp', action: 'https://wa.me/2348000000000' }
]
</script>

<template>
  <div class="help-view">
    <header class="view-header">
      <h2 class="view-title">
        <i class="fas fa-question-circle" aria-hidden="true"></i>
        {{ t('help.title') }}
      </h2>
      <p class="view-subtitle">{{ t('help.subtitle') }}</p>
    </header>

    <section class="quick-tips-section card">
      <h3 class="section-title">
        <i class="fas fa-lightbulb" aria-hidden="true"></i>
        {{ t('help.quickTips') }}
      </h3>
      
      <div class="tips-grid">
        <div 
          v-for="(tip, index) in quickTips" 
          :key="index"
          class="tip-card"
        >
          <div class="tip-icon">
            <i :class="`fas ${tip.icon}`" aria-hidden="true"></i>
          </div>
          <p class="tip-text">{{ t(tip.tip) }}</p>
        </div>
      </div>
    </section>

    <section class="how-to-section card">
      <h3 class="section-title">
        <i class="fas fa-book-open" aria-hidden="true"></i>
        {{ t('help.howToUse') }}
      </h3>
      
      <div class="steps-list">
        <div class="step-item">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>{{ t('help.steps.step1.title') }}</h4>
            <p>{{ t('help.steps.step1.desc') }}</p>
          </div>
        </div>
        
        <div class="step-item">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>{{ t('help.steps.step2.title') }}</h4>
            <p>{{ t('help.steps.step2.desc') }}</p>
          </div>
        </div>
        
        <div class="step-item">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>{{ t('help.steps.step3.title') }}</h4>
            <p>{{ t('help.steps.step3.desc') }}</p>
          </div>
        </div>
        
        <div class="step-item">
          <div class="step-number">4</div>
          <div class="step-content">
            <h4>{{ t('help.steps.step4.title') }}</h4>
            <p>{{ t('help.steps.step4.desc') }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="faq-section card">
      <h3 class="section-title">
        <i class="fas fa-comments" aria-hidden="true"></i>
        {{ t('help.faq.title') }}
      </h3>
      
      <div class="faq-list">
        <div 
          v-for="(item, index) in faqItems" 
          :key="index"
          class="faq-item"
          :class="{ expanded: expandedFaq === index }"
        >
          <button 
            class="faq-question"
            @click="toggleFaq(index)"
            :aria-expanded="expandedFaq === index"
          >
            <span>{{ t(item.q) }}</span>
            <i :class="expandedFaq === index ? 'fas fa-chevron-up' : 'fas fa-chevron-down'" aria-hidden="true"></i>
          </button>
          <div v-if="expandedFaq === index" class="faq-answer">
            <p>{{ t(item.a) }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="contact-section card">
      <h3 class="section-title">
        <i class="fas fa-headset" aria-hidden="true"></i>
        {{ t('help.needMoreHelp') }}
      </h3>
      
      <p class="contact-intro">{{ t('help.contactIntro') }}</p>
      
      <div class="contact-options">
        <a 
          v-for="option in contactOptions"
          :key="option.label"
          :href="option.action"
          class="contact-btn"
          target="_blank"
          rel="noopener"
        >
          <i :class="`fas ${option.icon}`" aria-hidden="true"></i>
          <span>{{ option.label }}</span>
        </a>
      </div>
    </section>

    <section class="disclaimer-section">
      <div class="disclaimer-card">
        <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
        <div>
          <strong>{{ t('help.disclaimer.title') }}</strong>
          <p>{{ t('help.disclaimer.text') }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.help-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding-bottom: 80px;
}

.view-header {
  text-align: center;
}

.view-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
}

.view-title i {
  color: var(--primary);
}

.view-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 var(--space-md);
}

.section-title i {
  color: var(--primary);
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-sm);
}

.tip-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-md);
  background: var(--glass-bg);
  border-radius: var(--radius-md);
  gap: var(--space-sm);
}

.tip-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark, #d97706) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.tip-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.step-item {
  display: flex;
  gap: var(--space-md);
}

.step-number {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: var(--primary);
  color: var(--text-on-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
}

.step-content h4 {
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
}

.step-content p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.faq-item {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all 0.2s ease;
}

.faq-item.expanded {
  border-color: var(--primary);
}

.faq-question {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--glass-bg);
  border: none;
  cursor: pointer;
  text-align: left;
  font-weight: 500;
  color: var(--text-primary);
  transition: background 0.2s ease;
}

.faq-question:hover {
  background: var(--glass-bg-strong);
}

.faq-question i {
  color: var(--text-muted);
  flex-shrink: 0;
}

.faq-answer {
  padding: 0 var(--space-md) var(--space-md);
  background: var(--glass-bg);
}

.faq-answer p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.contact-intro {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0 0 var(--space-md);
}

.contact-options {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.contact-btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.contact-btn:hover {
  background: var(--primary);
  color: var(--text-on-primary);
  border-color: var(--primary);
}

.contact-btn i {
  font-size: 1rem;
}

.disclaimer-section {
  margin-top: var(--space-md);
}

.disclaimer-card {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid var(--warning);
  border-radius: var(--radius-md);
}

.disclaimer-card > i {
  color: var(--warning);
  font-size: 1.25rem;
  flex-shrink: 0;
}

.disclaimer-card strong {
  display: block;
  margin-bottom: 0.25rem;
  color: var(--warning);
}

.disclaimer-card p {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>
