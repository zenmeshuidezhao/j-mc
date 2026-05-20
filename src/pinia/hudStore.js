import emitter from '@three/utils/event/event-bus.js';
import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';

export const useHudStore = defineStore('hud', () => { 
    const health = ref(20);
    const maxHealth = ref(20);

    const hunger = ref(20);
    const maxHunger = ref(20);

    const experience = ref(0.37);
    const level = ref(7);

    const MAX_STACK = 64;
    const selectedSlot = ref(0);

    const hotbarItems = ref(Array.from({ length: 9 }, () => null));

    const position = reactive({ x: 0, y: 0, z: 0});
    const facingAngle = ref(0);

    const chatMessages = ref([
        { id: 1, type: 'system', text: '[系统]世界已建立完成', timestamp: Date.now() - 5000 },
        { id: 2, type: 'system', text: '[系统]玩家物理碰撞已加载', timestamp: Date.now() - 5000 },
        { id: 3, type: 'system', text: '[系统]相机使用默认参数', timestamp: Date.now() - 1000 },
    ]);

    let nextMessageId = 4;

    const isChatOpen = ref(false);

    const gameTime = ref('9:00 AM');
    const gameDay = ref(1);
    const fps = ref(60);
    const playerCount = ref(1);
    const serverName = ref('Local server');

    const timeOfDay = ref(0.375);

    function toggleChat() {
        isChatOpen.value = !isChatOpen.value;

        if (isChatOpen.value) {
            emitter.emit('ui:chat-opened');
        } else {
            emitter.emit('ui:chat-closed');
        }
    }

    function closeChat() {
        isChatOpen.value = false;
        emitter.emit('ui:chat-closed');
    }

    function sendMessage(text) { 
        if (text.trim()) {
            addMessage(text, 'chat');
        }
        closeChat();
    }

    const DAY_PHASES = [
        { name: 'midnight', start: 0.00, end: 0.22 },
        { name: 'sunrise', start: 0.22, end: 0.28 },
        { name: 'morning', start: 0.28, end: 0.40 },
        { name: 'noon', start: 0.40, end: 0.55 },
        { name: 'afternoon', start: 0.55, end: 0.70 },
        { name: 'sunset', start: 0.70, end: 0.78 },
        { name: 'dark', start: 0.78, end: 0.85 },
        { name: 'midnight', start: 0.85, end: 1 },
    ];

    function getCurrentPhase() {
        const t = timeOfDay.value;

        for (const phase of DAY_PHASES) {
            if (t >= phase.start && t < phase.end) {
                return phase.name;
            }
        }

        return 'midnight';
    }

    function updateGameTime(time) {
        timeOfDay.value = time;
        
        const totalMinutes = Math.floor(time * 24 * 60);
        const hours = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;

        const period = hours >= 12 ? 'PM' : 'AM'; 
        const displayHours = hours % 12 || 12;

        gameTime.value = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    function incrementGameDay() {
        gameDay.value++;
    }

    function updatePlayerInfo(info) {
        playerCount.value = info.playerCount;
        serverName.value = info.serverName;
    }
})