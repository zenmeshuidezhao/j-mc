// src/js/utils/core/resources.js
import * as THREE from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import emitter from '../event/event-bus.js'

export default class Resources {
  constructor(sources) {
    this.sources = sources
    this.items = {}           // 已加载资源存储 { name: resource }
    this.toLoad = sources.length
    this.loaded = 0

    // 加载屏幕 DOM 元素
    this.loadingScreen = document.getElementById('loading-screen')
    this.loadingBar = document.getElementById('loading-bar')
    this.loadingPercentage = document.getElementById('loading-percentage')

    // 初始化加载器
    this._initLoaders()

    // 开始加载所有资源
    this._startLoading()
  }

  /**
   * 初始化各类 Three.js 加载器
   */
  _initLoaders() {
    this.loaders = {
      textureLoader: new THREE.TextureLoader(),
      gltfLoader: new GLTFLoader(),
      cubeTextureLoader: new THREE.CubeTextureLoader(),
      fontLoader: new FontLoader(),
      audioLoader: new THREE.AudioLoader(),
    }
  }

  /**
   * 开始加载所有资源
   */
  _startLoading() {
    for (const source of this.sources) {
      switch (source.type) {
        case 'texture':
          this._loadTexture(source)
          break
        case 'gltfModel':
          this._loadGLTF(source)
          break
        case 'cubeTexture':
          this._loadCubeTexture(source)
          break
        case 'font':
          this._loadFont(source)
          break
        case 'audio':
          this._loadAudio(source)
          break
        default:
          console.warn(`Unknown resource type: ${source.type}`)
          // 即使类型未知也要计数，避免卡住
          this._sourceLoaded(source, null)
      }
    }
  }

  _loadTexture(source) {
    this.loaders.textureLoader.load(
      source.path,
      (texture) => this._sourceLoaded(source, texture),
      undefined,
      (error) => this._onLoadError(source, error),
    )
  }

  _loadGLTF(source) {
    this.loaders.gltfLoader.load(
      source.path,
      (gltf) => this._sourceLoaded(source, gltf),
      undefined,
      (error) => this._onLoadError(source, error),
    )
  }

  _loadCubeTexture(source) {
    this.loaders.cubeTextureLoader.load(
      source.path,
      (cubeTexture) => this._sourceLoaded(source, cubeTexture),
      undefined,
      (error) => this._onLoadError(source, error),
    )
  }

  _loadFont(source) {
    this.loaders.fontLoader.load(
      source.path,
      (font) => this._sourceLoaded(source, font),
      undefined,
      (error) => this._onLoadError(source, error),
    )
  }

  _loadAudio(source) {
    this.loaders.audioLoader.load(
      source.path,
      (audioBuffer) => this._sourceLoaded(source, audioBuffer),
      undefined,
      (error) => this._onLoadError(source, error),
    )
  }

  /**
   * 单个资源加载完成
   */
  _sourceLoaded(source, file) {
    this.items[source.name] = file
    this.loaded++

    // 更新进度 UI
    const percentage = Math.round((this.loaded / this.toLoad) * 100)

    if (this.loadingBar) {
      this.loadingBar.style.width = `${percentage}%`
    }
    if (this.loadingPercentage) {
      this.loadingPercentage.textContent = `${percentage}%`
    }

    // 全部完成
    if (this.loaded === this.toLoad) {
      this._onAllLoaded()
    }
  }

  /**
   * 加载失败处理
   */
  _onLoadError(source, error) {
    console.error(`[Resources] Failed to load: ${source.name}`, error)
    // 失败也计数，避免进度卡住
    this._sourceLoaded(source, null)
  }

  /**
   * 所有资源加载完成
   */
  _onAllLoaded() {
    // 淡出动画隐藏加载屏幕
    if (this.loadingScreen) {
      this.loadingScreen.style.transition = 'opacity 0.5s ease-out'
      this.loadingScreen.style.opacity = '0'

      setTimeout(() => {
        this.loadingScreen.style.display = 'none'
      }, 500)
    }

    // 发出核心就绪事件
    emitter.emit('core:ready')
    console.log('[Resources] All resources loaded:', this.loaded)
  }

  /**
   * 获取加载进度 (0-1)
   */
  get progress() {
    return this.loaded / this.toLoad
  }

  /**
   * 是否全部加载完成
   */
  get isLoaded() {
    return this.loaded === this.toLoad
  }

  /**
   * 获取指定资源
   */
  getItem(name) {
    return this.items[name]
  }

  /**
   * 销毁 - 清理所有资源
   */
  destroy() {
    for (const item of Object.values(this.items)) {
      if (item?.dispose) {
        item.dispose()
      }

      // GLTF 模型需要遍历清理
      if (item?.scene?.traverse) {
        item.scene.traverse((child) => {
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
      }
    }

    this.items = {}
    this.loaded = 0
    console.log('[Resources] Destroyed')
  }
}
