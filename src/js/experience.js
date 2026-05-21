import * as THREE from 'three';

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

let instance;

export default class Experience {
    constructor(canvas) {
        if (instance) {
            return instance;
        }

        instance = this;

        window.Experience = this;

        this.canvas = canvas;

        this.debug = new Debug();
        this.stats = new Stats();
        this.sizes = new Sizes();
        this.time = new Time();
        this.scene = new THREE.Scene();
        this.camera = new Camera();
        this.renderer = new Renderer();
        this.resources = new Resources(sources);
        this.iMouse = new IMouse();
        this.input = new InputManager();
        this.pointerLock = new PointerLockManager();
        this.terrainDataManager = null;
        this.world = new World();

        emitter.on('core:resize', () => {
            this.resize();
        });

        emitter.on('core:tick', () => {
            this.update();
        });

        this.isPaused = false;
        emitter.on('core:pause', (paused) => {
            this.isPaused = paused;
        });

        emitter.on('game:create_world', ({ seed, terrain, trees}) => {
            if (this.world?.chunkManager) {
                this.world.reset({ seed, terrain, trees});
            }
        })

        emitter.on('game:reset_world', ({ seed, terrain, trees}) => {
            if (this.world) {
                this.world.reset({ seed, terrain, trees});
            }
        })

        window.addEventListener('beforeunload', () => {
            this.destroy();
        });
    }

    resize() {
        this.camera.resize();
        this.renderer.resize();
    }

    update() {
        if (!this.isPaused) {
            this.camera.update();
            this.world.update();
        }

        this.renderer.update();
        this.stats.update();
        this.iMouse.update();
    }

    destroy() {
        this.time?.destroy();

        this.world?.destroy();
        this.pointerLock?.destroy();
        this.input?.destroy();
        this.iMouse?.destroy();
        this.resources?.destroy();
        this.renderer?.destroy();
        this.camera?.destroy();

        this.stats?.destroy();
        this.sizes?.destroy();
        this.debug?.destroy();

        if (this.scene) {
            this.scene.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }

                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((m) => {
                            m.dispose();
                        });
                    } else {
                        child.material.dispose();
                    }
                }
            })

            this.scene.clear();
        }

        emitter.all.clear();

        if (window.Experience === this) {
            window.Experience = null;
        }

        instance = null;
    }
}