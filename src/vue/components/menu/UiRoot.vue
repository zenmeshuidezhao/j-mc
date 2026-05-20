<template>
    <Transition name="fade">
        <!-- <LoadingScreen /> -->
    </Transition>
</template>

<script setup>
import { useUiStore } from '@pinia/uiStore.js';
import emitter from '@three/utils/event/debug-emitter';

import { onMounted, onUnmounted } from 'vue';

// import LoadingScreen from './LoadingScreen.vue'

const ui = useUiStore();

onMounted(() => { 
    emitter.on('core:ready', handleCoreReady);
})

function handleCoreReady() {
    ui.screen = 'mainMenu';
    ui.mainMenuView = 'root';
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>