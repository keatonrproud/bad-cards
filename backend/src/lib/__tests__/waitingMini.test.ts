import test from 'node:test';
import assert from 'node:assert/strict';
import { GameLogicManager } from '../gameLogic';

// Helpers to create a room and get ids
function createRoomAndHost(manager: GameLogicManager) {
  const { room, playerId } = manager.createRoom('Test Room', 'Host', 8);
  return { roomId: room.id, hostId: playerId };
}

test('mini-join initializes state and allows item collection', () => {
  const manager = new GameLogicManager();
  const { roomId, hostId } = createRoomAndHost(manager);

  // Join mini-game
  const mini = manager.miniJoin(roomId, hostId);
  assert.ok(mini, 'Mini-game state should be initialized');
  assert.ok(mini && mini.players[hostId], 'Host player should be registered in mini-game');
  assert.equal(mini!.players[hostId].score, 0);

  // Add a collectible directly to state
  mini!.items.push({ id: 'it-1', x: mini!.players[hostId].x, y: mini!.players[hostId].y, type: 'star' });

  // Move to the same spot should collect
  const updated = manager.miniMove(roomId, hostId, mini!.players[hostId].x, mini!.players[hostId].y);
  assert.ok(updated, 'Mini-game state should be returned');
  assert.equal(updated!.players[hostId].score, 1, 'Score should increment after collect');
  assert.equal(updated!.items.length, 0, 'Collected items should be removed');
});

test('mini-move clamps within bounds', () => {
  const manager = new GameLogicManager();
  const { roomId, hostId } = createRoomAndHost(manager);
  const mini = manager.miniJoin(roomId, hostId)!;

  // Move far outside bounds (negative)
  const afterNeg = manager.miniMove(roomId, hostId, -1000, -1000)!;
  assert.ok(afterNeg.players[hostId].x >= 0, 'X should be clamped to >= 0-ish');
  assert.ok(afterNeg.players[hostId].y >= 0, 'Y should be clamped to >= 0-ish');

  // Move far outside bounds (beyond width/height)
  const afterPos = manager.miniMove(roomId, hostId, mini.width + 1000, mini.height + 1000)!;
  assert.ok(afterPos.players[hostId].x <= mini.width, 'X should be clamped to <= width-ish');
  assert.ok(afterPos.players[hostId].y <= mini.height, 'Y should be clamped to <= height-ish');
});
