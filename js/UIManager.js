import * as THREE from 'three';
import { MarchingAlgorithm } from './MarchingAlgorithm.js';
import { generateMiura } from './MiuraOriBoundary.js';
import { AppState } from './AppState.js';
import { DesignMode } from './DesignMode.js';
import { FoldingMode } from './FoldingMode.js';
import { Interaction } from './Interaction.js';

// ============================================
// UI CONTROLS
// ============================================
export const UI = {
    scene: null,
    camera: null,
    buildArtifacts: [],

    init(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        document.getElementById('generate-miura-btn').addEventListener('click', () => {
            const params = document.getElementById('miura-params');
            params.style.display = params.style.display === 'none' ? 'block' : 'none';
        });

        document.getElementById('apply-miura-btn').addEventListener('click', () => this.generateMiuraBoundary());
        document.getElementById('build-btn').addEventListener('click', () => this.buildPattern());
        document.getElementById('fold-btn').addEventListener('click', () => {
            this.switchToFoldingMode();
            document.getElementById('fold-btn').style.display = 'none';
        });
        document.getElementById('back-to-design-btn').addEventListener('click', () => this.backToDesign());

        document.getElementById('angle-slider').addEventListener('input', (e) => {
            let val = parseFloat(e.target.value);
            AppState.activationAngle = val;
            document.getElementById('angle-value').textContent = AppState.activationAngle + '°';
            if (val >= 180) val = 179.9;
            FoldingMode.updateFolding(val * Math.PI / 180);
        });
    },

    generateMiuraBoundary() {
        const xVerts = parseInt(document.getElementById('x-verts').value);
        const yVerts = parseInt(document.getElementById('y-verts').value);
        const theta = parseFloat(document.getElementById('theta').value) * Math.PI / 180;
        const hLength = parseFloat(document.getElementById('h-length').value);
        const vLength = parseFloat(document.getElementById('v-length').value);

        this.clearPreviousBuild();

        const { horizontal, vertical } = generateMiura(xVerts, yVerts, theta, hLength, vLength);
        AppState.horizontalVertices = horizontal;
        AppState.verticalVertices = vertical;

        DesignMode.update();
        document.getElementById('miura-params').style.display = 'none';
        document.getElementById('fold-btn').style.display = 'none';
        this.showMessage('Miura-Ori boundary generated!');
    },

    async buildPattern() {
        if (AppState.mode === 'building') {
            this.showMessage('Build already in progress...');
            return;
        }

        this.showMessage('Marching Algorithm Started...');
        AppState.mode = 'building';

        console.log("removing fold btn");
        const foldBtn = document.getElementById('fold-btn');
        foldBtn.style.display = 'none';
        this.clearPreviousBuild();

        const rows = AppState.verticalVertices.length + 1;
        const cols = AppState.horizontalVertices.length;
        MarchingAlgorithm.init(rows, cols, AppState.horizontalVertices, AppState.verticalVertices);

        for (let i = 1; i < rows; i++) {
            for (let j = 1; j < cols; j++) {
                const speed = parseInt(document.getElementById('speedSlider').value);
                const delay = (100 - speed) * 10;
                try {
                    const newPos = MarchingAlgorithm.calcNextVertex(i, j);
                    this.drawVertexPosition(i, j, newPos);
                    await new Promise(r => setTimeout(r, delay));
                    MarchingAlgorithm.calcNextAngle(i, j);
                    this.drawVertexRays(i, j, newPos);
                    await new Promise(r => setTimeout(r, delay));
                } catch (e) {
                    console.error(`RFFQM Build Failed at [${i}, ${j}] `);
                    console.error(e);
                    this.showMessage("Incompatible Geometry!");
                    AppState.mode = 'design';
                    return;
                }
            }
        }

        AppState.fullGrid = MarchingAlgorithm.dots;
        this.showMessage("Marching Algorithm Completed");
        AppState.mode = 'built';
        foldBtn.style.display = 'block';
    },

    drawVertexPosition(i, j, pos) {
        // 1. Add the Dot
        const dotGeom = new THREE.SphereGeometry(0.04);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const dot = new THREE.Mesh(dotGeom, dotMat);
        dot.position.copy(pos);
        this.scene.add(dot);
        this.buildArtifacts.push(dot);

        // 2. Add the Crease Lines (Connecting to neighbors)
        const lineMat = new THREE.LineBasicMaterial({ color: 0x666666 });

        // Horizontal crease to the left
        const pLeft = MarchingAlgorithm.dots[i][j - 1];
        const geomH = new THREE.BufferGeometry().setFromPoints([pos, pLeft]);
        const lineH = new THREE.Line(geomH, lineMat);
        this.scene.add(lineH);
        this.buildArtifacts.push(lineH);

        // Vertical crease to the bottom
        const pBottom = MarchingAlgorithm.dots[i - 1][j];
        const geomV = new THREE.BufferGeometry().setFromPoints([pos, pBottom]);
        const lineV = new THREE.Line(geomV, lineMat);
        this.scene.add(lineV);
        this.buildArtifacts.push(lineV);
    },

    drawVertexRays(i, j, pos) {
        const rayLength = 0.4;
        const alpha = MarchingAlgorithm.alphas[i][j];
        const beta = MarchingAlgorithm.betas[i][j];
        const rayMat = new THREE.LineBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });

        // 1. Reference: Vector pointing to Left neighbor
        const toLeft = new THREE.Vector3().subVectors(MarchingAlgorithm.dots[i][j - 1], pos).normalize();

        // Helper to rotate a vector in the XY plane
        const rotateXY = (vec, angle) => {
            return new THREE.Vector3(
                vec.x * Math.cos(angle) - vec.y * Math.sin(angle),
                vec.x * Math.sin(angle) + vec.y * Math.cos(angle),
                0
            );
        };

        // --- Draw Beta Ray ---
        const upDir = rotateXY(toLeft, -beta).multiplyScalar(rayLength);
        const betaGeom = new THREE.BufferGeometry().setFromPoints([pos, pos.clone().add(upDir)]);
        const betaLine = new THREE.Line(betaGeom, rayMat);
        this.scene.add(betaLine);
        this.buildArtifacts.push(betaLine);

        // --- Draw Alpha Ray ---
        const rightDir = rotateXY(upDir, -alpha);
        const alphaGeom = new THREE.BufferGeometry().setFromPoints([pos, pos.clone().add(rightDir)]);
        const alphaLine = new THREE.Line(alphaGeom, rayMat);
        this.scene.add(alphaLine);
        this.buildArtifacts.push(alphaLine);
    },

    clearPreviousBuild() {
        this.buildArtifacts.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        this.buildArtifacts = [];
    },

    setBuildVisibility(visible) {
        this.buildArtifacts.forEach(obj => {
            obj.visible = visible;
        });
    },

    switchToFoldingMode() {
        AppState.mode = 'folding';
        document.getElementById('mode').textContent = 'Mode: Folding';
        document.getElementById('design-controls').style.display = 'none';
        document.getElementById('folding-controls').style.display = 'block';

        DesignMode.clear();
        this.setBuildVisibility(false);
        FoldingMode.init(this.scene);
        Interaction.updateControlsForMode();
        // camera.position.set(2, 2, 5);
        // camera.lookAt(0, 0, 0);
    },

    backToDesign() {
        AppState.mode = 'built';
        document.getElementById('mode').textContent = 'Mode: Design';
        document.getElementById('design-controls').style.display = 'block';
        document.getElementById('fold-btn').style.display = 'block';
        document.getElementById('folding-controls').style.display = 'none';

        // Reset angle slider
        AppState.activationAngle = 0;
        document.getElementById('angle-value').textContent = AppState.activationAngle + '°';
        document.getElementById('angle-slider').value = 0;

        FoldingMode.clear();
        this.setBuildVisibility(true);
        DesignMode.init(this.scene);
        Interaction.updateControlsForMode();
    },

    showMessage(text) {
        const msg = document.getElementById('message');
        msg.textContent = text;
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 3000);
    }
};