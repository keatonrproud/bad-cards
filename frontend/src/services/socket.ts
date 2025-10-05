import { io, Socket } from 'socket.io-client';
import { GameRoom, Player, BlackCard } from '../types/game';

const DEBUG = false;

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

    // Connect to the backend server - use environment variables
    const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
    const serverUrl = isDevelopment 
      ? process.env.BACKEND_URL || 'http://localhost:3002'
      : window.location.origin;

    if (DEBUG) console.log('🔌 Connecting to game server at:', serverUrl);

    this.socket = io(serverUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      if (DEBUG) console.log('✅ Connected to game server, socket ID:', this.socket?.id);
      this.isConnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      if (DEBUG) console.log('❌ Disconnected from game server:', reason);
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      if (DEBUG) console.error('🔥 Connection error:', error);
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

  // Helper: emit once the socket is connected (retries for up to ~2s)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emitWhenConnected(event: string, payload: any, ack?: (...args: any[]) => void) {
    const socket = this.connect();
    const attemptEmit = (retries = 20) => {
      if (socket && socket.connected && socket.id) {
        if (DEBUG) console.log(`➡️ Emitting ${event}`, payload);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (socket.emit as any)(event, payload, ack as any);
      } else if (retries > 0) {
        if (DEBUG) console.log(`⏳ Waiting to emit ${event}...`, { retries });
        setTimeout(() => attemptEmit(retries - 1), 100);
      } else {
        console.error(`❌ Failed to emit ${event}: socket not connected`);
      }
    };
    attemptEmit();
  }

  // Room management
  createRoom(roomName: string, playerName: string, maxPlayers: number = 8, maxScore: number = 7, roundTimer: number = 45) {
    console.log('Creating room:', { roomName, playerName, maxPlayers, maxScore, roundTimer });
    this.emitWhenConnected('create-room', { roomName, playerName, maxPlayers, maxScore, roundTimer });
  }

  joinRoom(roomId: string, playerName: string) {
    if (DEBUG) console.log('👥 Joining room:', { roomId, playerName });
    this.emitWhenConnected('join-room', { roomId, playerName });
  }

  reconnectPlayer(roomId: string, playerId: string) {
    if (DEBUG) console.log('🔌 Reconnecting player:', { roomId, playerId });
    this.emitWhenConnected('reconnect-player', { roomId, playerId });
  }

  leaveRoom(roomId: string) {
    if (DEBUG) console.log('🚪 Leaving room:', roomId);
    this.emitWhenConnected('leave-room', { roomId });
  }

  // Game actions
  startGame(roomId: string) {
    if (DEBUG) console.log('🚀 Starting game:', roomId);
    this.emitWhenConnected('start-game', { roomId }, (ack: unknown) => {
      if (DEBUG) console.log('📨 Start-game acknowledgment received:', ack);
    });
  }

  // Waiting room mini-game
  miniJoin(roomId: string) {
    if (DEBUG) console.log('��️ Mini-game join:', { roomId });
    this.emitWhenConnected('mini-join', { roomId });
  }

  miniMove(roomId: string, x: number, y: number) {
    this.emitWhenConnected('mini-move', { roomId, x, y });
  }

  onMiniState(callback: (data: { roomId: string; state: any }) => void) {
    this.socket?.on('mini-state', (data) => {
      if (DEBUG) console.log('🕹️ Mini state:', data);
      callback(data);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.addListener('mini-state', callback as any);
  }

  playCards(roomId: string, cards: BlackCard[]) {
    if (DEBUG) console.log('�� Playing cards:', { roomId, cards });
    this.emitWhenConnected('play-cards', { roomId, cards });
  }

  judgePlay(roomId: string, playId: string) {
    if (DEBUG) console.log('⚖️ Judging play:', { roomId, playId });
    this.emitWhenConnected('judge-play', { roomId, playId });
  }

  nextRound(roomId: string) {
    if (DEBUG) console.log('➡️ Next round:', roomId);
    this.emitWhenConnected('next-round', { roomId });
  }

  resetGame(roomId: string) {
    if (DEBUG) console.log('🔄 Resetting game:', roomId);
    this.emitWhenConnected('reset-game', { roomId });
  }

  // Event listeners with better error handling
  onRoomCreated(callback: (data: { room: GameRoom; playerId: string }) => void) {
    if (DEBUG) console.log('📝 Setting up room-created listener');
    this.socket?.on('room-created', (data) => {
      if (DEBUG) console.log('🎉 Room created:', data);
      callback(data);
    });
    this.addListener('room-created', callback);
  }

  onPlayerJoined(callback: (data: { room: GameRoom; playerId: string }) => void) {
    if (DEBUG) console.log('�� Setting up player-joined listener');
    this.socket?.on('player-joined', (data) => {
      if (DEBUG) console.log('👋 Player joined:', data);
      callback(data);
    });
    this.addListener('player-joined', callback);
  }

  onPlayerReconnected(callback: (data: { room: GameRoom; playerId: string }) => void) {
    if (DEBUG) console.log('�� Setting up player-reconnected listener');
    this.socket?.on('player-reconnected', (data) => {
      if (DEBUG) console.log('�� Player reconnected:', data);
      callback(data);
    });
    this.addListener('player-reconnected', callback);
  }

  onPlayerLeft(callback: (data: { room: GameRoom; playerId: string }) => void) {
    this.socket?.on('player-left', (data) => {
      if (DEBUG) console.log('👋 Player left:', data);
      callback(data);
    });
    this.addListener('player-left', callback);
  }

  onGameStarted(callback: (data: { room: GameRoom }) => void) {
    this.socket?.on('game-started', (data) => {
      if (DEBUG) console.log('🎮 Game started:', data);
      callback(data);
    });
    this.addListener('game-started', callback);
  }

  onRoundStarted(callback: (data: { room: GameRoom }) => void) {
    this.socket?.on('round-started', (data) => {
      if (DEBUG) console.log('🔄 Round started:', data);
      callback(data);
    });
    this.addListener('round-started', callback);
  }

  onCardsPlayed(callback: (data: { room: GameRoom }) => void) {
    this.socket?.on('cards-played', (data) => {
      if (DEBUG) console.log('🃏 Cards played:', data);
      callback(data);
    });
    this.addListener('cards-played', callback);
  }

  onRoundComplete(callback: (data: { room: GameRoom; winner: Player }) => void) {
    this.socket?.on('round-complete', (data) => {
      if (DEBUG) console.log('🏆 Round complete:', data);
      callback(data);
    });
    this.addListener('round-complete', callback);
  }

  onGameComplete(callback: (data: { room: GameRoom; winner: Player }) => void) {
    this.socket?.on('game-complete', (data) => {
      if (DEBUG) console.log('🎊 Game complete:', data);
      callback(data);
    });
    this.addListener('game-complete', callback);
  }

  onGameReset(callback: (data: { room: GameRoom }) => void) {
    this.socket?.on('game-reset', (data) => {
      if (DEBUG) console.log('🔄 Game reset:', data);
      callback(data);
    });
    this.addListener('game-reset', callback);
  }

  onRoomUpdate(callback: (data: { room: GameRoom }) => void) {
    this.socket?.on('room-update', (data) => {
      if (DEBUG) console.log('🔄 Room update:', data);
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
