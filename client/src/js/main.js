import Game from './Game.js';
import NetworkManager from './NetworkManager.js';

class GameApp {
  constructor() {
    this.game = null;
    this.networkManager = null;
    this.currentPlayerId = null;
    this.gameState = 'menu'; // menu, waiting, countdown, playing, finished
    this.countdownTimer = null;
    
    this.initializeUI();
    this.connectToServer();
  }

  initializeUI() {
    // Get UI elements
    this.elements = {
      mainMenu: document.getElementById('mainMenu'),
      gameHUD: document.getElementById('gameHUD'),
      gameStatus: document.getElementById('gameStatus'),
      controls: document.getElementById('controls'),
      connectionStatus: document.getElementById('connectionStatus'),
      winnerModal: document.getElementById('winnerModal'),
      gameLog: document.getElementById('gameLog'),
      playerNameInput: document.getElementById('playerNameInput'),
      joinGameBtn: document.getElementById('joinGameBtn'),
      playAgainBtn: document.getElementById('playAgainBtn'),
      scoreBoard: document.getElementById('scoreBoard'),
      gameTimer: document.getElementById('gameTimer'),
      gamePhase: document.getElementById('gamePhase'),
      winnerInfo: document.getElementById('winnerInfo'),
      volumeSlider: document.getElementById('volumeSlider'),
      playersList: document.getElementById('playersList'),
      connectedPlayers: document.getElementById('connectedPlayers'),
      readyBtn: document.getElementById('readyBtn'),
      scootingIndicator: document.getElementById('scootingIndicator')
    };

    // Event listeners
    this.elements.joinGameBtn.addEventListener('click', () => this.joinGame());
    this.elements.playAgainBtn.addEventListener('click', () => this.playAgain());
    this.elements.readyBtn.addEventListener('click', () => this.setPlayerReady());
    
    // Enter key to join game
    this.elements.playerNameInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        this.joinGame();
      }
    });

    // Volume control
    this.elements.volumeSlider.addEventListener('input', e => {
      const volume = parseInt(e.target.value) / 100;
      if (this.game && this.game.soundManager) {
        this.game.soundManager.setMasterVolume(volume);
      }
    });

    // Set default player name
    this.elements.playerNameInput.value = `Dog${Math.floor(Math.random() * 1000)}`;
  }

  connectToServer() {
    this.updateConnectionStatus('waiting', 'Connecting...');
    
    this.networkManager = new NetworkManager();
    
    this.networkManager.on('connected', data => {
      this.currentPlayerId = data.playerId;
      this.updateConnectionStatus('connected', 'Connected');
      this.elements.playersList.innerHTML = '<div class="no-players">Finding other players...</div>';
      console.log('🔌 Connected to server with ID:', this.currentPlayerId);
    });

    this.networkManager.on('disconnected', () => {
      this.updateConnectionStatus('disconnected', 'Disconnected');
      this.showError('Connection lost. Please refresh the page.');
    });

    this.networkManager.on('error', error => {
      this.showError(`Connection error: ${error.message}`);
    });

    this.networkManager.on('waiting_for_player', () => {
      this.gameState = 'waiting';
      this.showWaitingScreen();
    });

    this.networkManager.on('game_found', data => {
      // Update players list but don't start the game immediately
      this.updatePlayersList(data.players, data.gameState?.state);
      console.log('🏠 Joined room with', data.players.length, 'players');
    });

    this.networkManager.on('game_started', data => {
      this.onGameStarted(data);
    });

    this.networkManager.on('player_moved', data => {
      if (this.game) {
        this.game.updateRemotePlayer(data.playerId, data.position, data.rotation, data.isScooting);
      }
    });

    this.networkManager.on('grass_colored', data => {
      if (this.game) {
        this.game.updateGrass(data.position, data.color, data.wasStolen, data.actionType);
        this.updateScoreBoard(data.scores);
        
        // Show stealing notification
        if (data.wasStolen && data.previousOwnerName && data.playerName) {
          this.showStealNotification(data.playerName, data.previousOwnerName);
        }
      }
    });

    this.networkManager.on('game_ended', data => {
      this.onGameEnded(data);
    });

    this.networkManager.on('countdown_started', data => {
      this.onCountdownStarted(data);
    });

    this.networkManager.on('countdown_update', data => {
      this.onCountdownUpdate(data);
    });

    this.networkManager.on('countdown_cancelled', data => {
      this.onCountdownCancelled(data);
    });

    this.networkManager.on('room_updated', data => {
      this.updatePlayersList(data.players, data.gameState);
    });

    this.networkManager.on('player_ready_update', data => {
      // The room_updated event will handle the UI update, but we can show feedback here
      console.log('Player ready update:', data);
    });

    this.networkManager.connect();
  }

  joinGame() {
    const playerName = this.elements.playerNameInput.value.trim();
    
    if (!playerName) {
      this.showError('Please enter your dog\'s name!');
      return;
    }

    if (playerName.length > 20) {
      this.showError('Dog name too long! Maximum 20 characters.');
      return;
    }

    this.elements.joinGameBtn.disabled = true;
    this.elements.joinGameBtn.textContent = '✅ Name Set!';
    this.networkManager.joinGame(playerName);
  }
  
  setPlayerReady() {
    this.networkManager.sendPlayerReady();
    this.elements.readyBtn.disabled = true;
    this.elements.readyBtn.textContent = '✅ Ready!';
    this.elements.readyBtn.classList.add('already-ready');
  }

  showWaitingScreen() {
    this.hideAllScreens();
    this.updateConnectionStatus('waiting', 'Waiting for players...');
    this.elements.gamePhase.textContent = 'Waiting for players...';
    this.elements.gameStatus.classList.remove('hidden');
  }

  startGame(gameData) {
    this.hideAllScreens();
    this.gameState = 'playing';
    
    // Initialize the 3D game
    this.game = new Game(this.networkManager, this.currentPlayerId);
    this.game.initialize(gameData);
    
    // Show game UI
    this.elements.gameHUD.classList.remove('hidden');
    this.elements.gameStatus.classList.remove('hidden');
    this.elements.controls.classList.remove('hidden');
    
    this.updateConnectionStatus('connected', 'In Game');
    this.elements.gamePhase.textContent = 'Get Ready!';
    
    // Update score board
    this.updateScoreBoard(gameData.gameState?.scores || {});
    
    // Start the game immediately for testing - controls should work right away
    setTimeout(() => {
      if (this.game) {
        this.game.startGame();
        this.elements.gamePhase.textContent = 'Game Started! Use WASD to move, Space to mark territory';
      }
    }, 500);
  }

  onGameStarted(data) {
    // Initialize the 3D game if not already done
    if (!this.game) {
      this.startGame(data);
    }
    
    this.elements.gamePhase.textContent = 'Game Started!';
    this.startGameTimer(data.duration);
    
    if (this.game) {
      this.game.startGame();
    }
  }

  startGameTimer(duration) {
    const startTime = Date.now();
    
    this.gameTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      
      this.elements.gameTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      if (remaining <= 0) {
        clearInterval(this.gameTimer);
        this.elements.gameTimer.textContent = '0:00';
      }
    }, 100);
  }

  onCountdownStarted(data) {
    this.gameState = 'countdown';
    this.elements.gamePhase.textContent = 'Game starting in 1 minute...';
    this.startCountdownTimer(data.countdownDuration);
    
    console.log('⏰ Countdown started - game will begin in 1 minute');
  }

  onCountdownUpdate(data) {
    const minutes = Math.floor(data.remaining / 60000);
    const seconds = Math.floor((data.remaining % 60000) / 1000);
    this.elements.gamePhase.textContent = `Game starting in ${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  onCountdownCancelled(data) {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    
    this.gameState = 'waiting';
    this.elements.gamePhase.textContent = `Countdown cancelled: ${data.reason}`;
    
    setTimeout(() => {
      this.elements.gamePhase.textContent = 'Waiting for more players...';
    }, 3000);
    
    console.log('⏰ Countdown cancelled:', data.reason);
  }

  startCountdownTimer(duration) {
    const startTime = Date.now();
    
    this.countdownTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      
      this.elements.gameTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      this.elements.gamePhase.textContent = `Game starting in ${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      if (remaining <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
    }, 100);
  }

  onGameEnded(data) {
    this.gameState = 'finished';
    
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
    }
    
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    
    // Show winner modal
    this.elements.winnerModal.classList.remove('hidden');
    
    if (data.winner) {
      if (data.winner.id === this.currentPlayerId) {
        this.elements.winnerInfo.innerHTML = `
          <h2>🎉 You Won!</h2>
          <p>Score: ${data.winner.score}</p>
        `;
      } else {
        this.elements.winnerInfo.innerHTML = `
          <h2>😢 You Lost!</h2>
          <p>Winner: ${data.winner.name}</p>
          <p>Score: ${data.winner.score}</p>
        `;
      }
    } else {
      this.elements.winnerInfo.innerHTML = `
        <h2>🤝 It's a Tie!</h2>
        <p>Great game!</p>
      `;
    }
    
    // Show final scores
    const scoresHtml = Object.values(data.finalScores)
      .sort((a, b) => b.score - a.score)
      .map(player => `<div>${player.name}: ${player.score}</div>`)
      .join('');
    
    this.elements.winnerInfo.innerHTML += `<div style="margin-top: 20px;"><h3>Final Scores:</h3>${scoresHtml}</div>`;
  }

  updateScoreBoard(scores) {
    const scoresArray = Object.values(scores).sort((a, b) => b.score - a.score);
    
    this.elements.scoreBoard.innerHTML = scoresArray.map(player => `
      <div class="score-item">
        <div style="display: flex; align-items: center;">
          <div class="player-color" style="background-color: ${player.color}"></div>
          <span>${player.name}</span>
        </div>
        <span>${player.score}</span>
      </div>
    `).join('');
  }

  updatePlayersList(players, gameState) {
    if (!players || players.length === 0) {
      this.elements.playersList.innerHTML = '<div class="no-players">No players in room</div>';
      this.elements.readyBtn.classList.add('hidden');
      return;
    }

    // Sort players to show current player first
    const sortedPlayers = [...players].sort((a, b) => {
      if (a.id === this.currentPlayerId) return -1;
      if (b.id === this.currentPlayerId) return 1;
      return 0;
    });

    const currentPlayer = sortedPlayers.find(p => p.id === this.currentPlayerId);
    const isCurrentPlayerReady = currentPlayer ? currentPlayer.isReady : false;

    const playersHtml = sortedPlayers.map(player => {
      const isCurrentPlayer = player.id === this.currentPlayerId;
      const statusClass = player.isReady ? 'ready' : 'waiting';
      const statusText = player.isReady ? 'Ready' : 'Waiting';
      
      return `
        <div class="player-item">
          <div class="player-info">
            <div class="player-color" style="background-color: ${player.color}"></div>
            <span class="player-name">
              ${player.name}${isCurrentPlayer ? ' (You)' : ''}
            </span>
          </div>
          <div class="player-status ${statusClass}">
            ${statusText}
          </div>
        </div>
      `;
    }).join('');

    this.elements.playersList.innerHTML = playersHtml;
    
    // Show ready button if player is in room and game hasn't started
    if (gameState === 'waiting' || gameState === 'countdown') {
      this.elements.readyBtn.classList.remove('hidden');
      
      if (isCurrentPlayerReady) {
        this.elements.readyBtn.disabled = true;
        this.elements.readyBtn.textContent = '✅ Ready!';
        this.elements.readyBtn.classList.add('already-ready');
      } else {
        this.elements.readyBtn.disabled = false;
        this.elements.readyBtn.textContent = '🎯 Ready to Play!';
        this.elements.readyBtn.classList.remove('already-ready');
      }
    } else {
      this.elements.readyBtn.classList.add('hidden');
    }
  }

  updateConnectionStatus(status, text) {
    this.elements.connectionStatus.className = `ui-overlay ${status}`;
    this.elements.connectionStatus.innerHTML = status === 'waiting' 
      ? `<span class="loading"></span> ${text}`
      : text;
  }

  hideAllScreens() {
    this.elements.mainMenu.classList.add('hidden');
    this.elements.gameHUD.classList.add('hidden');
    this.elements.gameStatus.classList.add('hidden');
    this.elements.controls.classList.add('hidden');
    this.elements.winnerModal.classList.add('hidden');
  }

  showError(message) {
    alert(message); // Simple error display - could be improved with a modal
  }

  showStealNotification(stealer, victim) {
    this.addLogMessage(`🏴‍☠️ ${stealer} stole territory from ${victim}`, 'steal');
  }

  addLogMessage(message, type = 'info') {
    // Create log message element
    const logMessage = document.createElement('div');
    logMessage.className = `log-message ${type}`;
    logMessage.textContent = message;
    
    // Add to log container
    this.elements.gameLog.appendChild(logMessage);
    
    // Scroll to bottom
    this.elements.gameLog.scrollTop = this.elements.gameLog.scrollHeight;
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (logMessage.parentNode) {
        logMessage.style.animation = 'fadeOutLog 0.3s ease forwards';
        setTimeout(() => {
          if (logMessage.parentNode) {
            logMessage.parentNode.removeChild(logMessage);
          }
        }, 300);
      }
    }, 5000);
    
    // Keep only the last 10 messages to prevent memory issues
    const messages = this.elements.gameLog.children;
    while (messages.length > 10) {
      this.elements.gameLog.removeChild(messages[0]);
    }
  }

  playAgain() {
    // Reset game state
    if (this.game) {
      this.game.destroy();
      this.game = null;
    }
    
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
    }
    
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    
    this.gameState = 'menu';
    this.hideAllScreens();
    this.elements.mainMenu.classList.remove('hidden');
    this.elements.joinGameBtn.disabled = false;
    this.elements.joinGameBtn.textContent = '📝 Set Dog Name';
    this.updateConnectionStatus('connected', 'Connected');
    this.elements.playersList.innerHTML = '<div class="no-players">Finding other players...</div>';
    this.elements.readyBtn.classList.add('hidden');
  }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
