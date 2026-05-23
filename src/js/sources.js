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
      '/textures/environmentMap/px.jpg',
      '/textures/environmentMap/nx.jpg',
      '/textures/environmentMap/py.jpg',
      '/textures/environmentMap/ny.jpg',
      '/textures/environmentMap/pz.jpg',
      '/textures/environmentMap/nz.jpg',
    ],
  },

  // ===== 方块纹理 =====
  {
    name: 'grassTopTexture',
    type: 'texture',
    path: '/textures/blocks/grass_block_top.png',
  },
  {
    name: 'grassSideTexture',
    type: 'texture',
    path: '/textures/blocks/grass_block_side.png',
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
    path: '/models/character/player.glb',
  },
]
