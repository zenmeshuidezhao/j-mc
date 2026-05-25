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
    ├── main.js                     # Vue 应用入口 (含 Pinia + i18n)
    ├── App.vue                     # 主组件（初始化 Experience + UI 组件）
    └ js/
    │   ├── experience.js           # 核心单例管理器
    │   ├── sources.js              # 资源定义列表
    │   ├── renderer.js             # WebGL 渲染器
    │   ├── camera/
    │   │   ├── camera.js           # 相机控制
    │   │   ├── camera-rig.js       # 相机支架
    │   │   ├── camera-rig-config.js
    │   │   ├── world/
    │   │   │   ├── world.js        # 世界管理
    │   │   │   ├── sky-dome.js     # 天空穹
    │   │   │   ├── day-cycle.js    # 昼夜循环
    │   │   │   ├── environment.js  # 环境管理
    │   │   │   ├── entity-collision.js
    │   └ utils/
    │     ├── core/
    │     │   ├── resources.js      # 资源加载器（含进度条）
    │     │   ├── time.js           # RAF 循环
    │     │   ├── sizes.js          # 窗口尺寸
    │     │   ├── stats.js          # 性能统计
    │     ├── event/
    │     │   ├── event-bus.js      # 事件总线入口（增强型 emitter）
    │     │   ├── debug-emitter.js  # 增强 emitter（调试功能）
    │     ├── debug/
    │     │   ├── debug.js          # Tweakpane 调试面板
    │     │   ├── debug-state-monitor.js
    │     ├── input/
    │     │   ├── imouse.js         # 鼠标位置管理
    │     │   ├── input.js          # 输入管理器
    │     │   ├── pointer-lock.js   # 鼠标锁定
    │   ├── styles/
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
mkdir -p src/js/utils/debug
mkdir -p src/js/utils/input
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
│     │   ├── stats.js
│     ├── event/
│     │   ├── event-bus.js
│     │   ├── debug-emitter.js
│     ├── debug/
│     │   ├── debug.js
│     │   ├── debug-state-monitor.js
│     ├── input/
│     │   ├── imouse.js
│     │   ├── input.js
│     │   ├── pointer-lock.js
│   styles/
│   ├── main.scss
│   ├── _tokens.scss
│   pinia/
│   vue/
│   └ components/
```

---

### 第二步：事件总线（event-bus.js + debug-emitter.js）

实际项目中 event-bus.js 导出的是增强型 emitter（debugEmitter），而非原始 mitt。

```javascript
// src/js/utils/event/event-bus.js
import debugEmitter from './debug-emitter.js'

// 导出增强型 emitter (与原版 mitt API 完全一致)
export default debugEmitter
```

```javascript
// src/js/utils/event/debug-emitter.js
import mitt from 'mitt'
import debugStateMonitor from '../debug/debug-state-monitor.js'

const baseEmitter = mitt()
const isDev = import.meta.env.DEV

function getCallerInfo() {
  if (!isDev) return undefined
  try {
    const stack = new Error('caller info').stack
    const lines = stack.split('\n')
    const callerLine = lines[3] || lines[2]
    if (!callerLine) return undefined
    const match = callerLine.match(/\/?([^/:]+):(\d+):\d+\)?$/)
    if (match) {
      const [, fileName, line] = match
      return `${fileName}:${line}`
    }
  }
  catch { /* ignore */ }
  return undefined
}

const debugEmitter = {
  emit(eventName, data) {
    if (isDev) {
      const source = getCallerInfo()
      debugStateMonitor.logEvent('emit', eventName, data, source)
    }
    return baseEmitter.emit(eventName, data)
  },

  on(eventName, handler) {
    if (isDev) {
      const source = getCallerInfo()
      debugStateMonitor.logEvent('on', eventName, null, source)
    }
    return baseEmitter.on(eventName, handler)
  },

  once(eventName, handler) {
    if (isDev) {
      const source = getCallerInfo()
      debugStateMonitor.logEvent('on', `${eventName} (once)`, null, source)
    }
    const wrapper = function (data) {
      baseEmitter.off(eventName, wrapper)
      handler(data)
    }
    wrapper._originalHandler = handler
    return baseEmitter.on(eventName, wrapper)
  },

  off(eventName, handler) {
    if (isDev) {
      const source = getCallerInfo()
      debugStateMonitor.logEvent('off', eventName, null, source)
    }
    if (handler) {
      const handlers = baseEmitter.all.get(eventName)
      if (handlers) {
        const wrappedHandler = handlers.find(h => h._originalHandler === handler)
        if (wrappedHandler) return baseEmitter.off(eventName, wrappedHandler)
      }
    }
    return baseEmitter.off(eventName, handler)
  },

  get all() {
    return baseEmitter.all
  },
}

export default debugEmitter
export const { emit, on, once, off, all } = debugEmitter
```

---

### 第三步：资源定义（sources.js）

实际项目中的资源列表远比简化示例丰富，包含多种资源类型：

```javascript
// src/js/sources.js
/**
 * 定义项目所需的静态资源列表。
 * Resources 类会根据 'type' 属性自动选择合适的加载器。
 *
 * 支持的资源类型 (type) 及其对应的加载器/方式:
 * - gltfModel:   GLTFLoader (支持 Draco 和 KTX2 压缩)
 * - texture:     TextureLoader (普通图像纹理, 如 jpg, png)
 * - cubeTexture: CubeTextureLoader (立方体贴图, 用于环境映射等)
 * - font:        FontLoader (加载字体文件, 通常是 json 格式)
 * - fbxModel:    FBXLoader (加载 FBX 模型)
 * - audio:       AudioLoader (加载音频文件)
 * - objModel:    OBJLoader (加载 OBJ 模型)
 * - hdrTexture:  HDRLoader (加载 HDR 环境贴图)
 * - svg:         SVGLoader (加载 SVG 文件作为纹理或数据)
 * - exrTexture:  EXRLoader (加载 EXR 高动态范围图像)
 * - video:       自定义加载逻辑，创建 VideoTexture (加载视频作为纹理)
 * - ktx2Texture: KTX2Loader (加载 KTX2 压缩纹理)
 */
export default [
  // ===== 环境贴图 =====
  {
    name: 'environmentMapHDRTexture',
    type: 'hdrTexture',
    path: 'textures/environmentMap/HDRI_110.hdr',
  },
  {
    name: 'backgroundTexture',
    type: 'texture',
    path: 'textures/background/morning.png',
  },

  // ===== 玩家模型 =====
  {
    name: 'steveModel',
    type: 'gltfModel',
    path: 'models/character/steve.glb',
  },
  {
    name: 'zombieModel',
    type: 'gltfModel',
    path: 'models/character/zombie.glb',
  },
  {
    name: 'alexModel',
    type: 'gltfModel',
    path: 'models/character/alex.glb',
  },
  {
    name: 'playerModel',
    type: 'gltfModel',
    path: 'models/character/player.glb',
  },

  // ===== 方块纹理 =====
  {
    name: 'grass_block_top_texture',
    type: 'texture',
    path: 'textures/blocks/grass_block_top.png',
  },
  {
    name: 'grass',
    type: 'texture',
    path: 'textures/blocks/grass.png',
  },
  {
    name: 'grass_block_side_texture',
    type: 'texture',
    path: 'textures/blocks/grass_block_side.png',
  },
  {
    name: 'coal_ore',
    type: 'texture',
    path: 'textures/blocks/coal_ore.png',
  },
  {
    name: 'dirt',
    type: 'texture',
    path: 'textures/blocks/dirt.png',
  },
  {
    name: 'stone',
    type: 'texture',
    path: 'textures/blocks/stone.png',
  },
  {
    name: 'iron_ore',
    type: 'texture',
    path: 'textures/blocks/iron_ore.png',
  },
  {
    name: 'sand',
    type: 'texture',
    path: 'textures/blocks/sand.png',
  },
  {
    name: 'red_sand',
    type: 'texture',
    path: 'textures/blocks/red_sand.png',
  },
  {
    name: 'terracotta_yellow',
    type: 'texture',
    path: 'textures/blocks/terracotta_yellow.png',
  },
  {
    name: 'terracotta_red',
    type: 'texture',
    path: 'textures/blocks/terracotta_red.png',
  },
  {
    name: 'snow',
    type: 'texture',
    path: 'textures/blocks/snow.png',
  },

  // ===== 树木纹理 =====
  {
    name: 'treeTrunk_TopTexture',
    type: 'texture',
    path: 'textures/blocks/tree_trunk_Top.png',
  },
  {
    name: 'treeTrunk_SideTexture',
    type: 'texture',
    path: 'textures/blocks/tree_trunk_Side.png',
  },
  {
    name: 'treeLeaves_Texture',
    type: 'texture',
    path: 'textures/blocks/azalea_leaves.png',
  },

  // ===== 白桦树纹理 =====
  {
    name: 'birchTrunk_TopTexture',
    type: 'texture',
    path: 'textures/blocks/birch_trunk_Top.png',
  },
  {
    name: 'birchTrunk_SideTexture',
    type: 'texture',
    path: 'textures/blocks/birch_trunk_Side.png',
  },
  {
    name: 'birchLeaves_Texture',
    type: 'texture',
    path: 'textures/blocks/azalea_leaves.png',
  },

  // ===== 樱花树纹理 =====
  {
    name: 'cherryTrunk_TopTexture',
    type: 'texture',
    path: 'textures/blocks/cherry_trunk_Top.png',
  },
  {
    name: 'cherryTrunk_SideTexture',
    type: 'texture',
    path: 'textures/blocks/cherry_trunk_Side.png',
  },
  {
    name: 'cherryLeaves_Texture',
    type: 'texture',
    path: 'textures/blocks/cherry_leaves.png',
  },

  // ===== 仙人掌纹理 =====
  {
    name: 'cactusTrunk_TopTexture',
    type: 'texture',
    path: 'textures/blocks/cactus_trunk_Top.png',
  },
  {
    name: 'cactusTrunk_SideTexture',
    type: 'texture',
    path: 'textures/blocks/cactus_trunk_Side.png',
  },

  // ===== 水和冰 =====
  {
    name: 'water_Texture',
    type: 'texture',
    path: 'textures/blocks/water.png',
  },
  {
    name: 'ice_Texture',
    type: 'texture',
    path: 'textures/blocks/ice.png',
  },
  {
    name: 'packedIce_Texture',
    type: 'texture',
    path: 'textures/blocks/ice_packed.png',
  },
  {
    name: 'gravel_Texture',
    type: 'texture',
    path: 'textures/blocks/gravel.png',
  },

  // ===== 植物 =====
  {
    name: 'deadBush_plant_Texture',
    type: 'texture',
    path: 'textures/blocks/dead_bush.png',
  },
  {
    name: 'shortDryGrass_plant_Texture',
    type: 'texture',
    path: 'textures/blocks/short_dry_grass.png',
  },
  {
    name: 'shortGrass_plant_Texture',
    type: 'texture',
    path: 'textures/blocks/short_grass.png',
  },
  {
    name: 'dandelion_plant_Texture',
    type: 'texture',
    path: 'textures/blocks/dandelion.png',
  },
  {
    name: 'poppy_plant_Texture',
    type: 'texture',
    path: 'textures/blocks/poppy.png',
  },
  {
    name: 'oxeyeDaisy_plant_Texture',
    type: 'texture',
    path: 'textures/blocks/oxeye_daisy.png',
  },
  {
    name: 'allium_plant_Texture',
    type: 'texture',
    path: 'textures/blocks/allium.png',
  },
  {
    name: 'cactus_flower_Texture',
    type: 'texture',
    path: 'textures/blocks/cactus_flower.png',
  },
  {
    name: 'pink_tulip_Texture',
    type: 'texture',
    path: 'textures/blocks/pink_tulip.png',
  },

  // ===== 方块破坏纹理（10 阶段）=====
  {
    name: 'destroy_stage_0',
    type: 'texture',
    path: 'textures/destroy/destroy_stage_0.png',
  },
  {
    name: 'destroy_stage_1',
    type: 'texture',
    path: 'textures/destroy/destroy_stage_1.png',
  },
  {
    name: 'destroy_stage_2',
    type: 'texture',
    path: 'textures/destroy/destroy_stage_2.png',
  },
  {
    name: 'destroy_stage_3',
    type: 'texture',
    path: 'textures/destroy/destroy_stage_3.png',
  },
  {
    name: 'destroy_stage_4',
    type: 'texture',
    path: 'textures/destroy/destroy_stage_4.png',
  },
  {
    name: 'destroy_stage_5',
    type: 'texture',
    path: 'textures/destroy/destroy_stage_5.png',
  },
  {
    name: 'destroy_stage_6',
    type: 'texture',
    path: 'textures/destroy/destroy_stage_6.png',
  },
  {
    name: 'destroy_stage_7',
    type: 'texture',
    path: 'textures/destroy/destroy_stage_7.png',
  },
  {
    name: 'destroy_stage_8',
    type: 'texture',
    path: 'textures/destroy/destroy_stage_8.png',
  },
  {
    name: 'destroy_stage_9',
    type: 'texture',
    path: 'textures/destroy/destroy_stage_9.png',
  },

  // ===== 天空盒贴图（昼夜循环）=====
  {
    name: 'sky_sunriseTexture',
    type: 'texture',
    path: 'textures/background/sunrise.png',
  },
  {
    name: 'sky_morningTexture',
    type: 'texture',
    path: 'textures/background/morning.png',
  },
  {
    name: 'sky_noonTexture',
    type: 'texture',
    path: 'textures/background/noon.png',
  },
  {
    name: 'sky_afternoonTexture',
    type: 'texture',
    path: 'textures/background/afternoon.png',
  },
  {
    name: 'sky_sunsetTexture',
    type: 'texture',
    path: 'textures/background/sunset.png',
  },
  {
    name: 'sky_duskTexture',
    type: 'texture',
    path: 'textures/background/dusk.png',
  },
  {
    name: 'sky_midnightTexture',
    type: 'texture',
    path: 'textures/background/midnight.png',
  },
]
```

---

### 第四步：资源加载器（resources.js）- 核心实现

与简化版的关键差异：
- 通过 `Experience` 单例获取 `renderer`（用于 KTX2 支持）
- 支持更多加载器类型（DRACO, KTX2, FBX, OBJ, HDR, SVG, EXR, Video）
- 方法名无 `_` 前缀（`setLoaders`, `startLoading`, `sourceLoaded`）
- 无单独的 `_onLoadError`，加载器调用中无错误回调（由 Three.js loader 内部处理）
- 有 `loadVideoTexture` 异步方法
- getter 为 `loadProgress`（而非 `progress`）

```javascript
// src/js/utils/core/resources.js
import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

import Experience from '../../experience.js'
import emitter from '../event/event-bus.js'

export default class Resources {
  constructor(sources, options = {}) {
    this.experience = new Experience()
    this.renderer = this.experience.renderer
    this.sources = sources

    this.items = {}
    this.toLoad = this.sources.length
    this.loaded = 0

    // Loading screen elements
    this.loadingScreen = document.getElementById('loading-screen')
    this.loadingBar = document.getElementById('loading-bar')
    this.loadingPercentage = document.getElementById('loading-percentage')

    this.options = {
      dracoDecoderPath: 'https://www.gstatic.com/draco/v1/decoders/',
      ktx2TranscoderPath: 'https://unpkg.com/three/examples/jsm/libs/basis/',
      ...options,
    }

    this.setLoaders()
    this.startLoading()
  }

  setLoaders() {
    this.loaders = {}
    this.loaders.gltfLoader = new GLTFLoader()
    this.loaders.textureLoader = new THREE.TextureLoader()
    this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader()
    this.loaders.fontLoader = new FontLoader()
    this.loaders.fbxLoader = new FBXLoader()
    this.loaders.audioLoader = new THREE.AudioLoader()
    this.loaders.objLoader = new OBJLoader()
    this.loaders.hdrTextureLoader = new HDRLoader()
    this.loaders.svgLoader = new SVGLoader()
    this.loaders.exrLoader = new EXRLoader()
    this.loaders.ktx2Loader = new KTX2Loader()

    // Set up DRACOLoader
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath(this.options.dracoDecoderPath)
    this.loaders.gltfLoader.setDRACOLoader(dracoLoader)

    // Set up KTX2Loader
    this.loaders.ktx2Loader
      .setTranscoderPath(this.options.ktx2TranscoderPath)
      .detectSupport(this.renderer.instance)
    this.loaders.gltfLoader.setKTX2Loader(this.loaders.ktx2Loader)
  }

  startLoading() {
    for (const source of this.sources) {
      switch (source.type) {
        case 'gltfModel': {
          this.loaders.gltfLoader.load(source.path, (file) => {
            this.sourceLoaded(source, file)
          })
          break
        }
        case 'texture': {
          this.loaders.textureLoader.load(source.path, (file) => {
            this.sourceLoaded(source, file)
          })
          break
        }
        case 'cubeTexture': {
          this.loaders.cubeTextureLoader.load(source.path, (file) => {
            this.sourceLoaded(source, file)
          })
          break
        }
        case 'font': {
          this.loaders.fontLoader.load(source.path, (file) => {
            this.sourceLoaded(source, file)
          })
          break
        }
        case 'fbxModel': {
          this.loaders.fbxLoader.load(source.path, (file) => {
            this.sourceLoaded(source, file)
          })
          break
        }
        case 'audio': {
          this.loaders.audioLoader.load(source.path, (file) => {
            this.sourceLoaded(source, file)
          })
          break
        }
        case 'objModel': {
          this.loaders.objLoader.load(source.path, (file) => {
            this.sourceLoaded(source, file)
          })
          break
        }
        case 'hdrTexture': {
          this.loaders.hdrTextureLoader.load(source.path, (file) => {
            this.sourceLoaded(source, file)
          })
          break
        }
        case 'svg': {
          this.loaders.svgLoader.load(source.path, (file) => {
            this.sourceLoaded(source, file)
          })
          break
        }
        case 'exrTexture': {
          this.loaders.exrLoader.load(source.path, (file) => {
            this.sourceLoaded(source, file)
          })
          break
        }
        case 'video': {
          this.loadVideoTexture(source.path).then((file) => {
            this.sourceLoaded(source, file)
          })
          break
        }
        case 'ktx2Texture': {
          this.loaders.ktx2Loader.load(source.path, (file) => {
            this.sourceLoaded(source, file)
          })
          break
        }
        // No default — 未知类型会被静默跳过
      }
    }
  }

  sourceLoaded(source, file) {
    this.items[source.name] = file
    this.loaded++

    // Update loading progress
    const progress = this.loadProgress
    const percentage = Math.round(progress * 100)

    if (this.loadingBar) {
      this.loadingBar.style.width = `${percentage}%`
    }
    if (this.loadingPercentage) {
      this.loadingPercentage.textContent = `${percentage}%`
    }

    if (this.loaded === this.toLoad) {
      // Hide loading screen with fade out animation
      if (this.loadingScreen) {
        this.loadingScreen.style.transition = 'opacity 0.5s ease-out'
        this.loadingScreen.style.opacity = '0'
        setTimeout(() => {
          this.loadingScreen.style.display = 'none'
        }, 500)
      }
      emitter.emit('core:ready')
    }
  }

  loadVideoTexture(path) {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.src = path
      video.loop = true
      video.muted = true
      video.playsInline = true

      video.addEventListener('loadeddata', () => {
        const texture = new THREE.VideoTexture(video)
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.format = THREE.RGBFormat
        resolve(texture)
      })

      video.load()
    })
  }

  get loadProgress() {
    return this.loaded / this.toLoad
  }

  get isLoaded() {
    return this.loaded === this.toLoad
  }

  destroy() {
    // Dispose all loaded textures
    for (const item of Object.values(this.items)) {
      if (item?.dispose) {
        item.dispose()
      }
      // For GLTF models, traverse and dispose
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

    // Clear items
    this.items = {}
    this.loaded = 0
  }
}
```

---

### 第五步：Time 类（RAF 循环）

实际实现中方法名无 `_` 前缀，RAF 初始化方式为先 requestAnimationFrame 再调用 tick。

```javascript
// src/js/utils/core/time.js
import emitter from '../event/event-bus.js'

export default class Time {
  constructor() {
    // Setup
    this.start = Date.now()
    this.current = this.start
    this.elapsed = 0
    this.delta = 16

    // RAF ID for cleanup
    this.rafId = null

    this.rafId = window.requestAnimationFrame(() => {
      this.tick()
    })
  }

  tick() {
    const currentTime = Date.now()
    // Clamp delta to 100ms max to prevent physics tunneling when tab is backgrounded
    this.delta = Math.min(currentTime - this.current, 100)
    this.current = currentTime
    this.elapsed = this.current - this.start

    emitter.emit('core:tick', {
      delta: this.delta,
      elapsed: this.elapsed,
    })

    this.rafId = window.requestAnimationFrame(() => {
      this.tick()
    })
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

实际实现中 `pixelRatio` 使用 `window.devicePixelRatio || 2`（而非 `Math.min`），resize 时不重新计算 `aspect`。

```javascript
// src/js/utils/core/sizes.js
import emitter from '../event/event-bus.js'

export default class Sizes {
  constructor() {
    // Setup
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.aspect = this.width / this.height
    this.pixelRatio = window.devicePixelRatio || 2

    // Save handler reference for cleanup
    this._resizeHandler = () => {
      this.width = window.innerWidth
      this.height = window.innerHeight
      this.pixelRatio = window.devicePixelRatio || 2

      emitter.emit('core:resize', {
        width: this.width,
        height: this.height,
        pixelRatio: this.pixelRatio,
      })
    }

    // Resize event
    window.addEventListener('resize', this._resizeHandler)
  }

  destroy() {
    window.removeEventListener('resize', this._resizeHandler)
  }
}
```

---

### 第七步：Experience 类（核心单例）

实际实现包含完整的子系统初始化（Camera, Renderer, Debug, Stats, Input 等），以及暂停状态和世界创建事件监听。

```javascript
// src/js/experience.js
import * as THREE from 'three'

import Camera from './camera/camera.js'
import Renderer from './renderer.js'
import sources from './sources.js'
import Resources from './utils/core/resources.js'
import Sizes from './utils/core/sizes.js'
import Stats from './utils/core/stats.js'
import Time from './utils/core/time.js'
import Debug from './utils/debug/debug.js'
import emitter from './utils/event/event-bus.js'
import IMouse from './utils/input/imouse.js'
import InputManager from './utils/input/input.js'
import PointerLockManager from './utils/input/pointer-lock.js'
import World from './world/world.js'

let instance

export default class Experience {
  constructor(canvas) {
    // Singleton
    if (instance) return instance
    instance = this

    // Global access
    window.Experience = this

    this.canvas = canvas

    // Panel
    this.debug = new Debug()
    this.stats = new Stats()
    this.sizes = new Sizes()
    this.time = new Time()
    this.scene = new THREE.Scene()
    this.camera = new Camera()
    this.renderer = new Renderer()
    this.resources = new Resources(sources)
    this.iMouse = new IMouse()
    this.input = new InputManager()
    this.pointerLock = new PointerLockManager()
    this.terrainDataManager = null // 地形数据管理器 - 将在 World 中初始化
    this.world = new World()

    emitter.on('core:resize', () => {
      this.resize()
    })

    emitter.on('core:tick', () => {
      this.update()
    })

    // Listen for pause state changes from UI
    this.isPaused = false
    emitter.on('ui:pause-changed', (paused) => {
      this.isPaused = paused
    })

    // Listen for world creation/reset events from UI
    emitter.on('game:create_world', ({ seed, terrain, trees }) => {
      if (this.world?.chunkManager) {
        this.world.reset({ seed, terrain, trees })
      }
    })

    emitter.on('game:reset_world', ({ seed, terrain, trees }) => {
      if (this.world) {
        this.world.reset({ seed, terrain, trees })
      }
    })

    window.addEventListener('beforeunload', () => {
      this.destroy()
    })
  }

  resize() {
    this.camera.resize()
    this.renderer.resize()
  }

  update() {
    // When paused, skip world and camera updates but keep rendering
    if (!this.isPaused) {
      this.camera.update()
      this.world.update()
    }
    // Always render (for static scene display)
    this.renderer.update()
    this.stats.update()
    this.iMouse.update()
  }

  destroy() {
    // 1. Stop update loop first
    this.time?.destroy()

    // 2. Destroy child components (reverse init order)
    this.world?.destroy()
    this.pointerLock?.destroy()
    this.input?.destroy()
    this.iMouse?.destroy()
    this.resources?.destroy()
    this.renderer?.destroy()
    this.camera?.destroy()

    // 3. Destroy utils
    this.stats?.destroy()
    this.sizes?.destroy()
    this.debug?.destroy()

    // 4. Clear scene
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

    // 5. Clear all mitt events (unified cleanup)
    emitter.all.clear()

    // 6. Clear global references
    if (window.Experience === this) {
      window.Experience = null
    }

    // 7. Reset singleton
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

实际 main.js 包含 Pinia（带调试插件）和 i18n。

```javascript
// src/main.js
import { createDebugPlugin } from '@pinia/debug-plugin.js'
import i18n from '@three/i18n.js'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import '@styles/main.scss'

const app = createApp(App)

// 创建 Pinia 实例并添加调试插件
const pinia = createPinia()
pinia.use(createDebugPlugin())

app.use(pinia)
app.use(i18n)
app.mount('#app')
```

```vue
<!-- src/App.vue -->
<script setup>
import Experience from '@three/experience.js'
import Crosshair from '@ui-components/Crosshair.vue'
import EventMonitorPanel from '@ui-components/debug/EventMonitorPanel.vue'
import GameHud from '@ui-components/hud/GameHud.vue'
import UiRoot from '@ui-components/menu/UiRoot.vue'
import AchievementPopup from '@ui-components/ui/AchievementPopup.vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const threeCanvas = ref(null)
let experience = null
onMounted(() => {
  // 初始化 three.js 场景
  experience = new Experience(threeCanvas.value)
})

onBeforeUnmount(() => {
  experience?.destroy()
  experience = null
})

// 检查是否为 debug 模式
const isDebugMode = window.location.hash === '#debug'
</script>

<template>
  <!-- 主容器：相对定位 -->
  <div class="relative w-screen h-screen overflow-hidden">
    <!-- Three.js Canvas -->
    <canvas ref="threeCanvas" class="three-canvas absolute inset-0 z-0" />

    <!-- Menu System (Loading/MainMenu/Pause/Settings) -->
    <UiRoot />

    <!-- Minecraft Style HUD (只在 playing 时显示) -->
    <GameHud />

    <!-- 准星（仅在 Pointer Lock 激活时显示） -->
    <Crosshair />

    <!-- Debug 模式：浮动 Event Monitor 面板 -->
    <EventMonitorPanel v-if="isDebugMode" class="event-monitor-overlay overflow-visible" />

    <!-- 成就提示弹窗 -->
    <AchievementPopup />
  </div>
</template>

<style scoped>
.three-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* Event Monitor 浮动面板样式 */
.event-monitor-overlay {
  position: absolute;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
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
│   Vue + Pinia + i18n    │
│   App.mount('#app')     │
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
│   初始化所有子系统      │
│   new Resources(sources)│
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     Resources           │
│   setLoaders()          │
│   startLoading()        │
│   逐个加载资源          │
└────────────┬────────────┘
             │
             │ (每个资源完成)
             ▼
┌─────────────────────────┐
│   sourceLoaded()        │
│   items[name] = file    │
│   loaded++              │
│   更新进度条 UI         │
│   percentage = loadProgress * 100 │
└────────────┬────────────┘
             │
             │ (全部完成)
             ▼
┌─────────────────────────┐
│    loaded === toLoad    │
│  1. opacity: 0          │
│  2. setTimeout 500ms    │
│  3. display: none       │
│  4. emit('core:ready')  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Experience 收到事件    │
│  初始化 Camera/World等  │
│  开始 RAF tick 循环     │
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
| 1 | `debug-emitter.js` | mitt, debug-state-monitor | 增强型事件总线 |
| 2 | `event-bus.js` | debug-emitter | 事件总线入口（导出 debugEmitter） |
| 3 | `sources.js` | 无 | 资源定义 |
| 4 | `resources.js` | event-bus, Experience, Three.js loaders | **核心：加载进度** |
| 5 | `time.js` | event-bus | RAF 循环 |
| 6 | `sizes.js` | event-bus | 窗口尺寸 |
| 7 | `experience.js` | 以上所有 + Camera/Renderer/World/Input | 单例管理器 |
| 8 | `main.js` | Vue, Pinia, i18n, App.vue | Vue 入口 |
| 9 | `App.vue` | experience.js, UI 组件 | 主组件 |

---

## 关键事件

| 事件名 | 发出者 | 监听者 | 说明 |
|--------|--------|--------|------|
| `core:ready` | Resources | Experience (及各子系统) | 资源加载完成 |
| `core:tick` | Time | Experience | 每帧更新 |
| `core:resize` | Sizes | Experience | 窗口尺寸变化 |
| `ui:pause-changed` | UI (Pinia/Vue) | Experience | 暂停状态切换 |
| `game:create_world` | UI | Experience/World | 创建世界 |
| `game:reset_world` | UI | Experience/World | 重置世界 |

---

## 与旧文档的主要差异

| 项 | 旧文档 | 实际实现 |
|----|--------|----------|
| event-bus | 直接导出 `mitt()` | 导出 `debugEmitter`（增强型 wrapper） |
| sources.js | 6 个简化资源 | 55+ 个真实资源，含 hdr/exr/ktx2/video 等类型 |
| resources.js | 5 种 loader，无 DRACO/KTX2 | 12 种 loader，含 DRACO/KTX2/FBX/OBJ/HDR/SVG/EXR/Video |
| resources.js 方法名 | `_initLoaders/_startLoading/_sourceLoaded/_onLoadError/_onAllLoaded` | `setLoaders/startLoading/sourceLoaded`（无 `_` 前缀，无 `_onLoadError/_onAllLoaded`） |
| resources.js 构造 | 无 Experience 引用，无 options | 有 `new Experience()` 引用 renderer，有 options（draco/ktx2 路径） |
| progress getter | `progress` | `loadProgress` |
| time.js 方法名 | `_tick()` | `tick()` |
| time.js RAF 初始化 | `this._tick()` 直接调用 | 先 `requestAnimationFrame(() => this.tick())` |
| sizes.js pixelRatio | `Math.min(window.devicePixelRatio, 2)` | `window.devicePixelRatio || 2` |
| sizes.js resize | 重新计算 `aspect` | 不重新计算 `aspect` |
| experience.js | 骨架，监听 `core:ready` | 完整系统，无单独 `core:ready` 监听 |
| main.js | 仅 Vue mount | Vue + Pinia(debug-plugin) + i18n |
| App.vue | 极简 | 含 UiRoot/GameHud/Crosshair/EventMonitor/Achievement |

---

## 下一步扩展（可选）

1. **Camera + Renderer** - 基础渲染
2. **World** - 场景管理
3. **更多资源类型** - 按实际 sources.js 已支持
4. **调试面板** - Tweakpane + debug-emitter
5. **Pinia Stores** - 状态管理（含 debug-plugin）
6. **HUD UI** - Vue 组件
7. **Input 系统** - IMouse/InputManager/PointerLock