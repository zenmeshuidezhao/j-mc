export const SKIN_LIST = [
    {
        id: 'steve',
        name: 'Steve',
        nameKey: 'skin.steve', // i18n key
        modelPath: 'models/character/steve.glb',
        thumbnail: 'textures/skins/steve-thumb.png',
    },
    {
        id: 'alex',
        name: 'Alex',
        nameKey: 'skin.alex', // i18n key
        modelPath: 'models/character/alex.glb',
        thumbnail: 'textures/skins/alex-thumb.png',
    },
    {
        id: 'player',
        name: 'Player',
        nameKey: 'skin.player',
        modelPath: 'models/character/player.glb',
        thumbnail: 'textures/skins/player-thumb.png',
    }
];

export const DEFAULT_SKIN_ID = 'steve';

export const ANIMATION_BUTTONS = [
  { id: 'idle', icon: '🧍', labelKey: 'anim.idle', clip: 'idle' },
  { id: 'walk', icon: '🚶', labelKey: 'anim.walk', clip: 'forward' },
  { id: 'run', icon: '🏃', labelKey: 'anim.run', clip: 'running_forward' },
  { id: 'tpose', icon: '✋', labelKey: 'anim.tpose', clip: 'tpose' },
  { id: 'mine', icon: '⛏️', labelKey: 'anim.mine', clip: 'quick_combo_punch' },
  { id: 'jump', icon: '🦘', labelKey: 'anim.jump', clip: 'jump' },
  { id: 'attack', icon: '⚔️', labelKey: 'anim.attack', clip: 'straight_punch' },
  { id: 'block', icon: '🛡️', labelKey: 'anim.block', clip: 'block' },
];