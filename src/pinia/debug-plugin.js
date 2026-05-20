import debugStateMonitor from '@three/utils/debug/debug-state-monitor.js';

function deepClone(value) {
    if (value === null || value === undefined) {
        return value;
    }

    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;

    }
}

export function createDebugPlugin() {
    if (!import.meta.env.DEV) {
        return () => {};
    }

    console.log('[PiniaDebugPlugin] Initialized');

    return ({ store, _options}) => {
        const storeId = store.$id;

        store.$subscribe((mutation, _state) => {
            const events = mutation.events;

            if (!events) {
                debugStateMonitor.logPiniaChange(storeId, '[batch update]', null, '[complex patch]');
                return;
            }

            const eventList = Array.isArray(events) ? events : [events];

            for (const event of eventList) { 
                const key = event.key;
                const oldValue = deepClone(event.oldValue);
                const newValue = deepClone(event.newValue);

                debugStateMonitor.logPiniaChange(storeId, key, oldValue, newValue);
            }
        })
    }
}

export function logPiniaChange(storeId, key, oldValue, newValue) {
    if (!import.meta.env.DEV) {
        return;
    }

    debugStateMonitor.logPiniaChange(storeId, key, oldValue, newValue);
}

export default createDebugPlugin;
