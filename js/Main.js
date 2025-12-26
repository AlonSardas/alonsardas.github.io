import * as THREE from 'three';
import { UI } from './UIManager.js';
import { DesignMode } from './DesignMode.js';
import { Interaction } from './Interaction.js';
import { FoldingMode } from './FoldingMode.js';

// ============================================
// INFO PANEL TOGGLE
// ============================================
const infoBtn = document.getElementById('info-btn');
const closeInfoBtn = document.getElementById('close-info-btn');
const panel = document.getElementById('info-panel');

infoBtn.addEventListener('click', () => {
    panel.classList.toggle('active');
});

closeInfoBtn.addEventListener('click', () => {
    panel.classList.remove('active');
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
const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
scene.add(ambientLight);
const sunLight1 = new THREE.DirectionalLight(0xffffff, 2.5);
sunLight1.position.set(-10, 20, -10);
// scene.add(sunLight1);

const sunLight2 = new THREE.DirectionalLight(0xffffff, 2.5);
sunLight2.position.set(10, 5, 10);
// sunLight2.castShadow = true;

// sunLight2.shadow.camera.top = 10;
// sunLight2.shadow.camera.bottom = -10;
// sunLight2.shadow.camera.left = -10;
// sunLight2.shadow.camera.right = 10;
// sunLight2.shadow.mapSize.set(1024, 1024); // Quality of the shadow

scene.add(sunLight2);
// renderer.shadowMap.enabled = true
// renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ============================================
// INITIALIZATION & ANIMATION
// ============================================
function init() {
    DesignMode.init(scene);
    UI.init(scene, camera);
    UI.generateMiuraBoundary();
    const msg = document.getElementById('message');
    msg.style.display = 'none';

    Interaction.init(scene, camera, renderer);

    renderer.domElement.addEventListener('mousedown', () => {
        if (panel.classList.contains('active')) {
            panel.classList.remove('active');
        }
    });
    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', (e) => Interaction.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => Interaction.onMouseMove(e));
    canvas.addEventListener('mouseup', () => Interaction.onMouseUp());

    // Touch events for mobile devices
    canvas.addEventListener('touchstart', (e) => handleTouch(e, (ev) => Interaction.onMouseDown(ev)), { passive: false });
    canvas.addEventListener('touchmove', (e) => handleTouch(e, (ev) => Interaction.onMouseMove(ev)), { passive: false });
    canvas.addEventListener('touchend', () => Interaction.onMouseUp());

    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    }, false);

    function handleTouch(e, mouseFunction) {

        if (e.touches.length > 0) {
            const touch = e.touches[0];

            const simulatedEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                target: e.target,
                preventDefault: () => e.preventDefault()
            };
            e.preventDefault();

            mouseFunction(simulatedEvent);
        }
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        FoldingMode.onResize(window.innerWidth, window.innerHeight);
    });
}

function animate() {
    requestAnimationFrame(animate);
    Interaction.update();
    renderer.render(scene, camera);
}

init();
animate();