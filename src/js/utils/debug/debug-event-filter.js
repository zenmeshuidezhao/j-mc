import { DEFAULT_BLACKLIST } from "./debug-config.js";

class DebugEventFilter {
    constructor() {
        // 是否在开发环境
        this.enabled = import.meta.env.DEV && window.location.hash === '#debug';
        this.blacklist = new Set(DEFAULT_BLACKLIST);
        // 是否启用黑名单
        this.enableBlacklist = true;
        this.timeRange = {
            start: null,
            end: null
        }
    }

    // 检查事件是否在黑名单中
    isBlacklisted(eventName) {
        if (this.enabled && this.enableBlacklist) {
            for (const pattern of this.blacklist) {
                if (eventName.startsWith(pattern)) {
                    return true;
                }
            }
        }

        return false;
    }

    // 添加事件到黑名单
    addToBlacklist(pattern) {
        this.blacklist.add(pattern);
    }

    // 从黑名单中移除事件
    removeFromBlacklist(pattern) {
        this.blacklist.delete(pattern);
    }

    // 设置黑名单（整体替换）
    setBlacklist(patterns) {
        this.blacklist = new Set(patterns);
    }

    // 获取黑名单
    getBlacklist() {
        return Array.from(this.blacklist);
    }

    // 设置时间范围
    setTimeRange(start, end) {
        this.timeRange.start = start;
        this.timeRange.end = end;
    }

    // 清空时间范围
    clearTimeRange() {
        this.timeRange.start = null;
        this.timeRange.end = null;
    }

    // 检查事件是否在指定时间范围内
    isInTimeRange(timestamp) {
        if (this.enabled) {
            if (this.timeRange.start && timestamp < this.timeRange.start) {
                return false;
            }

            if (this.timeRange.end && timestamp > this.timeRange.end) {
                return false;
            }
        }

        return true;
    }

    // 过滤单个日志
    filterLog(log) {
        if (this.enabled) {
            if (this.isBlacklisted(log.eventName)) {
                return false;
            }

            if (!this.isInTimeRange(log.timestamp)) {
                return false;
            }
        }

        return true;
    }

    // 过滤日志列表
    filterLogs(logs) {
        if (this.enabled) {
            return logs.filter(log => this.filterLog(log)); 
        }

        return logs;
    }

    // 重置默认黑名单
    resetToDefault() {
        this.blacklist = new Set(DEFAULT_BLACKLIST);
        this.timeRange = { start: null, end: null };
        this.enableBlacklist = true;
    }

    // 清除所有过滤器
    clearAll() {
        this.blacklist.clear();
        this.timeRange = { start: null, end: null };
        this.enableBlacklist = false;
    }
}

// 导出单例
export default new DebugEventFilter();