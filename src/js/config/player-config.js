export const MOVEMENT_DIRECTION_WEIGHTS = {
    FORWARD: 1.0,
    BACKWARD: 0.8,
    LEFT: 1.0,
    RIGHT: 1.0,
}

export const MOVEMENT_CONSTANTS = {
    COMBAT_DECELERATION: 0.9,
}

export const PLAYER_CONFIG = {
    speed: {
        crouch: 1.3,
        walk: 3.00,
        run: 5.00,
    },
    directionMultiplier: {
        crouch: {
            lateral: 1.0,
            backward: 1.0,
        }
        ,
        walk: {
            lateral: 0.8,
            backward: 0.75,
        },
        run: {
            lateral: 0.9,
            backward: 0.8,
        }
    },
    jumpForce: 4.9,
    facingAngle: Math.PI,
    mouseSensitivity: 0.002,
    turnSmoothing: 0.10,
    respawn: {
        thresholdY: -2,
        position: { x: 0, y: 0, z: 0},
    },
    speedLines: {
        fadeInSpeed: 5.0,
        fadeOutSpeed: 3.0,
        targetOpacity: 0.8,
    }
}