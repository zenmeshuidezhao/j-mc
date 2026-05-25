<template>
    <div class="main-menu">
        <div class="logo-container">
            <h1 class="title">MineCraft</h1>
            <span class="tagline">Web3D Powered!</span>
        </div>
        <div class="mc-menu">
            <templae v-if="!ui.world.hasWorld">
                <button class="mc-button" @click="handleStartGame">
                    <span class="title">Create World</span>
                </button>
            </templae>
            <template v-else> 
                <button class="mc-button" @click="handleContinue">
                    <span class="title">Continue</span>
                </button>
                <button class="mc-button" @click="handleStartGame">
                    <span class="title">New World</span>
                </button>
            </template>

            <button class="mc-button" @click="handleSettings">
                <span class="title">Settings</span>
            </button>
        </div>
    </div>
</template>

<script setup>
import { useUiStore } from '@pinia/uiStore.js';
import emitter from '@/js/utils/event/event-bus.js';

const ui = useUiStore();

function handleStartGame() {
    ui.world.hasWorld = true;
    ui.world.seed = Math.floor(Math.random() * 2000000000);
    ui.toPlaying();
    emitter.emit('game:create_world', { seed: ui.world.seed });
}

function handleContinue() {
    ui.toPlaying();
}

function handleSettings() {
    ui.screen = 'settings';
}
</script>

<style scoped>
.main-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.logo-container {
  position: relative;
  display: inline-block;
}

.title {
  font-size: 48px;
  color: #fff;
  text-shadow: 4px 4px #000;
}

.tagline {
  position: absolute;
  top: -10%;
  right: 0;
  transform: translate(10%, -20%) rotate(-15deg);
  font-size: 24px;
  color: #ffff00;
  text-shadow: 3px 3px #3f3f00;
}

.mc-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.mc-button {
  height: 40px;
  width: 300px;
  cursor: pointer;
  background: #999 url('/textures/hub/btn_bg.png') center / cover;
  image-rendering: pixelated;
  border: 2px solid #000;

  &:hover .title {
    background-color: rgba(100, 100, 255, 0.45);
    color: #ffffa0;
  }

  .title {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 16px;
    color: #ddd;
    text-shadow: 2px 2px #000a;
  }
}
</style>