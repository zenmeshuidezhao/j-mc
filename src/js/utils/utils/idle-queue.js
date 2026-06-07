export default class IdleQueue {
    constructor(options = {}) {
        this._tasks = [];
        this._taskByKey = new Map();
        this._scheduled = false;

        this.timeBudgetMs = options.timeBudgetMs ?? 6;
    }
    
    // 入队任务
    enqueue(key, fn, priority = 0) {
        const old = this._taskByKey.get(key);
        if (old) {
            old.cancelled = true;
            this._taskByKey.delete(key);
        }

        const task = {
            key,
            fn,
            priority,
            cancelled: false
        };

        this._taskByKey.set(key, task);
        this._tasks.push(task);
    }

    //取消任务
    cancel(key) {
        const task = this._taskByKey.get(key);
        if (task) {
            task.cancelled = true;
            this._taskByKey.delete(key);
        }
    }

    // 取消指定前缀的一组任务
    cancelPrefix(prefix) {
        for (const [key, task] of this._taskByKey.entries()) {
            if (key.startsWith(prefix)) {
                task.cancelled = true;
                this._taskByKey.delete(key);
            }
        }
    }

    // 队列长度
    size() {
        return this._taskByKey.size;
    }

    // 每帧调用一次
    pump() {
        if (this._scheduled || this._taskByKey.size === 0) {
            return
        }

        this._scheduled = true;

        const ric = typeof window !== 'undefined' ? window.requestIdleCallback : null;
        if (ric) {
            ric(deadline => this._run(deadline), { timeout: 50 });
        } else {
            setTimeout(() => this._run(), 0);
        }
    }

    _run(deadline) {
        this._scheduled = false;

        this._tasks.sort((a, b) => a.priority - b.priority);

        const start = performance.now();

        while (this._tasks.length > 0) {
            const task = this._tasks.shift();
            if (!task || task.cancelled) {
                continue;
            }

            // key map 中仍指向自己才行（被新任务替换则跳过）
            const current = this._taskByKey.get(task.key);
            if (current !== task) {
                continue;
            }

            try {
                task.fn();
            } finally {
                this._taskByKey.delete(task.key);
            }

            // 预算判断：优先用 deadline.timeRemaining，其次用 timeBudgetMs
            if (deadline?.timeRemaining) {
                if (deadline.timeRemaining() <= 0) {
                    break;
                }
            } else {
                if (performance.now() - start >= this.timeBudgetMs) {
                    break;
                }
            }

            // 若还有任务，继续调度
            if (this._taskByKey.size > 0) {
                this.pump();
            }
        }
    }
}