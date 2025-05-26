import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import GameRoom from './GameRoom.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Game state
const gameRooms = new Map();
const waitingPlayers = [];

// HTTP server
const server = app.listen(PORT, () => {
  console.log(`🐕 Dog Cleanup Game Server running on port ${PORT}`);
});

// WebSocket server
const wss = new WebSocketServer({ server });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    rooms: gameRooms.size,
    waitingPlayers: waitingPlayers.length
  });
});

wss.on('connection', ws => {
  console.log('🔌 New player connected');
  
  ws.playerId = uuidv4();
  ws.playerName = null;
  ws.gameRoom = null;
  ws.isAlive = true;

  ws.send(JSON.stringify({
    type: 'connected',
    playerId: ws.playerId
  }));

  ws.on('message', data => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Player disconnected:', ws.playerId);
    handlePlayerDisconnect(ws);
  });
});

function handleMessage(ws, message) {
  switch (message.type) {
    case 'join_game':
      handleJoinGame(ws, message);
      break;
    case 'player_move':
      handlePlayerMove(ws, message);
      break;
    case 'player_action':
      handlePlayerAction(ws, message);
      break;
  }
}

function handleJoinGame(ws, message) {
  const { playerName } = message;
  ws.playerName = playerName.trim();
  
  waitingPlayers.push(ws);
  
  if (waitingPlayers.length >= 2) {
    const player1 = waitingPlayers.shift();
    const player2 = waitingPlayers.shift();
    
    const roomId = uuidv4();
    const gameRoom = new GameRoom(roomId);
    
    gameRoom.addPlayer(player1);
    gameRoom.addPlayer(player2);
    
    player1.gameRoom = gameRoom;
    player2.gameRoom = gameRoom;
    
    gameRooms.set(roomId, gameRoom);
    
    // Send game found message first
    gameRoom.broadcastToRoom({
      type: 'game_found',
      roomId,
      players: gameRoom.getPlayersInfo(),
      gameState: gameRoom.getGameState()
    });
    
    // Auto-start the game after a short delay
    setTimeout(() => {
      gameRoom.setPlayerReady(player1.playerId);
      gameRoom.setPlayerReady(player2.playerId);
    }, 1000); // 1 second delay to allow UI to initialize
  }
}

function handlePlayerMove(ws, message) {
  if (ws.gameRoom) {
    ws.gameRoom.updatePlayerPosition(ws.playerId, message.position, message.rotation);
  }
}

function handlePlayerAction(ws, message) {
  if (ws.gameRoom && message.action === 'cleanup') {
    ws.gameRoom.handleCleanupAction(ws.playerId, message.position);
  }
}

function handlePlayerDisconnect(ws) {
  const waitingIndex = waitingPlayers.findIndex(player => player.playerId === ws.playerId);
  if (waitingIndex !== -1) {
    waitingPlayers.splice(waitingIndex, 1);
  }
  
  if (ws.gameRoom) {
    ws.gameRoom.removePlayer(ws.playerId);
    if (ws.gameRoom.getPlayerCount() === 0) {
      gameRooms.delete(ws.gameRoom.roomId);
    }
  }
}

console.log(`🌟 Dog Cleanup Game Server running on port ${PORT}`);
