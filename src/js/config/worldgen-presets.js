export const WORLDGEN_PRESETS = {
    default: {
        name: "Default",
        terrain: {
            scale: 168,
            magnitude: 6,
            offset: 8,
            fbm: { octaves: 5, gain: 0.5, lacunarity: 2.0 },
        },
        trees: {
            minHeight: 3,
            maxHeight: 6,
            minRadius: 2,
            maxRadius: 4,
            frequency: 0.05,
        },
    },
    flat: {
        name: "Flat",
        terrain: {
            scale: 260,
            magnitude: 2,
            offset: 8,
            fbm: { octaves: 3, gain: 0.45, lacunarity: 2.0 },
        },
        trees: {
            minHeight: 3,
            maxHeight: 5,
            minRadius: 2,
            maxRadius: 3,
            frequency: 0.04,
        },
    },
    mountains: {
        name: "Mountains",
        terrain: {
            scale: 110,
            magnitude: 18,
            offset: 10,
            fbm: { octaves: 6, gain: 0.55, lacunarity: 2.2 },
        },
        trees: {
            minHeight: 4,
            maxHeight: 8,
            minRadius: 3,
            maxRadius: 6,
            frequency: 0.06,
        },
    },
    forest: {
        name: "Forest",
        terrain: {
            scale: 168,
            magnitude: 6,
            offset: 8,
            fbm: { octaves: 5, gain: 0.5, lacunarity: 2.0 },
        },
        trees: {
            minHeight: 5,
            maxHeight: 10,
            minRadius: 3,
            maxRadius: 7,
            frequency: 0.12,
        },
    },
};

export const WORLDGEN_PRESET_IDS = ['default', 'flat', 'mountains', 'forest']

export const DEFAULT_WORLDGEN_DRAFT = {
    presetId: 'default',
    magnitude: 6,
    treeMinHeight: 3,
    treeMaxHeight: 6,
}

export function buildWorldGenParams(presetId, overrides = {}) {
    const preset = WORLDGEN_PRESETS[presetId] || WORLDGEN_PRESETS.default

    const terrain = JSON.parse(JSON.stringify(preset.terrain))
    const trees = JSON.parse(JSON.stringify(preset.trees))

    if (overrides.magnitude !== undefined) {
        terrain.magnitude = overrides.magnitude
    }
    if (overrides.treeMinHeight !== undefined) {
        trees.minHeight = overrides.treeMinHeight
    }
    if (overrides.treeMaxHeight !== undefined) {
        trees.maxHeight = overrides.treeMaxHeight
    }

    return { terrain, trees }
}
