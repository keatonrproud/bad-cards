export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  hand: BlackCard[];
  isConnected: boolean;
  disconnectedAt?: Date;
}

export interface WhiteCard {
  id: string;
  text: string;
  blanks: number;
}

export interface BlackCard {
  id: string;
  text: string;
}

export interface GamePlay {
  playerId: string;
  cards: BlackCard[];
}

export interface GameRound {
  id: string;
  roundNumber: number;
  whiteCard: WhiteCard;
  judgeId: string;
  plays: GamePlay[];
  winningPlayId?: string;
  status: 'playing' | 'judging' | 'results' | 'completed';
  timeRemaining?: number;
}

export interface GameRoom {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'active' | 'finished';
  currentRound?: GameRound;
  rounds: GameRound[];
  settings: {
    maxScore: number;
    roundTimer: number;
    judgeTimer: number;
  };
  createdAt: Date;
  waitingMini?: WaitingMiniState;
}

export interface GameState {
  rooms: Map<string, GameRoom>;
  whiteCards: WhiteCard[];
  blackCards: BlackCard[];
}

export interface SocketEvents {
  // Client to Server
  'create-room': (data: { roomName: string; playerName: string; maxPlayers: number }) => void;
  'join-room': (data: { roomId: string; playerName: string }) => void;
  'leave-room': (data: { roomId: string }) => void;
  'reconnect-player': (data: { playerId: string; roomId: string }) => void;
  'start-game': (data: { roomId: string }) => void;
  'play-cards': (data: { roomId: string; cards: BlackCard[] }) => void;
  'judge-play': (data: { roomId: string; playId: string }) => void;
  'next-round': (data: { roomId: string }) => void;
  'mini-join': (data: { roomId: string }) => void;
  'mini-move': (data: { roomId: string; x: number; y: number }) => void;
  
  // Server to Client
  'room-created': (data: { room: GameRoom; playerId: string }) => void;
  'player-joined': (data: { room: GameRoom; playerId: string }) => void;
  'player-left': (data: { room: GameRoom; playerId: string }) => void;
  'player-reconnected': (data: { room: GameRoom; playerId: string }) => void;
  'game-started': (data: { room: GameRoom }) => void;
  'round-started': (data: { room: GameRoom }) => void;
  'cards-played': (data: { room: GameRoom }) => void;
  'round-complete': (data: { room: GameRoom; winner: Player }) => void;
  'game-complete': (data: { room: GameRoom; winner: Player }) => void;
  'room-update': (data: { room: GameRoom }) => void;
  'mini-state': (data: { roomId: string; state: WaitingMiniState }) => void;
  'error': (data: { message: string }) => void;
}

export interface WaitingMiniState {
  width: number;
  height: number;
  items: MiniItem[];
  players: Record<string, MiniPlayerState>;
}

export interface MiniItem {
  id: string;
  x: number;
  y: number;
  type: 'star' | 'heart' | 'zap';
  collectedBy?: string;
}

export interface MiniPlayerState {
  x: number;
  y: number;
  score: number;
}
