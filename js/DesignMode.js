import * as THREE from 'three';
import { AppState } from './AppState.js';

const required = (name) => {
    throw new Error(`Missing parameter: ${name}.`);
};

// ============================================
// DESIGN MODE RENDERING
// ============================================
export const DesignMode = {
    scene: null,
    spheres: [],
    lines: [],
    angleRays: [],

    init(scene = required('scene')) {
        this.scene = scene;
        this.clear();

        // Draw the Horizontal Arm
        AppState.horizontalVertices.forEach((v, i) => {
            this.addVertexVisual(v, i, 'horizontal');
        });

        // Draw the Vertical Arm
        AppState.verticalVertices.forEach((v, i) => {
            this.addVertexVisual(v, i, 'vertical');
        });
    },

    clear() {
        this.spheres.forEach(s => this.scene.remove(s));
        this.lines.forEach(l => this.scene.remove(l));
        this.angleRays.forEach(r => this.scene.remove(r));
        this.spheres = [];
        this.lines = [];
        this.angleRays = [];
    },

    /**
     * @param {Object} vertex - { pos: Vector3, alpha: number }
     * @param {number} index - Index in the specific list
     * @param {string} type - 'horizontal' or 'vertical'
     */
    addVertexVisual(vertex, index, type) {
        // 1. Create sphere for vertex
        const sphereGeom = new THREE.SphereGeometry(0.1, 16, 16);
        const sphereMat = new THREE.MeshPhongMaterial({
            color: type === 0x3366ff
        });
        const sphere = new THREE.Mesh(sphereGeom, sphereMat);
        sphere.position.copy(vertex.pos);
        sphere.userData = { type, index };
        this.scene.add(sphere);
        this.spheres.push(sphere);

        if (type === 'horizontal' && index === 0) return; // Skip angle ray for first horizontal vertex
        // 2. Create angle ray (Direction depends on type)
        const rayLength = 0.5;
        const totalAngle = vertex.alpha;

        const rayEnd = new THREE.Vector3(
            vertex.pos.x + rayLength * Math.cos(totalAngle),
            vertex.pos.y + rayLength * Math.sin(totalAngle),
            0
        );

        // 3. ADD THIS: Control Sphere at the tip of the ray
        const handleGeom = new THREE.SphereGeometry(0.075, 8, 8); // Smaller than the main vertex
        const handleMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const handle = new THREE.Mesh(handleGeom, handleMat);
        handle.position.copy(rayEnd);

        // Crucial: Mark this as a 'ray-handle' so we can distinguish it from the vertex
        handle.userData = { type, index, isRayHandle: true };

        this.scene.add(handle);
        this.spheres.push(handle); // Add to the same list so it's raycastable

        // 4. Create the visible line for the ray
        const rayPoints = [vertex.pos, rayEnd];
        const rayLineGeom = new THREE.BufferGeometry().setFromPoints(rayPoints);
        const rayLineMat = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.6 });
        const rayLine = new THREE.Line(rayLineGeom, rayLineMat);

        this.scene.add(rayLine);
        this.angleRays.push(rayLine); // Ensure this is pushed so it gets cleared in this.clear()

        // 5. Create lines connecting vertices within the same arm
        const list = type === 'horizontal' ? AppState.horizontalVertices : AppState.verticalVertices;
        if (index > 0) {
            const prevVertex = list[index - 1];
            const lineGeom = new THREE.BufferGeometry().setFromPoints([prevVertex.pos, vertex.pos]);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x00ff88 });
            const line = new THREE.Line(lineGeom, lineMat);
            this.scene.add(line);
            this.lines.push(line);
        } else if (type === 'vertical') {
            // Connect first vertical vertex to last horizontal vertex
            const pos0 = AppState.horizontalVertices[0];
            const lineGeom = new THREE.BufferGeometry().setFromPoints([pos0.pos, vertex.pos]);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x00ff88 });
            const line = new THREE.Line(lineGeom, lineMat);
            this.scene.add(line);
            this.lines.push(line);
        }
    },

    update() {
        this.init(this.scene);
    }
};