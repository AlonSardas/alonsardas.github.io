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

        const uvs = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                uvs.push(j / (cols - 1), i / (rows - 1));
            }
        }
        this.geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));

        // Create a grid texture
        function createGridTexture(resolution = 512, lineWidth = 6) {
            const canvas = document.createElement('canvas');
            canvas.width = resolution;
            canvas.height = resolution;
            const ctx = canvas.getContext('2d');

            // Fill with your base color
            const baseColor = new THREE.Color().setHSL(0.6, 0.9, 0.45);
            ctx.fillStyle = `rgb(${baseColor.r * 255}, ${baseColor.g * 255}, ${baseColor.b * 255})`;
            ctx.fillRect(0, 0, resolution, resolution);

            // Draw grid lines
            // ctx.strokeStyle = '#ffffffff';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(0, 0, resolution, resolution);

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            // texture.colorSpace = THREE.SRGBColorSpace;
            texture.repeat.set(cols - 1, rows - 1);

            return texture;
        }

        const material = new THREE.MeshStandardMaterial({
            map: createGridTexture(),
            // color: new THREE.Color().setHSL(0.6, 1.0, 0.55),
            // color: new THREE.Color().setHSL(0.55, 0.9, 0.65),
            side: THREE.DoubleSide,
            roughness: 0.4,
            metalness: 0.2,
            flatShading: true,

            // emissive: new THREE.Color(0xffffff),
            // emissiveMap: createGridTexture(), // Use the same texture
            // emissiveIntensity: 0.6 // Adjust this until the lines pop
        });

        this.mesh = new THREE.Mesh(this.geometry, material);
        this.scene.add(this.mesh);
        // Initial update
        this.updateFolding(0);
    },

    updateFolding(gamma) {
        const foldedDots = this.engine.setGamma(gamma);

        const positionAttr = this.geometry.attributes.position;
        let idx = 0;

        for (let i = 0; i < this.engine.rows; i++) {
            for (let j = 0; j < this.engine.cols; j++) {
                const p = foldedDots[i][j];
                positionAttr.setXYZ(idx++, p.x, p.y, p.z);
            }
        }

        positionAttr.needsUpdate = true;
        // this.geometry.computeVertexNormals(); // Fixes lighting
    },

    clear() {
        [this.mesh].forEach(obj => {
            this.scene.remove(obj);
            obj.geometry.dispose();
            obj.material.dispose();
        });
        this.mesh = null;
    }
};