<template>
  <div>
  </div>
</template>

<script setup>
import Experience from '@three/experience.js';
import { exp } from 'three/tsl';
import { onBeforeMount, onMounted, ref } from 'vue';

const threeCanvas = ref(null);
let experience = null;

onMounted(() => {
  experience = new Experience(threeCanvas.value);
})

onBeforeUnmount(() => {
  experience?.destroy();
  experience = null;
})

const isDebugMode = window.location.hash === '#debug';
</script>

<style scoped>
</style>
