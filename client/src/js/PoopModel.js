import * as THREE from 'three';

export default class PoopModel {
  constructor(color = '#8B4513', size = 1) {
    this.color = color;
    this.size = size;
    this.mesh = new THREE.Group();
    
    this.createPoopGeometry();
  }

  createPoopGeometry() {
    // Create a realistic poop shape using multiple segments
    const segments = 3 + Math.floor(Math.random() * 3); // 3-5 segments
    
    for (let i = 0; i < segments; i++) {
      const segmentHeight = 0.3 + Math.random() * 0.4;
      const segmentRadius = 0.15 + Math.random() * 0.1;
      
      // Create slightly irregular cylinder for each segment
      const geometry = new THREE.CylinderGeometry(
        segmentRadius * 0.8, // top radius (slightly smaller)
        segmentRadius, // bottom radius
        segmentHeight,
        8, // radial segments
        1, // height segments
        false, // open ended
        0, // theta start
        Math.PI * 2 // theta length
      );
      
      // Add some irregularity to the vertices
      const vertices = geometry.attributes.position.array;
      for (let j = 0; j < vertices.length; j += 3) {
        vertices[j] += (Math.random() - 0.5) * 0.02; // x
        vertices[j + 2] += (Math.random() - 0.5) * 0.02; // z
      }
      geometry.attributes.position.needsUpdate = true;
      
      // Create material with slight color variation
      const colorVariation = 0.1;
      const baseColor = new THREE.Color(this.color);
      const r = Math.max(0, Math.min(1, baseColor.r + (Math.random() - 0.5) * colorVariation));
      const g = Math.max(0, Math.min(1, baseColor.g + (Math.random() - 0.5) * colorVariation));
      const b = Math.max(0, Math.min(1, baseColor.b + (Math.random() - 0.5) * colorVariation));
      
      const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color(r, g, b),
        roughness: 0.8,
        metalness: 0.1
      });
      
      const segment = new THREE.Mesh(geometry, material);
      
      // Position segments in a slightly curved pile
      const yOffset = i * segmentHeight * 0.7;
      const xOffset = (Math.random() - 0.5) * 0.1;
      const zOffset = (Math.random() - 0.5) * 0.1;
      
      segment.position.set(xOffset, yOffset, zOffset);
      segment.rotation.y = Math.random() * Math.PI * 2;
      segment.rotation.x = (Math.random() - 0.5) * 0.2;
      segment.rotation.z = (Math.random() - 0.5) * 0.2;
      
      segment.castShadow = true;
      segment.receiveShadow = true;
      
      this.mesh.add(segment);
    }
    
    // Add some small detail bumps
    this.addDetailBumps();
    
    // Scale the entire poop
    this.mesh.scale.setScalar(this.size);
    
    // Position slightly above ground
    this.mesh.position.y = 0.05;
  }

  addDetailBumps() {
    const bumpCount = 2 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < bumpCount; i++) {
      const bumpGeometry = new THREE.SphereGeometry(
        0.03 + Math.random() * 0.02,
        6,
        6
      );
      
      const bumpMaterial = new THREE.MeshLambertMaterial({
        color: this.color,
        roughness: 0.9
      });
      
      const bump = new THREE.Mesh(bumpGeometry, bumpMaterial);
      
      // Position bumps randomly on the surface
      bump.position.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.8,
        (Math.random() - 0.5) * 0.3
      );
      
      bump.castShadow = true;
      
      this.mesh.add(bump);
    }
  }

  // Animation for when poop appears
  animateAppearance() {
    // Start small and grow
    this.mesh.scale.setScalar(0.1);
    
    const startTime = Date.now();
    const duration = 300; // 300ms animation
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const scale = this.size * easeProgress;
      
      this.mesh.scale.setScalar(scale);
      
      // Add a little bounce at the end
      if (progress > 0.7) {
        const bounceProgress = (progress - 0.7) / 0.3;
        const bounce = Math.sin(bounceProgress * Math.PI * 2) * 0.1;
        this.mesh.scale.setScalar(scale + bounce);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  // Set position
  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
  }

  // Dispose method for cleanup
  dispose() {
    this.mesh.traverse(child => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
} 