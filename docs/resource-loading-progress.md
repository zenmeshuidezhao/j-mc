# 资源加载进度功能实现文档

## 当前状态分析

### j-mc 项目状态

| 文件/目录 | 状态 | 说明 |
|-----------|------|------|
| `index.html` | ✅ 已存在 | 包含加载屏幕 HTML 结构 |
| `package.json` | ✅ 已配置 | Vue 3 + Three.js + mitt + Pinia |
| `public/` | ✅ 已存在 | textures/, models/, fonts/, img/ |
| `src/` | ❌ 已删除 | 需从头创建 |

### Third-Person-MC 实现架构

```
Third-Person-MC/
├── index.html                      # 加载屏幕 HTML
└── src/
    ├── main.js                     # Vue 应用入口
    ├── App.vue                     # 主组件（初始化 Experience）
    └ js/
    │   ├── experience.js           # 核心单例管理器
    │   ├── sources.js              # 资源定义列表
    │   └ utils/
    │     ├── core/
    │     │   ├── resources.js      # 资源加载器
    │     │   ├── time.js           # RAF 循环
    │     │   ├── sizes.js          # 窗口尺寸
    │     ├── event/
    │     │   ├── event-bus.js      # 事件总线入口
    │     │   ├── debug-emitter.js  # 增强 emitter（调试）
    │     ├── debug/
    │       ├── debug.js            # Tweakpane 调试面板
    │       ├── debug-state-monitor.js
    └ styles/
    │   ├── main.scss               # 主样式入口
    │   ├── _tokens.scss            # CSS 变量
    │   ├── hud.scss                # HUD 样式
    │   pinia/                      # Pinia stores
    │   vue/                        # Vue 组件
```

---

## 实现步骤

### 第一步：创建基础目录结构

```bash
mkdir -p src/js/utils/core
mkdir -p src/js/utils/event
mkdir -p src/styles
mkdir -p src/pinia
mkdir -p src/vue/components
```

目标结构：

```
src/
├── main.js
├── App.vue
├── js/
│   ├── experience.js
│   ├── sources.js
│   └ utils/
│     ├── core/
│     │   ├── resources.js      # 核心：资源加载进度
│     │   ├── time.js
│     │   ├── sizes.js
│     ├── event/
│     │   ├── event-bus.js
│     styles/
│     ├── main.scss
│     ├── _tokens.scss
│     pinia/
│     vue/
│     └ components/
```

---

### 第二步：事件总线（event-bus.js）

```javascript
// src/js/utils/event/event-bus.js
import mitt from 'mitt'

const emitter = mitt()

export default emitter
```

---

### 第三步：资源定义（sources.js）

```javascript
// src/js/sources.js
/**
 * 定义项目所需的静态资源列表
 * type 支持的类型:
 * - gltfModel:  GLTFLoader
 * - texture:    TextureLoader
 * - cubeTexture: CubeTextureLoader
 * - font:       FontLoader
 * - audio:      AudioLoader
 * - hdrTexture: HDRLoader (可选扩展)
 * - video:      自定义 VideoTexture (可选扩展)
 */
export default [
  // ===== 环境贴图（天空盒）=====
  {
    name: 'environmentMap',
    type: 'cubeTexture',
    path: [
      '/textures/sky/px.jpg',
      '/textures/sky/nx.jpg',
      '/textures/sky/py.jpg',
      '/textures/sky/ny.jpg',
      '/textures/sky/pz.jpg',
      '/textures/sky/nz.jpg',
    ],
  },

  // ===== 方块纹理 =====
  {
    name: 'grassTopTexture',
    type: 'texture',
    path: '/textures/blocks/grass_top.png',
  },
  {
    name: 'grassSideTexture',
    type: 'texture',
    path: '/textures/blocks/grass_side.png',
  },
  {
    name: 'dirtTexture',
    type: 'texture',
    path: '/textures/blocks/dirt.png',
  },
  {
    name: 'stoneTexture',
    type: 'texture',
    path: '/textures/blocks/stone.png',
  },

  // ===== 玩家模型 =====
  {
    name: 'playerModel',
    type: 'gltfModel',
    path: '/models/player.glb',
  },

  // ===== 音效 =====
  {
    name: 'breakSound',
    type: 'audio',
    path: '/audio/break.mp3',
  },
]
```

---

### 第四步：资源加载器（resources.js）- 核心实现

```javascript
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
```

---

### 第五步：Time 类（RAF 循环）

```javascript
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
```

---

### 第六步：Sizes 类（窗口尺寸）

```javascript
// src/js/utils/core/sizes.js
import emitter from '../event/event-bus.js'

export default class Sizes {
  constructor() {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.aspect = this.width / this.height
    this.pixelRatio = Math.min(window.devicePixelRatio, 2)

    this._resizeHandler = () => {
      this.width = window.innerWidth
      this.height = window.innerHeight
      this.aspect = this.width / this.height
      this.pixelRatio = Math.min(window.devicePixelRatio, 2)

      emitter.emit('core:resize', {
        width: this.width,
        height: this.height,
        pixelRatio: this.pixelRatio,
      })
    }

    window.addEventListener('resize', this._resizeHandler)
  }

  destroy() {
    window.removeEventListener('resize', this._resizeHandler)
  }
}
```

---

### 第七步：Experience 类（核心单例）

```javascript
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
```

---

### 第八步：样式文件

```scss
// src/styles/_tokens.scss
:root {
  --primary: #262626;
  --secondary: #171717;
  --accent: #2563eb;
  --text: #f3f3f3;
}

// src/styles/main.scss
@use 'tokens';

@use 'tailwindcss';

html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
```

---

### 第九步：Vue 入口

```javascript
// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.scss'

createApp(App).mount('#app')
```

```vue
<!-- src/App.vue -->
<script setup>
import Experience from './js/experience.js'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvas = ref(null)
let experience = null

onMounted(() => {
  experience = new Experience(canvas.value)
})

onBeforeUnmount(() => {
  experience?.destroy()
  experience = null
})
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden">
    <canvas ref="canvas" class="absolute inset-0 z-0" />
  </div>
</template>

<style scoped>
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
```

---

## 加载流程图

```
┌─────────────────────────┐
│     index.html          │
│   显示 #loading-screen  │
│   进度条: 0%            │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     main.js             │
│   Vue App.mount('#app') │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     App.vue mounted     │
│   new Experience(canvas)│
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     Experience          │
│   new Resources(sources)│
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     Resources           │
│   _startLoading()       │
│   逐个加载资源          │
└────────────┬────────────┘
             │
             │ (每个资源完成)
             ▼
┌─────────────────────────┐
│   _sourceLoaded()       │
│   loaded++              │
│   更新进度条 UI         │
│   percentage = loaded/toLoad * 100 │
└────────────┬────────────┘
             │
             │ (全部完成)
             ▼
┌─────────────────────────┐
│    _onAllLoaded()       │
│  1. opacity: 0          │
│  2. setTimeout 500ms    │
│  3. display: none       │
│  4. emit('core:ready')  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Experience 收到事件    │
│  _onResourcesReady()    │
│  初始化 Camera/World等  │
└─────────────────────────┘
```

---

## HTML 加载屏幕（已存在）

```html
<!-- index.html 已包含 -->
<div id="loading-screen" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-900">
  <div class="w-64 space-y-4">
    <div class="text-center">
      <h2 class="text-xl font-semibold text-white mb-2">Loading Resources</h2>
      <p id="loading-percentage" class="text-gray-400">0%</p>
    </div>
    <div class="relative h-2 bg-gray-700 rounded-full overflow-hidden">
      <div id="loading-bar" class="absolute left-0 top-0 h-full w-0 bg-blue-500 transition-all duration-300 ease-out"></div>
    </div>
  </div>
</div>
```

---

## 执行顺序总结

| 步序 | 文件 | 依赖 | 说明 |
|------|------|------|------|
| 1 | `event-bus.js` | mitt | 事件总线基础 |
| 2 | `sources.js` | 无 | 资源定义 |
| 3 | `resources.js` | event-bus, Three.js | **核心：加载进度** |
| 4 | `time.js` | event-bus | RAF 循环 |
| 5 | `sizes.js` | event-bus | 窗口尺寸 |
| 6 | `experience.js` | 以上所有 | 单例管理器 |
| 7 | `main.js` | Vue, App.vue | Vue 入口 |
| 8 | `App.vue` | experience.js | 主组件 |

---

## 关键事件

| 事件名 | 发出者 | 监听者 | 说明 |
|--------|--------|--------|------|
| `core:ready` | Resources | Experience | 资源加载完成 |
| `core:tick` | Time | Experience | 每帧更新 |
| `core:resize` | Sizes | Experience | 窗口尺寸变化 |

---

## 下一步扩展（可选）

1. **Camera + Renderer** - 基础渲染
2. **World** - 场景管理
3. **更多资源类型** - HDR, Video, Draco 压缩
4. **调试面板** - Tweakpane
5. **Pinia Stores** - 状态管理
6. **HUD UI** - Vue 组件