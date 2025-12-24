import * as THREE from 'three';
import { UI } from './UIManager.js';
import { DesignMode } from './DesignMode.js';
import { Interaction } from './Interaction.js';

// ============================================
// INFO PANEL TOGGLE
// ============================================
const infoBtn = document.getElementById('infoButton');
const panel = document.getElementById('infoPanel');

infoBtn.addEventListener('click', () => {
    // panel.classList.add('active');
    // infoBtn.style.visibility = 'hidden'; // Hide button when panel is open
    panel.classList.toggle('active');
});

// ============================================
// THREE.JS SCENE SETUP
// ============================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 4.0);
scene.add(ambientLight);
const sunLight1 = new THREE.DirectionalLight(0xffffff, 3.5);
sunLight1.position.set(-10, 20, 10);
scene.add(sunLight1);
// const sunLight2 = new THREE.DirectionalLight(0xffffff, 1.5);
// sunLight2.position.set(10, -20, -10);
// scene.add(sunLight2);
// const fillLight = new THREE.PointLight(0xffffff, 2.8);
// fillLight.position.set(-10, -5, -10);
// scene.add(fillLight);

// ============================================
// INITIALIZATION & ANIMATION
// ============================================
function init() {
    DesignMode.init(scene);
    UI.init(scene, camera);
    UI.generateMiuraBoundary();

    Interaction.init(scene, camera, renderer);

    renderer.domElement.addEventListener('mousedown', () => {
        if (panel.classList.contains('active')) {
            panel.classList.remove('active');
        }
    });
    document.addEventListener('mousedown', (e) => Interaction.onMouseDown(e));
    document.addEventListener('mousemove', (e) => Interaction.onMouseMove(e));
    document.addEventListener('mouseup', () => Interaction.onMouseUp());
    // document.addEventListener('wheel', (e) => Interaction.onWheel(e), { passive: false });
    // document.addEventListener('contextmenu', (e) => e.preventDefault()); // Disable right-click menu

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