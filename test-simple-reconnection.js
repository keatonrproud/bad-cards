const io = require('socket.io-client');

// Simple reconnection test
async function testSimpleReconnection() {
  console.log('🧪 Testing simple reconnection functionality...');
  
  const serverUrl = 'https://bad-cards.fly.dev';
  
  // Step 1: Create a room
  const socket1 = io(serverUrl, { 
    transports: ['websocket'], 
    timeout: 10000,
    reconnection: false // Disable auto-reconnection to test manual reconnection
  });
  
  let roomId, playerId;
  
  socket1.on('connect', () => {
    console.log('✅ Socket connected');
    
    socket1.emit('create-room', {
      roomName: 'Simple Reconnection Test',
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
    console.log('👥 Players in room:', data.room.players.length);
    
    // Wait a bit, then disconnect to simulate page refresh
    setTimeout(() => {
      console.log('🔌 Simulating page refresh - disconnecting...');
      socket1.disconnect();
      
      // Wait a moment then try to reconnect
      setTimeout(() => {
        attemptReconnection();
      }, 2000);
    }, 3000);
  });
  
  function attemptReconnection() {
    console.log('🔄 Attempting to reconnect...');
    
    const socket2 = io(serverUrl, { 
      transports: ['websocket'], 
      timeout: 10000,
      reconnection: false
    });
    
    socket2.on('connect', () => {
      console.log('✅ New socket connected, sending reconnect request...');
      
      socket2.emit('reconnect-player', {
        roomId: roomId,
        playerId: playerId
      });
    });
    
    socket2.on('player-reconnected', (data) => {
      console.log('🎊 Successfully reconnected!');
      console.log('🏠 Room name:', data.room.name);
      console.log('👥 Players in room:', data.room.players.length);
      console.log('🔗 Player connection status:', data.room.players.find(p => p.id === playerId)?.isConnected);
      
      console.log('✅ Simple reconnection test PASSED!');
      socket2.disconnect();
      process.exit(0);
    });
    
    socket2.on('error', (error) => {
      console.error('❌ Reconnection error:', error);
      console.log('❌ Simple reconnection test FAILED!');
      socket2.disconnect();
      process.exit(1);
    });
    
    socket2.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      socket2.disconnect();
      process.exit(1);
    });
    
    // Timeout
    setTimeout(() => {
      console.error('⏰ Reconnection test timed out');
      socket2.disconnect();
      process.exit(1);
    }, 15000);
  }
  
  socket1.on('error', (error) => {
    console.error('❌ Initial socket error:', error);
    process.exit(1);
  });
  
  socket1.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });
}

// Run the test
testSimpleReconnection();
