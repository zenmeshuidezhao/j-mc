import { DEFAULT_BLACKLIST } from './debug-config'; 

function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function simplifyData(data, maxLength = 100) {
    if (data === null || data === undefined)  return data;

    try {
        const str = JSON.stringify(data);

        if (str.length <= maxLength) {
            return data;
        }

        return `${str.substring(0, maxLength)}... (${str.length}) chars`;
    } catch {
        return '[Complex Object]';
    }
}

class DebugStateMonitor { 
    constructor() {
        this.enabled = import.meta.env.DEV && window.location.hash === '#debug';

        this.logs = [];
        this.maxLogs = 200;

        this.isPaused = false;

        this.currentScope = 'all';
        this.searchQuery = '';

        this.listenerCount = new Map();

        this.stateSnapshot = {};

        this.highFrequencyEvents = new Set(DEFAULT_BLACKLIST);

        if (this.enabled) {
            console.log('[DebugStateMonitor] Initialized')
        }
    }

    getScope(eventName) {
        if (!eventName) return 'other';

        if (eventName.startsWith('ui:')) return 'ui';
        if (eventName.startsWith('settings:')) return 'settings';
        if (eventName.startsWith('game:')) return 'game';
        if (eventName.startsWith('core:')) return 'core';
        if (eventName.startsWith('shadow:')) return 'shadow';
        if (eventName.startsWith('pinia:')) return 'pinia';

        return 'other';
    }

    pause() {
        this.isPaused = true;
        console.log('[DebugStateMonitor] Paused');
    }

    resume() {
        this.isPaused = false;
        console.log('[DebugStateMonitor] Resumed');
    }

    logEvent(type, eventName, data, source) {
        if (!this.enabled || this.isPaused) return;

        if (this.highFrequencyEvents.has(eventName)) return;

        const scope = this.getScope(eventName);

        if (type === 'on') {
            const count = this.listenerCount.get(eventName) || 0;
            this.listenerCount.set(eventName, count + 1);
        } else if (type === 'off') {
            const count = this.listenerCount.get(eventName) || 0;
            if (count > 0) {
                this.listenerCount.set(eventName, count - 1);
            }
        }

        const logEntry = {
            id: generateId(),
            timestamp: Date.now(),
            type,
            scope,
            eventName,
            data: simplifyData(data),
            source: source || 'unknown',
            listeners: this.listenerCount.get(eventName) || 0,
        };

        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    logPiniaChange(storeName, key, oldValue, newValue) {
        if (!this.enabled || this.isPaused) return;

        const eventName = `pinia:${storeName}:${key}`;

        const logEntry = {
            id: generateId(),
            timestamp: Date.now(),
            type: 'pinia',
            scope: 'pinia',
            eventName,
            data: {
                store: storeName,
                key,
                oldValue: simplifyData(oldValue),
                newValue: simplifyData(newValue),
            },
            source: `${storeName}.js`,
            listeners: 0,
        };

        this.logs.push(logEntry);
        if (this.logslength > this.maxLogs) {
            this.logs.shift();
        }

        if (!this.stateSnapshot[storeName]) {
            this.stateSnapshot[storeName] = {};
        }
        this.stateSnapshot[storeName][key] = newValue;
    }

    setScope(scope) {
        this.currentScope = scope;
        console.warn(`[DebugStateMonitor] Scope changed to: ${scope}`)
    }

    setSearchQuery(query) {
        this.searchQuery = query.toLowerCase();
        console.warn(`[DebugStateMonitor] Search query changed to: ${query}`)
    }

    getFilteredLogs() {
        return this.logs.filter((log) => {
            if (this.currentScope !== 'all' && log.scope !== this.currentScope) {
                return false;
            }

            if (this.searchQuery) {
                const searchableText = `${log.eventName} ${JSON.stringify(log.data)}`.toLowerCase();
                if (!searchableText.includes(this.searchQuery)) {
                    return false;
                }
            }

            return true;
        });
    }

    getStateSnapshot() {
        return {
            ...this.stateSnapshot
        };
    }

    exportToJSON() {
        if (!this.enabled) return;

        const exportData = {
            timestamp: new Date().toISOString(),
            exportedBy: 'DebugStateMonitor',
            summary: {
                totalLogs: this.logs.length,
                scopeFilter: this.currentScope,
                searchQuery: this.searchQuery,
            },
            logs: this.logs,
            snapshot: this.getStateSnapshot(),
        };

        const jsonStr = JSON.stringify(exportData, null, 2);

        navigator.clipboard.writeText(jsonStr)
            .then(() => {
                console.warn('[DebugStateMonitor] JSON exported to clipboard');
            })
            .catch((err) => {
                console.error('[DebugStateMonitor] Failed to export JSON:', err);
            });

        return exportData;
    }

    clearLogs() {
        this.logs = [];
        console.warn('[DebugStateMonitor] Logs cleared');
    }

    getListenerStats() {
        return new Map(this.listenerCount);
    }
}

export default new DebugStateMonitor();