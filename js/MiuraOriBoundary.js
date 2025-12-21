import * as THREE from 'three';

export function generateMiura(xVerts, yVerts, thetaRad, hLength, vLength) {
    const horizontal = [];
    const vertical = [];
    let zigzag_angle = thetaRad;
    let last_pos = new THREE.Vector3(0, 0, 0);

    // Horizontal
    horizontal.push({ pos: last_pos.clone(), alpha: Math.PI / 2 });
    for (let i = 1; i < xVerts; i++) {
        let vec = new THREE.Vector3(Math.cos(zigzag_angle), Math.sin(zigzag_angle), 0);
        last_pos.add(vec.multiplyScalar(hLength));
        horizontal.push({ pos: last_pos.clone(), alpha: Math.PI / 2 });
        zigzag_angle = -zigzag_angle;
    }

    // Vertical
    for (let j = 1; j < yVerts; j++) {
        vertical.push({ pos: new THREE.Vector3(0, j * vLength, 0), alpha: thetaRad });
    }

    return { horizontal, vertical };
}