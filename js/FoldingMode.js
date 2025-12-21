import * as THREE from 'three';
import { AppState } from './AppState.js';
import { RFFQM } from './RFFQM.js';

// ============================================
// FOLDING MODE RENDERING
// ============================================
export const FoldingMode = {
    scene: null,
    engine: null,
    mesh: null,
    geometry: null,

    init(scene) {
        this.scene = scene;
        // 1. Initialize the RFFQM engine with the synthesized grid
        // AppState.fullGrid is the 2D array of Vector3s from the Marching Algorithm
        this.engine = new RFFQM(AppState.fullGrid);

        this.createMesh();
    },

    createMesh() {
        const rows = this.engine.rows;
        const cols = this.engine.cols;
        this.geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(rows * cols * 3);
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Create indices for the quads (2 triangles per quad)
        const indices = [];
        for (let i = 0; i < rows - 1; i++) {
            for (let j = 0; j < cols - 1; j++) {
                const a = i * cols + j;
                const b = i * cols + (j + 1);
                const c = (i + 1) * cols + (j + 1);
                const d = (i + 1) * cols + j;
                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }
        this.geometry.setIndex(indices);

        const material = new THREE.MeshPhongMaterial({
            color: 0xcccccc,
            side: THREE.DoubleSide,
            flatShading: true
        });

        this.mesh = new THREE.Mesh(this.geometry, material);
        this.scene.add(this.mesh);

        // Initial update
        this.updateFolding(0);
    },

    updateFolding(gamma) {
        if (!this.engine) return;

        // 3. Call your Python-ported logic
        const foldedDots = this.engine.setGamma(gamma);

        // 4. Update the BufferGeometry positions
        const positionAttr = this.geometry.attributes.position;
        let idx = 0;

        for (let i = 0; i < this.engine.rows; i++) {
            for (let j = 0; j < this.engine.cols; j++) {
                const p = foldedDots[i][j];
                positionAttr.setXYZ(idx++, p.x, p.y, p.z);
            }
        }

        positionAttr.needsUpdate = true;
        this.geometry.computeVertexNormals(); // Fixes lighting
    },

    clear() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }
    }
};