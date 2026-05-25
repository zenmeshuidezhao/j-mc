<script setup>
import Experience from './js/experience.js'
import UiRoot from './vue/components/menu/UiRoot.vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvas = ref(null)
let experience = null

onMounted(() => {
  experience = new Experience(canvas.value)
})

onBeforeUnmount(() => {
  experience?.destroy()
  experience = null
})
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden">
    <!-- Three.js Canvas -->
    <canvas ref="canvas" class="absolute inset-0 z-0" />

    <!-- Menu System -->
    <UiRoot />
  </div>
</template>

<style scoped>
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
