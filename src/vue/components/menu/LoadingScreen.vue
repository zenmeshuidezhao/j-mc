<template>
    <div id="loading-screen" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-900">
      <div class="w-64 space-y-4">
        <div class="text-center">
          <h2 class="text-xl font-semibold text-white mb-2">Loading Resources</h2>
          <p id="loading-percentage" class="text-gray-400">0%</p>
        </div>
        <div class="relative h-2 bg-gray-700 rounded-full overflow-hidden">
          <div id="loading-bar" class="absolute left-0 top-0 h-full w-0 bg-blue-500 transition-all duration-300 ease-out"></div>
        </div>
      </div>
    </div>
</template>

<script setup>
import emitter from '@/js/utils/event/event-bus.js';
import { onMounted, onUnmounted, ref } from 'vue';

const progress = ref(0);
const loadingText = ref('Loading...');

onMounted(() => {
    emitter.on('core:loading-progress', handleProgress);
})

onUnmounted(() => {
    emitter.off('core:loading-progress', handleProgress);
})

function handleProgress({ loaded, total }) {
    progress.value = Math.round(loaded / total * 100);
    loadingText.value = `Loading ${progress.value}%`;
}
</script>