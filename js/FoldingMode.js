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

        const positions = [];
        const qA = [], qB = [], qC = [], qD = [];

        const getDot = (i, j) => {
            const p = this.engine.dots[i][j];
            return [p.x, p.y, p.z];
        }

        for (let i = 0; i < rows - 1; i++) {
            for (let j = 0; j < cols - 1; j++) {
                // Get the 4 dots from your engine
                const p1 = getDot(i, j);
                const p2 = getDot(i, j + 1);
                const p3 = getDot(i + 1, j + 1);
                const p4 = getDot(i + 1, j);

                // We add 6 vertices per quad (2 triangles)
                positions.push(...p1, ...p2, ...p4, ...p2, ...p3, ...p4);

                // Every one of those 6 vertices needs to know all 4 corners
                for (let k = 0; k < 6; k++) {
                    qA.push(...p1);
                    qB.push(...p2);
                    qC.push(...p3);
                    qD.push(...p4);
                }
            }
        }

        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.geometry.setAttribute('qA', new THREE.Float32BufferAttribute(qA, 3));
        this.geometry.setAttribute('qB', new THREE.Float32BufferAttribute(qB, 3));
        this.geometry.setAttribute('qC', new THREE.Float32BufferAttribute(qC, 3));
        this.geometry.setAttribute('qD', new THREE.Float32BufferAttribute(qD, 3));

        const material = new THREE.MeshStandardMaterial({
            color: 0x4da6ff,
            side: THREE.DoubleSide,
            roughness: 0.4,
            metalness: 0.1
        });

        material.userData = {
            lineColor: { value: new THREE.Color(0xffffff) },
            lineWidth: { value: 1.5 },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        };

        material.onBeforeCompile = (shader) => {
            shader.uniforms.lineColor = material.userData.lineColor;
            shader.uniforms.lineWidth = material.userData.lineWidth;
            shader.uniforms.resolution = material.userData.resolution;

            shader.vertexShader = `
        attribute vec3 qA, qB, qC, qD;
        varying vec3 vQA, vQB, vQC, vQD;
        ${shader.vertexShader}
    `.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
         vQA = qA; vQB = qB; vQC = qC; vQD = qD;`
            );

            shader.fragmentShader = `
        uniform mat4 projectionMatrix;
        uniform mat4 modelViewMatrix;

        uniform vec2 resolution;
        uniform float lineWidth;
        uniform vec3 lineColor;
        varying vec3 vQA, vQB, vQC, vQD;

        float edgeDist(vec2 p, vec2 a, vec2 b) {
            vec2 pa = p - a;
            vec2 ba = b - a;
            float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
            return length(pa - ba * h);
        }

        vec2 project(vec3 pos) {
            vec4 projected = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            return (projected.xy / projected.w * 0.5 + 0.5) * resolution;
        }
        ${shader.fragmentShader}
    `.replace(
                '#include <dithering_fragment>',
                `
        vec2 pA = project(vQA);
        vec2 pB = project(vQB);
        vec2 pC = project(vQC);
        vec2 pD = project(vQD);

        float d = min(
            min(edgeDist(gl_FragCoord.xy, pA, pB), edgeDist(gl_FragCoord.xy, pB, pC)),
            min(edgeDist(gl_FragCoord.xy, pC, pD), edgeDist(gl_FragCoord.xy, pD, pA))
        );

        float edge = smoothstep(lineWidth, lineWidth - 1.0, d);

        // gl_FragColor already contains the lighting info
        // We just mix our line color into it.
        gl_FragColor.rgb = mix(gl_FragColor.rgb, lineColor, edge);

        #include <dithering_fragment>
        `
            );
        };

        this.mesh = new THREE.Mesh(this.geometry, material);
        // this.mesh.castShadow = true;
        // this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);

        // Initial update
        this.updateFolding(0);
    },

    updateFolding(gamma) {
        const foldedDots = this.engine.setGamma(gamma);
        const rows = this.engine.rows;
        const cols = this.engine.cols;

        const posAttr = this.geometry.attributes.position;
        const qAAttr = this.geometry.attributes.qA;
        const qBAttr = this.geometry.attributes.qB;
        const qCAttr = this.geometry.attributes.qC;
        const qDAttr = this.geometry.attributes.qD;

        let vIdx = 0; // Tracks the 6 vertices per quad

        for (let i = 0; i < rows - 1; i++) {
            for (let j = 0; j < cols - 1; j++) {
                // The 4 dots for this quad
                const p1 = foldedDots[i][j];
                const p2 = foldedDots[i][j + 1];
                const p3 = foldedDots[i + 1][j + 1];
                const p4 = foldedDots[i + 1][j];

                // Triangle 1
                posAttr.setXYZ(vIdx + 0, p1.x, p1.y, p1.z);
                posAttr.setXYZ(vIdx + 1, p2.x, p2.y, p2.z);
                posAttr.setXYZ(vIdx + 2, p4.x, p4.y, p4.z);
                // Triangle 2
                posAttr.setXYZ(vIdx + 3, p2.x, p2.y, p2.z);
                posAttr.setXYZ(vIdx + 4, p3.x, p3.y, p3.z);
                posAttr.setXYZ(vIdx + 5, p4.x, p4.y, p4.z);

                // Update the Quad Corners (All 6 vertices get all 4 corners)
                for (let k = 0; k < 6; k++) {
                    const currentV = vIdx + k;
                    qAAttr.setXYZ(currentV, p1.x, p1.y, p1.z);
                    qBAttr.setXYZ(currentV, p2.x, p2.y, p2.z);
                    qCAttr.setXYZ(currentV, p3.x, p3.y, p3.z);
                    qDAttr.setXYZ(currentV, p4.x, p4.y, p4.z);
                }

                vIdx += 6;
            }
        }

        posAttr.needsUpdate = true;
        qAAttr.needsUpdate = true;
        qBAttr.needsUpdate = true;
        qCAttr.needsUpdate = true;
        qDAttr.needsUpdate = true;

        this.geometry.computeVertexNormals();
    },

    clear() {
        [this.mesh].forEach(obj => {
            this.scene.remove(obj);
            obj.geometry.dispose();
            obj.material.dispose();
        });
        this.mesh = null;
    },

    onResize(width, height) {
        if (this.mesh) {
            this.mesh.material.userData.resolution.value.set(
                width,
                height
            );
        }
    }
};