export default class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map();
    this.gameState = 'waiting'; // waiting, countdown, playing, finished
    this.gameStartTime = null;
    this.gameDuration = 120000; // 2 minutes
    this.grassMap = new Map(); // position -> playerId (who colored it)
    this.playerReadyStatus = new Map();
    
    // Game countdown configuration
    this.countdownDuration = 60000; // 1 minute countdown
    this.countdownStartTime = null;
    this.countdownTimer = null;
    
    // Game world configuration
    this.worldSize = { x: 50, z: 50 };
    this.grassGridSize = 1; // 1x1 unit grass tiles
  }

  addPlayer(ws) {
    const playerData = {
      id: ws.playerId,
      name: ws.playerName,
      ws,
      position: this.getSpawnPosition(this.players.size),
      rotation: { x: 0, y: 0, z: 0 },
      score: 0,
      color: this.getPlayerColor(this.players.size),
      isReady: false
    };
    
    this.players.set(ws.playerId, playerData);
    this.playerReadyStatus.set(ws.playerId, false);
    
    console.log(`✅ Player ${ws.playerName} joined room ${this.roomId}`);
    
    // Start countdown when 2 players join
    if (this.players.size === 2 && this.gameState === 'waiting') {
      this.startCountdown();
    }
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      this.playerReadyStatus.delete(playerId);
      console.log(`❌ Player ${player.name} left room ${this.roomId}`);
      
      // Cancel countdown if less than 2 players remain
      if (this.gameState === 'countdown' && this.players.size < 2) {
        if (this.countdownTimer) {
          clearTimeout(this.countdownTimer);
          this.countdownTimer = null;
        }
        this.gameState = 'waiting';
        this.countdownStartTime = null;
        
        this.broadcastToRoom({
          type: 'countdown_cancelled',
          reason: 'Not enough players'
        });
        
        console.log(`⏰ Countdown cancelled in room ${this.roomId} - not enough players`);
      }
      
      // Notify remaining players
      this.broadcastToRoom({
        type: 'player_left',
        playerId,
        remainingPlayers: this.getPlayersInfo()
      });
    }
  }

  getSpawnPosition(playerIndex) {
    // Create spawn positions in a circle around the center
    const radius = 15;
    const angle = (playerIndex * 2 * Math.PI) / Math.max(8, this.players.size + 1); // Distribute evenly, minimum 8 positions
    
    return {
      x: Math.cos(angle) * radius,
      y: 0.5,
      z: Math.sin(angle) * radius
    };
  }

  getPlayerColor(playerIndex) {
    const colors = [
      '#8B4513', // Saddle Brown
      '#D2691E', // Chocolate
      '#A0522D', // Sienna
      '#CD853F', // Peru
      '#DEB887', // Burlywood
      '#F4A460', // Sandy Brown
      '#DAA520', // Goldenrod
      '#B8860B', // Dark Goldenrod
      '#9ACD32', // Yellow Green
      '#32CD32', // Lime Green
      '#228B22', // Forest Green
      '#006400', // Dark Green
      '#4169E1', // Royal Blue
      '#0000CD', // Medium Blue
      '#8A2BE2', // Blue Violet
      '#9400D3', // Violet
      '#FF1493', // Deep Pink
      '#DC143C', // Crimson
      '#B22222', // Fire Brick
      '#800000'  // Maroon
    ];
    return colors[playerIndex % colors.length];
  }

  startCountdown() {
    if (this.gameState !== 'waiting') return;
    
    this.gameState = 'countdown';
    this.countdownStartTime = Date.now();
    
    console.log(`⏰ Starting 1-minute countdown in room ${this.roomId}`);
    
    // Broadcast countdown start
    this.broadcastToRoom({
      type: 'countdown_started',
      countdownDuration: this.countdownDuration,
      startTime: this.countdownStartTime
    });
    
    // Set countdown timer
    this.countdownTimer = setTimeout(() => {
      this.startGame();
    }, this.countdownDuration);
    
    // Send countdown updates every 10 seconds
    this.sendCountdownUpdates();
  }

  sendCountdownUpdates() {
    const sendUpdate = () => {
      if (this.gameState !== 'countdown') return;
      
      const elapsed = Date.now() - this.countdownStartTime;
      const remaining = Math.max(0, this.countdownDuration - elapsed);
      
      this.broadcastToRoom({
        type: 'countdown_update',
        remaining
      });
      
      if (remaining > 0) {
        setTimeout(sendUpdate, 10000); // Update every 10 seconds
      }
    };
    
    setTimeout(sendUpdate, 10000); // First update after 10 seconds
  }

  setPlayerReady(playerId) {
    this.playerReadyStatus.set(playerId, true);
    
    // Check if all players are ready
    const allReady = Array.from(this.playerReadyStatus.values()).every(ready => ready);
    
    // During countdown, if all players are ready, start immediately
    if (this.gameState === 'countdown' && allReady && this.players.size >= 2) {
      if (this.countdownTimer) {
        clearTimeout(this.countdownTimer);
        this.countdownTimer = null;
      }
      this.startGame();
    }
    // If still waiting and only 1 player, start immediately when ready
    else if (this.gameState === 'waiting' && allReady && this.players.size === 1) {
      this.startGame();
    }
    
    this.broadcastToRoom({
      type: 'player_ready_update',
      playerId,
      allReady,
      readyPlayers: Array.from(this.playerReadyStatus.entries())
        .filter(([_, ready]) => ready)
        .map(([id, _]) => id)
    });
  }

  startGame() {
    this.gameState = 'playing';
    this.gameStartTime = Date.now();
    
    this.broadcastToRoom({
      type: 'game_started',
      startTime: this.gameStartTime,
      duration: this.gameDuration,
      players: this.getPlayersInfo()
    });
    
    // Set game end timer
    setTimeout(() => {
      this.endGame();
    }, this.gameDuration);
    
    console.log(`🚀 Game started in room ${this.roomId}`);
  }

  endGame() {
    if (this.gameState !== 'playing') return;
    
    this.gameState = 'finished';
    const finalScores = this.calculateFinalScores();
    const winner = this.getWinner(finalScores);
    
    this.broadcastToRoom({
      type: 'game_ended',
      winner,
      finalScores,
      grassMap: Array.from(this.grassMap.entries())
    });
    
    console.log(`🏁 Game ended in room ${this.roomId}. Winner: ${winner?.name || 'None'}`);
  }

  updatePlayerPosition(playerId, position, rotation) {
    const player = this.players.get(playerId);
    if (!player) return;
    
    player.position = position;
    player.rotation = rotation;
    
    // Broadcast position update to other players
    this.broadcastToRoom({
      type: 'player_moved',
      playerId,
      position,
      rotation
    }, playerId);
  }

  handleCleanupAction(playerId, position) {
    if (this.gameState !== 'playing') return;
    
    const player = this.players.get(playerId);
    if (!player) return;
    
    // Calculate grass tile position
    const grassX = Math.floor(position.x / this.grassGridSize);
    const grassZ = Math.floor(position.z / this.grassGridSize);
    const grassKey = `${grassX},${grassZ}`;
    
    // Check if position is within world bounds
    if (Math.abs(grassX) > this.worldSize.x / 2 || 
        Math.abs(grassZ) > this.worldSize.z / 2) {
      return;
    }
    
    // Always allow coloring - players can steal territory from others!
    const currentOwner = this.grassMap.get(grassKey);
    let wasStolen = false;
    let previousOwnerName = null;
    
    // Remove score from previous owner if exists and it's not the same player
    if (currentOwner && currentOwner !== playerId) {
      const prevPlayer = this.players.get(currentOwner);
      if (prevPlayer) {
        prevPlayer.score = Math.max(0, prevPlayer.score - 1);
        wasStolen = true;
        previousOwnerName = prevPlayer.name;
      }
    }
    
    // Only add score if this is a new tile or stolen from another player
    if (!currentOwner || currentOwner !== playerId) {
      this.grassMap.set(grassKey, playerId);
      player.score += 1;
      
      // Broadcast the grass update with steal information
      this.broadcastToRoom({
        type: 'grass_colored',
        position: { x: grassX, z: grassZ },
        playerId,
        color: player.color,
        scores: this.getCurrentScores(),
        wasStolen,
        previousOwner: currentOwner,
        previousOwnerName,
        playerName: player.name
      });
    }
  }

  getCurrentScores() {
    const scores = {};
    this.players.forEach((player, id) => {
      scores[id] = {
        name: player.name,
        score: player.score,
        color: player.color
      };
    });
    return scores;
  }

  calculateFinalScores() {
    return this.getCurrentScores();
  }

  getWinner(scores) {
    let winner = null;
    let highestScore = -1;
    
    Object.keys(scores).forEach(playerId => {
      if (scores[playerId].score > highestScore) {
        highestScore = scores[playerId].score;
        winner = {
          id: playerId,
          name: scores[playerId].name,
          score: highestScore
        };
      }
    });
    
    return winner;
  }

  getPlayersInfo() {
    const playersInfo = [];
    this.players.forEach(player => {
      playersInfo.push({
        id: player.id,
        name: player.name,
        position: player.position,
        rotation: player.rotation,
        score: player.score,
        color: player.color,
        isReady: this.playerReadyStatus.get(player.id) || false
      });
    });
    return playersInfo;
  }

  getGameState() {
    return {
      state: this.gameState,
      startTime: this.gameStartTime,
      duration: this.gameDuration,
      worldSize: this.worldSize,
      grassMap: Array.from(this.grassMap.entries()),
      scores: this.getCurrentScores()
    };
  }

  isGameActive() {
    return this.gameState === 'playing';
  }

  getPlayerCount() {
    return this.players.size;
  }

  broadcastToRoom(message, excludePlayerId = null) {
    this.players.forEach(player => {
      if (player.id !== excludePlayerId && player.ws.readyState === 1) {
        try {
          player.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error(`❌ Error sending message to player ${player.name}:`, error);
        }
      }
    });
  }
}
