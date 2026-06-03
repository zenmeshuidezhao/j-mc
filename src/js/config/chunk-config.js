export const CHUNK_BASIC_CONFIG = {
    chunkWidth: 64,
    chunkHeight: 32,
    viewDistance: 1,
    unloadPadding: 1,
    seed: 1337,
    worldName: 'default',
    useIndexedDB: false,
    autoSaveDelay: 2000
}

export const TERRAIN_PARAMS = {
    scale: 168,
    magnitude: 6,
    offset: 8,
    fbm: {
        octaves: 5,
        gain: 0.5,
        lacunarity: 2.0
    },
    rockExpose: {
        maxDepth: 2,
        slopeThreshold: 2,
    }
}

export const TREE_PARAMS = {
    minHeight: 3,
    maxHeight: 6,
    minRadius: 2,
    maxRadius: 4,
    frequency: 0.05,
}

export const RENDER_PARAMS = {
    scale: 1,
    heightScale: 1,
    showOresOnly: false,
}

export const WATER_PARAMS = {
    waterOffset: 3,
    flowSpeedX: 0.5,
    flowSpeedY: 0.00
}

export const CHUNK_DEFAULTS = {
    viewDistance: CHUNK_BASIC_CONFIG.viewDistance,
    unloadPadding: CHUNK_BASIC_CONFIG.unloadPadding,
}
