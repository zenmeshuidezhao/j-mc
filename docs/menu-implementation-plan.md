# j-mc 菜单首页实现方案

> 基于 Third-Person-MC 项目完整代码分析，确保 j-mc 实现与原项目完全一致

---

## 一、完整文件结构

```
src/
├── App.vue                          # 主应用入口
├── main.js                          # Vue + Pinia + i18n 初始化
│
├── pinia/
│   ├── uiStore.js                   # UI 状态管理（屏幕、菜单视图、世界状态、种子）
│   ├── achievementStore.js          # 成就状态管理
│   ├── skinStore.js                 # 皮肤状态管理
│   └── settingsStore.js             # 游戏设置管理
│
├── locales/
│   ├── en.json                      # 英文翻译
│   └── zh.json                      # 中文翻译
│
├── vue/components/
│   ├── menu/
│   │   ├── UiRoot.vue               # 菜单系统根组件（状态路由）
│   │   ├── LoadingScreen.vue        # 加载屏幕
│   │   ├── MainMenu.vue             # 主菜单（含 WorldSetup、Advanced）
│   │   ├── PauseMenu.vue            # 暂停菜单
│   │   ├── SettingsMenu.vue         # 设置菜单
│   │   ├── AchievementMenu.vue      # 成就列表
│   │   ├── HowToPlay.vue            # 玩法说明（多页教程）
│   │   ├── SkinSelector.vue         # 皮肤选择
│   │   └── ui/
│   │       └── McStepSlider.vue     # Minecraft 风格步进滑块
│   ├── ui/
│   │   └── AchievementPopup.vue     # 成就 Toast 弹窗
│   └── hud/
│       └── GameHud.vue              # 游戏内 HUD（可选）
│
├── js/
│   ├── experience.js                # Three.js 主类
│   ├── i18n.js                      # i18n 配置
│   ├── config/
│   │   ├── skin-config.js           # 皮肤配置
│   │   ├── worldgen-presets.js      # 世界生成预设
│   │   ├── settings-presets.js      # 设置预设
│   │   └── chunk-config.js          # 区块配置
│   ├── components/
│   │   └── skin-preview-scene.js    # 皮肤预览 3D 场景
│   └── utils/
│       ├── core/
│       │   ├── resources.js         # 资源加载器
│       │   ├── sizes.js             # 窗口尺寸
│       │   └── time.js              # 时间循环
│       └── event/
│           └── event-bus.js         # mitt 事件总线
│
├── styles/
│   ├── main.scss                    # 全局样式入口
│   ├── _tokens.scss                 # MC UI 变量 + 字体 + 按钮样式
│   └── hud.scss                     # HUD 样式（可选）
│
└── public/
    ├── textures/hub/
    │   ├── logo.png                 # 主菜单 Logo
    │   ├── btn_bg.png               # 按钮纹理
    │   └── github.png               # GitHub 图标
    ├── fonts/
    │   ├── Minecraftia-Regular.ttf  # 英文像素字体
    │   └── MinecraftV2.ttf          # 中文像素字体
    ├── img/
    │   ├── achievement/             # 成就图标（16个）
    │   └── howToPlayer/             # 玩法说明图片（5张）
    └── textures/skins/              # 皮肤缩略图
```

---

## 二、状态机设计

### 2.1 uiStore.js 完整实现

```javascript
import { useSettingsStore } from '@pinia/settingsStore.js'
import emitter from '@js/utils/event/event-bus.js'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { CHUNK_DEFAULTS } from '../js/config/chunk-config.js'
import {
  buildWorldGenParams,
  DEFAULT_WORLDGEN_DRAFT,
  WORLDGEN_PRESETS,
} from '../js/config/worldgen-presets.js'
import { useAchievementStore } from './achievementStore.js'

// ========================================
// Constants
// ========================================
const SEED_MAX = 2_000_000_000
const SEED_REGEX = /^\d+$/

// ========================================
// UI Store Definition
// ========================================
export const useUiStore = defineStore('ui', () => {
  const settingsStore = useSettingsStore()

  // ----------------------------------------
  // State
  // ----------------------------------------

  /** Current screen: 'loading' | 'mainMenu' | 'playing' | 'pauseMenu' | 'settings' */
  const screen = ref('loading')

  /** Main menu sub-view: 'root' | 'worldSetup' | 'howToPlay' | 'skinSelector' | 'achievements' */
  const mainMenuView = ref('root')

  /** Whether a new world creation is pending (for overwrite confirmation) */
  const pendingNewWorld = ref(false)

  /** World state */
  const world = ref({
    hasWorld: false,
    seed: null,
  })

  /** Seed input draft (user typing) */
  const seedDraft = ref('')

  /** Seed validation error message */
  const seedError = ref(null)

  /** Where to return after settings: 'mainMenu' | 'pauseMenu' | null */
  const returnTo = ref(null)

  /** Whether the game is paused */
  const isPaused = ref(false)

  /** WorldGen draft (Advanced panel state) */
  const worldGenDraft = reactive({
    presetId: DEFAULT_WORLDGEN_DRAFT.presetId,
    magnitude: DEFAULT_WORLDGEN_DRAFT.magnitude,
    treeMinHeight: DEFAULT_WORLDGEN_DRAFT.treeMinHeight,
    treeMaxHeight: DEFAULT_WORLDGEN_DRAFT.treeMaxHeight,
    viewDistance: CHUNK_DEFAULTS.viewDistance,
  })

  /** Whether Advanced panel is expanded */
  const advancedExpanded = ref(false)

  // ----------------------------------------
  // Computed
  // ----------------------------------------

  /** Check if current screen shows a menu overlay */
  const isMenuVisible = computed(() => {
    return ['loading', 'mainMenu', 'pauseMenu', 'settings'].includes(screen.value)
  })

  // ----------------------------------------
  // Seed Helpers
  // ----------------------------------------

  function normalizeSeedDraft() {
    seedDraft.value = seedDraft.value.trim()
  }

  function isSeedValidNumeric() {
    const trimmed = seedDraft.value.trim()
    if (trimmed === '') return true
    return SEED_REGEX.test(trimmed)
  }

  function getOrCreateSeedNumber() {
    const trimmed = seedDraft.value.trim()
    if (trimmed === '') {
      return Math.floor(Math.random() * SEED_MAX)
    }
    return Number.parseInt(trimmed, 10)
  }

  function randomizeSeed() {
    const randomSeed = Math.floor(Math.random() * SEED_MAX)
    seedDraft.value = String(randomSeed)
    seedError.value = null
  }

  function setSeedDraft(value) {
    seedDraft.value = value
    if (value.trim() !== '' && !SEED_REGEX.test(value.trim())) {
      seedError.value = 'Seed must be numeric only'
    } else {
      seedError.value = null
    }
  }

  // ----------------------------------------
  // Actions: Screen Navigation
  // ----------------------------------------

  function toMainMenu({ preservePause = false } = {}) {
    screen.value = 'mainMenu'
    mainMenuView.value = 'root'
    if (!preservePause) {
      isPaused.value = true
    }
    emitter.emit('ui:pause-changed', true)
  }

  function toPlaying() {
    screen.value = 'playing'
    mainMenuView.value = 'root'
    isPaused.value = false
    emitter.emit('ui:pause-changed', false)
    emitter.emit('game:request_pointer_lock')
  }

  function toPauseMenu() {
    screen.value = 'pauseMenu'
    mainMenuView.value = 'root'
    isPaused.value = true
    emitter.emit('ui:pause-changed', true)
  }

  function toSettings(from) {
    returnTo.value = from
    screen.value = 'settings'
  }

  function exitSettings() {
    screen.value = returnTo.value === 'pauseMenu' ? 'pauseMenu' : 'mainMenu'
    returnTo.value = null
  }

  // ----------------------------------------
  // Actions: Main Menu Views
  // ----------------------------------------

  function enterWorldSetup({ mode }) {
    mainMenuView.value = 'worldSetup'
    pendingNewWorld.value = mode === 'newWorld'
    seedDraft.value = ''
    seedError.value = null
    resetWorldGenDraft()
    advancedExpanded.value = false
  }

  function backToMainRoot() {
    mainMenuView.value = 'root'
    pendingNewWorld.value = false
    seedDraft.value = ''
    seedError.value = null
    advancedExpanded.value = false
  }

  function toHowToPlay() {
    mainMenuView.value = 'howToPlay'
  }

  function exitHowToPlay() {
    backToMainRoot()
  }

  function toSkinSelector() {
    mainMenuView.value = 'skinSelector'
  }

  function exitSubView() {
    if (screen.value === 'pauseMenu')
      mainMenuView.value = 'root'
    else
      backToMainRoot()
  }

  function exitSkinSelector() {
    exitSubView()
  }

  function toAchievements() {
    mainMenuView.value = 'achievements'
  }

  function exitAchievements() {
    exitSubView()
  }

  // ----------------------------------------
  // Actions: WorldGen Draft
  // ----------------------------------------

  function applyWorldGenPreset(presetId) {
    const preset = WORLDGEN_PRESETS[presetId]
    if (!preset) return

    worldGenDraft.presetId = presetId
    worldGenDraft.magnitude = preset.terrain.magnitude
    worldGenDraft.treeMinHeight = preset.trees.minHeight
    worldGenDraft.treeMaxHeight = preset.trees.maxHeight
  }

  function resetWorldGenDraft() {
    worldGenDraft.presetId = DEFAULT_WORLDGEN_DRAFT.presetId
    worldGenDraft.magnitude = DEFAULT_WORLDGEN_DRAFT.magnitude
    worldGenDraft.treeMinHeight = DEFAULT_WORLDGEN_DRAFT.treeMinHeight
    worldGenDraft.treeMaxHeight = DEFAULT_WORLDGEN_DRAFT.treeMaxHeight
    worldGenDraft.viewDistance = CHUNK_DEFAULTS.viewDistance
  }

  function toggleAdvanced() {
    advancedExpanded.value = !advancedExpanded.value
  }

  // ----------------------------------------
  // Actions: World Management
  // ----------------------------------------

  function _applyWorldAndStart(seed, eventName) {
    const achievementStore = useAchievementStore()
    achievementStore.reset()

    world.value = { hasWorld: true, seed: String(seed) }
    if (eventName === 'game:reset_world')
      pendingNewWorld.value = false

    const { terrain, trees } = buildWorldGenParams(worldGenDraft.presetId, {
      magnitude: worldGenDraft.magnitude,
      treeMinHeight: worldGenDraft.treeMinHeight,
      treeMaxHeight: worldGenDraft.treeMaxHeight,
    })
    settingsStore.setChunkViewDistance(worldGenDraft.viewDistance)

    toPlaying()
    emitter.emit(eventName, { seed, terrain, trees })
  }

  function createWorld(seed) {
    _applyWorldAndStart(seed, 'game:create_world')
  }

  function resetWorld(seed) {
    _applyWorldAndStart(seed, 'game:reset_world')
  }

  function continueWorld() {
    toPlaying()
  }

  // ----------------------------------------
  // Actions: Handle ESC key
  // ----------------------------------------

  function handleEscape() {
    switch (screen.value) {
      case 'settings':
        exitSettings()
        break
      case 'pauseMenu':
        toPlaying()
        break
      case 'playing':
        toPauseMenu()
        break
      case 'mainMenu':
        if (mainMenuView.value !== 'root')
          backToMainRoot()
        break
    }
  }

  return {
    // State
    screen,
    mainMenuView,
    pendingNewWorld,
    world,
    seedDraft,
    seedError,
    returnTo,
    isPaused,
    worldGenDraft,
    advancedExpanded,

    // Computed
    isMenuVisible,

    // Seed helpers
    normalizeSeedDraft,
    isSeedValidNumeric,
    getOrCreateSeedNumber,
    randomizeSeed,
    setSeedDraft,

    // Navigation
    toMainMenu,
    toPlaying,
    toPauseMenu,
    toSettings,
    exitSettings,

    // Main Menu
    enterWorldSetup,
    backToMainRoot,
    toHowToPlay,
    exitHowToPlay,
    toSkinSelector,
    exitSkinSelector,
    toAchievements,
    exitAchievements,

    // WorldGen
    applyWorldGenPreset,
    resetWorldGenDraft,
    toggleAdvanced,

    // World
    createWorld,
    resetWorld,
    continueWorld,

    // ESC
    handleEscape,
  }
})
```

### 2.2 状态流转图

```
┌────────────┐     core:ready      ┌────────────┐
│  loading   │ ──────────────────► │  mainMenu  │
└────────────┘                     └────────────┘
                                        │
                         ┌──────────────┼──────────────┐
                         │              │              │
                         ▼              ▼              ▼
                   ┌──────────┐  ┌────────────┐  ┌──────────┐
                   │ playing  │  │ pauseMenu  │  │ settings │
                   └──────────┘  └────────────┘  └──────────┘
                         │              │
                         └──────────────┘
                              (ESC 切换)
```

---

## 三、核心组件实现

### 3.1 UiRoot.vue（菜单根组件）

```vue
<script setup>
import { useUiStore } from '@pinia/uiStore.js'
import emitter from '@js/utils/event/event-bus.js'
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import HowToPlay from './HowToPlay.vue'
import LoadingScreen from './LoadingScreen.vue'
import MainMenu from './MainMenu.vue'
import PauseMenu from './PauseMenu.vue'
import SettingsMenu from './SettingsMenu.vue'
import SkinSelector from './SkinSelector.vue'

const ui = useUiStore()
const { locale } = useI18n()

onMounted(() => {
  emitter.on('core:ready', handleCoreReady)
  emitter.on('ui:escape', handleEscape)
  window.addEventListener('blur', handleWindowBlur)
})

onUnmounted(() => {
  emitter.off('core:ready', handleCoreReady)
  emitter.off('ui:escape', handleEscape)
  window.removeEventListener('blur', handleWindowBlur)
})

function handleCoreReady() {
  ui.screen = 'mainMenu'
  ui.mainMenuView = 'root'
}

function handleEscape() {
  ui.handleEscape()
}

function handleWindowBlur() {
  const isDebugMode = window.location.hash === '#debug'
  if (isDebugMode) return

  if (ui.screen === 'playing') {
    ui.toPauseMenu()
  }
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="ui.isMenuVisible"
      class="menu-overlay"
      :class="{
        loading: ui.screen === 'loading',
        dark: ui.screen !== 'loading',
        [`lang-${locale}`]: true,
      }"
    >
      <!-- Loading Screen -->
      <LoadingScreen v-if="ui.screen === 'loading'" />

      <!-- Main Menu -->
      <template v-else-if="ui.screen === 'mainMenu'">
        <HowToPlay v-if="ui.mainMenuView === 'howToPlay'" />
        <SkinSelector v-else-if="ui.mainMenuView === 'skinSelector'" />
        <MainMenu v-else />
      </template>

      <!-- Pause Menu -->
      <template v-else-if="ui.screen === 'pauseMenu'">
        <SkinSelector v-if="ui.mainMenuView === 'skinSelector'" />
        <PauseMenu v-else />
      </template>

      <!-- Settings Menu -->
      <SettingsMenu v-else-if="ui.screen === 'settings'" />
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

### 3.2 LoadingScreen.vue

```vue
<script setup>
import emitter from '@js/utils/event/event-bus.js'
import { onMounted, onUnmounted, ref } from 'vue'

const progress = ref(0)
const loadingText = ref('Loading...')

onMounted(() => {
  emitter.on('core:loading-progress', handleProgress)
})

onUnmounted(() => {
  emitter.off('core:loading-progress', handleProgress)
})

function handleProgress({ loaded, total }) {
  progress.value = Math.round((loaded / total) * 100)
  loadingText.value = `Loading... ${progress.value}%`
}
</script>

<template>
  <div class="loading-screen">
    <img
      src="/textures/hub/logo.png"
      alt="Minecraft"
      class="logo"
    >

    <div class="loading-bar-container">
      <div class="loading-bar-bg">
        <div
          class="loading-bar-fill"
          :style="{ width: `${progress}%` }"
        />
      </div>
      <p class="loading-text">{{ loadingText }}</p>
    </div>
  </div>
</template>

<style scoped>
.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 48px;
}

.logo {
  max-width: min(720px, 92vw);
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
}

.loading-bar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.loading-bar-bg {
  width: 300px;
  height: 8px;
  background: #222;
  border: 2px solid #555;
}

.loading-bar-fill {
  height: 100%;
  background: linear-gradient(to right, #3a3, #5c5);
  transition: width 0.2s ease;
}

.loading-text {
  color: #aaa;
  font-size: 14px;
  text-shadow: 2px 2px #000;
}
</style>
```

### 3.3 MainMenu.vue（含 WorldSetup 和 Advanced Panel）

```vue
<script setup>
import { useSettingsStore } from '@pinia/settingsStore.js'
import { useUiStore } from '@pinia/uiStore.js'
import { WORLDGEN_PRESET_IDS, WORLDGEN_PRESETS } from '@js/config/worldgen-presets.js'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AchievementMenu from './AchievementMenu.vue'
import McStepSlider from './ui/McStepSlider.vue'

const ui = useUiStore()
const settings = useSettingsStore()
const { locale, t } = useI18n()

// Toggle Language
function toggleLanguage() {
  const newLang = locale.value === 'en' ? 'zh' : 'en'
  settings.setLanguage(newLang, { global: { locale } })
}

// Open GitHub
function openGitHub() {
  window.open('https://github.com/hexianWeb/Third-Person-MC', '_blank')
}

const showConfirmDialog = ref(false)

const taglines = [
  'Web3D Powered!',
  'Three.js Rocks!',
  'No install required!',
]
const randomTagline = ref(taglines[Math.floor(Math.random() * taglines.length)])

function handleCreate() {
  const trimmed = ui.seedDraft.trim()
  if (trimmed === '') {
    ui.seedError = t('menu.seedRequired')
    return
  }
  if (!ui.isSeedValidNumeric()) {
    ui.seedError = 'Seed must be numeric only'
    return
  }

  const seed = ui.getOrCreateSeedNumber()

  if (ui.pendingNewWorld && ui.world.hasWorld) {
    showConfirmDialog.value = true
  } else {
    ui.createWorld(seed)
  }
}

function confirmOverwrite() {
  const seed = ui.getOrCreateSeedNumber()
  showConfirmDialog.value = false
  ui.resetWorld(seed)
}

function cancelOverwrite() {
  showConfirmDialog.value = false
}
</script>

<template>
  <div class="main-menu">
    <!-- Logo Container -->
    <div class="logo-container">
      <img
        src="/textures/hub/logo.png"
        alt="Minecraft"
        class="logo"
      >
      <span class="tagline">{{ randomTagline }}</span>
    </div>

    <!-- Top-Right Actions -->
    <div class="top-right-actions">
      <button class="action-btn" title="GitHub Repository" @click="openGitHub">
        <img src="/textures/hub/github.png" alt="GitHub" class="action-icon">
      </button>
      <button class="action-btn" title="Switch Language" @click="toggleLanguage">
        <img src="https://i.ibb.co/99187Lk/lang.png" alt="Language" class="action-icon">
      </button>
    </div>

    <!-- Root View -->
    <div v-if="ui.mainMenuView === 'root'" class="mc-menu">
      <template v-if="!ui.world.hasWorld">
        <button class="mc-button" @click="ui.enterWorldSetup({ mode: 'create' })">
          <span class="title">{{ $t('menu.createWorld') }}</span>
        </button>
      </template>
      <template v-else>
        <button class="mc-button" @click="ui.continueWorld()">
          <span class="title">{{ $t('menu.continue') }}</span>
        </button>
        <button class="mc-button" @click="ui.enterWorldSetup({ mode: 'newWorld' })">
          <span class="title">{{ $t('menu.newWorld') }}</span>
        </button>
      </template>
      <button class="mc-button" @click="ui.toSettings('mainMenu')">
        <span class="title">{{ $t('menu.settings') }}</span>
      </button>
      <button class="mc-button" @click="ui.toAchievements()">
        <span class="title">{{ $t('ui.achievement.menuTitle') }}</span>
      </button>
      <div class="mc-menu double">
        <button class="mc-button half" @click="ui.toHowToPlay()">
          <span class="title">{{ $t('menu.howToPlay') }}</span>
        </button>
        <button class="mc-button half" @click="ui.toSkinSelector()">
          <span class="title">{{ $t('menu.skins') }}</span>
        </button>
      </div>
    </div>

    <!-- World Setup View -->
    <div v-else-if="ui.mainMenuView === 'worldSetup'" class="mc-menu world-setup">
      <h2 class="menu-title">
        {{ ui.pendingNewWorld ? $t('menu.newWorld') : $t('menu.createWorld') }}
      </h2>

      <!-- Seed Input -->
      <div class="seed-input-group">
        <label class="seed-label">{{ $t('menu.seedLabel') }}</label>
        <input
          type="text"
          class="mc-input"
          inputmode="numeric"
          pattern="\d*"
          :placeholder="$t('menu.seedPlaceholder')"
          :value="ui.seedDraft"
          @input="ui.setSeedDraft($event.target.value)"
        >
        <p v-if="ui.seedError" class="seed-error">{{ ui.seedError }}</p>
      </div>

      <!-- Fixed Notice -->
      <div class="notice-bar">
        <span class="notice-icon mc-text">🛈</span>
        <span class="mc-text">Advanced settings only affect new worlds</span>
      </div>

      <!-- Advanced Toggle -->
      <button class="mc-button advanced-toggle" @click="ui.toggleAdvanced()">
        <span class="title mc-text" style="font-size: 25px;">
          {{ $t('menu.advanced') }} {{ ui.advancedExpanded ? '▾' : '▸' }}
        </span>
      </button>

      <!-- Advanced Panel -->
      <div v-if="ui.advancedExpanded" class="advanced-panel">
        <!-- Warning -->
        <div class="warning-bar">
          <span class="warning-icon mc-text">⚠</span>
          <span class="mc-text">Changes here only apply when creating a new world</span>
        </div>

        <!-- World Type Preset -->
        <div class="setting-section">
          <h4 class="section-label">{{ $t('menu.worldType') }}</h4>
          <div class="preset-row">
            <button
              v-for="presetId in WORLDGEN_PRESET_IDS"
              :key="presetId"
              class="preset-btn"
              :class="{ active: ui.worldGenDraft.presetId === presetId }"
              @click="ui.applyWorldGenPreset(presetId)"
            >
              {{ WORLDGEN_PRESETS[presetId].name }}
            </button>
          </div>
        </div>

        <!-- Terrain Height -->
        <div class="setting-section">
          <h4 class="section-label">Terrain</h4>
          <McStepSlider
            v-model="ui.worldGenDraft.magnitude"
            :min="0"
            :max="32"
            :step="1"
            :decimals="0"
            label="Height"
          />
        </div>

        <!-- Tree Settings -->
        <div class="setting-section">
          <h4 class="section-label">Trees</h4>
          <McStepSlider
            v-model="ui.worldGenDraft.treeMinHeight"
            :min="1"
            :max="16"
            :step="1"
            :decimals="0"
            label="Min Height"
          />
          <McStepSlider
            v-model="ui.worldGenDraft.treeMaxHeight"
            :min="1"
            :max="32"
            :step="1"
            :decimals="0"
            label="Max Height"
          />
        </div>

        <!-- Render Settings -->
        <div class="setting-section">
          <h4 class="section-label">Render</h4>
          <McStepSlider
            v-model="ui.worldGenDraft.viewDistance"
            :min="1"
            :max="8"
            :step="1"
            :decimals="0"
            :label="$t('settings.viewDistance')"
          />
        </div>
      </div>

      <!-- Buttons -->
      <button class="mc-button" @click="ui.randomizeSeed()">
        <span class="title">{{ $t('menu.randomSeed') }}</span>
      </button>
      <button class="mc-button" @click="handleCreate">
        <span class="title">{{ $t('menu.create') }}</span>
      </button>
      <button class="mc-button" @click="ui.backToMainRoot()">
        <span class="title">{{ $t('menu.back') }}</span>
      </button>
    </div>

    <!-- Achievement View -->
    <div v-else-if="ui.mainMenuView === 'achievements'">
      <AchievementMenu />
    </div>

    <!-- Overwrite Confirmation Dialog -->
    <Teleport to="body">
      <div v-if="showConfirmDialog" class="dialog-overlay" @click.self="cancelOverwrite">
        <div class="mc-panel dialog">
          <h3 class="dialog-title">Warning</h3>
          <p class="dialog-body">
            {{ $t('menu.warningOverwrite') }}
            <br><br>
            New Seed: <strong>{{ ui.seedDraft || 'Random' }}</strong>
            <br>
            World Type: <strong>{{ WORLDGEN_PRESETS[ui.worldGenDraft.presetId]?.name || 'Default' }}</strong>
          </p>
          <div class="mc-menu double">
            <button class="mc-button half" @click="cancelOverwrite">
              <span class="title">{{ $t('menu.cancel') }}</span>
            </button>
            <button class="mc-button half" @click="confirmOverwrite">
              <span class="title">{{ $t('menu.confirm') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.main-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.logo-container {
  position: relative;
  display: inline-block;
}

.logo {
  max-width: min(720px, 92vw);
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
}

.tagline {
  position: absolute;
  top: -10%;
  right: 0;
  transform: translate(10%, -20%) rotate(-15deg);
  font-family: 'MinecraftV2', 'Minecraftia', monospace;
  font-size: clamp(20px, 3vw, 32px);
  color: #ffff00;
  text-shadow: 3px 3px 0 #3f3f00, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  white-space: nowrap;
  font-weight: 400;
  letter-spacing: 0.5px;
  pointer-events: none;
  z-index: 10;
  animation: tagline-bounce 0.5s ease-in-out infinite alternate;
}

@keyframes tagline-bounce {
  from { transform: translate(10%, -20%) rotate(-15deg) scale(0.9); }
  to { transform: translate(10%, -20%) rotate(-15deg) scale(1.1); }
}

.top-right-actions {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 12px;
  z-index: 100;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  transition: transform 0.2s;
}

.action-btn:hover {
  transform: scale(1.1);
}

.action-icon {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  filter: drop-shadow(2px 2px 0 rgba(0,0,0,0.5));
}

.menu-title {
  color: #fff;
  font-size: 24px;
  text-shadow: 2px 2px #000;
  margin-bottom: 8px;
}

.world-setup {
  max-width: min(520px, 92vw);
}

.seed-input-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.seed-label {
  color: #aaa;
  font-size: 12px;
}

.seed-error {
  color: #f55;
  font-size: 12px;
  text-shadow: 1px 1px #000;
}

.notice-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(100, 150, 255, 0.2);
  border: 1px solid rgba(100, 150, 255, 0.4);
  color: #aaf;
  font-size: 12px;
  margin-bottom: 8px;
  width: 100%;
}

.advanced-toggle {
  width: 100%;
}

.advanced-panel {
  width: 100%;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #555;
  padding: 12px;
  margin-bottom: 8px;
}

.warning-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 180, 0, 0.15);
  border: 1px solid rgba(255, 180, 0, 0.4);
  color: #fa0;
  font-size: 11px;
  margin-bottom: 12px;
}

.setting-section {
  margin-bottom: 12px;
}

.section-label {
  color: #aaa;
  font-size: 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid #444;
  padding-bottom: 4px;
}

.preset-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.preset-btn {
  padding: 6px 10px;
  background: #444;
  border: 1px solid #666;
  color: #aaa;
  cursor: pointer;
  font-size: 11px;
}

.preset-btn:hover {
  background: #555;
  color: #fff;
}

.preset-btn.active {
  background: #4a7;
  border-color: #6c9;
  color: #fff;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
}

.dialog {
  min-width: 320px;
  max-width: 480px;
  text-align: center;
}

.dialog-title {
  color: #333;
  font-size: 20px;
  margin-bottom: 16px;
}

.dialog-body {
  color: #444;
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.5;
}

.dialog-body strong {
  color: #222;
}
</style>
```

---

## 四、成就系统

### 4.1 achievementStore.js

```javascript
import { defineStore } from 'pinia'

export const ACHIEVEMENTS = [
  { id: 'first_world', iconPath: '/img/achievement/first_world.png' },
  { id: 'first_punch', iconPath: '/img/achievement/first_punch.png' },
  { id: 'first_run', iconPath: '/img/achievement/first_run.png' },
  { id: 'first_jump', iconPath: '/img/achievement/first_jump.png' },
  { id: 'first_zoom', iconPath: '/img/achievement/first_zoom.png' },
  { id: 'first_perspective', iconPath: '/img/achievement/first_perspective.png' },
  { id: 'first_chat', iconPath: '/img/achievement/first_chat.png' },
  { id: 'first_mine', iconPath: '/img/achievement/first_mine.png' },
  { id: 'first_place', iconPath: '/img/achievement/first_place.png' },
  { id: 'first_damage_enemy', iconPath: '/img/achievement/first_damage_enemy.png' },
  { id: 'first_hurt', iconPath: '/img/achievement/first_hurt.png' },
  { id: 'play_5_mins', iconPath: '/img/achievement/play_5_mins.png' },
  { id: 'hiker', iconPath: '/img/achievement/hiker.png' },
  { id: 'rage_quit', iconPath: '/img/achievement/rage_quit.png' },
  { id: 'who_am_i', iconPath: '/img/achievement/who_am_i.png' },
  { id: 'first_rear_view', iconPath: '/img/achievement/look_back.png' },
]

export const useAchievementStore = defineStore('achievement', {
  state: () => ({
    unlocked: {},
    activeToasts: [],
  }),

  actions: {
    unlock(id) {
      const achievement = ACHIEVEMENTS.find(a => a.id === id)
      if (!this.unlocked[id] && achievement) {
        this.unlocked[id] = Date.now()
        this.showToast(achievement)
      }
    },

    showToast(achievement) {
      const instanceId = Date.now() + Math.random()
      const toast = { ...achievement, instanceId }
      this.activeToasts.push(toast)

      setTimeout(() => {
        this.activeToasts = this.activeToasts.filter(t => t.instanceId !== instanceId)
      }, 5000)

      if (this.isAllUnlocked) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('achievement:all_unlocked'))
        }, 5500)
      }
    },

    reset() {
      this.unlocked = {}
      this.activeToasts = []
    },
  },

  getters: {
    isAllUnlocked: (state) => {
      return Object.keys(state.unlocked).length >= ACHIEVEMENTS.length
    },
  },
})
```

### 4.2 AchievementMenu.vue

```vue
<script setup>
import { ACHIEVEMENTS, useAchievementStore } from '@pinia/achievementStore.js'
import { useUiStore } from '@pinia/uiStore.js'

const ui = useUiStore()
const store = useAchievementStore()
</script>

<template>
  <div class="mc-menu achievement-menu">
    <h2 class="menu-title mc-title">
      {{ $t('ui.achievement.menuTitle') }}
    </h2>

    <div class="achievement-list">
      <div
        v-for="achf in ACHIEVEMENTS"
        :key="achf.id"
        class="achievement-item"
        :class="{ locked: !store.unlocked[achf.id] }"
      >
        <img :src="achf.iconPath" class="achf-icon">
        <div class="achf-info">
          <h3 class="achf-title">{{ $t(`ui.achievement.${achf.id}.title`) }}</h3>
          <p class="achf-desc">{{ $t(`ui.achievement.${achf.id}.desc`) }}</p>
        </div>
        <div class="achf-status">
          {{ store.unlocked[achf.id] ? $t('ui.achievement.unlocked') : $t('ui.achievement.locked') }}
        </div>
      </div>
    </div>

    <button class="mc-button back-btn" @click="ui.exitAchievements()">
      <span class="title">{{ $t('menu.back') }}</span>
    </button>
  </div>
</template>

<style scoped>
.achievement-menu {
  width: min(800px, 92vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.mc-title {
  font-size: 32px;
  color: #fff;
  text-shadow: 3px 3px 0 #3f3f3f, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
  text-align: center;
  margin-bottom: 20px;
}

.achievement-list {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
  padding-right: 10px;
}

.achievement-list::-webkit-scrollbar {
  width: 10px;
}

.achievement-list::-webkit-scrollbar-thumb {
  background: #aaa;
  border: 2px solid #333;
}

.achievement-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.5);
}

.achievement-item {
  display: flex;
  background-color: rgba(33, 33, 33, 0.9);
  border: 4px solid #555;
  padding: 10px;
  align-items: center;
  gap: 15px;
}

.achievement-item.locked {
  opacity: 0.6;
}

.achievement-item.locked .achf-icon {
  filter: grayscale(100%);
}

.achf-icon {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.achf-info {
  flex: 1;
  text-align: left;
}

.achf-title {
  color: #fbff00;
  margin: 0 0 5px 0;
  font-size: 16px;
  text-shadow: 2px 2px 0 #000;
}

.achf-desc {
  color: #fff;
  margin: 0;
  font-size: 14px;
  text-shadow: 2px 2px 0 #000;
}

.achf-status {
  font-weight: bold;
  color: #fff;
  font-size: 14px;
  text-shadow: 2px 2px 0 #000;
  width: 80px;
  text-align: right;
  flex-shrink: 0;
}

.back-btn {
  height: 7vh;
  min-height: 48px;
}
</style>
```

---

## 五、玩法说明系统

### 5.1 HowToPlay.vue

```vue
<script setup>
import { useUiStore } from '@pinia/uiStore.js'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const ui = useUiStore()
const { t } = useI18n()

const pages = [
  { id: 'movement-camera', image: '1.png', bodyCount: 5, keybindCount: 8 },
  { id: 'combat', image: '2.png', bodyCount: 3, keybindCount: 3 },
  { id: 'build-edit', image: '3.png', bodyCount: 3, keybindCount: 2 },
  { id: 'achievements', image: '4.png', bodyCount: 3, keybindCount: 2 },
  { id: 'tips-ui', image: '5.png', bodyCount: 6, keybindCount: 2 },
]

function pageI18nKey(id) {
  return id.replace(/-/g, '_')
}

const currentIndex = ref(0)
const currentPage = computed(() => pages[currentIndex.value])

const progressLabel = computed(() => `${currentIndex.value + 1} / ${pages.length}`)
const backLabel = computed(() => (currentIndex.value === 0 ? t('howto.mainMenu') : t('howto.prev')))
const nextLabel = computed(() =>
  currentIndex.value === pages.length - 1 ? t('howto.done') : t('howto.next'),
)

function goBack() {
  if (currentIndex.value > 0) {
    currentIndex.value -= 1
    return
  }
  ui.exitHowToPlay()
}

function goNext() {
  if (currentIndex.value < pages.length - 1) {
    currentIndex.value += 1
    return
  }
  ui.exitHowToPlay()
}

function handleKeydown(event) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    goBack()
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    goNext()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="howto">
    <header class="howto__header">
      <div class="howto__headerLeft">
        <div class="howto__title mc-text">{{ $t('howto.title') }}</div>
      </div>
      <div class="howto__headerRight">
        <div class="howto__progress mc-text">{{ progressLabel }}</div>
      </div>
    </header>

    <main class="mc-panel howto__panel">
      <div class="howto__panelTitle mc-text">
        {{ $t(`howto.pages.${pageI18nKey(currentPage.id)}.title`) }}
      </div>

      <!-- 2x2 四格图 -->
      <div class="howto__illustration">
        <div class="illus illus--comic">
          <div
            v-for="idx in 4"
            :key="idx"
            class="comicCell comicCell--quadrant"
            :style="{ backgroundImage: `url(/img/howToPlayer/${currentPage.image})` }"
          />
        </div>
      </div>

      <!-- 文案 -->
      <ul class="howto__body">
        <li
          v-for="i in currentPage.bodyCount"
          :key="i"
          class="howto__bodyLine mc-text"
        >
          {{ $t(`howto.pages.${pageI18nKey(currentPage.id)}.body.${i - 1}`) }}
        </li>
      </ul>

      <!-- 按键表 -->
      <div v-if="currentPage.keybindCount" class="howto__keybinds">
        <div class="howto__keybindsTitle mc-text">{{ $t('howto.controls') }}</div>
        <div class="howto__keybindGrid">
          <div
            v-for="i in currentPage.keybindCount"
            :key="i"
            class="howto__keybindRow"
          >
            <div class="howto__keybindAction mc-text">
              {{ $t(`howto.pages.${pageI18nKey(currentPage.id)}.keybinds.${i - 1}.action`) }}
            </div>
            <div class="howto__keybindKey mc-text">
              {{ $t(`howto.pages.${pageI18nKey(currentPage.id)}.keybinds.${i - 1}.key`) }}
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="mc-menu double howto__footer">
      <button class="mc-button half" @click="goBack">
        <span class="title">{{ backLabel }}</span>
      </button>
      <button class="mc-button half" @click="goNext">
        <span class="title">{{ nextLabel }}</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
.howto {
  width: min(920px, 92vw);
  max-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.howto__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 2px;
}

.howto__title {
  color: #fff;
  font-size: 22px;
  text-shadow: 2px 2px #000;
}

.howto__progress {
  color: #aaa;
  font-size: 14px;
  text-shadow: 1px 1px #000;
}

.howto__panel {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  width: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.howto__panelTitle {
  color: #222;
  font-size: 18px;
}

.howto__illustration {
  width: 100%;
}

.illus {
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 2px solid rgba(0, 0, 0, 0.25);
  background: radial-gradient(120% 120% at 20% 10%, rgba(120, 200, 255, 0.28), rgba(0, 0, 0, 0) 60%),
              radial-gradient(120% 120% at 80% 80%, rgba(255, 120, 120, 0.18), rgba(0, 0, 0, 0) 55%),
              linear-gradient(135deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.02));
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.06);
}

.illus--comic {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 6px;
  padding: 6px;
}

.comicCell {
  border: 2px solid rgba(0, 0, 0, 0.18);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.06);
  overflow: hidden;
  min-height: 0;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease, filter 0.25s ease;
}

.comicCell:hover {
  transform: scale(1.06) rotate(1deg);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.2), 0 4px 16px rgba(255, 220, 100, 0.25);
  filter: brightness(1.08);
}

.comicCell--quadrant {
  background-color: rgba(0, 0, 0, 0.1);
  background-size: 200% 200%;
  background-repeat: no-repeat;
  image-rendering: pixelated;
}

.comicCell--quadrant:nth-child(1) { background-position: 0 0; }
.comicCell--quadrant:nth-child(2) { background-position: 100% 0; }
.comicCell--quadrant:nth-child(3) { background-position: 0 100%; }
.comicCell--quadrant:nth-child(4) { background-position: 100% 100%; }

.howto__body {
  margin: 0;
  padding: 0 0 0 18px;
  display: grid;
  gap: 6px;
}

.howto__bodyLine {
  color: #333;
  font-size: 14px;
  line-height: 1.35;
}

.howto__keybinds {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  padding-top: 10px;
}

.howto__keybindsTitle {
  color: #333;
  font-size: 14px;
  margin-bottom: 8px;
}

.howto__keybindGrid {
  display: grid;
  gap: 6px;
}

.howto__keybindRow {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
}

.howto__keybindAction {
  color: #444;
  font-size: 13px;
}

.howto__keybindKey {
  color: #111;
  font-size: 13px;
  padding: 2px 8px;
  border: 1px solid rgba(0, 0, 0, 0.22);
  background: rgba(255, 255, 255, 0.45);
}

.howto__footer {
  flex-shrink: 0;
  width: 100%;
}
</style>
```

---

## 六、皮肤选择系统

### 6.1 skin-config.js

```javascript
export const SKIN_LIST = [
  {
    id: 'steve',
    name: 'Steve',
    nameKey: 'skin.steve',
    modelPath: 'models/character/steve.glb',
    thumbnail: 'textures/skins/steve-thumb.png',
  },
  {
    id: 'alex',
    name: 'Alex',
    nameKey: 'skin.alex',
    modelPath: 'models/character/alex.glb',
    thumbnail: 'textures/skins/alex-thumb.png',
  },
  {
    id: 'player',
    name: 'Classic',
    nameKey: 'skin.player',
    modelPath: 'models/character/player.glb',
    thumbnail: 'textures/skins/player-thumb.png',
  },
]

export const DEFAULT_SKIN_ID = 'steve'

export const ANIMATION_BUTTONS = [
  { id: 'idle', icon: '🧍', labelKey: 'anim.idle', clip: 'idle' },
  { id: 'walk', icon: '🚶', labelKey: 'anim.walk', clip: 'forward' },
  { id: 'run', icon: '🏃', labelKey: 'anim.run', clip: 'running_forward' },
  { id: 'tpose', icon: '✋', labelKey: 'anim.tpose', clip: 'tpose' },
  { id: 'mine', icon: '⛏️', labelKey: 'anim.mine', clip: 'quick_combo_punch' },
  { id: 'jump', icon: '🦘', labelKey: 'anim.jump', clip: 'jump' },
  { id: 'attack', icon: '⚔️', labelKey: 'anim.attack', clip: 'straight_punch' },
  { id: 'block', icon: '🛡️', labelKey: 'anim.block', clip: 'block' },
]
```

### 6.2 skinStore.js

```javascript
import { DEFAULT_SKIN_ID, SKIN_LIST } from '@js/config/skin-config.js'
import emitter from '@js/utils/event/event-bus.js'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'mc-player-skin'

export const useSkinStore = defineStore('skin', () => {
  const currentSkinId = ref(DEFAULT_SKIN_ID)
  const previewSkinId = ref(null)
  const isLoading = ref(false)

  function loadSkin() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && SKIN_LIST.find(s => s.id === saved)) {
      currentSkinId.value = saved
    }
  }

  function saveSkin() {
    localStorage.setItem(STORAGE_KEY, currentSkinId.value)
  }

  function initPreview() {
    previewSkinId.value = currentSkinId.value
  }

  function setPreviewSkin(skinId) {
    previewSkinId.value = skinId
  }

  function applySkin() {
    if (previewSkinId.value && previewSkinId.value !== currentSkinId.value) {
      currentSkinId.value = previewSkinId.value
      saveSkin()
      emitter.emit('skin:changed', { skinId: currentSkinId.value })
    }
  }

  function cancelPreview() {
    previewSkinId.value = null
  }

  function getSkinConfig(skinId) {
    return SKIN_LIST.find(s => s.id === skinId)
  }

  loadSkin()

  return {
    currentSkinId,
    previewSkinId,
    isLoading,
    loadSkin,
    saveSkin,
    initPreview,
    setPreviewSkin,
    applySkin,
    cancelPreview,
    getSkinConfig,
  }
})
```

### 6.3 SkinSelector.vue

```vue
<script setup>
import { useSkinStore } from '@pinia/skinStore.js'
import { useUiStore } from '@pinia/uiStore.js'
import SkinPreviewScene from '@js/components/skin-preview-scene.js'
import { ANIMATION_BUTTONS, SKIN_LIST } from '@js/config/skin-config.js'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const skinStore = useSkinStore()
const ui = useUiStore()

const previewCanvas = ref(null)
const previewContainer = ref(null)
const previewScene = ref(null)
const currentAnim = ref('idle')

function playAnimation(animId) {
  currentAnim.value = animId
  const btn = ANIMATION_BUTTONS.find(b => b.id === animId)
  if (btn && previewScene.value) {
    previewScene.value.playAnimation(btn.clip)
  }
}

function rotateLeft() { previewScene.value?.rotate(-Math.PI / 4) }
function rotateRight() { previewScene.value?.rotate(Math.PI / 4) }
function resetRotation() { previewScene.value?.resetRotation() }

function selectSkin(skinId) { skinStore.setPreviewSkin(skinId) }

function apply() {
  skinStore.applySkin()
  ui.exitSkinSelector()
}

function cancel() {
  skinStore.cancelPreview()
  ui.exitSkinSelector()
}

function updateCanvasSize() {
  if (!previewContainer.value || !previewScene.value) return
  const rect = previewContainer.value.getBoundingClientRect()
  previewScene.value.resize(rect.width, rect.height)
}

onMounted(() => {
  if (previewCanvas.value) {
    previewScene.value = new SkinPreviewScene(previewCanvas.value)
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
  }

  skinStore.initPreview()

  const skin = SKIN_LIST.find(s => s.id === skinStore.previewSkinId)
  if (skin && previewScene.value) {
    previewScene.value.loadModel(skin.modelPath)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize)
  previewScene.value?.dispose()
})

watch(() => skinStore.previewSkinId, (skinId) => {
  const skin = SKIN_LIST.find(s => s.id === skinId)
  if (skin && previewScene.value) {
    previewScene.value.loadModel(skin.modelPath)
    currentAnim.value = 'idle'
  }
})
</script>

<template>
  <div class="skin-selector">
    <h2 class="skin-title mc-text">{{ $t('menu.selectSkin') }}</h2>

    <!-- Preview Section -->
    <div class="skin-preview-section">
      <!-- Animation Buttons -->
      <div class="anim-buttons">
        <button
          v-for="(btn, index) in ANIMATION_BUTTONS"
          :key="btn.id"
          class="anim-btn mc-button-pixel"
          :class="{ active: currentAnim === btn.id }"
          :title="$t(btn.labelKey)"
          @click="playAnimation(btn.id)"
        >
          <div
            class="anim-icon"
            :style="{ backgroundPositionX: `calc(${index} * 100% / 7)` }"
          />
        </button>
      </div>

      <!-- 3D Preview -->
      <div ref="previewContainer" class="skin-preview">
        <canvas ref="previewCanvas" />
        <div v-if="skinStore.isLoading" class="loading-spinner" />

        <!-- Rotation Controls -->
        <div class="rotate-controls">
          <button class="rotate-btn mc-button-pixel" @click="rotateLeft">◀</button>
          <button class="rotate-btn mc-button-pixel reset" @click="resetRotation">🔄</button>
          <button class="rotate-btn mc-button-pixel" @click="rotateRight">▶</button>
        </div>
      </div>
    </div>

    <!-- Skin List -->
    <div class="skin-list">
      <div
        v-for="skin in SKIN_LIST"
        :key="skin.id"
        class="skin-card"
        :class="{
          selected: skin.id === skinStore.previewSkinId,
          equipped: skin.id === skinStore.currentSkinId,
        }"
        @click="selectSkin(skin.id)"
      >
        <div class="skin-thumb">
          <img :src="skin.thumbnail" :alt="$t(skin.nameKey)" class="skin-thumbnail">
        </div>
        <span class="skin-name mc-text">{{ $t(skin.nameKey) }}</span>
        <span v-if="skin.id === skinStore.currentSkinId" class="equipped-badge mc-text">
          ✓ {{ $t('skin.equipped') }}
        </span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="mc-menu double skin-actions">
      <button class="mc-button half mc-button-large" @click="cancel">
        <span class="title">{{ $t('common.cancel') }}</span>
      </button>
      <button
        class="mc-button half mc-button-large"
        :disabled="skinStore.previewSkinId === skinStore.currentSkinId"
        @click="apply"
      >
        <span class="title">{{ $t('common.apply') }}</span>
      </button>
    </div>

    <!-- Credits -->
    <div class="skin-credits">
      <p class="credits-text mc-text">{{ $t('skin.credits') }}</p>
      <div class="credits-links">
        <a href="https://www.planetminecraft.com/member/hibiki_ekko/" target="_blank" class="credit-link mc-text">hibiki_ekko</a>
        <span class="credits-separator"> & </span>
        <a href="https://www.minecraftskins.com/profile/5521971/holland0519" target="_blank" class="credit-link mc-text">holland0519</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Minecraft 像素边框 */
.mc-border {
  box-shadow: 0 -2px 0 0 rgba(0, 0, 0, 0.55), -2px 0 0 0 rgba(0, 0, 0, 0.55),
              0 -4px 0 0 rgba(255, 255, 255, 0.25) inset, -4px 0 0 0 rgba(255, 255, 255, 0.25) inset,
              0 4px 0 0 rgba(0, 0, 0, 0.4) inset, 4px 0 0 0 rgba(0, 0, 0, 0.4) inset;
}

.skin-selector {
  width: min(600px, 92vw);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-family: 'MinecraftV2', sans-serif;
}

.skin-title {
  color: #fff;
  font-size: 24px;
  text-shadow: 3px 3px 0 #3f3f3f;
  text-align: center;
  margin: 0;
  letter-spacing: 2px;
}

.skin-preview-section {
  display: flex;
  gap: 8px;
}

.anim-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.anim-btn {
  width: 48px;
  height: 48px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;

  background: linear-gradient(180deg, #c6c6c6 0%, #8b8b8b 100%);
  border: none;
  box-shadow: 0 -2px 0 0 rgba(0, 0, 0, 0.5), -2px 0 0 0 rgba(0, 0, 0, 0.5),
              0 -4px 0 0 rgba(255, 255, 255, 0.3) inset, -4px 0 0 0 rgba(255, 255, 255, 0.3) inset,
              0 4px 0 0 rgba(0, 0, 0, 0.35) inset, 4px 0 0 0 rgba(0, 0, 0, 0.35) inset;
  image-rendering: pixelated;
  display: flex;
  align-items: center;
  justify-content: center;
}

.anim-icon {
  width: 32px;
  height: 32px;
  background-image: url('/textures/btns/buttons.png');
  background-repeat: no-repeat;
  background-size: 900% 100%;
  image-rendering: pixelated;
  pointer-events: none;
}

.anim-btn:hover {
  background: linear-gradient(180deg, #d8d8d8 0%, #9d9d9d 100%);
  filter: brightness(1.15);
}

.anim-btn:active {
  background: linear-gradient(180deg, #8b8b8b 0%, #c6c6c6 100%);
  transform: translateY(2px);
}

.anim-btn.active {
  background: linear-gradient(135deg, #85cb3a 0%, #4c8a22 100%);
}

.skin-preview {
  flex: 1;
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: linear-gradient(180deg, #87ceeb 0%, #3a8c3a 100%);
  box-shadow: 0 -4px 0 0 rgba(0, 0, 0, 0.5), -4px 0 0 0 rgba(0, 0, 0, 0.5),
              0 -6px 0 0 rgba(255, 255, 255, 0.2) inset, -6px 0 0 0 rgba(255, 255, 255, 0.2) inset,
              0 6px 0 0 rgba(0, 0, 0, 0.4) inset, 6px 0 0 0 rgba(0, 0, 0, 0.4) inset;
  image-rendering: pixelated;
}

.skin-preview canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.rotate-controls {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.rotate-btn {
  width: 44px;
  height: 44px;
  cursor: pointer;
  font-size: 1.25rem;
  transition: all 0.1s;
  border: none;

  background: linear-gradient(180deg, #c6c6c6 0%, #8b8b8b 100%);
  box-shadow: 0 -2px 0 0 rgba(0, 0, 0, 0.5), -2px 0 0 0 rgba(0, 0, 0, 0.5),
              0 -4px 0 0 rgba(255, 255, 255, 0.3) inset, -4px 0 0 0 rgba(255, 255, 255, 0.3) inset,
              0 4px 0 0 rgba(0, 0, 0, 0.35) inset, 4px 0 0 0 rgba(0, 0, 0, 0.35) inset;
}

.rotate-btn:hover {
  background: linear-gradient(180deg, #d8d8d8 0%, #9d9d9d 100%);
  filter: brightness(1.15);
}

.rotate-btn.reset {
  background: linear-gradient(180deg, #7cb342 0%, #558b2f 100%);
}

.skin-list {
  display: flex;
  justify-content: center;
  gap: 8%;
  padding: 16px;

  background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.1) 0px, rgba(0, 0, 0, 0.1) 2px, transparent 2px, transparent 4px),
              repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.1) 0px, rgba(0, 0, 0, 0.1) 2px, transparent 2px, transparent 4px),
              linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%);

  box-shadow: 0 -4px 0 0 rgba(0, 0, 0, 0.5), -4px 0 0 0 rgba(0, 0, 0, 0.5),
              0 -6px 0 0 rgba(255, 255, 255, 0.15) inset, -6px 0 0 0 rgba(255, 255, 255, 0.15) inset,
              0 6px 0 0 rgba(0, 0, 0, 0.4) inset, 6px 0 0 0 rgba(0, 0, 0, 0.4) inset;
}

.skin-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;

  background: linear-gradient(180deg, #c6c6c6 0%, #8b8b8b 100%);
  border: none;
  box-shadow: 0 -2px 0 0 rgba(0, 0, 0, 0.5), -2px 0 0 0 rgba(0, 0, 0, 0.5),
              0 -4px 0 0 rgba(255, 255, 255, 0.25) inset, -4px 0 0 0 rgba(255, 255, 255, 0.25) inset,
              0 4px 0 0 rgba(0, 0, 0, 0.35) inset, 4px 0 0 0 rgba(0, 0, 0, 0.35) inset;
}

.skin-card:hover {
  transform: translateY(-4px) scale(1.02);
  filter: brightness(1.1);
}

.skin-card.selected {
  background: linear-gradient(135deg, #85cb3a 0%, #4c8a22 100%) padding-box, linear-gradient(135deg, #fcea2c, #fcb40a) border-box;
  border: 2px solid transparent;
}

.skin-card.equipped {
  box-shadow: 0 0 0 2px #ffd700, 0 -2px 0 0 rgba(0, 0, 0, 0.5), -2px 0 0 0 rgba(0, 0, 0, 0.5);
}

.skin-thumb {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.skin-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.skin-name {
  font-size: 14px;
  color: #fff;
  text-shadow: 2px 2px 0 #3f3f3f;
  font-weight: bold;
}

.equipped-badge {
  font-size: 11px;
  color: #fff;
  background: linear-gradient(180deg, #ffd700 0%, #ffb700 100%);
  padding: 4px 10px;
  text-shadow: 1px 1px 0 #000;
}

.skin-actions {
  width: 100%;
}

.mc-button-large {
  height: 48px;
  font-size: 16px;
}

.loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  background: linear-gradient(45deg, transparent 40%, #fff 40%, #fff 60%, transparent 60%),
              linear-gradient(-45deg, transparent 40%, #8b8b8b 40%, #8b8b8b 60%, transparent 60%), #c6c6c6;
  animation: spin 1s steps(8) infinite;
}

@keyframes spin {
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

.skin-credits {
  text-align: center;
  padding: 12px;
  margin-top: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.credits-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 6px 0;
}

.credit-link {
  font-size: 12px;
  color: #4ade80;
  text-decoration: none;
}

.credit-link:hover {
  color: #86efac;
  text-decoration: underline;
}
</style>
```

---

## 七、设置系统

### 7.1 settingsStore.js（完整实现）

参见 Third-Person-MC 的 `src/pinia/settingsStore.js`，包含：
- localStorage 持久化
- Camera presets（FOV、Bobbing）
- Visual presets（SpeedLines）
- Environment settings（Sky、Sun、Ambient、Fog）
- Chunk settings（ViewDistance、UnloadPadding）
- Shadow quality
- Mouse sensitivity
- 多语言切换

### 7.2 SettingsMenu.vue

参见 Third-Person-MC 的 `src/vue/components/menu/SettingsMenu.vue`，包含：
- Camera Section（preset 按钮）
- World Section（ViewDistance、UnloadPadding 步进滑块）
- Visual Section（FrontView toggle、SpeedLines preset）
- Environment Section（Sky mode、Sun/Ambient/Fog 滑块）
- Graphics Section（Shadow quality 按钮）
- Controls Section（Mouse sensitivity +/- 按钮）

### 7.3 McStepSlider.vue

参见 Third-Person-MC 的 `src/vue/components/menu/ui/McStepSlider.vue`，包含：
- 离散步进滑块
- 键盘左右箭头支持
- @input（拖动时）和 @change（释放时）事件

---

## 八、i18n 多语言

### 8.1 i18n.js

```javascript
import { createI18n } from 'vue-i18n'
import en from '../locales/en.json'
import zh from '../locales/zh.json'

function getDefaultLocale() {
  const saved = localStorage.getItem('mc-game-settings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed.language) return parsed.language
    } catch (e) {
      console.warn('Failed to parse settings for language', e)
    }
  }

  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('zh')) return 'zh'
  return 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages: { en, zh },
})

export default i18n
```

### 8.2 语言文件结构

参见 Third-Person-MC 的 `src/locales/en.json` 和 `src/locales/zh.json`。

---

## 九、样式系统

### 9.1 _tokens.scss

```scss
@charset "UTF-8";

@font-face {
  font-family: 'Minecraftia';
  src: url('/fonts/Minecraftia-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'MinecraftV2';
  src: url('/fonts/MinecraftV2.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

* {
  font-family: 'Minecraftia', 'MinecraftV2', sans-serif;
  font-weight: 400;
}

.mc-text {
  font-family: 'MinecraftV2', sans-serif !important;
  font-size: 14px;
  font-weight: 400;
}

.menu-overlay.lang-en * {
  font-family: 'Minecraftia', 'MinecraftV2', sans-serif;
}

.menu-overlay.lang-zh * {
  font-family: 'MinecraftV2', 'Minecraftia', sans-serif;
}

:root {
  --mc-ui-scale: 1.2;
  --mc-btn-height: calc(40px * var(--mc-ui-scale));
  --mc-btn-width: min(calc(400px * var(--mc-ui-scale)), 92vw);
  --mc-btn-gap: calc(8px * var(--mc-ui-scale));
  --mc-btn-font-size: calc(1em * var(--mc-ui-scale));
}

@media (max-width: 600px) {
  :root { --mc-ui-scale: 1.0; }
}

@media (min-width: 601px) and (max-width: 1000px) {
  :root { --mc-ui-scale: 1.1; }
}

@mixin flex-center-hv {
  display: flex;
  justify-content: center;
  align-items: center;
}

.mc-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--mc-btn-gap);
  padding: 16px;

  &.double {
    flex-direction: row;
    justify-content: center;
  }
}

.mc-button {
  height: var(--mc-btn-height);
  width: var(--mc-btn-width);
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  user-select: none;

  background: #999 url('/textures/hub/btn_bg.png') center / cover;
  image-rendering: pixelated;
  border: 2px solid #000;

  &:hover .title {
    background-color: rgba(100, 100, 255, 0.45);
    text-shadow: 2px 2px #202013cc;
    color: #ffffa0;
  }

  &:active .title {
    box-shadow: inset -2px -4px #0004, inset 2px 2px #fff5;
  }

  .title {
    width: 100%;
    height: 100%;
    font-size: var(--mc-btn-font-size);
    line-height: 1;
    @include flex-center-hv;
    color: #ddd;
    text-shadow: 2px 2px #000a;
    box-shadow: inset -2px -4px #0006, inset 2px 2px #fff7;
  }

  &.half {
    width: calc(var(--mc-btn-width) / 2 - var(--mc-btn-gap) / 2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
}

.mc-input {
  height: var(--mc-btn-height);
  width: var(--mc-btn-width);
  padding: 0 12px;
  background: #000;
  border: 2px solid #a0a0a0;
  color: #fff;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #fff;
  }

  &::placeholder {
    color: #666;
  }
}

.mc-panel {
  background: #c6c6c6;
  border: 4px solid;
  border-color: #fff #555 #555 #fff;
  padding: 16px;
  image-rendering: pixelated;
}

.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  @include flex-center-hv;

  &.dark {
    background: rgba(0, 0, 0, 0.6);
  }

  &.loading {
    background: rgba(0, 0, 0, 0.85);
  }
}
```

---

## 十、main.js

```javascript
import { createDebugPlugin } from '@pinia/debug-plugin.js'
import i18n from '@js/i18n.js'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import '@styles/main.scss'

const app = createApp(App)

const pinia = createPinia()
pinia.use(createDebugPlugin())

app.use(pinia)
app.use(i18n)
app.mount('#app')
```

---

## 十一、事件通信

| 事件名 | 方向 | 说明 |
|--------|------|------|
| `core:loading-progress` | Resources → Vue | 加载进度 |
| `core:ready` | Resources → Vue | 加载完成 |
| `core:resize` | Sizes → Experience | 窗口 resize |
| `core:tick` | Time → Experience | 每帧 tick |
| `ui:pause-changed` | Vue → Three.js | 暂停状态切换 |
| `ui:escape` | Keyboard → UiRoot | ESC 按键 |
| `game:create_world` | Vue → Three.js | 创建世界 |
| `game:reset_world` | Vue → Three.js | 重置世界 |
| `skin:changed` | Vue → Three.js | 皮肤切换 |
| `settings:*` | Vue → Three.js | 各种设置变化 |
| `shadow:quality-changed` | Vue → Three.js | 阴影质量 |

---

## 十二、实现优先级

| 优先级 | 功能 | 依赖 |
|--------|------|------|
| **P0** | UiRoot + LoadingScreen + MainMenu | uiStore, event-bus |
| **P1** | i18n 多语言 | en.json, zh.json |
| **P2** | PauseMenu | uiStore |
| **P3** | SettingsMenu + settingsStore + McStepSlider | uiStore |
| **P4** | 成就系统 | achievementStore, AchievementMenu |
| **P5** | 玩法说明 | HowToPlay |
| **P6** | 皮肤系统 | skinStore, SkinSelector, SkinPreviewScene |

---

## 十三、注意事项

1. **路径别名配置**：
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@js': resolve(__dirname, 'src/js'),
      '@pinia': resolve(__dirname, 'src/pinia'),
      '@styles': resolve(__dirname, 'src/styles'),
    },
  },
})
```

2. **资源准备**：
   - `/textures/hub/logo.png`、`btn_bg.png`、`github.png`
   - `/fonts/Minecraftia-Regular.ttf`、`MinecraftV2.ttf`
   - `/img/achievement/` 目录（16张成就图标）
   - `/img/howToPlayer/` 目录（5张玩法说明图）

3. **确保一致性**：
   - 所有组件代码与 Third-Person-MC 保持一致
   - 样式变量命名一致
   - 事件名称一致
   - Pinia store 结构一致