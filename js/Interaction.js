import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AppState } from './AppState.js';
import { DesignMode } from './DesignMode.js';

// ============================================
// INTERACTION: MOUSE CONTROLS
// ============================================
export const Interaction = {
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    selectedObject: null,
    dragMode: 'POSITION', // 'POSITION' or 'ANGLE'
    zoomLevel: 5,

    isDragging: false,
    lastMousePosition: { x: 0, y: 0 },

    camera: null,
    scene: null,
    renderer: null,
    controls: null,

    init(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.camera.position.set(0, 0, this.zoomLevel);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.updateControlsForMode();
    },

    updateControlsForMode() {
        if (AppState.mode === 'design' || AppState.mode === 'built') {
            // In design mode, OrbitControls' rotation interferes with dragging
            this.controls.enableRotate = false;
            this.camera.position.set(0, 0, this.zoomLevel);
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        } else if (AppState.mode === 'folding') {
            this.controls.enableRotate = true;
        }
    },

    onMouseDown(event) {
        if (event.target.tagName !== 'CANVAS') return;

        this.lastMousePosition = { x: event.clientX, y: event.clientY };

        if (AppState.mode === 'design' || AppState.mode === 'built') {
            const hitSomething = this.handleRaycastPick(event);
            if (hitSomething) {
                // If dragging a vertex, disable OrbitControls so we don't pan 
                this.controls.enabled = false;
                this.isDragging = true;
            }
        }
    },

    onMouseMove(event) {
        if (this.isDragging) {
            this.performDragging(event);
        }
    },

    handleRaycastPick(event) {
        this.updateMouseCoords(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(DesignMode.spheres);
        if (intersects.length > 0) {
            this.selectedObject = intersects[0].object;
            this.isDragging = true;

            // Reset build state if we start editing
            if (AppState.mode === 'built') {
                AppState.mode = 'design';
                const foldBtn = document.getElementById('fold-btn');
                if (foldBtn) foldBtn.style.display = 'none';
            }

            return true;
        }
        return false;
    },

    performDragging(event) {
        this.updateMouseCoords(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersectPoint = new THREE.Vector3();

        if (this.raycaster.ray.intersectPlane(plane, intersectPoint)) {
            const { type, index, isRayHandle } = this.selectedObject.userData;
            const targetList = type === 'horizontal' ? AppState.horizontalVertices : AppState.verticalVertices;
            const vertex = targetList[index];

            if (isRayHandle) {
                const dx = intersectPoint.x - vertex.pos.x;
                const dy = intersectPoint.y - vertex.pos.y;
                vertex.alpha = Math.atan2(dy, dx);
            } else {
                vertex.pos.copy(intersectPoint);
            }

            DesignMode.update();
        }
    },

    updateMouseCoords(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    },

    onMouseUp() {
        this.isDragging = false;
        this.selectedObject = null;
        this.controls.enabled = true;
    },

    update() {
        this.controls.update();
    }
};