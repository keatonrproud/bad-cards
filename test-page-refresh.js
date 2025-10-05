const io = require('socket.io-client');

// Test page refresh reconnection functionality
async function testPageRefreshReconnection() {
  console.log('🧪 Testing page refresh reconnection functionality...');
  
  const serverUrl = 'https://bad-cards.fly.dev';
  
  // Step 1: Create a room and join with multiple players
  const socket1 = io(serverUrl, { transports: ['websocket'], timeout: 10000 });
  const socket2 = io(serverUrl, { transports: ['websocket'], timeout: 10000 });
  
  let roomId, player1Id, player2Id;
  let playersJoined = 0;
  
  // Player 1 creates room
  socket1.on('connect', () => {
    console.log('✅ Player 1 connected');
    socket1.emit('create-room', {
      roomName: 'Page Refresh Test',
      playerName: 'Player1',
      maxPlayers: 8,
      maxScore: 7
    });
  });
  
  socket1.on('room-created', (data) => {
    console.log('🎉 Room created by Player 1');
    roomId = data.room.id;
    player1Id = data.playerId;
    playersJoined++;
    
    // Now connect player 2
    socket2.connect();
  });
  
  // Player 2 joins room
  socket2.on('connect', () => {
    console.log('✅ Player 2 connected');
    socket2.emit('join-room', {
      roomId: roomId,
      playerName: 'Player2'
    });
  });
  
  socket2.on('player-joined', (data) => {
    console.log('👋 Player 2 joined room');
    player2Id = data.playerId;
    playersJoined++;
    
    if (playersJoined === 2) {
      console.log('👥 Both players in room, simulating page refresh for Player 1...');
      
      // Simulate page refresh - disconnect and reconnect immediately
      setTimeout(() => {
        socket1.disconnect();
        
        // Simulate the delay of a page refresh (1 second)
        setTimeout(() => {
          simulatePageRefresh();
        }, 1000);
      }, 2000);
    }
  });
  
  function simulatePageRefresh() {
    console.log('🔄 Simulating page refresh reconnection...');
    
    const socket1Refresh = io(serverUrl, {
      transports: ['websocket'],
      timeout: 10000
    });
    
    socket1Refresh.on('connect', () => {
      console.log('✅ Player 1 reconnected after refresh');
      
      // Simulate the frontend reconnection logic
      socket1Refresh.emit('reconnect-player', {
        roomId: roomId,
        playerId: player1Id
      });
    });
    
    socket1Refresh.on('player-reconnected', (data) => {
      console.log('🎊 Player 1 successfully reconnected!');
      console.log('👥 Players in room:', data.room.players.length);
      console.log('🏠 Room status:', data.room.status);
      
      // Verify both players are still in the room
      const player1 = data.room.players.find(p => p.id === player1Id);
      const player2 = data.room.players.find(p => p.id === player2Id);
      
      if (player1 && player2) {
        console.log('✅ Both players still in room after refresh!');
        console.log('✅ Page refresh reconnection test PASSED!');
      } else {
        console.log('❌ Missing players after reconnection');
        console.log('❌ Page refresh reconnection test FAILED!');
      }
      
      // Cleanup
      socket1Refresh.disconnect();
      socket2.disconnect();
      process.exit(player1 && player2 ? 0 : 1);
    });
    
    socket1Refresh.on('error', (error) => {
      console.error('❌ Reconnection failed:', error.message);
      console.log('❌ Page refresh reconnection test FAILED!');
      socket1Refresh.disconnect();
      socket2.disconnect();
      process.exit(1);
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.error('⏰ Page refresh reconnection test timed out');
      socket1Refresh.disconnect();
      socket2.disconnect();
      process.exit(1);
    }, 10000);
  }
  
  // Error handlers
  socket1.on('error', (error) => {
    console.error('❌ Socket 1 error:', error);
  });
  
  socket2.on('error', (error) => {
    console.error('❌ Socket 2 error:', error);
  });
}

// Run the test
testPageRefreshReconnection();
