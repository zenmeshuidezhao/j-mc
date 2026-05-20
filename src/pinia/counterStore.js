import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useCounterStore = defineStore('counter', () => {
    const counter = ref(0);

    function increment() {
        counter.value++;
    }

    function decrement() {
        counter.value--;
    }

    return {
        counter,
        increment,
        decrement
    }
})