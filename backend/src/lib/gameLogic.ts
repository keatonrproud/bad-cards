import { v4 as uuidv4 } from 'uuid';
import { GameRoom, Player, GameRound, WhiteCard, BlackCard, GamePlay } from '../types/game';
import { whiteCards, blackCards, shuffleCards, dealBlackCards, getRandomWhiteCard } from '../data/cards';

export class GameLogicManager {
  private rooms: Map<string, GameRoom> = new Map();
  private whiteCardDeck: WhiteCard[] = [];
  private blackCardDeck: BlackCard[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;
  private miniSpawnIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Cleanup configuration (in milliseconds)
  private readonly CLEANUP_CONFIG = {
    SINGLE_PLAYER_TIMEOUT: 30 * 60 * 1000,      // 30 minutes alone
    DISCONNECTED_PLAYER_TIMEOUT: 10 * 60 * 1000, // 10 minutes disconnected
    FINISHED_GAME_TIMEOUT: 60 * 60 * 1000,       // 1 hour after game finished  
    INACTIVE_WAITING_TIMEOUT: 2 * 60 * 60 * 1000, // 2 hours in waiting state
    CLEANUP_INTERVAL: 5 * 60 * 1000              // Check every 5 minutes
  };

  private readonly MINI_CONFIG = {
    WIDTH: 720,
    HEIGHT: 420,
    ACTIVE_CAP: 18,
    SPAWN_MS: 600,
    COLLISION_RADIUS: 24
  };

  constructor() {
    this.initializeDecks();
    this.startPeriodicCleanup();
  }

  private initializeDecks() {
    this.whiteCardDeck = shuffleCards([...whiteCards]);
    this.blackCardDeck = shuffleCards([...blackCards]);
  }

  private startPeriodicCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.performRoomCleanup();
    }, this.CLEANUP_CONFIG.CLEANUP_INTERVAL);
  }

  private performRoomCleanup() {
    const now = Date.now();
    const roomsToDelete: string[] = [];

    for (const [roomId, room] of this.rooms) {
      const timeSinceCreation = now - room.createdAt.getTime();
      const connectedPlayers = room.players.filter(p => p.isConnected);
      const allPlayersDisconnected = connectedPlayers.length === 0;
      
      // Mark room for deletion if any condition is met
      let shouldDelete = false;
      let reason = '';

      // Single player timeout
      if (room.players.length === 1 && timeSinceCreation > this.CLEANUP_CONFIG.SINGLE_PLAYER_TIMEOUT) {
        shouldDelete = true;
        reason = 'single player timeout';
      }
      
      // All players disconnected
      else if (allPlayersDisconnected && timeSinceCreation > this.CLEANUP_CONFIG.DISCONNECTED_PLAYER_TIMEOUT) {
        shouldDelete = true;
        reason = 'all players disconnected';
      }
      
      // Finished game cleanup
      else if (room.status === 'finished' && timeSinceCreation > this.CLEANUP_CONFIG.FINISHED_GAME_TIMEOUT) {
        shouldDelete = true;
        reason = 'finished game timeout';
      }
      
      // Inactive waiting room
      else if (room.status === 'waiting' && timeSinceCreation > this.CLEANUP_CONFIG.INACTIVE_WAITING_TIMEOUT) {
        shouldDelete = true;
        reason = 'inactive waiting room timeout';
      }

      if (shouldDelete) {
        roomsToDelete.push(roomId);
        console.log(`🧹 Cleaning up room "${room.name}" (${roomId}): ${reason}`);
      } else {
        // Clean up disconnected players from active rooms
        this.cleanupDisconnectedPlayers(room, now);
      }
    }

    // Delete marked rooms
    roomsToDelete.forEach(roomId => {
      this.rooms.delete(roomId);
    });

    if (roomsToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${roomsToDelete.length} rooms. Active rooms: ${this.rooms.size}`);
    }
  }

  createRoom(roomName: string, hostName: string, maxPlayers: number = 8): { room: GameRoom; playerId: string } {
    const roomId = uuidv4();
    const hostId = uuidv4();
    
    const host: Player = {
      id: hostId,
      name: hostName,
      isHost: true,
      score: 0,
      hand: [],
      isConnected: true
    };

    const room: GameRoom = {
      id: roomId,
      name: roomName,
      hostId,
      players: [host],
      maxPlayers,
      status: 'waiting',
      rounds: [],
      settings: {
        maxScore: 1,
        roundTimer: 90,
        judgeTimer: 60
      },
      createdAt: new Date()
    };

    this.rooms.set(roomId, room);
    return { room, playerId: hostId };
  }

  joinRoom(roomId: string, playerName: string): { room: GameRoom; playerId: string } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    if (room.status !== 'waiting') {
      throw new Error('Game already in progress');
    }

    if (room.players.some(p => p.name === playerName)) {
      throw new Error('Player name already taken');
    }

    const playerId = uuidv4();
    const player: Player = {
      id: playerId,
      name: playerName,
      isHost: false,
      score: 0,
      hand: [],
      isConnected: true
    };

    room.players.push(player);
    return { room, playerId };
  }

  leaveRoom(roomId: string, playerId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return null;

    const player = room.players[playerIndex];
    
    // If host leaves, transfer to next player or delete room
    if (player.isHost && room.players.length > 1) {
      room.players[1].isHost = true;
      room.hostId = room.players[1].id;
    } else if (player.isHost) {
      this.rooms.delete(roomId);
      return null;
    }

    room.players.splice(playerIndex, 1);
    
    // If game is active and not enough players, end game
    if (room.status === 'active' && room.players.length < 3) {
      room.status = 'finished';
    }

    return room;
  }

  startGame(roomId: string, hostId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    if (room.hostId !== hostId) {
      throw new Error('Only host can start the game');
    }

    if (room.players.length < 3) {
      throw new Error('Need at least 3 players to start');
    }

    if (room.status !== 'waiting') {
      throw new Error('Game already started');
    }

    // Stop waiting room mini-game when main game starts
    this.stopWaitingMini(roomId);

    // Deal initial hands (7 cards per player)
    room.players.forEach(player => {
      player.hand = dealBlackCards(7);
      player.score = 0;
    });

    room.status = 'active';
    this.startNewRound(room);
    
    return room;
  }

  private startNewRound(room: GameRoom): void {
    const roundNumber = room.rounds.length + 1;
    
    // Get next judge (rotate through players)
    const judgeIndex = (roundNumber - 1) % room.players.length;
    const judge = room.players[judgeIndex];

    // Draw white card
    if (this.whiteCardDeck.length === 0) {
      this.whiteCardDeck = shuffleCards([...whiteCards]);
    }
    const whiteCard = this.whiteCardDeck.pop()!;

    const round: GameRound = {
      id: uuidv4(),
      roundNumber,
      whiteCard,
      judgeId: judge.id,
      plays: [],
      status: 'playing',
      timeRemaining: room.settings.roundTimer
    };

    room.currentRound = round;
    room.rounds.push(round);
  }

  playCards(roomId: string, playerId: string, cards: BlackCard[]): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room || !room.currentRound) return null;

    const round = room.currentRound;
    if (round.status !== 'playing') {
      throw new Error('Not accepting plays right now');
    }

    if (round.judgeId === playerId) {
      throw new Error('Judge cannot play cards');
    }

    // Check if player already played
    if (round.plays.some(play => play.playerId === playerId)) {
      throw new Error('Already played this round');
    }

    // Validate card count matches white card blanks
    if (cards.length !== round.whiteCard.blanks) {
      throw new Error(`Must play exactly ${round.whiteCard.blanks} card(s)`);
    }

    // Remove cards from player's hand
    const player = room.players.find(p => p.id === playerId);
    if (!player) return null;

    cards.forEach(card => {
      const cardIndex = player.hand.findIndex(c => c.id === card.id);
      if (cardIndex !== -1) {
        player.hand.splice(cardIndex, 1);
      }
    });

    // Deal replacement cards
    const replacementCards = dealBlackCards(cards.length);
    player.hand.push(...replacementCards);

    // Add play to round
    const play: GamePlay = {
      playerId,
      cards
    };
    round.plays.push(play);

    // Check if all non-judge players have played
    const nonJudgePlayers = room.players.filter(p => p.id !== round.judgeId);
    if (round.plays.length === nonJudgePlayers.length) {
      round.status = 'judging';
      round.timeRemaining = room.settings.judgeTimer;
    }

    return room;
  }

  judgePlay(roomId: string, judgeId: string, playId: string): { room: GameRoom; winner: Player } | null {
    const room = this.rooms.get(roomId);
    if (!room || !room.currentRound) return null;

    const round = room.currentRound;
    if (round.judgeId !== judgeId) {
      throw new Error('Only the judge can select winning play');
    }

    if (round.status !== 'judging') {
      throw new Error('Not in judging phase');
    }

    const winningPlay = round.plays.find(play => 
      play.playerId === playId || play.cards.some(card => card.id === playId)
    );
    
    if (!winningPlay) {
      throw new Error('Invalid play selection');
    }

    round.winningPlayId = winningPlay.playerId;
    round.status = 'results';

    // Award point to winner
    const winner = room.players.find(p => p.id === winningPlay.playerId)!;
    winner.score += 1;

    // Check if game is complete
    if (winner.score >= room.settings.maxScore) {
      room.status = 'finished';
      round.status = 'completed';
    }

    return { room, winner };
  }

  nextRound(roomId: string, hostId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    if (room.hostId !== hostId && !room.currentRound) {
      throw new Error('Only host can advance rounds');
    }

    if (room.status === 'finished') {
      throw new Error('Game is finished');
    }

    if (!room.currentRound || room.currentRound.status !== 'results') {
      throw new Error('Round not ready to advance');
    }

    room.currentRound.status = 'completed';
    this.startNewRound(room);

    return room;
  }

  getRoom(roomId: string): GameRoom | null {
    return this.rooms.get(roomId) || null;
  }

  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  private cleanupDisconnectedPlayers(room: GameRoom, now: number) {
    const playersToRemove: string[] = [];
    
    room.players.forEach(player => {
      if (!player.isConnected && player.disconnectedAt) {
        const timeSinceDisconnection = now - player.disconnectedAt.getTime();
        
        if (timeSinceDisconnection > this.CLEANUP_CONFIG.DISCONNECTED_PLAYER_TIMEOUT) {
          playersToRemove.push(player.id);
        }
      }
    });

    playersToRemove.forEach(playerId => {
      const playerIndex = room.players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        console.log(`🧹 Removing disconnected player "${player.name}" from room "${room.name}"`);
        
        // Handle host transfer if needed
        if (player.isHost && room.players.length > 1) {
          const nextHost = room.players.find(p => p.id !== playerId);
          if (nextHost) {
            nextHost.isHost = true;
            room.hostId = nextHost.id;
          }
        }
        
        room.players.splice(playerIndex, 1);
        
        // If game is active and not enough players, end game
        if (room.status === 'active' && room.players.length < 3) {
          room.status = 'finished';
          console.log(`🎮 Game in room "${room.name}" ended due to insufficient players`);
        }
      }
    });
  }

  setPlayerConnection(roomId: string, playerId: string, connected: boolean): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.isConnected = connected;
      if (!connected) {
        player.disconnectedAt = new Date();
      } else {
        // Clear disconnection timestamp when reconnecting
        player.disconnectedAt = undefined;
      }
    }

    return room;
  }

  // Add method to get room statistics
  getRoomStatistics() {
    const stats = {
      totalRooms: this.rooms.size,
      waitingRooms: 0,
      activeRooms: 0,
      finishedRooms: 0,
      totalPlayers: 0,
      connectedPlayers: 0,
      disconnectedPlayers: 0
    };

    for (const room of this.rooms.values()) {
      if (room.status === 'waiting') stats.waitingRooms++;
      else if (room.status === 'active') stats.activeRooms++;
      else if (room.status === 'finished') stats.finishedRooms++;
      
      stats.totalPlayers += room.players.length;
      stats.connectedPlayers += room.players.filter(p => p.isConnected).length;
      stats.disconnectedPlayers += room.players.filter(p => !p.isConnected).length;
    }

    return stats;
  }

  // Add method to manually trigger cleanup (for testing/admin purposes)
  manualCleanup() {
    console.log('🧹 Manual cleanup triggered');
    this.performRoomCleanup();
  }

  // Clean shutdown
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('🧹 GameLogicManager cleanup stopped');
  }

  // Waiting room mini-game helpers
  private getOrCreateWaitingMini(room: GameRoom) {
    if (!room.waitingMini) {
      room.waitingMini = {
        width: this.MINI_CONFIG.WIDTH,
        height: this.MINI_CONFIG.HEIGHT,
        items: [],
        players: {}
      };
    }
    return room.waitingMini;
  }

  private spawnMiniItem(room: GameRoom) {
    const mini = this.getOrCreateWaitingMini(room);
    const types: Array<'star' | 'heart' | 'zap'> = ['star', 'heart', 'zap'];
    const newItem = {
      id: uuidv4(),
      x: Math.random() * (mini.width - 30) + 15,
      y: Math.random() * (mini.height - 30) + 15,
      type: types[Math.floor(Math.random() * types.length)] as 'star' | 'heart' | 'zap'
    };
    mini.items.push(newItem);
  }

  private ensureMiniSpawnLoop(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (this.miniSpawnIntervals.has(roomId)) return;

    const interval = setInterval(() => {
      const r = this.rooms.get(roomId);
      if (!r || r.status !== 'waiting') {
        this.stopWaitingMini(roomId);
        return;
      }
      const mini = this.getOrCreateWaitingMini(r);
      // Only count active items (those without collectedBy)
      const activeCount = mini.items.filter(it => !it.collectedBy).length;
      if (activeCount < this.MINI_CONFIG.ACTIVE_CAP) {
        this.spawnMiniItem(r);
      }
      // Prune fully collected items to avoid unbounded growth
      if (mini.items.length > 200) {
        mini.items = mini.items.filter(it => !it.collectedBy).slice(-this.MINI_CONFIG.ACTIVE_CAP);
      }
    }, this.MINI_CONFIG.SPAWN_MS);

    this.miniSpawnIntervals.set(roomId, interval);
  }

  private stopWaitingMini(roomId: string) {
    const interval = this.miniSpawnIntervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.miniSpawnIntervals.delete(roomId);
    }
    const room = this.rooms.get(roomId);
    if (room) {
      room.waitingMini = undefined;
    }
  }

  miniJoin(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const mini = this.getOrCreateWaitingMini(room);

    if (!mini.players[playerId]) {
      mini.players[playerId] = {
        x: Math.random() * (mini.width - 40) + 20,
        y: Math.random() * (mini.height - 40) + 20,
        score: 0
      };
    }

    // Ensure we have some items to start and spawn loop running
    this.ensureMiniSpawnLoop(roomId);
    return mini;
  }

  miniMove(roomId: string, playerId: string, x: number, y: number) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const mini = this.getOrCreateWaitingMini(room);

    const player = mini.players[playerId];
    if (!player) return mini;

    // Clamp movement
    const clampedX = Math.max(20, Math.min(mini.width - 20, x));
    const clampedY = Math.max(20, Math.min(mini.height - 20, y));
    player.x = clampedX;
    player.y = clampedY;

    // Collision detection with active items only
    for (const item of mini.items) {
      if (!item.collectedBy) {
        const dx = item.x - clampedX;
        const dy = item.y - clampedY;
        if (Math.abs(dx) < this.MINI_CONFIG.COLLISION_RADIUS && Math.abs(dy) < this.MINI_CONFIG.COLLISION_RADIUS) {
          item.collectedBy = playerId;
          player.score += 1;
        }
      }
    }

    // Remove collected items to allow respawn quickly
    mini.items = mini.items.filter(it => !it.collectedBy);

    return mini;
  }

  // Reset a finished game back to waiting state for replay
  resetGame(roomId: string, hostPlayerId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Verify the requester is the host
    const host = room.players.find(p => p.id === hostPlayerId && p.isHost);
    if (!host) {
      throw new Error('Only the room host can restart the game');
    }

    // Can only reset finished games
    if (room.status !== 'finished') {
      throw new Error('Can only restart finished games');
    }

    // Reset game state
    room.status = 'waiting';
    room.currentRound = undefined;
    room.rounds = [];
    
    // Reset all players
    room.players.forEach(player => {
      player.hand = [];
      player.score = 0;
    });

    // Re-initialize waiting room mini-game
    this.getOrCreateWaitingMini(room);

    console.log(`🔄 Game reset in room "${room.name}" by ${host.name}`);
    return room;
  }
}
