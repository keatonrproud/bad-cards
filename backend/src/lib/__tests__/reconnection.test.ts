import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { GameLogicManager } from '../gameLogic';
import { GameRoom } from '../../types/game';

describe('Player Reconnection', () => {
  let gameManager: GameLogicManager;
  let room: GameRoom;
  let playerId: string;
  let roomId: string;

  beforeEach(() => {
    gameManager = new GameLogicManager();
    const result = gameManager.createRoom('Test Room', 'Alice', 3);
    room = result.room;
    playerId = result.playerId;
    roomId = room.id;
  });

  afterEach(() => {
    // Clean up
    gameManager.leaveRoom(roomId, playerId);
  });

  it('should allow player to reconnect with existing playerId', () => {
    // Arrange: Mark player as disconnected
    gameManager.setPlayerConnection(roomId, playerId, false);
    
    const roomBeforeReconnect = gameManager.getRoom(roomId);
    expect(roomBeforeReconnect).toBeDefined();
    const playerBeforeReconnect = roomBeforeReconnect!.players.find(p => p.id === playerId);
    expect(playerBeforeReconnect?.isConnected).toBe(false);

    // Act: Reconnect the player
    gameManager.setPlayerConnection(roomId, playerId, true);
    
    // Assert: Player should be marked as connected
    const roomAfterReconnect = gameManager.getRoom(roomId);
    const playerAfterReconnect = roomAfterReconnect!.players.find(p => p.id === playerId);
    
    expect(playerAfterReconnect).toBeDefined();
    expect(playerAfterReconnect?.isConnected).toBe(true);
    expect(playerAfterReconnect?.name).toBe('Alice');
    expect(playerAfterReconnect?.id).toBe(playerId);
  });

  it('should maintain game state when player reconnects', () => {
    // Arrange: Add more players and start game
    const player2 = gameManager.joinRoom(roomId, 'Bob');
    const player3 = gameManager.joinRoom(roomId, 'Charlie');
    expect(player2).toBeDefined();
    expect(player3).toBeDefined();
    
    gameManager.startGame(roomId, playerId);
    
    const roomBeforeDisconnect = gameManager.getRoom(roomId);
    const aliceHandBefore = roomBeforeDisconnect!.players.find(p => p.id === playerId)?.hand;
    
    // Act: Disconnect and reconnect Alice
    gameManager.setPlayerConnection(roomId, playerId, false);
    gameManager.setPlayerConnection(roomId, playerId, true);
    
    // Assert: Game state and player hand should be preserved
    const roomAfterReconnect = gameManager.getRoom(roomId);
    const aliceAfterReconnect = roomAfterReconnect!.players.find(p => p.id === playerId);
    
    expect(aliceAfterReconnect?.hand).toEqual(aliceHandBefore);
    expect(roomAfterReconnect!.status).toBe('playing');
    expect(roomAfterReconnect!.rounds.length).toBeGreaterThan(0);
  });

  it('should not allow reconnection with invalid playerId', () => {
    // Arrange
    const invalidPlayerId = 'invalid-player-id';
    
    // Act & Assert: Should return room but player should not exist
    const room = gameManager.getRoom(roomId);
    const player = room?.players.find(p => p.id === invalidPlayerId);
    
    expect(player).toBeUndefined();
  });

  it('should not allow reconnection to non-existent room', () => {
    // Arrange
    const invalidRoomId = 'invalid-room-id';
    
    // Act & Assert
    const room = gameManager.getRoom(invalidRoomId);
    
    expect(room).toBeNull();
  });

  it('should preserve player score on reconnection', () => {
    // Arrange: Setup game with score
    gameManager.joinRoom(roomId, 'Bob');
    gameManager.joinRoom(roomId, 'Charlie');
    gameManager.startGame(roomId, playerId);
    
    // Manually set a score for testing
    const room = gameManager.getRoom(roomId);
    const alice = room!.players.find(p => p.id === playerId);
    if (alice) {
      alice.score = 5;
    }
    
    // Act: Disconnect and reconnect
    gameManager.setPlayerConnection(roomId, playerId, false);
    gameManager.setPlayerConnection(roomId, playerId, true);
    
    // Assert: Score should be preserved
    const roomAfter = gameManager.getRoom(roomId);
    const aliceAfter = roomAfter!.players.find(p => p.id === playerId);
    
    expect(aliceAfter?.score).toBe(5);
  });

  it('should allow player to rejoin room with same name without "name taken" error', () => {
    // Arrange: Player disconnects (but stays in room)
    gameManager.setPlayerConnection(roomId, playerId, false);
    
    const roomBeforeRejoin = gameManager.getRoom(roomId);
    expect(roomBeforeRejoin).toBeDefined();
    const playerBeforeRejoin = roomBeforeRejoin!.players.find(p => p.name === 'Alice');
    expect(playerBeforeRejoin).toBeDefined();
    expect(playerBeforeRejoin?.isConnected).toBe(false);

    // Act: Try to join room again with same name (simulates frontend rejoin)
    const result = gameManager.joinRoom(roomId, 'Alice');
    
    // Assert: Should succeed and return the existing player's ID
    expect(result).toBeDefined();
    expect(result?.playerId).toBe(playerId);
    expect(result?.room.players.length).toBe(1); // Should not create duplicate player
    
    const playerAfterRejoin = result?.room.players.find(p => p.name === 'Alice');
    expect(playerAfterRejoin?.isConnected).toBe(true);
    expect(playerAfterRejoin?.id).toBe(playerId);
  });
});
