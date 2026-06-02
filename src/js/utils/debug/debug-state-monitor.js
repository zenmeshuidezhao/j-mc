import { DEFAULT_BLACKLIST } from './debug-config.js';

function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2,9)}`
}

function simplifyData(data, maxLength = 100) {
    if ([null, undefined].includes(data)) {
        return data;
    }

    try {
        const str = JSON.stringify(data);
        if (str.length < maxLength) {
            return data;
        }

        return `${str.substring(0, maxLength)}...(${str.length} chars})`
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

        // 统计活跃监听器数量
        this.listenerCount = new Map();

        // 状态快照缓存
        this.stateSnapshot = {};

        // 高频事件不参与监视器
        this.highFrequencyEvents = new Set(DEFAULT_BLACKLIST);

        if (this.enabled) {
            console.warn('[DebugStateMonitor] Initialized');
        }
    }

    // 根据事件名识别Scope
    getScope(eventName) {
        if (!eventName) {
            return 'other';
        }

        if (eventName.startsWith('ui:')) {
            return 'ui';
        } else if (eventName.startsWith('settings:')) {
            return 'settings';
        } else if (eventName.startsWith('game:')) {
            return 'game';
        } else if (eventName.startsWith('core:')) {
            return 'core';
        } else if (eventName.startsWith('shadow:')) {
            return 'shadow';
        } else if (eventName.startsWith('pinia:')) {
            return 'pinia';
        }
    }

    // 暂停监控
    pause() {
        this.isPaused = true;
        console.warn('[DebugStateMonitor] Paused');
    }

    // 继续监控
    resume() {
        this.isPaused = false;
        console.warn('[DebugStateMonitor] Resumed');
    }

    // 记录事件
    logEvent(type, eventName, data, source) {
        if(!this.enabled || this.isPaused || this.highFrequencyEvents.has(eventName)) {
            return;
        }

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

        // 创建日志条目
        const logEntry = {
            id: generateId(),
            type,
            eventName,
            scope,
            data: simplifyData(data),
            source: source || 'unknown',
            timestamp: Date.now(),
            listeners: this.listenerCount.get(eventName) || 0,
        };

        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    // 记录pinia状态变更
    logPiniaChange(storeName, key, oldValue, newValue) {
        if (!this.enabled || this.isPaused) {
            return;
        }

        const eventName = `pinia:${storeName}.${key}`;

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
                newValue: simplifyData(newValue)
            },
            source: `${storeName}.js`,
            listeners: 0,
        };

        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        if (!this.stateSnapshot[storeName]) {
            this.stateSnapshot[storeName] = {};
        }

        this.stateSnapshot[storeName][key] = newValue;
    }

    // 设置当前Scope筛选
    setScope(scope) {
        this.currentScope = scope;
        console.warn(`[DebugStateMonitor] Scope set to ${scope}`);
    }

    // 设置搜索关键词
    setSearchQuery(query) {
        this.searchQuery = query.toLowerCase();
        console.warn(`[DebugStateMonitor] Search query set to ${query}`);
    }

    // 获取过滤后的日志列表
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
        })
    }

    // 获取当前状态快照
    getStateSnapshot() {
        return { ...this.stateSnapshot }
    }

    // 导出日志为 JSON 并复制到剪贴板
    exportToJSON() {
        if (!this.enabled) {
            return;
        }

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
        }

        const jsonStr = JSON.stringify(exportData, null, 2);

        // 复制到剪贴板
        navigator.clipboard.writeText(jsonStr).then(() => {
            console.warn('[DebugStateMonitor] Exported tos clipboard')
        }).catch((err) => {
            console.error('[DebugStateMonitor] Failed to export:', err)
        })

        return exportData;
    }

    // 清空日志
    clearLogs() {
        this.logs = [];
        console.warn('[DebugStateMonitor] Logs cleared');
    }

    // 获取监听器统计
    getListenerStats() {
        return new Map(this.listenerCount);
    }
}

export default new DebugStateMonitor();