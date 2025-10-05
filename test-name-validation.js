const { GameLogicManager } = require('./backend/dist/lib/gameLogic.js');

console.log('🧪 Testing player name validation fix...\n');

const gameManager = new GameLogicManager();

// Test 1: Create a room with a player
console.log('Test 1: Creating room with player "TestUser"');
const { room: room1, playerId: player1Id } = gameManager.createRoom('Test Room', 'TestUser', 4);
console.log(`✅ Room created: ${room1.name}, Player: ${room1.players[0].name}, ID: ${player1Id}\n`);

// Test 2: Try to join the same room with the same name (should work - reconnection)
console.log('Test 2: Trying to join same room with same name "TestUser" (reconnection scenario)');
try {
  const result = gameManager.joinRoom(room1.id, 'TestUser');
  if (result) {
    console.log(`✅ Reconnection successful! Player ID: ${result.playerId}`);
    console.log(`✅ Same player ID returned: ${result.playerId === player1Id}`);
    console.log(`✅ Room still has 1 player: ${result.room.players.length === 1}\n`);
  } else {
    console.log('❌ Join room returned null\n');
  }
} catch (error) {
  console.log(`❌ Error during reconnection: ${error.message}\n`);
}

// Test 3: Try to join with a different name (should work)
console.log('Test 3: Trying to join same room with different name "AnotherUser"');
try {
  const result = gameManager.joinRoom(room1.id, 'AnotherUser');
  if (result) {
    console.log(`✅ New player joined successfully! Player ID: ${result.playerId}`);
    console.log(`✅ Room now has 2 players: ${result.room.players.length === 2}`);
    console.log(`✅ Players: ${result.room.players.map(p => p.name).join(', ')}\n`);
  } else {
    console.log('❌ Join room returned null\n');
  }
} catch (error) {
  console.log(`❌ Error joining with different name: ${error.message}\n`);
}

// Test 4: Create another room and try to join with same name as in first room (should fail)
console.log('Test 4: Creating second room and trying to join with name "TestUser" (should fail)');
const { room: room2 } = gameManager.createRoom('Second Room', 'Host2', 4);
try {
  const result = gameManager.joinRoom(room2.id, 'TestUser');
  if (result) {
    console.log(`❌ This should have failed! Player joined: ${result.playerId}\n`);
  } else {
    console.log('❌ Join room returned null (unexpected)\n');
  }
} catch (error) {
  console.log(`✅ Correctly rejected duplicate name: ${error.message}\n`);
}

// Test 5: Disconnect player from first room and try to rejoin
console.log('Test 5: Disconnecting "TestUser" and trying to rejoin');
gameManager.setPlayerConnection(room1.id, player1Id, false);
try {
  const result = gameManager.joinRoom(room1.id, 'TestUser');
  if (result) {
    console.log(`✅ Disconnected player rejoined successfully! Player ID: ${result.playerId}`);
    console.log(`✅ Same player ID returned: ${result.playerId === player1Id}`);
    console.log(`✅ Player is now connected: ${result.room.players.find(p => p.id === player1Id)?.isConnected}\n`);
  } else {
    console.log('❌ Join room returned null\n');
  }
} catch (error) {
  console.log(`❌ Error during disconnected player rejoin: ${error.message}\n`);
}

console.log('🎉 All tests completed!');
