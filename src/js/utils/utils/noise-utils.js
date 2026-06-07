// fBm（分形布朗运动）噪声生成功能

export function fbm2D(simplex, x, z, options = {}) {
    const {
        octaves = 5,
        gain = 0.5,
        lacunarity = 2.0,
        scale = 35,
    } = options;

    let result = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxAmplitude = 0;

    for (let i = 0; i < octaves; i++) {
        const sampleX = x / (scale / frequency);
        const sampleZ = z / (scale / frequency);

        const noiseVal = simplex.noise(sampleX, sampleZ);

        result += noiseVal * amplitude;
        maxAmplitude += amplitude;

        frequency *= lacunarity;
        amplitude *= gain;
    }

    return result / maxAmplitude;
}