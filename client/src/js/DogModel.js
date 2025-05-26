import * as THREE from 'three';

export default class DogModel {
  constructor(color = '#8B4513') {
    this.color = color;
    this.mesh = new THREE.Group();
    this.animationTime = 0;
    this.isMoving = false;
    this.lastPosition = new THREE.Vector3();
    
    this.createDogGeometry();
    this.setupAnimations();
  }

  createDogGeometry() {
    // Dog body (main torso)
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 3);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: this.color });
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.position.set(0, 1, 0);
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.mesh.add(this.body);

    // Dog head
    const headGeometry = new THREE.BoxGeometry(1.2, 1, 1.5);
    const headMaterial = new THREE.MeshLambertMaterial({ color: this.color });
    this.head = new THREE.Mesh(headGeometry, headMaterial);
    this.head.position.set(0, 1.5, 1.8);
    this.head.castShadow = true;
    this.head.receiveShadow = true;
    this.mesh.add(this.head);

    // Dog snout
    const snoutGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.8);
    const snoutMaterial = new THREE.MeshLambertMaterial({ color: this.color });
    this.snout = new THREE.Mesh(snoutGeometry, snoutMaterial);
    this.snout.position.set(0, 1.3, 2.5);
    this.snout.castShadow = true;
    this.mesh.add(this.snout);

    // Dog ears
    const earGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.1);
    const earMaterial = new THREE.MeshLambertMaterial({ color: this.color });
    
    this.leftEar = new THREE.Mesh(earGeometry, earMaterial);
    this.leftEar.position.set(-0.4, 1.8, 1.6);
    this.leftEar.rotation.z = -0.3;
    this.leftEar.castShadow = true;
    this.mesh.add(this.leftEar);
    
    this.rightEar = new THREE.Mesh(earGeometry, earMaterial);
    this.rightEar.position.set(0.4, 1.8, 1.6);
    this.rightEar.rotation.z = 0.3;
    this.rightEar.castShadow = true;
    this.mesh.add(this.rightEar);

    // Dog eyes
    const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    
    this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    this.leftEye.position.set(-0.25, 1.6, 2.3);
    this.mesh.add(this.leftEye);
    
    this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    this.rightEye.position.set(0.25, 1.6, 2.3);
    this.mesh.add(this.rightEye);

    // Dog nose
    const noseGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const noseMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    this.nose = new THREE.Mesh(noseGeometry, noseMaterial);
    this.nose.position.set(0, 1.25, 2.9);
    this.mesh.add(this.nose);

    // Dog legs
    const legGeometry = new THREE.CylinderGeometry(0.15, 0.2, 1.5);
    const legMaterial = new THREE.MeshLambertMaterial({ color: this.color });
    
    this.legs = [];
    const legPositions = [
      { x: -0.6, z: 1 },   // Front left
      { x: 0.6, z: 1 },    // Front right
      { x: -0.6, z: -1 },  // Back left
      { x: 0.6, z: -1 }    // Back right
    ];
    
    legPositions.forEach((pos, _index) => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos.x, 0.25, pos.z);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.legs.push(leg);
      this.mesh.add(leg);
    });

    // Dog tail
    const tailGeometry = new THREE.CylinderGeometry(0.1, 0.15, 1.2);
    const tailMaterial = new THREE.MeshLambertMaterial({ color: this.color });
    this.tail = new THREE.Mesh(tailGeometry, tailMaterial);
    this.tail.position.set(0, 1.2, -1.8);
    this.tail.rotation.x = 0.5; // Tail pointing up
    this.tail.castShadow = true;
    this.mesh.add(this.tail);

    // Dog collar (optional decoration)
    const collarGeometry = new THREE.TorusGeometry(0.7, 0.1, 8, 16);
    const collarMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
    this.collar = new THREE.Mesh(collarGeometry, collarMaterial);
    this.collar.position.set(0, 1.2, 1.5);
    this.collar.rotation.x = Math.PI / 2;
    this.mesh.add(this.collar);

    // Set initial position
    this.mesh.position.y = 0.5;
  }

  setupAnimations() {
    // Store original positions for animation
    this.originalPositions = {
      legs: this.legs.map(leg => leg.position.clone()),
      tail: this.tail.rotation.clone(),
      head: this.head.rotation.clone()
    };
  }

  update(deltaTime) {
    this.animationTime += deltaTime;
    
    // Check if dog is moving
    const currentPosition = this.mesh.position.clone();
    this.isMoving = currentPosition.distanceTo(this.lastPosition) > 0.01;
    this.lastPosition.copy(currentPosition);
    
    if (this.isMoving) {
      this.animateWalking();
    } else {
      this.animateIdle();
    }
    
    // Tail wagging animation
    this.animateTail();
  }

  animateWalking() {
    const walkSpeed = 8;
    const walkTime = this.animationTime * walkSpeed;
    
    // Leg walking animation
    this.legs.forEach((leg, index) => {
      const legPhase = (index % 2) * Math.PI; // Opposite legs move together
      const bobAmount = 0.2;
      const bobOffset = Math.sin(walkTime + legPhase) * bobAmount;
      
      leg.position.y = this.originalPositions.legs[index].y + Math.abs(bobOffset);
      leg.rotation.x = Math.sin(walkTime + legPhase) * 0.3;
    });
    
    // Body bobbing
    this.body.position.y = 1 + Math.sin(walkTime * 2) * 0.05;
    
    // Head bobbing
    this.head.position.y = 1.5 + Math.sin(walkTime * 2) * 0.03;
    this.head.rotation.x = Math.sin(walkTime) * 0.1;
  }

  animateIdle() {
    const idleSpeed = 2;
    const idleTime = this.animationTime * idleSpeed;
    
    // Reset legs to original positions
    this.legs.forEach((leg, index) => {
      leg.position.copy(this.originalPositions.legs[index]);
      leg.rotation.x = 0;
    });
    
    // Gentle breathing animation
    this.body.scale.y = 1 + Math.sin(idleTime) * 0.02;
    
    // Subtle head movement
    this.head.rotation.y = Math.sin(idleTime * 0.5) * 0.1;
    this.head.rotation.x = Math.sin(idleTime * 0.3) * 0.05;
  }

  animateTail() {
    const tailSpeed = 6;
    const tailTime = this.animationTime * tailSpeed;
    
    // Tail wagging
    this.tail.rotation.z = Math.sin(tailTime) * 0.5;
    
    // More excited wagging when moving
    if (this.isMoving) {
      this.tail.rotation.z *= 1.5;
    }
  }

  // Cleanup action animation
  performCleanupAnimation() {
    // Quick squat animation
    const originalY = this.body.position.y;
    const squatAmount = 0.3;
    
    // Animate down
    const animateDown = () => {
      this.body.position.y = Math.max(originalY - squatAmount, originalY - squatAmount);
      this.head.position.y = 1.5 - squatAmount;
      
      // Animate back up after a short delay
      setTimeout(() => {
        this.body.position.y = originalY;
        this.head.position.y = 1.5;
      }, 200);
    };
    
    animateDown();
  }

  // Getters for position and rotation
  get position() {
    return this.mesh.position;
  }

  get rotation() {
    return this.mesh.rotation;
  }

  // Setters for position and rotation
  set position(pos) {
    this.mesh.position.copy(pos);
  }

  set rotation(rot) {
    this.mesh.rotation.copy(rot);
  }

  // Color change method
  changeColor(newColor) {
    this.color = newColor;
    
    // Update all dog parts with new color
    const dogParts = [this.body, this.head, this.snout, this.leftEar, this.rightEar, this.tail, ...this.legs];
    dogParts.forEach(part => {
      part.material.color.setHex(newColor);
    });
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
