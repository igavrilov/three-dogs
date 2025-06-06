export default class MobileControls {
  constructor(game) {
    this.game = game;
    this.isMobile = this.detectMobile();
    
    // Virtual joystick state
    this.joystickActive = false;
    this.joystickCenter = { x: 0, y: 0 };
    this.joystickPosition = { x: 0, y: 0 };
    this.joystickRadius = 50;
    
    // Touch tracking
    this.activeTouches = new Map();
    this.cameraTouch = null;
    this.lastCameraMove = { x: 0, y: 0 };
    
    // Mobile state
    this.isScootingActive = false;
    
    if (this.isMobile) {
      this.initializeMobileControls();
    }
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  }

  initializeMobileControls() {
    // Get mobile control elements
    this.joystick = document.getElementById('mobileJoystick');
    this.joystickThumb = document.getElementById('mobileJoystickThumb');
    this.scootBtn = document.getElementById('mobileScootBtn');
    this.poopBtn = document.getElementById('mobilePoopBtn');
    this.cameraArea = document.getElementById('mobileCameraArea');
    
    if (!this.joystick || !this.scootBtn || !this.poopBtn || !this.cameraArea) {
      console.error('Mobile control elements not found');
      return;
    }

    // Initialize joystick
    this.setupVirtualJoystick();
    
    // Initialize action buttons
    this.setupActionButtons();
    
    // Initialize camera controls
    this.setupCameraControls();
    
    // Prevent context menu and selection on mobile
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());
    
    console.log('📱 Mobile controls initialized');
  }

  setupVirtualJoystick() {
    const rect = this.joystick.getBoundingClientRect();
    this.joystickCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    // Touch start
    this.joystick.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.joystickActive = true;
      const touch = e.touches[0];
      this.activeTouches.set('joystick', touch.identifier);
      this.updateJoystickPosition(touch);
    });

    // Touch move
    document.addEventListener('touchmove', (e) => {
      if (!this.joystickActive) return;
      
      for (const touch of e.touches) {
        if (this.activeTouches.get('joystick') === touch.identifier) {
          e.preventDefault();
          this.updateJoystickPosition(touch);
          break;
        }
      }
    });

    // Touch end
    document.addEventListener('touchend', (e) => {
      for (const touch of e.changedTouches) {
        if (this.activeTouches.get('joystick') === touch.identifier) {
          this.joystickActive = false;
          this.activeTouches.delete('joystick');
          this.resetJoystick();
          break;
        }
      }
    });
  }

  updateJoystickPosition(touch) {
    const deltaX = touch.clientX - this.joystickCenter.x;
    const deltaY = touch.clientY - this.joystickCenter.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance <= this.joystickRadius) {
      this.joystickPosition.x = deltaX;
      this.joystickPosition.y = deltaY;
    } else {
      const angle = Math.atan2(deltaY, deltaX);
      this.joystickPosition.x = Math.cos(angle) * this.joystickRadius;
      this.joystickPosition.y = Math.sin(angle) * this.joystickRadius;
    }
    
    // Update visual position
    this.joystickThumb.style.transform = 
      `translate(calc(-50% + ${this.joystickPosition.x}px), calc(-50% + ${this.joystickPosition.y}px))`;
    
    // Convert to movement input
    this.updateMovementInput();
  }

  resetJoystick() {
    this.joystickPosition = { x: 0, y: 0 };
    this.joystickThumb.style.transform = 'translate(-50%, -50%)';
    this.clearMovementInput();
  }

  updateMovementInput() {
    if (!this.game.keys) return;
    
    const deadzone = 0.3;
    const normalizedX = this.joystickPosition.x / this.joystickRadius;
    const normalizedY = this.joystickPosition.y / this.joystickRadius;
    
    // Clear previous input
    this.clearMovementInput();
    
    // Set new input based on joystick position
    if (Math.abs(normalizedX) > deadzone) {
      if (normalizedX > 0) {
        this.game.keys['KeyD'] = true; // Right
      } else {
        this.game.keys['KeyA'] = true; // Left
      }
    }
    
    if (Math.abs(normalizedY) > deadzone) {
      if (normalizedY > 0) {
        this.game.keys['KeyS'] = true; // Down (backward)
      } else {
        this.game.keys['KeyW'] = true; // Up (forward)
      }
    }
  }

  clearMovementInput() {
    if (!this.game.keys) return;
    
    this.game.keys['KeyW'] = false;
    this.game.keys['KeyA'] = false;
    this.game.keys['KeyS'] = false;
    this.game.keys['KeyD'] = false;
  }

  setupActionButtons() {
    // Poop button
    this.poopBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.game.performCleanup();
      this.poopBtn.style.transform = 'scale(0.9)';
    });

    this.poopBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.poopBtn.style.transform = 'scale(1)';
    });

    // Scoot button (toggle)
    this.scootBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.toggleScooting();
      this.scootBtn.style.transform = 'scale(0.9)';
    });

    this.scootBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.scootBtn.style.transform = 'scale(1)';
    });
  }

  toggleScooting() {
    this.isScootingActive = !this.isScootingActive;
    
    if (this.isScootingActive) {
      this.game.keys['ShiftLeft'] = true;
      this.scootBtn.classList.add('scoot-active');
    } else {
      this.game.keys['ShiftLeft'] = false;
      this.scootBtn.classList.remove('scoot-active');
    }
    
    // Trigger the game's scooting toggle
    if (this.game.toggleScooting) {
      this.game.isScooting = this.isScootingActive;
      this.game.updateScootingIndicator();
      
      // Update dog animation
      if (this.game.localPlayer && this.game.localPlayer.dog.setScootingMode) {
        this.game.localPlayer.dog.setScootingMode(this.isScootingActive);
      }
    }
  }

  setupCameraControls() {
    let lastTouchTime = 0;
    
    this.cameraArea.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        this.cameraTouch = {
          identifier: touch.identifier,
          startX: touch.clientX,
          startY: touch.clientY,
          lastX: touch.clientX,
          lastY: touch.clientY
        };
        
        // Double tap for pointer lock (if supported)
        const now = Date.now();
        if (now - lastTouchTime < 300) {
          this.game.requestPointerLock();
        }
        lastTouchTime = now;
      }
    });

    this.cameraArea.addEventListener('touchmove', (e) => {
      if (this.cameraTouch && e.touches.length === 1) {
        e.preventDefault();
        
        for (const touch of e.touches) {
          if (touch.identifier === this.cameraTouch.identifier) {
            const deltaX = touch.clientX - this.cameraTouch.lastX;
            const deltaY = touch.clientY - this.cameraTouch.lastY;
            
            // Update camera rotation (similar to mouse movement)
            if (this.game.mouse) {
              this.game.mouse.x += deltaX * 0.003; // Sensitivity adjustment
              this.game.mouse.y += deltaY * 0.003;
              
              // Clamp vertical rotation
              this.game.mouse.y = Math.max(-Math.PI / 2 * 0.9, Math.min(Math.PI / 2 * 0.9, this.game.mouse.y));
            }
            
            this.cameraTouch.lastX = touch.clientX;
            this.cameraTouch.lastY = touch.clientY;
            break;
          }
        }
      }
    });

    this.cameraArea.addEventListener('touchend', (e) => {
      if (this.cameraTouch) {
        for (const touch of e.changedTouches) {
          if (touch.identifier === this.cameraTouch.identifier) {
            this.cameraTouch = null;
            break;
          }
        }
      }
    });
  }

  // Update method called from game loop
  update(deltaTime) {
    if (!this.isMobile) return;
    
    // Update joystick center position (in case of orientation change)
    if (this.joystick) {
      const rect = this.joystick.getBoundingClientRect();
      this.joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
  }

  // Show/hide mobile controls
  showControls() {
    if (this.isMobile) {
      const mobileControls = document.getElementById('mobileControls');
      const mobileCameraArea = document.getElementById('mobileCameraArea');
      
      if (mobileControls) mobileControls.style.display = 'block';
      if (mobileCameraArea) mobileCameraArea.style.display = 'block';
    }
  }

  hideControls() {
    if (this.isMobile) {
      const mobileControls = document.getElementById('mobileControls');
      const mobileCameraArea = document.getElementById('mobileCameraArea');
      
      if (mobileControls) mobileControls.style.display = 'none';
      if (mobileCameraArea) mobileCameraArea.style.display = 'none';
    }
  }

  // Cleanup
  destroy() {
    this.clearMovementInput();
    this.activeTouches.clear();
    this.cameraTouch = null;
  }
} 