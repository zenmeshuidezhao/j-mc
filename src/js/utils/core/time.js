// src/js/utils/core/time.js
import emitter from '../event/event-bus.js'

export default class Time {
  constructor() {
    this.start = Date.now()
    this.current = this.start
    this.elapsed = 0
    this.delta = 16

    this.rafId = null
    this._tick()
  }

  _tick() {
    const currentTime = Date.now()
    this.delta = Math.min(currentTime - this.current, 100) // clamp to 100ms
    this.current = currentTime
    this.elapsed = this.current - this.start

    emitter.emit('core:tick', {
      delta: this.delta,
      elapsed: this.elapsed,
    })

    this.rafId = window.requestAnimationFrame(() => this._tick())
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}
