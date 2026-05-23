// src/js/experience.js
import * as THREE from 'three'
import emitter from './utils/event/event-bus.js'
import Resources from './utils/core/resources.js'
import Sizes from './utils/core/sizes.js'
import Time from './utils/core/time.js'
import sources from './sources.js'

let instance

export default class Experience {
  constructor(canvas) {
    // 单例模式
    if (instance) return instance
    instance = this

    window.Experience = this

    this.canvas = canvas

    // 核心工具
    this.sizes = new Sizes()
    this.time = new Time()

    // Three.js 核心
    this.scene = new THREE.Scene()

    // 资源加载
    this.resources = new Resources(sources)

    // 监听事件
    emitter.on('core:resize', () => this.resize())
    emitter.on('core:tick', () => this.update())

    // 监听资源加载完成
    emitter.on('core:ready', () => {
      console.log('[Experience] Resources ready, initializing scene...')
      this._onResourcesReady()
    })

    window.addEventListener('beforeunload', () => this.destroy())
  }

  _onResourcesReady() {
    // 初始化依赖资源的组件
    // 例如: Camera, Renderer, World, Player 等
    console.log('[Experience] Scene initialized')
  }

  resize() {
    // TODO: Camera 和 Renderer resize
  }

  update() {
    // TODO: Camera 和 Renderer update
  }

  destroy() {
    this.time?.destroy()
    this.sizes?.destroy()
    this.resources?.destroy()

    if (this.scene) {
      this.scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          }
          else {
            child.material.dispose()
          }
        }
      })
      this.scene.clear()
    }

    emitter.all.clear()

    if (window.Experience === this) {
      window.Experience = null
    }
    instance = null
  }
}
