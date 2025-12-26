import * as THREE from 'three';

export function generateMiura(xVerts, yVerts, thetaRad, hLength, vLength) {
    const horizontal = [];
    const vertical = [];
    let zigzagAngle = thetaRad;
    let lastPos = new THREE.Vector3(0, 0, 0);

    // Horizontal
    horizontal.push({ pos: lastPos.clone(), alpha: Math.PI - zigzagAngle });
    for (let i = 1; i < xVerts; i++) {
        let vec = new THREE.Vector3(Math.cos(zigzagAngle), Math.sin(zigzagAngle), 0);
        lastPos.add(vec.multiplyScalar(hLength));
        horizontal.push({ pos: lastPos.clone(), alpha: Math.PI / 2 });
        zigzagAngle = -zigzagAngle;
    }

    // Vertical
    for (let j = 1; j < yVerts; j++) {
        vertical.push({ pos: new THREE.Vector3(0, j * vLength, 0), alpha: thetaRad });
    }

    // Center
    const width = horizontal[xVerts - 1 - (1 - xVerts % 2)].pos.x;
    const height = vertical.at(-1).pos.y;

    const centeringShift = new THREE.Vector3(-width / 2, -height / 2, 0);

    // Apply to all generated objects
    horizontal.forEach(v => v.pos.add(centeringShift));
    vertical.forEach(v => v.pos.add(centeringShift));

    return { horizontal, vertical };
}