const io = require('socket.io-client');

// Test reconnection functionality
async function testReconnection() {
  console.log('🧪 Testing reconnection functionality...');
  
  const serverUrl = 'https://bad-cards.fly.dev';
  
  // Create first socket and room
  const socket1 = io(serverUrl, {
    transports: ['websocket'],
    timeout: 10000
  });
  
  let roomId, playerId;
  
  socket1.on('connect', () => {
    console.log('✅ Socket 1 connected');
    
    // Create a room
    socket1.emit('create-room', {
      roomName: 'Reconnection Test',
      playerName: 'TestPlayer',
      maxPlayers: 8,
      maxScore: 7
    });
  });
  
  socket1.on('room-created', (data) => {
    console.log('🎉 Room created:', data.room.name);
    roomId = data.room.id;
    playerId = data.playerId;
    
    console.log('📝 Room ID:', roomId);
    console.log('👤 Player ID:', playerId);
    
    // Simulate disconnect after 2 seconds
    setTimeout(() => {
      console.log('🔌 Disconnecting socket 1...');
      socket1.disconnect();
      
      // Try to reconnect after 3 seconds
      setTimeout(() => {
        testReconnection();
      }, 3000);
    }, 2000);
  });
  
  function testReconnection() {
    console.log('🔄 Attempting reconnection...');
    
    const socket2 = io(serverUrl, {
      transports: ['websocket'],
      timeout: 10000
    });
    
    socket2.on('connect', () => {
      console.log('✅ Socket 2 connected, attempting reconnection...');
      
      // Try to reconnect to the room
      socket2.emit('reconnect-player', {
        roomId: roomId,
        playerId: playerId
      });
    });
    
    socket2.on('player-reconnected', (data) => {
      console.log('🎊 Successfully reconnected to room:', data.room.name);
      console.log('👥 Players in room:', data.room.players.length);
      
      // Test passed
      console.log('✅ Reconnection test PASSED!');
      socket2.disconnect();
      process.exit(0);
    });
    
    socket2.on('error', (error) => {
      console.error('❌ Reconnection failed:', error.message);
      console.log('❌ Reconnection test FAILED!');
      socket2.disconnect();
      process.exit(1);
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.error('⏰ Reconnection test timed out');
      socket2.disconnect();
      process.exit(1);
    }, 10000);
  }
  
  socket1.on('error', (error) => {
    console.error('❌ Socket 1 error:', error);
  });
  
  socket1.on('disconnect', () => {
    console.log('🔌 Socket 1 disconnected');
  });
}

// Run the test
testReconnection();
