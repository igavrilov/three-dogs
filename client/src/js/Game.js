import * as THREE from 'three';
import DogModel from './DogModel.js';
import GrassField from './GrassField.js';
import PoopModel from './PoopModel.js';
import BigPoopModel from './BigPoopModel.js';
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
    this.pendingCleanupCells = new Map(); // Collect cells for batch cleanup processing
    this.cleanupTimers = new Map(); // Timers for delayed cleanup processing
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
    this.scootingSpeed = 2.5; // Slower when scooting
    this.lastMoveUpdate = 0;
    this.moveUpdateInterval = 50; // Send position updates every 50ms
    
    // Cleanup action
    this.lastCleanupTime = 0;
    this.cleanupCooldown = 500; // 500ms cooldown between cleanups
    
    // Scooting mechanic
    this.isScooting = false;
    this.lastScootTime = 0;
    this.scootInterval = 200; // Color grass every 200ms while scooting
    
    // Movement tracking for footstep sounds
    this.lastFootstepTime = 0;
    this.footstepInterval = 400; // Play footstep every 400ms when moving
    
    // Skybox and clouds
    this.clouds = [];
    this.skyTime = 0;
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
    // Remove background color so skybox shows
    // Temporarily disable fog to ensure clouds and sun are visible
    // this.scene.fog = new THREE.Fog(0x87CEEB, 50, 300);
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      500
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
    // Create skybox with animated clouds and sun
    this.setupSkybox();
    
    // Create extended grass field that goes beyond the fence
    this.grassField = new GrassField(150, 150);
    this.scene.add(this.grassField.mesh);
    
    // Add fence around the play area
    this.createFence();
    
    // Add distant landscape beyond the fence
    this.createDistantLandscape();
    
    // Add some decorative elements within the play area
    this.addDecorations();
  }

  setupSkybox() {
    // Remove the plain color background
    this.scene.background = null;
    
    // Create a large sphere for the skybox
    const skyGeometry = new THREE.SphereGeometry(200, 32, 32);
    
    // Create gradient sky material
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },    // Bright blue
        bottomColor: { value: new THREE.Color(0x87CEEB) }, // Sky blue
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    
    const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(skybox);
    
    // Create the sun
    this.createSun();
    
    // Create animated clouds
    this.createClouds();
  }

  createSun() {
    // Create sun geometry - make it much larger and closer
    const sunGeometry = new THREE.SphereGeometry(3, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 1.0
    });
    
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    
    // Position the sun much further away and higher
    sun.position.set(80, 50, 60);
    this.scene.add(sun);
    
    console.log('🌞 Sun created at position:', sun.position);
    
    // Add sun glow effect
    const glowGeometry = new THREE.SphereGeometry(4, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.3
    });
    
    const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    sunGlow.position.copy(sun.position);
    this.scene.add(sunGlow);
    
    // Add a second sun that's visible on the horizon but further away
    const horizonSun = new THREE.Mesh(
      new THREE.SphereGeometry(3, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 1.0
      })
    );
    horizonSun.position.set(90, 15, 90); // On horizon, visible from current camera angle but much further
    this.scene.add(horizonSun);
    console.log('🌅 Horizon sun created at:', horizonSun.position);
  }

  createClouds() {
    // Create cloud texture using canvas
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Draw fluffy cloud shape
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.beginPath();
    
    // Create cloud-like shape with multiple circles
    const cloudCenters = [
      { x: 128, y: 128, r: 40 },
      { x: 100, y: 120, r: 35 },
      { x: 156, y: 120, r: 35 },
      { x: 128, y: 100, r: 30 },
      { x: 80, y: 140, r: 25 },
      { x: 176, y: 140, r: 25 }
    ];
    
    cloudCenters.forEach(center => {
      context.beginPath();
      context.arc(center.x, center.y, center.r, 0, Math.PI * 2);
      context.fill();
    });
    
    // Create texture from canvas
    const cloudTexture = new THREE.CanvasTexture(canvas);
    cloudTexture.wrapS = THREE.RepeatWrapping;
    cloudTexture.wrapT = THREE.RepeatWrapping;
    
    // Create cloud material - make it more visible
    const cloudMaterial = new THREE.MeshBasicMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.9,
      alphaTest: 0.1,
      side: THREE.DoubleSide
    });
    
    // Create fewer, larger, closer clouds for testing
    for (let i = 0; i < 6; i++) {
      const cloudGeometry = new THREE.PlaneGeometry(20 + Math.random() * 10, 10 + Math.random() * 5);
      const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial.clone());
      
      // Position clouds very close and low
      cloud.position.set(
        (Math.random() - 0.5) * 60,
        15 + Math.random() * 10,
        (Math.random() - 0.5) * 60
      );
      
      console.log(`☁️ Cloud ${i} created at position:`, cloud.position);
      
      // Rotate clouds to face down slightly
      cloud.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      cloud.rotation.z = Math.random() * Math.PI * 2;
      
      // Store initial position for animation
      cloud.userData = {
        initialX: cloud.position.x,
        speed: 0.5 + Math.random() * 1.0, // Random speed between 0.5 and 1.5
        direction: Math.random() * Math.PI * 2 // Random direction
      };
      
      this.clouds.push(cloud);
      this.scene.add(cloud);
    }
    
    // Add a simple test cloud (white box) to make sure we can see SOMETHING
    const testCloudGeometry = new THREE.BoxGeometry(5, 2, 3);
    const testCloudMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const testCloud = new THREE.Mesh(testCloudGeometry, testCloudMaterial);
    testCloud.position.set(10, 12, 5);
    this.scene.add(testCloud);
    console.log('🧪 Test cloud (white box) created at:', testCloud.position);
    
    // Add clouds visible from current camera angle (on the horizon)
    for (let i = 0; i < 3; i++) {
      const horizonCloud = new THREE.Mesh(
        new THREE.PlaneGeometry(15, 8),
        new THREE.MeshBasicMaterial({ 
          map: cloudTexture, 
          transparent: true, 
          opacity: 0.8,
          side: THREE.DoubleSide
        })
      );
      
      // Position clouds on the horizon where current camera can see them
      const angle = (i / 3) * Math.PI * 2;
      horizonCloud.position.set(
        Math.cos(angle) * 40,
        8, // Lower height, visible from current camera angle
        Math.sin(angle) * 40
      );
      
      // Rotate to face camera
      horizonCloud.lookAt(0, 0, 0);
      
      this.scene.add(horizonCloud);
      this.clouds.push(horizonCloud);
      console.log(`🌅 Horizon cloud ${i} created at:`, horizonCloud.position);
    }
  }

  createFence() {
    const fenceHeight = 1.5;
    const fencePostRadius = 0.1;
    const fenceDistance = 28; // Distance from center
    
    // Fence post material
    const postMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const railMaterial = new THREE.MeshLambertMaterial({ color: 0xA0522D });
    
    // Create square fence - 4 sides
    const corners = [
      { x: -fenceDistance, z: -fenceDistance },
      { x: fenceDistance, z: -fenceDistance },
      { x: fenceDistance, z: fenceDistance },
      { x: -fenceDistance, z: fenceDistance }
    ];
    
    for (let i = 0; i < 4; i++) {
      const corner1 = corners[i];
      const corner2 = corners[(i + 1) % 4];
      
      // Create fence posts at corners
      const postGeometry = new THREE.CylinderGeometry(fencePostRadius, fencePostRadius, fenceHeight);
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(corner1.x, fenceHeight / 2, corner1.z);
      post.castShadow = true;
      this.scene.add(post);
      
      // Create horizontal rails between posts
      const railLength = Math.sqrt((corner2.x - corner1.x) ** 2 + (corner2.z - corner1.z) ** 2);
      const railGeometry = new THREE.BoxGeometry(railLength, 0.1, 0.1);
      
      // Lower rail
      const lowerRail = new THREE.Mesh(railGeometry, railMaterial);
      lowerRail.position.set((corner1.x + corner2.x) / 2, fenceHeight * 0.3, (corner1.z + corner2.z) / 2);
      lowerRail.rotation.y = Math.atan2(corner2.z - corner1.z, corner2.x - corner1.x);
      lowerRail.castShadow = true;
      this.scene.add(lowerRail);
      
      // Upper rail
      const upperRail = new THREE.Mesh(railGeometry, railMaterial);
      upperRail.position.set((corner1.x + corner2.x) / 2, fenceHeight * 0.7, (corner1.z + corner2.z) / 2);
      upperRail.rotation.y = Math.atan2(corner2.z - corner1.z, corner2.x - corner1.x);
      upperRail.castShadow = true;
      this.scene.add(upperRail);
    }
  }

  createDistantLandscape() {
    // Create a distant river
    this.createRiver();
    
    // Create a distant house
    this.createHouse();
    
    // Create distant forest
    this.createDistantForest();
    
    // Create hills
    this.createHills();
    
    // Create distant fields
    this.createDistantFields();
    
    // Create a distant barn
    this.createBarn();
  }

  createRiver() {
    const riverGeometry = new THREE.PlaneGeometry(200, 8);
    const riverMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x4169E1,
      transparent: true,
      opacity: 0.8 
    });
    
    const river = new THREE.Mesh(riverGeometry, riverMaterial);
    river.rotation.x = -Math.PI / 2;
    river.position.set(60, 0.05, -40);
    river.receiveShadow = true;
    this.scene.add(river);
    
    console.log('🏊 River created');
  }

  createHouse() {
    // House base
    const houseGeometry = new THREE.BoxGeometry(8, 6, 10);
    const houseMaterial = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
    const house = new THREE.Mesh(houseGeometry, houseMaterial);
    house.position.set(-50, 3, 40);
    house.castShadow = true;
    this.scene.add(house);
    
    // Roof
    const roofGeometry = new THREE.ConeGeometry(7, 4, 4);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(-50, 8, 40);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.scene.add(roof);
    
    // Chimney
    const chimneyGeometry = new THREE.BoxGeometry(1, 3, 1);
    const chimneyMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
    const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
    chimney.position.set(-48, 9, 42);
    chimney.castShadow = true;
    this.scene.add(chimney);
    
    console.log('🏠 House created');
  }

  createDistantForest() {
    // Create a line of trees in the background
    for (let i = 0; i < 20; i++) {
      const treeHeight = 15 + Math.random() * 10;
      const treeRadius = 3 + Math.random() * 2;
      
      // Tree trunk
      const trunkGeometry = new THREE.CylinderGeometry(1, 1.5, treeHeight * 0.3);
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      
      // Tree foliage
      const foliageGeometry = new THREE.ConeGeometry(treeRadius, treeHeight * 0.7, 8);
      const foliageMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(0.3, 0.7, 0.3 + Math.random() * 0.2) 
      });
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      
      // Position trees in the distance
      const x = -80 + i * 8 + (Math.random() - 0.5) * 4;
      const z = 70 + (Math.random() - 0.5) * 20;
      
      trunk.position.set(x, treeHeight * 0.15, z);
      foliage.position.set(x, treeHeight * 0.5, z);
      
      trunk.castShadow = true;
      foliage.castShadow = true;
      
      this.scene.add(trunk);
      this.scene.add(foliage);
    }
    
    console.log('🌲 Distant forest created');
  }

  createHills() {
    // Create rolling hills in the background
    for (let i = 0; i < 5; i++) {
      const hillGeometry = new THREE.SphereGeometry(20 + Math.random() * 15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const hillMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(0.25, 0.6, 0.4 + Math.random() * 0.2) 
      });
      const hill = new THREE.Mesh(hillGeometry, hillMaterial);
      
      hill.position.set(
        (Math.random() - 0.5) * 200,
        -5,
        80 + Math.random() * 40
      );
      hill.receiveShadow = true;
      this.scene.add(hill);
    }
    
    console.log('⛰️ Hills created');
  }

  createDistantFields() {
    // Create different colored field patches
    const fieldColors = [0x90EE90, 0xFFFF99, 0xDEB887, 0x98FB98];
    
    for (let i = 0; i < 8; i++) {
      const fieldGeometry = new THREE.PlaneGeometry(
        15 + Math.random() * 10,
        15 + Math.random() * 10
      );
      const fieldMaterial = new THREE.MeshLambertMaterial({ 
        color: fieldColors[Math.floor(Math.random() * fieldColors.length)] 
      });
      const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
      
      field.rotation.x = -Math.PI / 2;
      field.position.set(
        (Math.random() - 0.5) * 120,
        0.02,
        50 + Math.random() * 30
      );
      field.receiveShadow = true;
      this.scene.add(field);
    }
    
    console.log('🌾 Distant fields created');
  }

  createBarn() {
    // Barn base
    const barnGeometry = new THREE.BoxGeometry(12, 8, 8);
    const barnMaterial = new THREE.MeshLambertMaterial({ color: 0xB22222 });
    const barn = new THREE.Mesh(barnGeometry, barnMaterial);
    barn.position.set(45, 4, 55);
    barn.castShadow = true;
    this.scene.add(barn);
    
    // Barn roof
    const roofGeometry = new THREE.BoxGeometry(14, 3, 10);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(45, 9.5, 55);
    roof.castShadow = true;
    this.scene.add(roof);
    
    console.log('🚜 Barn created');
  }

  addDecorations() {
    // Add some small decorative elements within the fenced area
    const decorations = [
      { type: 'rock', count: 8 },
      { type: 'flower', count: 12 },
      { type: 'bush', count: 6 }
    ];
    
    decorations.forEach(({ type, count }) => {
      for (let i = 0; i < count; i++) {
        let decoration;
        
        switch (type) {
          case 'rock':
            decoration = new THREE.Mesh(
              new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.3),
              new THREE.MeshLambertMaterial({ color: 0x696969 })
            );
            break;
            
          case 'flower':
            decoration = new THREE.Mesh(
              new THREE.SphereGeometry(0.2, 8, 8),
              new THREE.MeshLambertMaterial({ 
                color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6) 
              })
            );
            break;
            
          case 'bush':
            decoration = new THREE.Mesh(
              new THREE.SphereGeometry(0.8 + Math.random() * 0.4, 8, 8),
              new THREE.MeshLambertMaterial({ color: 0x228B22 })
            );
            break;
        }
        
        // Position within the fenced area
        decoration.position.set(
          (Math.random() - 0.5) * 50,
          decoration.geometry.parameters?.radius || 0.3,
          (Math.random() - 0.5) * 50
        );
        
        decoration.castShadow = true;
        decoration.receiveShadow = true;
        this.scene.add(decoration);
      }
    });
    
    console.log('🌸 Decorations added within fence');
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
    
    // Cleanup action (regular poop - 4 cells)
    if (event.code === 'Space' && this.isGameStarted) {
      event.preventDefault();
      this.performCleanup();
    }
    
    // Toggle scooting mode
    if (event.code === 'ShiftLeft' && this.isGameStarted) {
      event.preventDefault();
      this.toggleScooting();
    }
  }

  onKeyUp(event) {
    this.keys[event.code] = false;
    
    // Stop scooting when shift is released
    if (event.code === 'ShiftLeft') {
      this.stopScooting();
    }
  }

  onMouseMove(event) {
    if (this.isPointerLocked) {
      this.mouse.x += event.movementX * 0.002;
      this.mouse.y += event.movementY * 0.002;
      // Allow looking almost straight up and down to see the sky
      this.mouse.y = Math.max(-Math.PI / 2 * 0.9, Math.min(Math.PI / 2 * 0.9, this.mouse.y));
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
      
      // Send regular cleanup action (4 cells)
      this.networkManager.sendPlayerAction('cleanup', {
        x: position.x,
        y: position.y,
        z: position.z
      });
    }
  }

  toggleScooting() {
    this.isScooting = !this.isScooting;
    console.log('🛷 Scooting mode:', this.isScooting ? 'ON' : 'OFF');
    
    // Visual feedback
    if (this.localPlayer && this.localPlayer.dog.setScootingMode) {
      this.localPlayer.dog.setScootingMode(this.isScooting);
    }
    
    // Update UI indicator
    this.updateScootingIndicator();
  }

  stopScooting() {
    if (this.isScooting) {
      this.isScooting = false;
      console.log('🛷 Stopped scooting');
      
      // Visual feedback
      if (this.localPlayer && this.localPlayer.dog.setScootingMode) {
        this.localPlayer.dog.setScootingMode(false);
      }
      
      // Update UI indicator
      this.updateScootingIndicator();
    }
  }

  updateScootingIndicator() {
    const indicator = document.getElementById('scootingIndicator');
    if (indicator) {
      if (this.isScooting) {
        indicator.classList.remove('hidden');
      } else {
        indicator.classList.add('hidden');
      }
    }
  }

  performScootAction() {
    const now = Date.now();
    if (now - this.lastScootTime < this.scootInterval) {
      return; // Too soon to scoot again
    }
    
    this.lastScootTime = now;
    
    if (this.localPlayer) {
      const { position } = this.localPlayer.dog;
      
      // Send scooting action (1 cell)
      this.networkManager.sendPlayerAction('scoot', {
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
      
      // Move the dog (use different speed based on scooting state)
      const currentSpeed = this.isScooting ? this.scootingSpeed : this.moveSpeed;
      const moveDistance = currentSpeed * deltaTime;
      dog.position.addScaledVector(finalDirection, moveDistance);
      
      // If scooting and moving, perform scoot action
      if (this.isScooting) {
        this.performScootAction();
      }
      
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
          },
          this.isScooting
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

  updateSky(deltaTime) {
    this.skyTime += deltaTime;
    
    // Animate clouds
    this.clouds.forEach(cloud => {
      const userData = cloud.userData;
      
      // Move clouds in their assigned direction
      cloud.position.x += Math.cos(userData.direction) * userData.speed * deltaTime;
      cloud.position.z += Math.sin(userData.direction) * userData.speed * deltaTime;
      
      // Wrap clouds around the world (when they move too far, bring them back)
      const maxDistance = 40;
      if (cloud.position.x > maxDistance) cloud.position.x = -maxDistance;
      if (cloud.position.x < -maxDistance) cloud.position.x = maxDistance;
      if (cloud.position.z > maxDistance) cloud.position.z = -maxDistance;
      if (cloud.position.z < -maxDistance) cloud.position.z = maxDistance;
      
      // Add subtle vertical bobbing
      cloud.position.y = 15 + Math.sin(this.skyTime * 0.3 + cloud.position.x * 0.01) * 2;
      
      // Slowly rotate clouds
      cloud.rotation.z += deltaTime * 0.05;
    });
  }

  updateRemotePlayer(playerId, position, rotation, isScooting = false) {
    const player = this.players.get(playerId);
    if (player && player.dog) {
      player.dog.position.set(position.x, position.y, position.z);
      player.dog.rotation.set(rotation.x, rotation.y, rotation.z);
      
      // Update scooting state for remote players
      if (player.dog.setScootingMode) {
        player.dog.setScootingMode(isScooting);
      }
    }
  }

  updateGrass(position, color, wasStolen = false, actionType = 'cleanup') {
    if (this.grassField) {
      this.grassField.colorTile(position.x, position.z, color);
      
      // Handle poop creation based on action type
      if (actionType === 'cleanup') {
        this.handleCleanupCell(position, color);
      }
      // For scooting, no poop models are created
      
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

  handleCleanupCell(position, color) {
    // Calculate the 2x2 area that this cell belongs to
    const areaX = Math.floor(position.x / 2) * 2;
    const areaZ = Math.floor(position.z / 2) * 2;
    const areaKey = `${areaX},${areaZ}`;
    
    // Initialize or update the pending cleanup for this area
    if (!this.pendingCleanupCells.has(areaKey)) {
      this.pendingCleanupCells.set(areaKey, {
        cells: new Set(),
        color: color,
        areaX: areaX,
        areaZ: areaZ
      });
    }
    
    const cleanupData = this.pendingCleanupCells.get(areaKey);
    cleanupData.cells.add(`${position.x},${position.z}`);
    
    // Clear any existing timer for this area
    if (this.cleanupTimers.has(areaKey)) {
      clearTimeout(this.cleanupTimers.get(areaKey));
    }
    
    // Set a short delay to collect all 4 cells before creating the poop
    const timer = setTimeout(() => {
      this.processCleanupArea(areaKey);
    }, 100); // 100ms delay to collect all cells
    
    this.cleanupTimers.set(areaKey, timer);
  }

  processCleanupArea(areaKey) {
    const cleanupData = this.pendingCleanupCells.get(areaKey);
    if (!cleanupData) return;
    
    // Check if we have multiple cells (indicating a 4-cell cleanup)
    if (cleanupData.cells.size >= 2) {
      // Create one big poop for the area
      this.createBigPoop(cleanupData.areaX, cleanupData.areaZ, cleanupData.color);
    } else {
      // Single cell - create small poop (for edge cases)
      const cellKey = Array.from(cleanupData.cells)[0];
      const [x, z] = cellKey.split(',').map(Number);
      this.createSmallPoop(x, z, cleanupData.color);
    }
    
    // Clean up
    this.pendingCleanupCells.delete(areaKey);
    this.cleanupTimers.delete(areaKey);
  }

  createBigPoop(areaX, areaZ, color) {
    const centerX = areaX + 1.0;
    const centerZ = areaZ + 1.0;
    const poopKey = `big_${centerX},${centerZ}`;
    
    // Remove any existing poops in this area
    this.removePoopsInArea(areaX, areaZ);
    
    // Create the big poop model
    const bigPoop = new BigPoopModel(color);
    bigPoop.setPosition(centerX, 0.1, centerZ);
    
    // Add to scene and store
    this.scene.add(bigPoop.mesh);
    this.poopModels.set(poopKey, bigPoop);
    
    // Animate appearance
    bigPoop.animateAppearance();
  }

  createSmallPoop(x, z, color) {
    const poopKey = `${x},${z}`;
    
    // Remove existing poop if it exists
    if (this.poopModels.has(poopKey)) {
      const existingPoop = this.poopModels.get(poopKey);
      this.scene.remove(existingPoop.mesh);
      existingPoop.dispose();
      this.poopModels.delete(poopKey);
    }
    
    // Create small poop model
    const poop = new PoopModel(color, 0.8 + Math.random() * 0.4);
    poop.setPosition(x, 0.1, z);
    
    // Add to scene and store
    this.scene.add(poop.mesh);
    this.poopModels.set(poopKey, poop);
    
    // Animate appearance
    poop.animateAppearance();
  }

  removePoopsInArea(areaX, areaZ) {
    // Remove any existing poops in the 2x2 area
    const positions = [
      { x: areaX, z: areaZ },
      { x: areaX + 1, z: areaZ },
      { x: areaX, z: areaZ + 1 },
      { x: areaX + 1, z: areaZ + 1 }
    ];
    
    positions.forEach(pos => {
      const key = `${pos.x},${pos.z}`;
      if (this.poopModels.has(key)) {
        const existingPoop = this.poopModels.get(key);
        this.scene.remove(existingPoop.mesh);
        existingPoop.dispose();
        this.poopModels.delete(key);
      }
    });
    
    // Also remove any existing big poop for this area
    const centerX = areaX + 1.0;
    const centerZ = areaZ + 1.0;
    const bigPoopKey = `big_${centerX},${centerZ}`;
    if (this.poopModels.has(bigPoopKey)) {
      const existingPoop = this.poopModels.get(bigPoopKey);
      this.scene.remove(existingPoop.mesh);
      existingPoop.dispose();
      this.poopModels.delete(bigPoopKey);
    }
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
  }

  startGameLoop() {
    let lastTime = 0;
    
    const gameLoop = currentTime => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      this.updateMovement(deltaTime);
      this.updateCamera();
      this.updateSky(deltaTime);
      
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
    // Clean up timers
    this.cleanupTimers.forEach(timer => clearTimeout(timer));
    this.cleanupTimers.clear();
    this.pendingCleanupCells.clear();
    
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
