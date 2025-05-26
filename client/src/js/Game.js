import * as THREE from 'three';
import DogModel from './DogModel.js';
import GrassField from './GrassField.js';
import PoopModel from './PoopModel.js';
import SoundManager from './SoundManager.js';

export default class Game {
  constructor(networkManager, playerId) {
    this.networkManager = networkManager;
    this.playerId = playerId;
    
    // Three.js core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.canvas = null;
    
    // Game objects
    this.players = new Map();
    this.grassField = null;
    this.localPlayer = null;
    this.poopModels = new Map(); // Store poop models by tile position
    this.soundManager = null;
    
    // Game state
    this.isGameStarted = false;
    this.gameData = null;
    
    // Controls
    this.keys = {};
    this.mouse = { x: 0, y: 0 };
    this.isPointerLocked = false;
    
    // Camera settings
    this.cameraDistance = 8;
    this.cameraHeight = 6;
    this.cameraAngle = 0;
    
    // Movement
    this.moveSpeed = 5;
    this.lastMoveUpdate = 0;
    this.moveUpdateInterval = 50; // Send position updates every 50ms
    
    // Cleanup action
    this.lastCleanupTime = 0;
    this.cleanupCooldown = 500; // 500ms cooldown between cleanups
    
    // Movement tracking for footstep sounds
    this.lastFootstepTime = 0;
    this.footstepInterval = 400; // Play footstep every 400ms when moving
  }

  initialize(gameData) {
    this.gameData = gameData;
    this.setupThreeJS();
    this.setupLighting();
    this.setupWorld();
    this.setupPlayers(gameData.players);
    this.setupControls();
    this.setupAudio();
    this.startGameLoop();
    
    console.log('🎮 Game initialized with data:', gameData);
  }

  setupThreeJS() {
    // Get canvas
    this.canvas = document.getElementById('gameCanvas');
    
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
    this.scene.fog = new THREE.Fog(0x87CEEB, 50, 100);
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 25);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    this.scene.add(directionalLight);
  }

  setupWorld() {
    // Create grass field
    this.grassField = new GrassField(50, 50);
    this.scene.add(this.grassField.mesh);
    
    // Add some decorative elements
    this.addDecorations();
  }

  addDecorations() {
    // Add some trees around the field
    const treeGeometry = new THREE.ConeGeometry(1, 4, 8);
    const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = 30;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      // Trunk
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.set(x, 1, z);
      trunk.castShadow = true;
      this.scene.add(trunk);
      
      // Tree top
      const tree = new THREE.Mesh(treeGeometry, treeMaterial);
      tree.position.set(x, 4, z);
      tree.castShadow = true;
      this.scene.add(tree);
    }
    
    // Add some rocks
    const rockGeometry = new THREE.DodecahedronGeometry(0.5);
    const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
    
    for (let i = 0; i < 12; i++) {
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(
        (Math.random() - 0.5) * 40,
        0.25,
        (Math.random() - 0.5) * 40
      );
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }

  setupPlayers(playersData) {
    playersData.forEach(playerData => {
      const dog = new DogModel(playerData.color);
      dog.position.copy(playerData.position);
      this.scene.add(dog.mesh);
      
      this.players.set(playerData.id, {
        dog,
        data: playerData
      });
      
      // Set local player
      if (playerData.id === this.playerId) {
        this.localPlayer = this.players.get(playerData.id);
        this.updateCamera();
      }
    });
  }

  setupControls() {
    // Keyboard controls
    document.addEventListener('keydown', e => this.onKeyDown(e));
    document.addEventListener('keyup', e => this.onKeyUp(e));
    
    // Mouse controls
    document.addEventListener('mousemove', e => this.onMouseMove(e));
    document.addEventListener('click', () => this.requestPointerLock());
    
    // Canvas focus
    this.canvas.addEventListener('click', () => {
      this.canvas.focus();
      console.log('🎯 Canvas focused');
    });
    
    // Make canvas focusable
    this.canvas.tabIndex = 0;
    this.canvas.style.outline = 'none';
    
    // Pointer lock
    document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
    
    console.log('🎮 Controls setup complete');
  }

  setupAudio() {
    this.soundManager = new SoundManager();
    console.log('🔊 Audio system initialized');
  }

  onKeyDown(event) {
    this.keys[event.code] = true;
    console.log('🎮 Key pressed:', event.code, 'Game started:', this.isGameStarted);
    
    // Cleanup action
    if (event.code === 'Space' && this.isGameStarted) {
      event.preventDefault();
      this.performCleanup();
    }
  }

  onKeyUp(event) {
    this.keys[event.code] = false;
  }

  onMouseMove(event) {
    if (this.isPointerLocked) {
      this.mouse.x += event.movementX * 0.002;
      this.mouse.y += event.movementY * 0.002;
      this.mouse.y = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.mouse.y));
    }
  }

  requestPointerLock() {
    if (this.isGameStarted) {
      this.canvas.requestPointerLock();
    }
  }

  onPointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.canvas;
  }

  performCleanup() {
    const now = Date.now();
    if (now - this.lastCleanupTime < this.cleanupCooldown) {
      return; // Still in cooldown
    }
    
    this.lastCleanupTime = now;
    
    if (this.localPlayer) {
      const { position } = this.localPlayer.dog;
      
      // Play poop sound
      if (this.soundManager) {
        this.soundManager.playPoopSound();
      }
      
      // Trigger dog cleanup animation
      if (this.localPlayer.dog.performCleanupAnimation) {
        this.localPlayer.dog.performCleanupAnimation();
      }
      
      this.networkManager.sendPlayerAction('cleanup', {
        x: position.x,
        y: position.y,
        z: position.z
      });
    }
  }

  updateMovement(deltaTime) {
    if (!this.localPlayer || !this.isGameStarted) {
      if (!this.localPlayer) console.log('❌ No local player');
      if (!this.isGameStarted) console.log('❌ Game not started');
      return;
    }
    
    const { dog } = this.localPlayer;
    const moveVector = new THREE.Vector3();
    
    // Calculate movement direction
    if (this.keys['KeyW'] || this.keys['ArrowUp']) {
      moveVector.z -= 1;
      console.log('🏃 Moving forward');
    }
    if (this.keys['KeyS'] || this.keys['ArrowDown']) {
      moveVector.z += 1;
      console.log('🏃 Moving backward');
    }
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
      moveVector.x -= 1;
      console.log('🏃 Moving left');
    }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) {
      moveVector.x += 1;
      console.log('🏃 Moving right');
    }
    
    if (moveVector.length() > 0) {
      moveVector.normalize();
      
      // Apply camera rotation to movement
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0;
      cameraDirection.normalize();
      
      const right = new THREE.Vector3();
      right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
      
      const finalDirection = new THREE.Vector3();
      finalDirection.addScaledVector(cameraDirection, -moveVector.z);
      finalDirection.addScaledVector(right, moveVector.x);
      finalDirection.normalize();
      
      // Move the dog
      const moveDistance = this.moveSpeed * deltaTime;
      dog.position.addScaledVector(finalDirection, moveDistance);
      
      // Keep within bounds
      const bounds = 24; // Slightly smaller than world size
      dog.position.x = Math.max(-bounds, Math.min(bounds, dog.position.x));
      dog.position.z = Math.max(-bounds, Math.min(bounds, dog.position.z));
      
      // Rotate dog to face movement direction
      dog.rotation.y = Math.atan2(finalDirection.x, finalDirection.z);
      
      // Get current time for sound and network updates
      const now = Date.now();
      
      // Play footstep sounds
      if (this.soundManager && now - this.lastFootstepTime > this.footstepInterval) {
        this.soundManager.playFootstepSound();
        this.lastFootstepTime = now;
      }
      
      // Send position update
      if (now - this.lastMoveUpdate > this.moveUpdateInterval) {
        this.networkManager.sendPlayerMove(
          {
            x: dog.position.x,
            y: dog.position.y,
            z: dog.position.z
          },
          {
            x: dog.rotation.x,
            y: dog.rotation.y,
            z: dog.rotation.z
          }
        );
        this.lastMoveUpdate = now;
      }
    }
  }

  updateCamera() {
    if (!this.localPlayer) return;
    
    const { dog } = this.localPlayer;
    
    // Third-person camera
    const cameraOffset = new THREE.Vector3(
      Math.sin(this.mouse.x) * this.cameraDistance,
      this.cameraHeight + Math.sin(this.mouse.y) * 3,
      Math.cos(this.mouse.x) * this.cameraDistance
    );
    
    this.camera.position.copy(dog.position).add(cameraOffset);
    this.camera.lookAt(dog.position);
  }

  updateRemotePlayer(playerId, position, rotation) {
    const player = this.players.get(playerId);
    if (player && player.dog) {
      player.dog.position.set(position.x, position.y, position.z);
      player.dog.rotation.set(rotation.x, rotation.y, rotation.z);
    }
  }

  updateGrass(position, color, wasStolen = false) {
    if (this.grassField) {
      this.grassField.colorTile(position.x, position.z, color);
      
      // Add poop model at this position
      this.addPoopModel(position, color);
      
      // Play appropriate sound effect
      if (this.soundManager) {
        if (wasStolen) {
          this.soundManager.playStealSound();
        } else {
          this.soundManager.playSuccessSound();
        }
      }
    }
  }

  addPoopModel(tilePosition, color) {
    const tileKey = `${tilePosition.x},${tilePosition.z}`;
    
    // Remove existing poop model if it exists
    if (this.poopModels.has(tileKey)) {
      const existingPoop = this.poopModels.get(tileKey);
      this.scene.remove(existingPoop.mesh);
      existingPoop.dispose();
      this.poopModels.delete(tileKey);
    }
    
    // Create new poop model
    const poopSize = 0.8 + Math.random() * 0.4; // Random size between 0.8 and 1.2
    const poop = new PoopModel(color, poopSize);
    
    // Position the poop at the center of the tile
    const worldX = tilePosition.x;
    const worldZ = tilePosition.z;
    poop.setPosition(worldX, 0.1, worldZ);
    
    // Add to scene and store reference
    this.scene.add(poop.mesh);
    this.poopModels.set(tileKey, poop);
    
    // Animate the poop appearance
    poop.animateAppearance();
  }

  startGame() {
    this.isGameStarted = true;
    console.log('🚀 Game started! Controls should now work.');
    console.log('🎮 Local player:', this.localPlayer ? 'Found' : 'Not found');
    console.log('🎮 Keys object:', this.keys);
    
    // Start ambient sounds
    if (this.soundManager) {
      this.soundManager.startAmbientSound();
    }
    
    // Test if controls are working by forcing movement for 2 seconds
    setTimeout(() => {
      console.log('🧪 Testing movement - simulating W key press');
      this.keys['KeyW'] = true;
      setTimeout(() => {
        this.keys['KeyW'] = false;
        console.log('🧪 Movement test complete');
      }, 2000);
    }, 1000);
  }

  startGameLoop() {
    let lastTime = 0;
    
    const gameLoop = currentTime => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      this.updateMovement(deltaTime);
      this.updateCamera();
      
      // Update dog animations
      this.players.forEach(player => {
        if (player.dog.update) {
          player.dog.update(deltaTime);
        }
      });
      
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(gameLoop);
    };
    
    requestAnimationFrame(gameLoop);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  destroy() {
    // Clean up poop models
    this.poopModels.forEach(poop => {
      this.scene.remove(poop.mesh);
      poop.dispose();
    });
    this.poopModels.clear();
    
    // Clean up sound manager
    if (this.soundManager) {
      this.soundManager.dispose();
    }
    
    // Clean up Three.js resources
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    // Remove event listeners
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('resize', this.onWindowResize);
    
    console.log('🗑️ Game destroyed');
  }
}
