import Game from './Game.js';
import NetworkManager from './NetworkManager.js';

class GameApp {
  constructor() {
    this.game = null;
    this.networkManager = null;
    this.currentPlayerId = null;
    this.gameState = 'menu'; // menu, waiting, playing, finished
    
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
      playerNameInput: document.getElementById('playerNameInput'),
      joinGameBtn: document.getElementById('joinGameBtn'),
      playAgainBtn: document.getElementById('playAgainBtn'),
      scoreBoard: document.getElementById('scoreBoard'),
      gameTimer: document.getElementById('gameTimer'),
      gamePhase: document.getElementById('gamePhase'),
      winnerInfo: document.getElementById('winnerInfo'),
      volumeSlider: document.getElementById('volumeSlider')
    };

    // Event listeners
    this.elements.joinGameBtn.addEventListener('click', () => this.joinGame());
    this.elements.playAgainBtn.addEventListener('click', () => this.playAgain());
    
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
      this.startGame(data);
    });

    this.networkManager.on('game_started', data => {
      this.onGameStarted(data);
    });

    this.networkManager.on('player_moved', data => {
      if (this.game) {
        this.game.updateRemotePlayer(data.playerId, data.position, data.rotation);
      }
    });

    this.networkManager.on('grass_colored', data => {
      if (this.game) {
        this.game.updateGrass(data.position, data.color, data.wasStolen);
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
    this.networkManager.joinGame(playerName);
  }

  showWaitingScreen() {
    this.hideAllScreens();
    this.updateConnectionStatus('waiting', 'Waiting for another player...');
    this.elements.gamePhase.textContent = 'Waiting for another player...';
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

  onGameEnded(data) {
    this.gameState = 'finished';
    
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
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
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'steal-notification';
    notification.innerHTML = `
      <div class="steal-content">
        🏴‍☠️ <strong>${stealer}</strong> stole territory from <strong>${victim}</strong>!
      </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
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
    
    this.gameState = 'menu';
    this.hideAllScreens();
    this.elements.mainMenu.classList.remove('hidden');
    this.elements.joinGameBtn.disabled = false;
    this.updateConnectionStatus('connected', 'Connected');
  }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
