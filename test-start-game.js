const io = require('socket.io-client');

// Connect three clients
const host = io('http://localhost:3002');
const player2 = io('http://localhost:3002');
const player3 = io('http://localhost:3002');

let roomId;
let hostPlayerId;

host.on('connect', () => {
  console.log('Host connected');
  // Create room
  host.emit('create-room', { roomName: 'Test Room', playerName: 'Host', maxPlayers: 8 });
});

host.on('room-created', (data) => {
  console.log('Room created:', data);
  roomId = data.room.id;
  hostPlayerId = data.playerId;
  
  // Join with other players
  player2.emit('join-room', { roomId, playerName: 'Player 2' });
});

player2.on('player-joined', (data) => {
  console.log('Player 2 joined:', data.playerId);
  // Join with player 3
  player3.emit('join-room', { roomId, playerName: 'Player 3' });
});

player3.on('player-joined', (data) => {
  console.log('Player 3 joined:', data.playerId);
  console.log('\n--- Starting game ---');
  // Start game as host
  host.emit('start-game', { roomId });
});

// Listen for game started event on all clients
host.on('game-started', (data) => {
  console.log('\nHost received game-started:', {
    roomStatus: data.room.status,
    hasCurrentRound: !!data.room.currentRound,
    currentRound: data.room.currentRound
  });
});

player2.on('game-started', (data) => {
  console.log('\nPlayer 2 received game-started:', {
    roomStatus: data.room.status,
    hasCurrentRound: !!data.room.currentRound
  });
});

player3.on('game-started', (data) => {
  console.log('\nPlayer 3 received game-started:', {
    roomStatus: data.room.status,
    hasCurrentRound: !!data.room.currentRound
  });
});

// Listen for errors
[host, player2, player3].forEach((client, index) => {
  client.on('error', (data) => {
    console.error(`Client ${index + 1} error:`, data);
  });
  
  client.on('connect_error', (error) => {
    console.error(`Client ${index + 1} connection error:`, error.message);
  });
});

// Listen for round started
host.on('round-started', (data) => {
  console.log('\nRound started event received:', {
    hasCurrentRound: !!data.room.currentRound,
    roundNumber: data.room.currentRound?.roundNumber
  });
});

// Cleanup after test
setTimeout(() => {
  console.log('\nClosing connections...');
  host.disconnect();
  player2.disconnect();
  player3.disconnect();
  process.exit(0);
}, 5000);
