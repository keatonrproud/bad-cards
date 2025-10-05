import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GameRoom, Player, GameContextType } from '../types/game';
import { socketService } from '../services/socket';

const GameContext = createContext<GameContextType | undefined>(undefined);

// SessionStorage keys (persists across refreshes, clears on tab close)
const STORAGE_KEYS = {
  ROOM_ID: 'badcards_room_id',
  PLAYER_ID: 'badcards_player_id',
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Persist playerId to sessionStorage whenever it changes
  useEffect(() => {
    if (playerId) {
      sessionStorage.setItem(STORAGE_KEYS.PLAYER_ID, playerId);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
    }
  }, [playerId]);

  // Persist roomId to sessionStorage whenever currentRoom changes
  useEffect(() => {
    if (currentRoom?.id) {
      sessionStorage.setItem(STORAGE_KEYS.ROOM_ID, currentRoom.id);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.ROOM_ID);
    }
  }, [currentRoom?.id]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    console.log('🎮 GameContext: Setting up socket listeners');
    
    // Connect to socket when context mounts
    const socket = socketService.connect();
    setIsConnected(socket.connected);

    // Set up socket listeners with proper error handling
    socketService.onRoomCreated(({ room, playerId: newPlayerId }) => {
      console.log('🎉 GameContext: Room created, navigating to game');
      setCurrentRoom(room);
      setPlayerId(newPlayerId);
      setCurrentPlayer(room.players.find(p => p.id === newPlayerId) || null);
      setError(null);
      setIsCreating(false);
      
      // Navigate to game page
      setTimeout(() => {
        navigate('/game');
      }, 100);
    });

    socketService.onPlayerJoined(({ room, playerId: newPlayerId }) => {
      console.log('👋 GameContext: Joined room, updating state');
      setCurrentRoom(room);
      setIsJoining(false);
      
      if (!playerId) {
        setPlayerId(newPlayerId);
        setCurrentPlayer(room.players.find(p => p.id === newPlayerId) || null);
        
        // Navigate to game page
        setTimeout(() => {
          navigate('/game');
        }, 100);
      }
      setError(null);
    });

    socketService.onPlayerReconnected(({ room, playerId: reconnectedPlayerId }) => {
      console.log('🔌 GameContext: Player reconnected successfully');
      setCurrentRoom(room);
      setPlayerId(reconnectedPlayerId);
      setCurrentPlayer(room.players.find(p => p.id === reconnectedPlayerId) || null);
      setIsReconnecting(false);
      setError(null);
      
      // Navigate to game page if not already there
      if (location.pathname !== '/game') {
        setTimeout(() => {
          navigate('/game');
        }, 100);
      }
    });

    socketService.onRoomUpdate(({ room }) => {
      console.log('🔄 GameContext: Room updated');
      setCurrentRoom(room);
      if (playerId) {
        setCurrentPlayer(room.players.find(p => p.id === playerId) || null);
      }
    });

    socketService.onGameStarted(({ room }) => {
      console.log('🚀 GameContext: Game started');
      setCurrentRoom(room);
      if (playerId) {
        setCurrentPlayer(room.players.find(p => p.id === playerId) || null);
      }
    });

    socketService.onRoundStarted(({ room }) => {
      console.log('🔄 GameContext: Round started');
      setCurrentRoom(room);
      if (playerId) {
        setCurrentPlayer(room.players.find(p => p.id === playerId) || null);
      }
    });

    socketService.onCardsPlayed(({ room }) => {
      console.log('🃏 GameContext: Cards played');
      setCurrentRoom(room);
      if (playerId) {
        setCurrentPlayer(room.players.find(p => p.id === playerId) || null);
      }
    });

    socketService.onRoundComplete(({ room }) => {
      console.log('🏆 GameContext: Round complete');
      setCurrentRoom(room);
      if (playerId) {
        setCurrentPlayer(room.players.find(p => p.id === playerId) || null);
      }
    });

    socketService.onGameComplete(({ room }) => {
      console.log('🎊 GameContext: Game complete');
      setCurrentRoom(room);
      if (playerId) {
        setCurrentPlayer(room.players.find(p => p.id === playerId) || null);
      }
    });

    socketService.onPlayerLeft(({ room }) => {
      console.log('👋 GameContext: Player left');
      setCurrentRoom(room);
      if (playerId) {
        setCurrentPlayer(room.players.find(p => p.id === playerId) || null);
      }
    });

    socketService.onError(({ message }) => {
      console.error('❌ GameContext: Socket error:', message);
      
      // Set user-friendly error messages
      let userMessage = message;
      if (message.includes('already taken')) {
        userMessage = 'That player name is already taken in this room. Try a different name!';
      } else if (message.includes('Room is full')) {
        userMessage = 'This room is full. Try joining a different room.';
      } else if (message.includes('Game already in progress')) {
        userMessage = 'This game has already started. Try joining a different room.';
      } else if (message.includes('Room not found') || message.includes('Player not found')) {
        userMessage = 'Could not reconnect to room. It may have been deleted.';
        // Clear stored data on reconnection failure
        sessionStorage.removeItem(STORAGE_KEYS.ROOM_ID);
        sessionStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
        setCurrentRoom(null);
        setPlayerId(null);
        setCurrentPlayer(null);
      }
      
      setError(userMessage);
      setIsJoining(false);
      setIsCreating(false);
      setIsReconnecting(false);
    });

    // Handle socket connection events
    socket.on('connect', () => {
      console.log('✅ GameContext: Socket connected');
      setIsConnected(true);
      setError(null);
      
      // Attempt auto-reconnect if we have stored credentials
      // Backend will handle gracefully if player is already connected
      const storedRoomId = sessionStorage.getItem(STORAGE_KEYS.ROOM_ID);
      const storedPlayerId = sessionStorage.getItem(STORAGE_KEYS.PLAYER_ID);
      
      if (storedRoomId && storedPlayerId) {
        console.log('🔄 Attempting to reconnect to room:', storedRoomId, 'as player:', storedPlayerId);
        setIsReconnecting(true);
        socketService.reconnectPlayer(storedRoomId, storedPlayerId);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('❌ GameContext: Socket disconnected');
      setIsConnected(false);
      setError('Disconnected from server. Trying to reconnect...');
    });

    socket.on('connect_error', () => {
      console.log('❌ GameContext: Socket connection error');
      setIsConnected(false);
      setError('Cannot connect to game server. Please check if it\'s running.');
      setIsJoining(false);
      setIsCreating(false);
      setIsReconnecting(false);
    });

    return () => {
      console.log('🧹 GameContext: Cleaning up listeners');
      socketService.removeAllListeners();
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [navigate, location.pathname, playerId, currentRoom]);

  const value: GameContextType = {
    currentRoom,
    currentPlayer,
    playerId,
    isConnected,
    isJoining,
    isCreating,
    setIsJoining,
    setIsCreating
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};
