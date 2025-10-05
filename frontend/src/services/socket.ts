import { io, Socket } from 'socket.io-client';
import { GameRoom, Player, BlackCard } from '../types/game';

class SocketService {
  private socket: Socket | null = null;
  // Generic event listeners - args type varies by event, so any[] is acceptable here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map();
  private isConnecting = false;

  connect(): Socket {
    if (this.socket) {
      if (!this.socket.connected && !this.isConnecting) {
        this.socket.connect();
      }
      return this.socket;
    }

    if (this.isConnecting) {
      return this.socket!;
    }

    this.isConnecting = true;

    // Connect to the backend server
    const serverUrl = import.meta.env.PROD ? '' : 'http://localhost:3002';

    console.log('🔗 Connecting to game server at:', serverUrl || 'same-origin');

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      retries: 3,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to game server, socket ID:', this.socket?.id);
      this.isConnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from game server:', reason);
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔥 Connection error:', error);
      this.isConnecting = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.isConnecting = false;
  }

  // Room management
  createRoom(roomName: string, playerName: string, maxPlayers: number = 8) {
    console.log('🎮 Creating room:', { roomName, playerName, maxPlayers });
    this.socket?.emit('create-room', { roomName, playerName, maxPlayers });
  }

  joinRoom(roomId: string, playerName: string) {
    console.log('👥 Joining room:', { roomId, playerName });
    this.socket?.emit('join-room', { roomId, playerName });
  }

  reconnectPlayer(roomId: string, playerId: string) {
    console.log('🔌 Reconnecting player:', { roomId, playerId });
    this.socket?.emit('reconnect-player', { roomId, playerId });
  }

  leaveRoom(roomId: string) {
    console.log('🚪 Leaving room:', roomId);
    this.socket?.emit('leave-room', { roomId });
  }

  // Game actions
  startGame(roomId: string) {
    console.log('🚀 Starting game:', roomId);
    this.socket?.emit('start-game', { roomId });
  }

  // Waiting room mini-game
  miniJoin(roomId: string) {
    console.log('🕹️ Mini-game join:', { roomId });
    this.socket?.emit('mini-join', { roomId });
  }

  miniMove(roomId: string, x: number, y: number) {
    this.socket?.emit('mini-move', { roomId, x, y });
  }

  onMiniState(callback: (data: { roomId: string; state: any }) => void) {
    this.socket?.on('mini-state', (data) => {
      callback(data);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.addListener('mini-state', callback as any);
  }

  playCards(roomId: string, cards: BlackCard[]) {
    console.log('🃏 Playing cards:', { roomId, cards });
    this.socket?.emit('play-cards', { roomId, cards });
  }

  judgePlay(roomId: string, playId: string) {
    console.log('⚖️ Judging play:', { roomId, playId });
    this.socket?.emit('judge-play', { roomId, playId });
  }

  nextRound(roomId: string) {
    console.log('➡️ Next round:', roomId);
    this.socket?.emit('next-round', { roomId });
  }

  // Event listeners with better error handling
  onRoomCreated(callback: (data: { room: GameRoom; playerId: string }) => void) {
    console.log('📝 Setting up room-created listener');
    this.socket?.on('room-created', (data) => {
      console.log('🎉 Room created:', data);
      callback(data);
    });
    this.addListener('room-created', callback);
  }

  onPlayerJoined(callback: (data: { room: GameRoom; playerId: string }) => void) {
    console.log('📝 Setting up player-joined listener');
    this.socket?.on('player-joined', (data) => {
      console.log('👋 Player joined:', data);
      callback(data);
    });
    this.addListener('player-joined', callback);
  }

  onPlayerReconnected(callback: (data: { room: GameRoom; playerId: string }) => void) {
    console.log('📝 Setting up player-reconnected listener');
    this.socket?.on('player-reconnected', (data) => {
      console.log('🔌 Player reconnected:', data);
      callback(data);
    });
    this.addListener('player-reconnected', callback);
  }

  onPlayerLeft(callback: (data: { room: GameRoom; playerId: string }) => void) {
    this.socket?.on('player-left', (data) => {
      console.log('👋 Player left:', data);
      callback(data);
    });
    this.addListener('player-left', callback);
  }

  onGameStarted(callback: (data: { room: GameRoom }) => void) {
    this.socket?.on('game-started', (data) => {
      console.log('🎮 Game started:', data);
      callback(data);
    });
    this.addListener('game-started', callback);
  }

  onRoundStarted(callback: (data: { room: GameRoom }) => void) {
    this.socket?.on('round-started', (data) => {
      console.log('🔄 Round started:', data);
      callback(data);
    });
    this.addListener('round-started', callback);
  }

  onCardsPlayed(callback: (data: { room: GameRoom }) => void) {
    this.socket?.on('cards-played', (data) => {
      console.log('🃏 Cards played:', data);
      callback(data);
    });
    this.addListener('cards-played', callback);
  }

  onRoundComplete(callback: (data: { room: GameRoom; winner: Player }) => void) {
    this.socket?.on('round-complete', (data) => {
      console.log('🏆 Round complete:', data);
      callback(data);
    });
    this.addListener('round-complete', callback);
  }

  onGameComplete(callback: (data: { room: GameRoom; winner: Player }) => void) {
    this.socket?.on('game-complete', (data) => {
      console.log('🎊 Game complete:', data);
      callback(data);
    });
    this.addListener('game-complete', callback);
  }

  onRoomUpdate(callback: (data: { room: GameRoom }) => void) {
    this.socket?.on('room-update', (data) => {
      console.log('🔄 Room update:', data);
      callback(data);
    });
    this.addListener('room-update', callback);
  }

  onError(callback: (data: { message: string }) => void) {
    this.socket?.on('error', (data) => {
      console.error('❌ Socket error:', data);
      callback(data);
    });
    this.addListener('error', callback);
  }

  // Helper methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private addListener(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  removeAllListeners() {
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket?.off(event, callback);
      });
    });
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();
