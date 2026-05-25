<script setup>
import { useUiStore } from '@pinia/uiStore.js'
import emitter from '@/js/utils/event/event-bus.js'
import { onMounted, onUnmounted } from 'vue'
import LoadingScreen from './LoadingScreen.vue'
import MainMenu from './MainMenu.vue'

const ui = useUiStore()

onMounted(() => {
  emitter.on('core:ready', handleCoreReady)
  emitter.on('ui:escape', ui.handleEscape)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  emitter.off('core:ready', handleCoreReady)
  emitter.off('ui:escape', ui.handleEscape)
  window.removeEventListener('keydown', handleKeydown)
})

function handleCoreReady() {
  ui.toMainMenu()
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    emitter.emit('ui:escape')
  }
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="ui.isMenuVisible"
      class="menu-overlay"
      :class="{
        loading: ui.screen === 'loading',
        dark: ui.screen !== 'loading',
      }"
    >
      <LoadingScreen v-if="ui.screen === 'loading'" />
      <MainMenu v-else-if="ui.screen === 'mainMenu'" />
      <!-- Settings 和 PauseMenu 后续实现 -->
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
}

.menu-overlay.loading {
  background: rgba(0, 0, 0, 0.85);
}

.menu-overlay.dark {
  background: rgba(0, 0, 0, 0.6);
}
</style>
