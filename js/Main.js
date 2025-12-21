import * as THREE from 'three';
import { UI } from './UIManager.js';
// import { AppState } from './AppState.js';
import { DesignMode } from './DesignMode.js';
import { Interaction } from './Interaction.js';

// ============================================
// THREE.JS SCENE SETUP
// ============================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// ============================================
// INITIALIZATION & ANIMATION
// ============================================
function init() {
    DesignMode.init(scene);
    UI.init(scene, camera);
    UI.generateMiuraBoundary();

    Interaction.init(scene, camera, renderer);

    document.addEventListener('mousedown', (e) => Interaction.onMouseDown(e));
    document.addEventListener('mousemove', (e) => Interaction.onMouseMove(e));
    document.addEventListener('mouseup', () => Interaction.onMouseUp());
    // document.addEventListener('wheel', (e) => Interaction.onWheel(e), { passive: false });
    document.addEventListener('contextmenu', (e) => e.preventDefault()); // Disable right-click menu

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function animate() {
    requestAnimationFrame(animate);
    Interaction.update();
    renderer.render(scene, camera);
}

init();
animate();