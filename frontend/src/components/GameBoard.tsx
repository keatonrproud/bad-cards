import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { Player, BlackCard } from '../types/game';
import { socketService } from '../services/socket';
import { PlayingCard } from './PlayingCard';
import { PlayerHand } from './PlayerHand';
import { Button } from './ui/Button';
import { Trophy, Crown, Users, Timer, Star, Zap, Heart } from 'lucide-react';

// Interactive waiting room mini-game
interface CollectibleItem {
  id: string;
  x: number;
  y: number;
  type: 'star' | 'heart' | 'zap';
  collected: boolean;
  collectedBy?: string;
}

interface PlayerCharacter {
  id: string;
  name: string;
  x: number;
  y: number;
  score: number;
  color: string;
}

type MiniPlayerState = { x: number; y: number; score: number };
type MiniState = {
  width: number;
  height: number;
  items: { id: string; x: number; y: number; type: 'star' | 'heart' | 'zap'; collectedBy?: string }[];
  players: Record<string, MiniPlayerState>;
};

const WaitingRoomGame = ({ players, playerId, roomId }: { players: Player[]; playerId: string; roomId: string }) => {
  const [characters, setCharacters] = useState<PlayerCharacter[]>([]);
  const [collectibles, setCollectibles] = useState<CollectibleItem[]>([]);
  const [gameArea, setGameArea] = useState({ width: 720, height: 420 });

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  // Initialize player characters
  useEffect(() => {
    const newCharacters = players.map((player, index) => ({
      id: player.id,
      name: player.name,
      x: Math.random() * (gameArea.width - 40) + 20,
      y: Math.random() * (gameArea.height - 40) + 20,
      score: 0,
      color: colors[index % colors.length]
    }));
    setCharacters(newCharacters);
  }, [players, gameArea]);

  // Using server-synced spawning; no local spawn
  useEffect(() => {
    if (!roomId) return;
    socketService.miniJoin(roomId);
    socketService.onMiniState(({ state }: { state: MiniState }) => {
      setCollectibles(state.items.map((it) => ({
        id: it.id,
        x: it.x,
        y: it.y,
        type: it.type,
        collected: Boolean(it.collectedBy),
        collectedBy: it.collectedBy
      })));

      setCharacters((prev: PlayerCharacter[]) => {
        const byId: Record<string, PlayerCharacter> = {};
        prev.forEach(p => { byId[p.id] = p; });
        const merged = players.map((p: Player, index: number) => {
          const existing = byId[p.id];
          const serverPlayer = state.players[p.id] || { x: 20, y: 20, score: 0 };
          return {
            id: p.id,
            name: p.name,
            x: serverPlayer.x,
            y: serverPlayer.y,
            score: serverPlayer.score,
            color: existing?.color ?? colors[index % colors.length]
          } as PlayerCharacter;
        });
        return merged;
      });

      if (state.width && state.height) {
        setGameArea({ width: state.width, height: state.height });
      }
    });
  }, [roomId]);

  useEffect(() => {
    const onResize = () => {
      const baseW = 720;
      const baseH = 420;
      const maxW = Math.min(window.innerWidth - 48, 960);
      const scale = Math.max(0.8, Math.min(1.4, maxW / baseW));
      setGameArea({ width: Math.round(baseW * scale), height: Math.round(baseH * scale) });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Throttled pointer movement -> server
  const lastSentRef = useRef(0);
  const sendMove = (x: number, y: number) => {
    if (!roomId) return;
    const now = performance.now();
    if (now - lastSentRef.current < 33) return;
    lastSentRef.current = now;
    socketService.miniMove(roomId, x, y);
  };

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    sendMove(x, y);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    sendMove(x, y);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'star': return <Star className="w-4 h-4 text-yellow-400" />;
      case 'heart': return <Heart className="w-4 h-4 text-red-400" />;
      case 'zap': return <Zap className="w-4 h-4 text-blue-400" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-4 border">
      <div className="text-center mb-3">
        <h3 className="font-semibold text-sm">🎮 Waiting Room Mini-Game</h3>
        <p className="text-xs text-muted-foreground">Tap/move to collect items while waiting!</p>
      </div>

      {/* Game Area */}
      <div 
        className="relative mx-auto bg-white rounded-lg border-2 border-blue-200 overflow-hidden cursor-pointer touch-none select-none"
        style={{ width: gameArea.width, height: gameArea.height }}
        onPointerDown={handlePointer}
        onPointerMove={handlePointer}
        onTouchMove={handleTouchMove}
      >
        {/* Collectibles */}
        {collectibles.map(item => (
          !item.collected && (
            <motion.div
              key={item.id}
              className="absolute"
              style={{ left: item.x, top: item.y }}
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ duration: 0.5, rotate: { duration: 2, repeat: Infinity, ease: "linear" } }}
            >
              {getIcon(item.type)}
            </motion.div>
          )
        ))}

        {/* Player Characters */}
        {characters.map(char => (
          <motion.div
            key={char.id}
            className="absolute w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
            style={{ 
              left: char.x - 16, 
              top: char.y - 16,
              backgroundColor: char.color 
            }}
            animate={{ x: 0, y: 0 }}
            transition={{ type: "spring", damping: 10 }}
          >
            {char.name.charAt(0).toUpperCase()}
            {char.id === playerId && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
            )}
          </motion.div>
        ))}

        {/* Floating particles effect */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-300 rounded-full"
              style={{
                left: `${(i * 50) % 100}%`,
                top: `${(i * 30) % 100}%`
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.7, 0.3]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5
              }}
            />
          ))}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {characters
          .sort((a, b) => b.score - a.score)
          .map(char => (
            <div 
              key={char.id}
              className={`flex items-center gap-2 p-2 rounded text-xs ${
                char.id === playerId ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50'
              }`}
            >
              <div 
                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: char.color }}
              >
                {char.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium truncate">{char.name}</span>
              <span className="ml-auto font-bold text-blue-600">{char.score}</span>
            </div>
          ))}
      </div>

      <div className="mt-2 text-center text-xs text-muted-foreground">
        {characters.find(char => char.id === playerId) ? "You're the glowing player! " : ""}Move around to collect items
      </div>
    </div>
  );
};

export const GameBoard: React.FC = () => {
  const { currentRoom, currentPlayer, playerId } = useGame();

  if (!currentRoom || !currentPlayer || !playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  const currentRound = currentRoom.currentRound;
  const isJudge = currentRound?.judgeId === playerId;
  const hasPlayedThisRound = currentRound?.plays.some(play => play.playerId === playerId);

  const handlePlayCards = (cards: BlackCard[]) => {
    if (currentRoom && currentRound) {
      socketService.playCards(currentRoom.id, cards);
    }
  };

  const handleJudgePlay = (playerId: string) => {
    if (currentRoom) {
      socketService.judgePlay(currentRoom.id, playerId);
    }
  };

  const handleNextRound = () => {
    if (currentRoom) {
      socketService.nextRound(currentRoom.id);
    }
  };

  const renderWaitingForGame = () => (
    <div className="text-center space-y-6 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="mx-auto w-20 h-20 bg-game-blue rounded-full flex items-center justify-center"
      >
        <Users className="w-10 h-10 text-white" />
      </motion.div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2">Waiting for game to start...</h2>
        <p className="text-muted-foreground mb-4">
          {currentRoom.players.length}/{currentRoom.maxPlayers} players in room
        </p>
      </div>

      {/* Interactive Mini-Game */}
      <WaitingRoomGame players={currentRoom.players} playerId={playerId} roomId={currentRoom.id} />

      {currentPlayer.isHost && currentRoom.players.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button 
            onClick={() => socketService.startGame(currentRoom.id)}
            size="lg"
            className="bg-game-blue hover:bg-game-blue-dark animate-pulse"
          >
            Start Game
          </Button>
        </motion.div>
      )}
    </div>
  );

  const renderGameComplete = () => {
    const winner = currentRoom.players.reduce((prev, current) => 
      prev.score > current.score ? prev : current
    );

    return (
      <div className="text-center space-y-6 py-12">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="mx-auto w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center"
        >
          <Trophy className="w-12 h-12 text-white" />
        </motion.div>
        <div>
          <h2 className="text-3xl font-bold mb-2">Game Complete!</h2>
          <p className="text-xl text-game-blue font-semibold">
            🎉 {winner.name} wins with {winner.score} points!
          </p>
        </div>
        {currentPlayer.isHost && (
          <Button 
            onClick={() => window.location.reload()}
            size="lg"
            className="bg-game-blue hover:bg-game-blue-dark"
          >
            New Game
          </Button>
        )}
      </div>
    );
  };

  if (currentRoom.status === 'waiting') {
    return renderWaitingForGame();
  }

  if (currentRoom.status === 'finished') {
    return renderGameComplete();
  }

  if (!currentRound) {
    return <div className="text-center py-12">No active round</div>;
  }

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <div className="bg-card rounded-lg p-4 border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold">Round {currentRound.roundNumber}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Judge: {currentRoom.players.find(p => p.id === currentRound.judgeId)?.name}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {currentRound.timeRemaining && (
              <div className="flex items-center gap-1 text-sm">
                <Timer className="w-4 h-4" />
                <span>{Math.floor(currentRound.timeRemaining / 1000)}s</span>
              </div>
            )}
            <div className="text-sm font-medium">
              Goal: {currentRoom.settings.maxScore} points
            </div>
          </div>
        </div>
      </div>

      {/* White Card */}
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <PlayingCard
            card={currentRound.whiteCard}
            type="white"
            className="h-48"
          />
        </div>
      </div>

      {/* Game Phase Content */}
      {currentRound.status === 'playing' && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">
              {isJudge ? 'You are the judge - wait for submissions!' : 'Select your cards!'}
            </p>
            <p className="text-sm text-muted-foreground">
              Waiting for {currentRoom.players.length - currentRound.plays.length - 1} more players...
            </p>
          </div>
          
          <PlayerHand
            cards={currentPlayer.hand}
            maxSelection={currentRound.whiteCard.blanks}
            onCardsSelected={handlePlayCards}
            isSelectionPhase={!hasPlayedThisRound}
            isJudge={isJudge}
          />
        </div>
      )}

      {currentRound.status === 'judging' && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">
              {isJudge ? 'Choose the winning play!' : 'Judge is selecting the winner...'}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentRound.plays.map((play, index) => (
              <motion.div
                key={`${play.playerId}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 border-2 rounded-lg ${
                  isJudge ? 'cursor-pointer hover:bg-accent' : ''
                }`}
                onClick={isJudge ? () => handleJudgePlay(play.playerId) : undefined}
              >
                <div className="space-y-2">
                  {play.cards.map((card, _cardIndex) => (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      type="black"
                      className="h-24"
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {currentRound.status === 'results' && (
        <div className="space-y-4 text-center">
          <div>
            <p className="text-lg font-medium mb-2">Round Complete!</p>
            <p className="text-xl text-game-blue font-semibold">
              Winner: {currentRoom.players.find(p => p.id === currentRound.winningPlayId)?.name}
            </p>
          </div>
          
          {currentPlayer.isHost && (
            <Button 
              onClick={handleNextRound}
              size="lg"
              className="bg-game-blue hover:bg-game-blue-dark"
            >
              Next Round
            </Button>
          )}
        </div>
      )}

      {/* Scoreboard */}
      <div className="bg-card rounded-lg p-4 border">
        <h3 className="font-semibold mb-3">Scoreboard</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {currentRoom.players
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <div
                key={player.id}
                className={`p-2 rounded text-center ${
                  player.id === playerId ? 'bg-game-blue text-white' : 'bg-muted'
                }`}
              >
                <div className="font-medium text-sm">{player.name}</div>
                <div className="text-lg font-bold">{player.score}</div>
                {index === 0 && player.score > 0 && (
                  <Crown className="w-4 h-4 mx-auto text-yellow-500" />
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
