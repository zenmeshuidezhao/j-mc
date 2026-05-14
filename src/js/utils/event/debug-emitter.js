 import mitt from "mitt";
 import debugStateMonitor from "../debug-state-monitor.js";

const baseEmitter = mitt();

const isDev = import.meta.env.DEV;

function getCallerInfo() {
    if (!isDev) return undefined;

    try {
    const stack = new Error('caller info').stack;
    } catch {

    }

        return undefined;
}