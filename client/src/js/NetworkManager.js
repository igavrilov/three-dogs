export default class NetworkManager {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventListeners = new Map();
    
    // Server configuration
    this.serverUrl = this.getServerUrl();
  }

  getServerUrl() {
    // Check if we're in production (deployed) or development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Development mode - connect to local server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = 3001; // Server port
      const url = `${protocol}//${host}:${port}`;
      console.log('🔧 Development WebSocket URL:', url);
      return url;
    } else {
      // Production mode - always use hardcoded server URL for now
      const hardcodedUrl = 'wss://three-dogs-production.up.railway.app';
      console.log('🔧 Production mode - using hardcoded server URL:', hardcodedUrl);
      console.log('🔧 Current hostname:', window.location.hostname);
      console.log('🔧 Current location:', window.location.href);
      return hardcodedUrl;
    }
  }

  connect() {
    try {
      console.log('🔌 Attempting to connect to WebSocket URL:', this.serverUrl);
      this.ws = new WebSocket(this.serverUrl);
      
      this.ws.onopen = () => {
        console.log('🔌 Connected to game server at:', this.serverUrl);
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing server message:', error);
        }
      };

      this.ws.onclose = event => {
        console.log('🔌 Disconnected from server:', event.code, event.reason);
        this.isConnected = false;
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = error => {
        console.error('❌ WebSocket error:', error);
        this.emit('error', { message: 'Connection error' });
      };

    } catch (error) {
      console.error('❌ Failed to connect to server:', error);
      this.emit('error', { message: 'Failed to connect to server' });
    }
  }

  attemptReconnect() {
    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  handleMessage(message) {
    console.log('📨 Received message:', message.type, message);
    
    switch (message.type) {
      case 'connected':
        this.emit('connected', message);
        break;
      case 'waiting_for_player':
        this.emit('waiting_for_player', message);
        break;
      case 'game_found':
        this.emit('game_found', message);
        break;
      case 'game_started':
        this.emit('game_started', message);
        break;
      case 'player_moved':
        this.emit('player_moved', message);
        break;
      case 'grass_colored':
        this.emit('grass_colored', message);
        break;
      case 'game_ended':
        this.emit('game_ended', message);
        break;
      case 'player_left':
        this.emit('player_left', message);
        break;
      case 'room_updated':
        this.emit('room_updated', message);
        break;
      case 'player_ready_update':
        this.emit('player_ready_update', message);
        break;
      case 'error':
        this.emit('error', message);
        break;
      case 'pong':
        // Handle ping/pong for connection health
        break;
      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }

  // Event system
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Game actions
  joinGame(playerName) {
    this.send({
      type: 'join_game',
      playerName
    });
  }

  sendPlayerMove(position, rotation) {
    this.send({
      type: 'player_move',
      position,
      rotation
    });
  }

  sendPlayerAction(action, position) {
    this.send({
      type: 'player_action',
      action,
      position
    });
  }

  sendPlayerReady() {
    this.send({
      type: 'player_ready'
    });
  }

  // Low-level send function
  send(message) {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        console.log('📤 Sent message:', message.type, message);
      } catch (error) {
        console.error('❌ Error sending message:', error);
      }
    } else {
      console.warn('⚠️ Cannot send message - not connected');
    }
  }

  // Connection health check
  ping() {
    this.send({ type: 'ping', timestamp: Date.now() });
  }

  // Cleanup
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.eventListeners.clear();
  }

  // Getters
  getConnectionState() {
    return {
      isConnected: this.isConnected,
      readyState: this.ws ? this.ws.readyState : WebSocket.CLOSED,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}
