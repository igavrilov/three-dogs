export default class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map();
    this.gameState = 'waiting'; // waiting, playing, finished
    this.gameStartTime = null;
    this.gameDuration = 120000; // 2 minutes
    this.grassMap = new Map(); // position -> playerId (who colored it)
    this.playerReadyStatus = new Map();
    
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
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      this.playerReadyStatus.delete(playerId);
      console.log(`❌ Player ${player.name} left room ${this.roomId}`);
      
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

  setPlayerReady(playerId) {
    this.playerReadyStatus.set(playerId, true);
    
    // Check if all players are ready
    const allReady = Array.from(this.playerReadyStatus.values()).every(ready => ready);
    
    // Start game when all players are ready (minimum 1 player)
    if (allReady && this.players.size >= 1) {
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
    
    // Color the grass if not already colored by this player
    const currentOwner = this.grassMap.get(grassKey);
    if (currentOwner !== playerId) {
      // Remove score from previous owner if exists
      if (currentOwner) {
        const prevPlayer = this.players.get(currentOwner);
        if (prevPlayer) {
          prevPlayer.score = Math.max(0, prevPlayer.score - 1);
        }
      }
      
      // Add to current player's score
      this.grassMap.set(grassKey, playerId);
      player.score += 1;
      
      // Broadcast the grass update
      this.broadcastToRoom({
        type: 'grass_colored',
        position: { x: grassX, z: grassZ },
        playerId,
        color: player.color,
        scores: this.getCurrentScores()
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
