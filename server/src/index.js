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

// HTTP server
const server = app.listen(PORT, () => {
  console.log(`🐕 Dog Cleanup Game Server running on port ${PORT}`);
});

// WebSocket server
const wss = new WebSocketServer({ server });

// Health check endpoint
app.get('/health', (req, res) => {
  const totalPlayers = Array.from(gameRooms.values()).reduce((sum, room) => sum + room.getPlayerCount(), 0);
  res.json({ 
    status: 'healthy', 
    rooms: gameRooms.size,
    totalPlayers: totalPlayers
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
  
  // Find an existing room that's waiting for players or create a new one
  let gameRoom = null;
  let roomId = null;
  
  // Look for a room that's still waiting for players
  for (const [id, room] of gameRooms) {
    if (room.gameState === 'waiting') {
      gameRoom = room;
      roomId = id;
      break;
    }
  }
  
  // If no waiting room found, create a new one
  if (!gameRoom) {
    roomId = uuidv4();
    gameRoom = new GameRoom(roomId);
    gameRooms.set(roomId, gameRoom);
  }
  
  // Add player to the room
  gameRoom.addPlayer(ws);
  ws.gameRoom = gameRoom;
  
  // Send game found message
  gameRoom.broadcastToRoom({
    type: 'game_found',
    roomId,
    players: gameRoom.getPlayersInfo(),
    gameState: gameRoom.getGameState()
  });
  
  // Auto-start the game after a short delay if this is the first player
  // or if there are already multiple players
  if (gameRoom.getPlayerCount() >= 1) {
    setTimeout(() => {
      // Set all current players as ready
      gameRoom.players.forEach((player) => {
        gameRoom.setPlayerReady(player.id);
      });
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
  if (ws.gameRoom) {
    ws.gameRoom.removePlayer(ws.playerId);
    if (ws.gameRoom.getPlayerCount() === 0) {
      gameRooms.delete(ws.gameRoom.roomId);
    }
  }
}

console.log(`🌟 Dog Cleanup Game Server running on port ${PORT}`);
