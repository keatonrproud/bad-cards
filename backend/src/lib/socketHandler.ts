import { Server, Socket } from 'socket.io';
import { GameLogicManager } from './gameLogic';

const DEBUG = false;

export class SocketHandler {
  private gameManager: GameLogicManager;
  private io: Server;
  private playerSockets: Map<string, string> = new Map(); // playerId -> socketId
  private socketPlayers: Map<string, string> = new Map(); // socketId -> playerId

  constructor(io: Server, gameManager: GameLogicManager) {
    this.io = io;
    this.gameManager = gameManager;
  }

  handleConnection(socket: Socket) {
    if (DEBUG) console.log('User connected:', socket.id);

    socket.on('connection-test', (_data, ack) => {
      if (ack && typeof ack === 'function') {
        ack('connection-test-acknowledged');
      }
    });

    // Handle room creation
    socket.on('create-room', (data: { roomName: string; playerName: string; maxPlayers: number; maxScore?: number; roundTimer?: number }) => {
      try {
        const { roomName, playerName, maxPlayers, maxScore = 7, roundTimer = 45 } = data;
        const { room, playerId } = this.gameManager.createRoom(roomName, playerName, maxPlayers, maxScore, roundTimer);
        
        // Store player-socket mapping
        this.playerSockets.set(playerId, socket.id);
        this.socketPlayers.set(socket.id, playerId);
        
        // Join socket room
        socket.join(room.id);
        
        socket.emit('room-created', { room, playerId });
        socket.emit('room-update', { room });
        if (DEBUG) console.log(`Room created: ${room.name} by ${playerName}`);
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Handle joining room
    socket.on('join-room', (data: { roomId: string; playerName: string }) => {
      try {
        const { roomId, playerName } = data;
        const result = this.gameManager.joinRoom(roomId, playerName);
        
        if (!result) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const { room, playerId } = result;
        
        // Store player-socket mapping
        this.playerSockets.set(playerId, socket.id);
        this.socketPlayers.set(socket.id, playerId);
        
        // Join socket room
        socket.join(room.id);
        
        // Notify player
        socket.emit('player-joined', { room, playerId });
        
        // Notify all players in room
        this.io.to(room.id).emit('room-update', { room });
        if (DEBUG) console.log(`${playerName} joined room: ${room.name}`);
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Handle leaving room
    socket.on('leave-room', (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const playerId = this.socketPlayers.get(socket.id);
        
        if (!playerId) return;
        
        const room = this.gameManager.leaveRoom(roomId, playerId);
        
        // Clean up mappings
        this.playerSockets.delete(playerId);
        this.socketPlayers.delete(socket.id);
        
        // Leave socket room
        socket.leave(roomId);
        
        if (room) {
          // Notify remaining players
          this.io.to(roomId).emit('room-update', { room });
        }
        
        socket.emit('player-left', { roomId });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Handle game start  
    socket.on('start-game', (data: { roomId: string }, ack?) => {
      // Send acknowledgment immediately
      if (ack && typeof ack === 'function') {
        ack('start-game-received');
      }
      try {
        const { roomId } = data;
        const playerId = this.socketPlayers.get(socket.id);
        
        if (!playerId) {
          if (DEBUG) console.warn(`[start-game] player not found for socket`, { socketId: socket.id });
          socket.emit('error', { message: 'Player not found' });
          return;
        }
        const room = this.gameManager.startGame(roomId, playerId);

        if (!room) {
          if (DEBUG) console.warn(`[start-game] gameManager.startGame returned null`, { roomId, playerId });
          socket.emit('error', { message: 'Failed to start game' });
          return;
        }
        
        // Notify all players
        this.io.to(roomId).emit('game-started', { room });
        this.io.to(roomId).emit('round-started', { room });
        if (DEBUG) console.log(`Game started in room: ${room.name}`);
      } catch (error) {
        console.error(`[start-game] error`, { error: (error as Error).message });
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Handle resetting finished game
    socket.on('reset-game', (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const playerId = this.socketPlayers.get(socket.id);
        
        if (!playerId) {
          socket.emit('error', { message: 'Host not found' });
          return;
        }
        
        const room = this.gameManager.resetGame(roomId, playerId);
        
        if (!room) {
          socket.emit('error', { message: 'Failed to reset game' });
          return;
        }
        
        // Notify all players
        this.io.to(roomId).emit('game-reset', { room });
        this.io.to(roomId).emit('room-update', { room });
        if (DEBUG) console.log(`Game reset in room: ${room.name}`);
        
      } catch (error) {
        console.error(`[reset-game] error`, { error: (error as Error).message });
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Handle playing cards
    socket.on('play-cards', (data: { roomId: string; cards: any[] }) => {
      try {
        const { roomId, cards } = data;
        const playerId = this.socketPlayers.get(socket.id);
        
        if (!playerId) {
          socket.emit('error', { message: 'Player not found' });
          return;
        }
        
        const room = this.gameManager.playCards(roomId, playerId, cards);
        
        if (!room) {
          socket.emit('error', { message: 'Failed to play cards' });
          return;
        }
        
        // Notify all players
        this.io.to(roomId).emit('cards-played', { room });
        this.io.to(roomId).emit('room-update', { room });
        
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Handle judging
    socket.on('judge-play', (data: { roomId: string; playId: string }) => {
      try {
        const { roomId, playId } = data;
        const judgeId = this.socketPlayers.get(socket.id);
        
        if (!judgeId) {
          socket.emit('error', { message: 'Judge not found' });
          return;
        }
        
        const result = this.gameManager.judgePlay(roomId, judgeId, playId);
        
        if (!result) {
          socket.emit('error', { message: 'Failed to judge play' });
          return;
        }
        
        const { room, winner } = result;
        
        // Notify all players
        this.io.to(roomId).emit('round-complete', { room, winner });
        this.io.to(roomId).emit('room-update', { room });
        
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Handle mini-game join/move
    socket.on('mini-join', (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const playerId = this.socketPlayers.get(socket.id);
        if (!playerId) {
          socket.emit('error', { message: 'Player not found' });
          return;
        }
        const state = this.gameManager.miniJoin(roomId, playerId);
        if (!state) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        this.io.to(roomId).emit('mini-state', { roomId, state });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    socket.on('mini-move', (data: { roomId: string; x: number; y: number }) => {
      try {
        const { roomId, x, y } = data;
        const playerId = this.socketPlayers.get(socket.id);
        if (!playerId) {
          socket.emit('error', { message: 'Player not found' });
          return;
        }
        const state = this.gameManager.miniMove(roomId, playerId, x, y);
        if (!state) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        this.io.to(roomId).emit('mini-state', { roomId, state });
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (DEBUG) console.log('User disconnected:', socket.id);
      
      const playerId = this.socketPlayers.get(socket.id);
      if (playerId) {
        // Don't immediately clean up mappings - keep them for potential reconnection
        // Only clean up the socket -> player mapping, keep player -> socket for reconnection attempts
        this.socketPlayers.delete(socket.id);
        
        // Find and update all rooms this player is in
        const rooms = this.gameManager.getAllRooms();
        rooms.forEach(room => {
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            // Mark player as disconnected with timestamp
            this.gameManager.setPlayerConnection(room.id, playerId, false);
            if (DEBUG) console.log(`🔌 Player "${player.name}" disconnected from room "${room.name}"`);
            this.io.to(room.id).emit('room-update', { room });
          }
        });
      }
    });

    // Handle reconnection (when player rejoins with existing playerId)
    socket.on('reconnect-player', (data: { playerId: string; roomId: string }) => {
      try {
        const { playerId, roomId } = data;
        const room = this.gameManager.getRoom(roomId);
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const player = room.players.find(p => p.id === playerId);
        if (!player) {
          socket.emit('error', { message: 'Player not found in room' });
          return;
        }

        // Check if player is already connected from another socket
        const existingSocketId = this.playerSockets.get(playerId);
        if (existingSocketId && existingSocketId !== socket.id) {
          // Disconnect the old socket if it exists
          const existingSocket = this.io.sockets.sockets.get(existingSocketId);
          if (existingSocket) {
            if (DEBUG) console.log(`🔌 Disconnecting old socket for player "${player.name}"`);
            existingSocket.disconnect();
          }
        }

        // Update player-socket mapping
        this.playerSockets.set(playerId, socket.id);
        this.socketPlayers.set(socket.id, playerId);
        
        // Mark player as reconnected
        this.gameManager.setPlayerConnection(roomId, playerId, true);
        
        // Join socket room
        socket.join(roomId);
        
        // Notify player of successful reconnection
        socket.emit('player-reconnected', { room, playerId });
        
        // Notify other players
        this.io.to(roomId).emit('room-update', { room });
        if (DEBUG) console.log(`🔌 Player "${player.name}" reconnected to room "${room.name}"`);
      } catch (error) {
        socket.emit('error', { message: (error as Error).message });
      }
    });
  }
}
