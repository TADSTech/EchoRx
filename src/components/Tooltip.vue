<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}>()

const isVisible = ref(false)
</script>

<template>
  <div 
    class="tooltip-container"
    @mouseenter="isVisible = true"
    @mouseleave="isVisible = false"
    @focus="isVisible = true"
    @blur="isVisible = false"
  >
    <slot></slot>
    <Transition name="tooltip">
      <div 
        v-if="isVisible"
        class="tooltip-bubble"
        :class="[position || 'top']"
        role="tooltip"
      >
        {{ text }}
        <span class="tooltip-arrow"></span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tooltip-container {
  position: relative;
  display: inline-flex;
}

.tooltip-bubble {
  position: absolute;
  z-index: 1000;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  box-shadow: var(--shadow-lg);
  pointer-events: none;
}

.tooltip-bubble.top {
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-bubble.bottom {
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-bubble.left {
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip-bubble.right {
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--bg-tertiary);
  transform: rotate(45deg);
}

.tooltip-bubble.top .tooltip-arrow {
  bottom: -4px;
  left: 50%;
  margin-left: -4px;
}

.tooltip-bubble.bottom .tooltip-arrow {
  top: -4px;
  left: 50%;
  margin-left: -4px;
}

.tooltip-bubble.left .tooltip-arrow {
  right: -4px;
  top: 50%;
  margin-top: -4px;
}

.tooltip-bubble.right .tooltip-arrow {
  left: -4px;
  top: 50%;
  margin-top: -4px;
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.95);
}

.tooltip-bubble.left.tooltip-enter-from,
.tooltip-bubble.left.tooltip-leave-to,
.tooltip-bubble.right.tooltip-enter-from,
.tooltip-bubble.right.tooltip-leave-to {
  transform: translateY(-50%) scale(0.95);
}
</style>
