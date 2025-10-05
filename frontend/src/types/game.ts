export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  hand: BlackCard[];
  isConnected: boolean;
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
}

export interface PublicRoom {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  maxScore: number;
  status: string;
  createdAt: Date;
}

export interface GameContextType {
  currentRoom: GameRoom | null;
  currentPlayer: Player | null;
  playerId: string | null;
  isConnected: boolean;
  isJoining: boolean;
  isCreating: boolean;
  setIsJoining: (joining: boolean) => void;
  setIsCreating: (creating: boolean) => void;
}
