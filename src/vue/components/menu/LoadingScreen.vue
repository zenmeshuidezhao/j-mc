<template>
    <div class="loading-screen">
        <img src="/textures/hub/logo.png" alt="Minecraft" class="logo">
        <div class="loading-bar-container">
            <div class="loading-bar-bg">
                <div class="loading-bar-fill" :style="{ width: `${progress}%`}"></div>
            </div>
            <p class="loading-text">
                {{ loadingText }}
            </p>
        </div>
    </div>
</template>

<script setup>
import emitter from '@three/utils/event/event-bus.js';
import { onMounted, onUnmounted, ref } from 'vue';

const progress = ref(10);
const loadingText = ref("Loading...");

onMounted(() => {
    emitter.on("core:loading-progress", handleProgress);
})
onUnmounted(() => {
    emitter.off("core:loading-progress", handleProgress);
})

function handleProgress({ loaded, total}) {
    progress.value = Math.round((loaded / total) * 100);
    loadingText.value = `Loading... ${progress.value}%`;
}
</script>

<style scoped>
</style>