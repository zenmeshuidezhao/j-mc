import emitter from '@/js/utils/event/event-bus.js';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
    const screen = ref('loading');
    const mainMenuView = ref('root');
    const isPaused = ref(false);
    const world = ref({
        hasWorld: false,
        seed: null
    })

    const isMenuVisible = computed(() => {
        return ['loading', 'mainMenu', 'pauseMenu', 'settings'].includes(screen.value);
    });

    function toMainMenu() {
        screen.value = 'mainMenu';
        mainMenuView.value = 'root';
        isPaused.value = false;
    }
    function toPlaying() {
        screen.value = 'playing';
        isPaused.value = false;
        emitter.emit('ui:pause-changed', false);
    }

    function toPauseMenu() {
        screen.value = 'pauseMenu';
        isPaused.value = true;
        emitter.emit('ui:pause-changed', true);
    }

    function handleEscape() {
        switch(screen.value) {
            case 'playing':
                toPauseMenu();
                break;
            case 'pauseMenu':
                toPlaying();
                break;
            case 'mainMenu':
                if (mainMenuView.value !== 'root') {
                    mainMenuView.value = 'root';
                }
                break;
        }
    }

    return {
        screen,
        mainMenuView,
        isPaused,
        world,
        isMenuVisible,
        toMainMenu,
        toPlaying,
        toPauseMenu,
        handleEscape
    }
});