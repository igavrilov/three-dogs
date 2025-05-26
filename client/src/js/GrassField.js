import * as THREE from 'three';

export default class GrassField {
  constructor(width = 50, height = 50) {
    this.width = width;
    this.height = height;
    this.tileSize = 1;
    this.tilesX = Math.floor(width / this.tileSize);
    this.tilesZ = Math.floor(height / this.tileSize);
    
    // Store colored tiles
    this.coloredTiles = new Map();
    
    // Create the grass field
    this.createGrassField();
    this.createColoredTiles();
  }

  createGrassField() {
    // Base grass geometry
    const grassGeometry = new THREE.PlaneGeometry(this.width, this.height);
    grassGeometry.rotateX(-Math.PI / 2); // Rotate to be horizontal
    
    // Grass texture (procedural)
    const grassTexture = this.createGrassTexture();
    
    const grassMaterial = new THREE.MeshLambertMaterial({
      map: grassTexture,
      color: 0x4CAF50 // Green grass color
    });
    
    this.mesh = new THREE.Mesh(grassGeometry, grassMaterial);
    this.mesh.receiveShadow = true;
    this.mesh.position.set(0, 0, 0);
  }

  createGrassTexture() {
    // Create a simple procedural grass texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Base grass color
    context.fillStyle = '#4CAF50';
    context.fillRect(0, 0, 256, 256);
    
    // Add some grass blade patterns
    context.fillStyle = '#388E3C';
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const width = 1 + Math.random() * 2;
      const height = 2 + Math.random() * 4;
      
      context.fillRect(x, y, width, height);
    }
    
    // Add lighter grass highlights
    context.fillStyle = '#66BB6A';
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const width = 1;
      const height = 1 + Math.random() * 2;
      
      context.fillRect(x, y, width, height);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    
    return texture;
  }

  createColoredTiles() {
    // Create a group to hold all colored tiles
    this.coloredTilesGroup = new THREE.Group();
    this.mesh.add(this.coloredTilesGroup);
  }

  colorTile(tileX, tileZ, color) {
    const tileKey = `${tileX},${tileZ}`;
    
    // Remove existing tile if it exists
    if (this.coloredTiles.has(tileKey)) {
      const existingTile = this.coloredTiles.get(tileKey);
      this.coloredTilesGroup.remove(existingTile);
      existingTile.geometry.dispose();
      existingTile.material.dispose();
    }
    
    // Create new colored tile
    const tileGeometry = new THREE.PlaneGeometry(this.tileSize * 0.9, this.tileSize * 0.9);
    tileGeometry.rotateX(-Math.PI / 2);
    
    const tileMaterial = new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity: 0.8
    });
    
    const tileMesh = new THREE.Mesh(tileGeometry, tileMaterial);
    
    // Position the tile
    const worldX = tileX * this.tileSize;
    const worldZ = tileZ * this.tileSize;
    tileMesh.position.set(worldX, 0.01, worldZ); // Slightly above grass to avoid z-fighting
    
    // Add to scene and store reference
    this.coloredTilesGroup.add(tileMesh);
    this.coloredTiles.set(tileKey, tileMesh);
    
    // Add a subtle animation
    this.animateTileAppearance(tileMesh);
  }

  animateTileAppearance(tileMesh) {
    // Start with scale 0 and animate to full size
    tileMesh.scale.set(0, 1, 0);
    
    const startTime = Date.now();
    const duration = 300; // 300ms animation
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      tileMesh.scale.set(easeOut, 1, easeOut);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  getTilePosition(worldX, worldZ) {
    return {
      x: Math.floor(worldX / this.tileSize),
      z: Math.floor(worldZ / this.tileSize)
    };
  }

  isValidTilePosition(tileX, tileZ) {
    const halfTilesX = Math.floor(this.tilesX / 2);
    const halfTilesZ = Math.floor(this.tilesZ / 2);
    
    return tileX >= -halfTilesX && tileX < halfTilesX &&
           tileZ >= -halfTilesZ && tileZ < halfTilesZ;
  }

  clearTile(tileX, tileZ) {
    const tileKey = `${tileX},${tileZ}`;
    
    if (this.coloredTiles.has(tileKey)) {
      const tile = this.coloredTiles.get(tileKey);
      this.coloredTilesGroup.remove(tile);
      tile.geometry.dispose();
      tile.material.dispose();
      this.coloredTiles.delete(tileKey);
    }
  }

  clearAllTiles() {
    this.coloredTiles.forEach((tile, _key) => {
      this.coloredTilesGroup.remove(tile);
      tile.geometry.dispose();
      tile.material.dispose();
    });
    this.coloredTiles.clear();
  }

  getColoredTileCount(color) {
    let count = 0;
    this.coloredTiles.forEach(tile => {
      if (tile.material.color.getHexString() === color.replace('#', '')) {
        count++;
      }
    });
    return count;
  }

  getAllColoredTiles() {
    const tiles = [];
    this.coloredTiles.forEach((tile, key) => {
      const [x, z] = key.split(',').map(Number);
      tiles.push({
        x,
        z,
        color: `#${tile.material.color.getHexString()}`
      });
    });
    return tiles;
  }

  // Add some visual effects
  addGrassParticles(position, color) {
    // Create small particle effect when grass is colored
    const particleCount = 10;
    const particles = new THREE.Group();
    
    for (let i = 0; i < particleCount; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.02, 4, 4);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      
      // Random position around the tile
      particle.position.set(
        position.x + (Math.random() - 0.5) * 0.5,
        0.1,
        position.z + (Math.random() - 0.5) * 0.5
      );
      
      // Random velocity
      particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        Math.random() * 0.05 + 0.02,
        (Math.random() - 0.5) * 0.02
      );
      
      particles.add(particle);
    }
    
    this.mesh.add(particles);
    
    // Animate particles
    const startTime = Date.now();
    const duration = 1000; // 1 second
    
    const animateParticles = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      particles.children.forEach(particle => {
        particle.position.add(particle.userData.velocity);
        particle.userData.velocity.y -= 0.001; // Gravity
        particle.material.opacity = 0.8 * (1 - progress);
      });
      
      if (progress < 1) {
        requestAnimationFrame(animateParticles);
      } else {
        // Clean up particles
        particles.children.forEach(particle => {
          particle.geometry.dispose();
          particle.material.dispose();
        });
        this.mesh.remove(particles);
      }
    };
    
    animateParticles();
  }

  // Dispose method for cleanup
  dispose() {
    // Dispose of all colored tiles
    this.clearAllTiles();
    
    // Dispose of main grass mesh
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }
    if (this.mesh.material) {
      if (this.mesh.material.map) {
        this.mesh.material.map.dispose();
      }
      this.mesh.material.dispose();
    }
  }

  // Update method for any ongoing animations
  update(_deltaTime) {
    // Could add wind effects, grass swaying, etc.
    // For now, this is a placeholder for future enhancements
  }
}
