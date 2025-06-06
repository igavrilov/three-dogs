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
    totalPlayers
  });
});

wss.on('connection', ws => {
  console.log('🔌 New player connected');
  
  ws.playerId = uuidv4();
  ws.playerName = `Dog${Math.floor(Math.random() * 1000)}`; // Temporary name
  ws.gameRoom = null;
  ws.isAlive = true;

  // Automatically assign player to a room
  assignPlayerToRoom(ws);

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
    case 'player_ready':
      handlePlayerReady(ws, message);
      break;
  }
}

function assignPlayerToRoom(ws) {
  // Find an existing room that's waiting for players or in countdown (allow joining)
  let gameRoom = null;
  let roomId = null;
  
  // Look for a room that can accept new players (waiting or countdown state)
  for (const [id, room] of gameRooms) {
    if (room.gameState === 'waiting' || room.gameState === 'countdown') {
      gameRoom = room;
      roomId = id;
      break;
    }
  }
  
  // If no available room found, create a new one
  if (!gameRoom) {
    roomId = uuidv4();
    gameRoom = new GameRoom(roomId);
    gameRooms.set(roomId, gameRoom);
    console.log(`🏠 Created new room ${roomId} for auto-connect`);
  } else {
    console.log(`🏠 Player auto-joining existing room ${roomId} with ${gameRoom.getPlayerCount()} players`);
  }
  
  // Add player to the room
  gameRoom.addPlayer(ws);
  ws.gameRoom = gameRoom;
  
  // Send game found message to all players in room
  gameRoom.broadcastToRoom({
    type: 'game_found',
    roomId,
    players: gameRoom.getPlayersInfo(),
    gameState: gameRoom.getGameState()
  });
  
  // Also send the room update to ensure the new player gets the current state
  setTimeout(() => {
    gameRoom.broadcastToRoom({
      type: 'room_updated',
      players: gameRoom.getPlayersInfo(),
      gameState: gameRoom.gameState
    });
  }, 100);
}

function handleJoinGame(ws, message) {
  const { playerName } = message;
  const oldName = ws.playerName;
  ws.playerName = playerName.trim();
  
  console.log(`📝 Player ${oldName} changed name to ${ws.playerName} in room ${ws.gameRoom?.roomId}`);
  
  // Update the room with the new player name
  if (ws.gameRoom) {
    // Update player data in the room
    const player = ws.gameRoom.players.get(ws.playerId);
    if (player) {
      player.name = ws.playerName;
    }
    
    // Broadcast updated player info
    ws.gameRoom.broadcastToRoom({
      type: 'room_updated',
      players: ws.gameRoom.getPlayersInfo(),
      gameState: ws.gameRoom.gameState
    });
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

function handlePlayerReady(ws, message) {
  if (ws.gameRoom) {
    ws.gameRoom.setPlayerReady(ws.playerId);
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
