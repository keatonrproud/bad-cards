import { test, describe } from 'node:test';
import assert from 'node:assert';
import { GameLogicManager } from '../gameLogic';
import { GameRoom } from '../../types/game';

describe('Room Cleanup Tests', () => {
  test('should not cleanup rooms with single player before timeout', () => {
    const gameManager = new GameLogicManager();
    gameManager.shutdown(); // Stop automatic cleanup for testing

    const { room } = gameManager.createRoom('Test Room', 'Host', 4);
    
    // Manually trigger cleanup before timeout
    gameManager.manualCleanup();
    
    assert(gameManager.getRoom(room.id) !== null, 'Room should still exist before timeout');
    
    gameManager.shutdown();
  });

  test('should cleanup rooms with single player after timeout', () => {
    const gameManager = new GameLogicManager();
    gameManager.shutdown();

    const { room } = gameManager.createRoom('Test Room', 'Host', 4);
    
    // Mock the creation time to be older than timeout (30+ minutes ago)
    const oldRoom = gameManager.getRoom(room.id)!;
    oldRoom.createdAt = new Date(Date.now() - 31 * 60 * 1000);
    
    gameManager.manualCleanup();
    
    assert.strictEqual(gameManager.getRoom(room.id), null, 'Room should be cleaned up after timeout');
    
    gameManager.shutdown();
  });

  test('should remove disconnected players after timeout', () => {
    const gameManager = new GameLogicManager();
    gameManager.shutdown();

    const { room, playerId: hostId } = gameManager.createRoom('Test Room', 'Host', 4);
    const player2Result = gameManager.joinRoom(room.id, 'Player2');
    
    assert(player2Result !== null, 'Player2 should join successfully');
    const { playerId: player2Id } = player2Result!;
    
    // Disconnect player2
    gameManager.setPlayerConnection(room.id, player2Id, false);
    
    // Mock disconnection time to be older than timeout (10+ minutes ago)
    const updatedRoom = gameManager.getRoom(room.id)!;
    const disconnectedPlayer = updatedRoom.players.find(p => p.id === player2Id)!;
    disconnectedPlayer.disconnectedAt = new Date(Date.now() - 11 * 60 * 1000);
    
    gameManager.manualCleanup();
    
    const finalRoom = gameManager.getRoom(room.id)!;
    assert.strictEqual(finalRoom.players.length, 1, 'Only host should remain');
    assert.strictEqual(finalRoom.players[0].id, hostId, 'Host should be the remaining player');
    
    gameManager.shutdown();
  });

  test('should transfer host when disconnected host is removed', () => {
    const gameManager = new GameLogicManager();
    gameManager.shutdown();

    const { room, playerId: hostId } = gameManager.createRoom('Test Room', 'Host', 4);
    const player2Result = gameManager.joinRoom(room.id, 'Player2');
    
    const { playerId: player2Id } = player2Result!;
    
    // Disconnect host
    gameManager.setPlayerConnection(room.id, hostId, false);
    
    // Mock disconnection time
    const updatedRoom = gameManager.getRoom(room.id)!;
    const disconnectedHost = updatedRoom.players.find(p => p.id === hostId)!;
    disconnectedHost.disconnectedAt = new Date(Date.now() - 11 * 60 * 1000);
    
    gameManager.manualCleanup();
    
    const finalRoom = gameManager.getRoom(room.id)!;
    assert.strictEqual(finalRoom.players.length, 1, 'Only one player should remain');
    assert.strictEqual(finalRoom.hostId, player2Id, 'Player2 should become host');
    assert.strictEqual(finalRoom.players[0].isHost, true, 'Remaining player should be host');
    
    gameManager.shutdown();
  });

  test('should cleanup room when all players are disconnected after timeout', () => {
    const gameManager = new GameLogicManager();
    gameManager.shutdown();

    const { room, playerId: hostId } = gameManager.createRoom('Test Room', 'Host', 4);
    const player2Result = gameManager.joinRoom(room.id, 'Player2');
    
    const { playerId: player2Id } = player2Result!;
    
    // Disconnect all players
    gameManager.setPlayerConnection(room.id, hostId, false);
    gameManager.setPlayerConnection(room.id, player2Id, false);
    
    // Mock creation time to simulate timeout (10+ minutes)
    const updatedRoom = gameManager.getRoom(room.id)!;
    updatedRoom.createdAt = new Date(Date.now() - 11 * 60 * 1000);
    
    gameManager.manualCleanup();
    
    assert.strictEqual(gameManager.getRoom(room.id), null, 'Room should be cleaned up when all players disconnected');
    
    gameManager.shutdown();
  });

  test('should cleanup finished games after timeout', () => {
    const gameManager = new GameLogicManager();
    gameManager.shutdown();

    const { room } = gameManager.createRoom('Test Room', 'Host', 4);
    
    // Set room to finished status
    const updatedRoom = gameManager.getRoom(room.id)!;
    updatedRoom.status = 'finished';
    updatedRoom.createdAt = new Date(Date.now() - 61 * 60 * 1000); // 61 minutes ago
    
    gameManager.manualCleanup();
    
    assert.strictEqual(gameManager.getRoom(room.id), null, 'Finished room should be cleaned up');
    
    gameManager.shutdown();
  });

  test('should cleanup inactive waiting rooms after timeout', () => {
    const gameManager = new GameLogicManager();
    gameManager.shutdown();

    const { room } = gameManager.createRoom('Test Room', 'Host', 4);
    
    // Mock creation time to be older than inactive timeout (2+ hours ago)
    const updatedRoom = gameManager.getRoom(room.id)!;
    updatedRoom.createdAt = new Date(Date.now() - 2.1 * 60 * 60 * 1000);
    
    gameManager.manualCleanup();
    
    assert.strictEqual(gameManager.getRoom(room.id), null, 'Inactive waiting room should be cleaned up');
    
    gameManager.shutdown();
  });

  test('should end active game when players drop below minimum', () => {
    const gameManager = new GameLogicManager();
    gameManager.shutdown();

    const { room, playerId: hostId } = gameManager.createRoom('Test Room', 'Host', 4);
    gameManager.joinRoom(room.id, 'Player2');
    const player3Result = gameManager.joinRoom(room.id, 'Player3');
    const player4Result = gameManager.joinRoom(room.id, 'Player4');
    
    // Start game (requires 3+ players)
    gameManager.startGame(room.id, hostId);
    
    let activeRoom = gameManager.getRoom(room.id)!;
    assert.strictEqual(activeRoom.status, 'active', 'Game should be active');
    
    // Disconnect players to drop below 3
    gameManager.setPlayerConnection(room.id, player3Result!.playerId, false);
    gameManager.setPlayerConnection(room.id, player4Result!.playerId, false);
    
    // Mock disconnection times
    activeRoom = gameManager.getRoom(room.id)!;
    activeRoom.players.forEach(player => {
      if (!player.isConnected && player.disconnectedAt) {
        player.disconnectedAt = new Date(Date.now() - 11 * 60 * 1000);
      }
    });
    
    gameManager.manualCleanup();
    
    const finalRoom = gameManager.getRoom(room.id)!;
    assert.strictEqual(finalRoom.status, 'finished', 'Game should be finished due to insufficient players');
    assert.strictEqual(finalRoom.players.length, 2, 'Should have 2 remaining players');
    
    gameManager.shutdown();
  });

  test('should provide accurate room statistics', () => {
    const gameManager = new GameLogicManager();
    gameManager.shutdown();

    // Create various types of rooms
    const { room: waitingRoom } = gameManager.createRoom('Waiting Room', 'Host1', 4);
    
    const { room: activeRoom, playerId: host2 } = gameManager.createRoom('Active Room', 'Host2', 4);
    gameManager.joinRoom(activeRoom.id, 'Player2');
    gameManager.joinRoom(activeRoom.id, 'Player3');
    gameManager.startGame(activeRoom.id, host2);
    
    const { room: finishedRoom } = gameManager.createRoom('Finished Room', 'Host3', 4);
    const finishedRoomObj = gameManager.getRoom(finishedRoom.id)!;
    finishedRoomObj.status = 'finished';
    
    // Disconnect one player
    gameManager.setPlayerConnection(waitingRoom.id, waitingRoom.players[0].id, false);
    
    const stats = gameManager.getRoomStatistics();
    
    assert.strictEqual(stats.totalRooms, 3, 'Should have 3 total rooms');
    assert.strictEqual(stats.waitingRooms, 1, 'Should have 1 waiting room');
    assert.strictEqual(stats.activeRooms, 1, 'Should have 1 active room');
    assert.strictEqual(stats.finishedRooms, 1, 'Should have 1 finished room');
    assert.strictEqual(stats.totalPlayers, 5, 'Should have 5 total players');
    assert.strictEqual(stats.connectedPlayers, 4, 'Should have 4 connected players');
    assert.strictEqual(stats.disconnectedPlayers, 1, 'Should have 1 disconnected player');
    
    gameManager.shutdown();
  });

  test('should clear disconnection timestamp when player reconnects', () => {
    const gameManager = new GameLogicManager();
    gameManager.shutdown();

    const { room, playerId } = gameManager.createRoom('Test Room', 'Host', 4);
    
    // Disconnect player
    gameManager.setPlayerConnection(room.id, playerId, false);
    
    let updatedRoom = gameManager.getRoom(room.id)!;
    let player = updatedRoom.players.find(p => p.id === playerId)!;
    assert.strictEqual(player.isConnected, false, 'Player should be disconnected');
    assert(player.disconnectedAt !== undefined, 'Disconnection timestamp should be set');
    
    // Reconnect player
    gameManager.setPlayerConnection(room.id, playerId, true);
    
    updatedRoom = gameManager.getRoom(room.id)!;
    player = updatedRoom.players.find(p => p.id === playerId)!;
    assert.strictEqual(player.isConnected, true, 'Player should be reconnected');
    assert.strictEqual(player.disconnectedAt, undefined, 'Disconnection timestamp should be cleared');
    
    gameManager.shutdown();
  });
});
