import * as THREE from 'three';

export default class BigPoopModel {
  constructor(color = '#8B4513') {
    this.color = color;
    this.mesh = new THREE.Group();
    
    this.createBigPoopGeometry();
  }

  createBigPoopGeometry() {
    // Create a large, sprawling poop that covers 2x2 area
    const segments = 5 + Math.floor(Math.random() * 3); // 5-7 segments for bigger poop
    
    for (let i = 0; i < segments; i++) {
      const segmentHeight = 0.2 + Math.random() * 0.3; // Taller segments
      const segmentRadius = 0.2 + Math.random() * 0.15; // Larger radius
      
      // Create cylinder for each segment
      const geometry = new THREE.CylinderGeometry(
        segmentRadius * 0.8, // top radius
        segmentRadius, // bottom radius
        segmentHeight,
        12, // more radial segments for smoother look
        1, // height segments
        false, // open ended
        0, // theta start
        Math.PI * 2 // theta length
      );
      
      // Add irregularity to vertices
      const vertices = geometry.attributes.position.array;
      for (let j = 0; j < vertices.length; j += 3) {
        vertices[j] += (Math.random() - 0.5) * 0.04; // x
        vertices[j + 2] += (Math.random() - 0.5) * 0.04; // z
      }
      geometry.attributes.position.needsUpdate = true;
      
      // Create material with color variation
      const colorVariation = 0.15;
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
      
      // Spread segments across the 2x2 area
      const spreadRadius = 0.8; // Spread across ~2 units
      const angle = (i / segments) * Math.PI * 2 + Math.random() * 0.5;
      const distance = Math.random() * spreadRadius;
      
      const xOffset = Math.cos(angle) * distance;
      const zOffset = Math.sin(angle) * distance;
      const yOffset = i * segmentHeight * 0.4; // Less stacking, more spreading
      
      segment.position.set(xOffset, yOffset, zOffset);
      segment.rotation.y = Math.random() * Math.PI * 2;
      segment.rotation.x = (Math.random() - 0.5) * 0.3;
      segment.rotation.z = (Math.random() - 0.5) * 0.3;
      
      segment.castShadow = true;
      segment.receiveShadow = true;
      
      this.mesh.add(segment);
    }
    
    // Add extra detail bumps spread across the area
    this.addSpreadBumps();
    
    // Position slightly above ground
    this.mesh.position.y = 0.1;
  }

  addSpreadBumps() {
    const bumpCount = 8 + Math.floor(Math.random() * 6); // More bumps for bigger poop
    
    for (let i = 0; i < bumpCount; i++) {
      const bumpGeometry = new THREE.SphereGeometry(
        0.04 + Math.random() * 0.03,
        8,
        8
      );
      
      const bumpMaterial = new THREE.MeshLambertMaterial({
        color: this.color,
        roughness: 0.9
      });
      
      const bump = new THREE.Mesh(bumpGeometry, bumpMaterial);
      
      // Spread bumps across the 2x2 area
      const spreadRadius = 0.9;
      bump.position.set(
        (Math.random() - 0.5) * spreadRadius * 2,
        Math.random() * 0.6,
        (Math.random() - 0.5) * spreadRadius * 2
      );
      
      bump.castShadow = true;
      
      this.mesh.add(bump);
    }
  }

  // Animation for when big poop appears
  animateAppearance() {
    // Start small and grow with a more dramatic effect
    this.mesh.scale.setScalar(0.1);
    
    const startTime = Date.now();
    const duration = 500; // Longer animation for bigger poop
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out animation with bounce
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      let scale = easeProgress;
      
      // Add a bigger bounce effect
      if (progress > 0.6) {
        const bounceProgress = (progress - 0.6) / 0.4;
        const bounce = Math.sin(bounceProgress * Math.PI * 3) * 0.2 * (1 - bounceProgress);
        scale += bounce;
      }
      
      this.mesh.scale.setScalar(scale);
      
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