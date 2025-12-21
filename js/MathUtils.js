import * as THREE from 'three';

export function calcAngle(v1, v2) {
    return v1.angleTo(v2);
}

/**
 * Creates a rotation transformation around a specific axis.
 * In JS, we use a Quaternion or a Matrix4 to represent this.
 * @param {THREE.Vector3} axisVec - The vector representing the crease/axis.
 * @param {number} angle - The folding angle in radians.
 */
export function createRotationAroundAxis(axisVec, angle) {
    const normalizedAxis = axisVec.clone().normalize();
    return new THREE.Quaternion().setFromAxisAngle(normalizedAxis, angle);
}


/**
 * Centering helper: moves the entire point set so its bounding box center is at (0,0,0).
 */
export function centerDots(dots2D) {
    const box = new THREE.Box3();
    dots2D.forEach(row => row.forEach(v => box.expandByPoint(v)));

    const center = new THREE.Vector3();
    box.getCenter(center);

    dots2D.forEach(row => row.forEach(v => v.sub(center)));
}