import { DEFAULT_BLACKLIST } from './debug-config.js';

class DebugEventFilter { 
    constructor() {
        this.enabled = import.meta.env.DEV && window.location.hash === '#debug';

        this.blacklist = new Set(DEFAULT_BLACKLIST);

        this.enabledBlacklist = true

        this.timeRange = {
            start: null,
            end: null
        }
    }


    isBlacklisted(eventName) {
        if (!this.enabled || !this.enabledBlacklist) return false;

        for (const pattern of this.blacklist) {
            if (eventName.startsWith(pattern)) {
                return true;
            }
        }

        return false;
    }

    addToBlacklist(pattern) {
        this.blacklist.add(pattern);
    }

    removeFromBlacklist(pattern) {
        this.blacklist.delete(pattern);
    }

    setBlacklist(patterns) {
        this.blacklist = new Set(patterns);
    }

    getBlacklist() {
        return Array.from(this.blacklist);
    }

    setTimeRange(start, end) {
        this.timeRange.start = start;
        this.timeRange.end = end;
    }

    clearTimeRange() {
        this.timeRange.start = null;
        this.timeRange.end = null;
    }

    isInTimeRange(timestamp) {
        if (!this.enabled) return true;

        if (this.timeRange.start && timestamp < this.timeRange.start) {
            return false;
        }

        if (this.timeRange.end && timestamp > this.timeRange.end) {
            return false;
        }

        return true;
    }

    filterLog(log) {
        if (!this.enabled) return true;

        if (this.isBlacklisted(log.eventName)) {
            return false;
        }

        if (!this.isInTimeRange(log.timestamp)) {
            return false;
        }

        return true;
    }

    filterLogs(logs) {
        if (!this.enabled) return logs;

        return logs.filter(log => this.filterLog(log));
    }

    resetToDefault() {
        this.blacklist = new Set(DEFAULT_BLACKLIST);
        this.timeRange = { start: null, end: null };
        this.enabledBlacklist = true;
    }

    clearAll() {
        this.blacklist.clear();
        this.timeRange = { start: null, end: null };
        this.enabledBlacklist = false;

    }
}

export default new DebugEventFilter();