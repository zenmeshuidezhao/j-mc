import * as THREE from 'three';

export function isInAttackbox(attackerPos, forwardDir, targetPos, width, depth) {
    const dx = targetPos.x - attackerPos.x;
    const dz = targetPos.z - attackerPos.z;

    const forwardDist = dx * forwardDir.x + dz * forwardDir.z;
    if (forwardDist < 0 || forwardDist > depth) {
        return false;
    }

    const rightDist = dx * (-forwardDir.z) + dz * forwardDir.x;
    if (Math.abs(rightDist) > width / 2) {
        return false;
    }

    return true;
}

export function createAttackBoxHelper(color = 0xFF0000) {
    const positions = new Float32Array(24 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({ 
        color,
        depthTest: false,
        transparent: true,
        opacity: 0.6,
     });

     const lines = new THREE.LineSegments(geometry, material);
     lines.frustumCulled = false;
     lines.renderOrder = 999;
     return lines;
}

export function updateAttackBoxHelper(helper, attackerPos, forwardDir, width, depth, height = 1.7) {
  const arr = helper.geometry.attributes.position.array
  const hw = width / 2
  const rightX = -forwardDir.z
  const rightZ = forwardDir.x

  // 4 corners at ground level: near-left, near-right, far-left, far-right
  const nlX = attackerPos.x + rightX * (-hw)
  const nlZ = attackerPos.z + rightZ * (-hw)
  const nrX = attackerPos.x + rightX * hw
  const nrZ = attackerPos.z + rightZ * hw
  const flX = nlX + forwardDir.x * depth
  const flZ = nlZ + forwardDir.z * depth
  const frX = nrX + forwardDir.x * depth
  const frZ = nrZ + forwardDir.z * depth

  const yB = attackerPos.y
  const yT = attackerPos.y + height

  // 24 vertices = 12 line segments (bottom 4 + top 4 + vertical 4)
  const verts = [
    // Bottom rectangle
    nlX,
    yB,
    nlZ,
    nrX,
    yB,
    nrZ,
    nrX,
    yB,
    nrZ,
    frX,
    yB,
    frZ,
    frX,
    yB,
    frZ,
    flX,
    yB,
    flZ,
    flX,
    yB,
    flZ,
    nlX,
    yB,
    nlZ,
    // Top rectangle
    nlX,
    yT,
    nlZ,
    nrX,
    yT,
    nrZ,
    nrX,
    yT,
    nrZ,
    frX,
    yT,
    frZ,
    frX,
    yT,
    frZ,
    flX,
    yT,
    flZ,
    flX,
    yT,
    flZ,
    nlX,
    yT,
    nlZ,
    // Vertical edges
    nlX,
    yB,
    nlZ,
    nlX,
    yT,
    nlZ,
    nrX,
    yB,
    nrZ,
    nrX,
    yT,
    nrZ,
    flX,
    yB,
    flZ,
    flX,
    yT,
    flZ,
    frX,
    yB,
    frZ,
    frX,
    yT,
    frZ,
  ]

  for (let i = 0; i < verts.length; i++) {
    arr[i] = verts[i]
  }

  helper.geometry.attributes.position.needsUpdate = true
}