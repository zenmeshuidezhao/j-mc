 import mitt from "mitt";
 import debugStateMonitor from "../debug-state-monitor.js";
import { callWithErrorHandling } from "vue";
import { debug } from "three/tsl";

const baseEmitter = mitt();

const isDev = import.meta.env.DEV;

function getCallerInfo() {
    if (!isDev) return undefined;

    try {
        const stack = new Error('caller info').stack;
        const lines = stack.split('\n');

        const callerLine = lines[3] || lines[2];

        if (!callerLine) return undefined;

        const match = callerLine.match(/\/?([^/:]+):(\d+):\d+\)?$/);

        if (match) {
            const [, fileName, line] = match;
            return `${fileName}:${line}`;
        } 
    } catch {

    }

    return undefined;
}

const debugEmitter = {
    emit(eventName, data) {
        if (isDev) {
            const source = getCallerInfo();
            debugStateMonitor.logEvent('emit', eventName, data, source);
        }

        return baseEmitter.emit(eventName, data);
    },
    on(eventName, handler) {
        if (isDev) {
            const source = getCallerInfo();
            debugStateMonitor.logEvent('on', eventName, null, source);
        }

        return baseEmitter.on(eventName, handler);
    },
    once(eventName, handler) {
        if (isDev) {
            const source = getCallerInfo();
            debugStateMonitor.logEvent('once', `${eventName}（once）`, null, source);
        }

        const wrapper = function(data) {
            baseEmitter.off(eventName, wrapper);
            handler(data);
        }

        wrapper._originalHandler = handler

        return baseEmitter.on(eventName, wrapper);
    },
    off(eventName, handler) {
        if (isDev) {
            const source = getCallerInfo();
            debugStateMonitor.logEvent('off', eventName, null, source);
        }

        if (handler) {
            const handlers = baseEmitter.all.get(eventName);
            if (handlers) {
                const wrappedHandler = handlers.find(h => h._originalHandler === handler);

                if (wrappedHandler) {
                    return baseEmitter.off(eventName, wrappedHandler);
                }
            }
        }

        return baseEmitter.off(eventName, handler);
    },
    get all() {
        return baseEmitter.all;
    },
}

export default debugEmitter;

export const { emit, on, once, off, all } = debugEmitter;
