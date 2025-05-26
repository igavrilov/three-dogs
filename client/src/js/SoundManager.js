export default class SoundManager {
  constructor() {
    this.audioContext = null;
    this.sounds = new Map();
    this.masterVolume = 0.3;
    this.isEnabled = true;
    
    this.initializeAudioContext();
    this.createSounds();
  }

  async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume audio context on user interaction (required by browsers)
      const resumeAudio = () => {
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        document.removeEventListener('click', resumeAudio);
        document.removeEventListener('keydown', resumeAudio);
      };
      
      document.addEventListener('click', resumeAudio);
      document.addEventListener('keydown', resumeAudio);
      
      console.log('🔊 Audio context initialized');
    } catch (error) {
      console.warn('⚠️ Audio not supported:', error);
      this.isEnabled = false;
    }
  }

  createSounds() {
    if (!this.isEnabled) return;
    
    // Create procedural sound effects
    this.createPoopSound();
    this.createFootstepSound();
    this.createSuccessSound();
    this.createStealSound();
    this.createAmbientSound();
  }

  createPoopSound() {
    // Create a "plop" sound using oscillators
    const createPlopSound = () => {
      if (!this.audioContext) return null;
      
      const duration = 0.3;
      const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / this.audioContext.sampleRate;
        
        // Low frequency "plop" with quick decay
        const freq1 = 80 * Math.exp(-t * 8);
        const freq2 = 120 * Math.exp(-t * 12);
        const noise = (Math.random() - 0.5) * 0.1 * Math.exp(-t * 15);
        
        data[i] = (
          Math.sin(2 * Math.PI * freq1 * t) * 0.3 * Math.exp(-t * 5) +
          Math.sin(2 * Math.PI * freq2 * t) * 0.2 * Math.exp(-t * 8) +
          noise
        ) * Math.exp(-t * 3);
      }
      
      return buffer;
    };
    
    this.sounds.set('poop', createPlopSound());
  }

  createFootstepSound() {
    // Create a soft footstep sound
    const createFootstepSound = () => {
      if (!this.audioContext) return null;
      
      const duration = 0.15;
      const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / this.audioContext.sampleRate;
        
        // Soft thud with some high frequency content
        const lowFreq = 60 + Math.random() * 20;
        const highFreq = 200 + Math.random() * 100;
        const noise = (Math.random() - 0.5) * 0.3;
        
        data[i] = (
          Math.sin(2 * Math.PI * lowFreq * t) * 0.2 * Math.exp(-t * 10) +
          Math.sin(2 * Math.PI * highFreq * t) * 0.1 * Math.exp(-t * 20) +
          noise * 0.1 * Math.exp(-t * 15)
        ) * Math.exp(-t * 8);
      }
      
      return buffer;
    };
    
    this.sounds.set('footstep', createFootstepSound());
  }

  createSuccessSound() {
    // Create a positive "ding" sound for scoring
    const createSuccessSound = () => {
      if (!this.audioContext) return null;
      
      const duration = 0.5;
      const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / this.audioContext.sampleRate;
        
        // Pleasant bell-like sound
        const freq1 = 523; // C5
        const freq2 = 659; // E5
        const freq3 = 784; // G5
        
        data[i] = (
          Math.sin(2 * Math.PI * freq1 * t) * 0.3 * Math.exp(-t * 2) +
          Math.sin(2 * Math.PI * freq2 * t) * 0.2 * Math.exp(-t * 3) +
          Math.sin(2 * Math.PI * freq3 * t) * 0.1 * Math.exp(-t * 4)
        ) * Math.exp(-t * 1);
      }
      
      return buffer;
    };
    
    this.sounds.set('success', createSuccessSound());
  }

  createStealSound() {
    // Create a mischievous sound for stealing territory
    const createStealSound = () => {
      if (!this.audioContext) return null;
      
      const duration = 0.4;
      const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / this.audioContext.sampleRate;
        
        // Sneaky sliding sound
        const freq = 200 + Math.sin(t * 20) * 50;
        const wobble = Math.sin(t * 15) * 0.1;
        
        data[i] = (
          Math.sin(2 * Math.PI * freq * t) * (0.2 + wobble) * Math.exp(-t * 2) +
          (Math.random() - 0.5) * 0.05 * Math.exp(-t * 5)
        );
      }
      
      return buffer;
    };
    
    this.sounds.set('steal', createStealSound());
  }

  createAmbientSound() {
    // Create subtle ambient nature sounds
    const createAmbientSound = () => {
      if (!this.audioContext) return null;
      
      const duration = 2.0;
      const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / this.audioContext.sampleRate;
        
        // Gentle wind and bird-like sounds
        const wind = Math.sin(t * 0.5) * 0.02;
        const bird1 = Math.sin(2 * Math.PI * (800 + Math.sin(t * 3) * 100) * t) * 0.01 * Math.sin(t * 2);
        const bird2 = Math.sin(2 * Math.PI * (1200 + Math.sin(t * 4) * 150) * t) * 0.008 * Math.sin(t * 1.5);
        
        data[i] = wind + bird1 + bird2;
      }
      
      return buffer;
    };
    
    this.sounds.set('ambient', createAmbientSound());
  }

  playSound(soundName, volume = 1, pitch = 1) {
    if (!this.isEnabled || !this.audioContext || !this.sounds.has(soundName)) {
      return;
    }
    
    try {
      const buffer = this.sounds.get(soundName);
      if (!buffer) return;
      
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      source.playbackRate.value = pitch;
      gainNode.gain.value = volume * this.masterVolume;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
      
      // Clean up after sound finishes
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };
      
    } catch (error) {
      console.warn('⚠️ Error playing sound:', error);
    }
  }

  playPoopSound() {
    // Add some variation to the poop sound
    const pitch = 0.8 + Math.random() * 0.4; // Random pitch between 0.8 and 1.2
    const volume = 0.7 + Math.random() * 0.3; // Random volume between 0.7 and 1.0
    this.playSound('poop', volume, pitch);
  }

  playFootstepSound() {
    const pitch = 0.9 + Math.random() * 0.2;
    const volume = 0.3 + Math.random() * 0.2;
    this.playSound('footstep', volume, pitch);
  }

  playSuccessSound() {
    this.playSound('success', 0.8);
  }

  playStealSound() {
    this.playSound('steal', 0.6);
  }

  startAmbientSound() {
    if (!this.isEnabled || !this.audioContext) return;
    
    const playAmbient = () => {
      this.playSound('ambient', 0.1);
      // Play again after the sound duration with some variation
      setTimeout(playAmbient, 1800 + Math.random() * 400);
    };
    
    // Start ambient sounds after a short delay
    setTimeout(playAmbient, 1000);
  }

  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  dispose() {
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.sounds.clear();
  }
} 