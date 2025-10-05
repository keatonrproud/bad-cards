import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { Player, BlackCard } from '../types/game';
import { socketService } from '../services/socket';
import { PlayingCard } from './PlayingCard';
import { PlayerHand } from './PlayerHand';
import { Button } from './ui/Button';
import { Timer } from './Timer';
import { Scoreboard } from './Scoreboard';
import { Trophy, Crown, Users } from 'lucide-react';

// Enhanced waiting room with player list
const WaitingRoomAnimation = ({ players }: { players: Player[] }) => {
  return (
    <div className="text-center space-y-6 py-8">
      {/* Simple animated dots */}
      <div className="flex items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 bg-primary rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      
      {/* Player count and status */}
      <motion.div
        className="space-y-2"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <p className="text-muted-foreground">
          {players.length} player{players.length !== 1 ? 's' : ''} in room
        </p>
        <p className="text-sm text-muted-foreground/80">
          Waiting for more players...
        </p>
      </motion.div>

      {/* Player list with animations */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Players:</h4>
        <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
          <AnimatePresence>
            {players.map((player) => (
              <motion.div
                key={player.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30
                }}
                className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20"
              >
                <div className="flex items-center gap-1.5">
                  {player.isHost && (
                    <Crown className="w-3 h-3 text-yellow-500" />
                  )}
                  <span>{player.name}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export const GameBoard = () => {
  const { currentRoom, currentPlayer, playerId, isConnected } = useGame();
  
  if (!currentRoom || !currentPlayer || !playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 py-8 max-w-md">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center"
        >
          <Users className="w-10 h-10 text-primary-foreground" />
        </motion.div>
        
        <div>
          <h2 className="text-2xl font-bold mb-2 text-foreground">Waiting for game to start...</h2>
          <p className="text-muted-foreground mb-2">
            {currentRoom.players.length}/{currentRoom.maxPlayers} players in room
          </p>
          {!currentPlayer.isHost && currentRoom.players.length >= 3 && (
            <p className="text-sm text-primary font-medium mb-4">
              ⏳ Waiting for room creator to start the game
            </p>
          )}
          {currentRoom.players.length < 3 && (
            <p className="text-sm text-orange-400 font-medium mb-4">
              Need at least 3 players to start
            </p>
          )}
        </div>

        {/* Start Game Button */}
        {currentPlayer.isHost && currentRoom.players.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button 
              onClick={() => socketService.startGame(currentRoom.id)}
              size="lg"
              disabled={!isConnected}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Start Game
            </Button>
          </motion.div>
        )}

        {/* Waiting Room Animation */}
        <WaitingRoomAnimation players={currentRoom.players} />
      </div>
    </div>
  );

  const renderGameComplete = () => {
    const winner = currentRoom.players.reduce((prev, current) => 
      prev.score > current.score ? prev : current
    );

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 py-12 max-w-md">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="mx-auto w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center"
          >
            <Trophy className="w-12 h-12 text-white" />
          </motion.div>
          <div>
            <h2 className="text-3xl font-bold mb-2 text-foreground">Game Complete!</h2>
            <p className="text-xl text-primary font-semibold">
              🎉 {winner.name} wins with {winner.score} points!
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            {currentPlayer.isHost && (
              <Button 
                onClick={() => socketService.resetGame(currentRoom.id)}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Play Again
              </Button>
            )}
            <Button 
              onClick={() => window.location.href = '/'}
              size="lg"
              variant="outline"
              className="border-border text-foreground hover:bg-accent"
            >
              Back to Home
            </Button>
          </div>
        </div>
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center py-12 text-muted-foreground">No active round</div>
      </div>
    );
  }

  // Main game render
  return (
    <div className="min-h-screen max-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header - Room Info and Integrated Scoreboard */}
      <div className="flex-shrink-0 bg-card/95 backdrop-blur border-b border-border">
        {/* Room Info Bar */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-primary">Room: {currentRoom.code}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{currentRoom.players.length}/{currentRoom.maxPlayers}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {currentRound && (
              <Timer
                key={currentRound.id}
                duration={currentRoom.settings.timeLimit}
                onTimeUp={() => {}}
                className="text-xs"
                size="sm"
              />
            )}
            <div className="text-xs font-medium text-muted-foreground hidden sm:block">
              Goal: {currentRoom.settings.maxScore}
            </div>
          </div>
        </div>

        {/* Integrated Scoreboard */}
        <div className="px-4 pb-3">
          <Scoreboard
            players={currentRoom.players}
            currentPlayerId={playerId}
            maxScore={currentRoom.settings.maxScore}
            className="bg-transparent border-0 p-0 justify-start"
          />
        </div>
      </div>

      {/* Main Game Area - Fixed Height */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Centered Prompt Card - Fixed Height Container */}
        <div className="flex-shrink-0 h-80 sm:h-96 flex items-center justify-center p-2 sm:p-4">
          <div className="text-center space-y-3 sm:space-y-6 max-w-2xl">
            <PlayingCard
              card={currentRound.whiteCard}
              type="white"
              size="lg"
              className="shadow-2xl mx-auto"
            />
            
            {/* Game Phase Status - Simplified */}
            <div className="space-y-2">
              {currentRound.status === 'playing' && !isJudge && (
                <div>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Waiting for {currentRoom.players.length - currentRound.plays.length - 1} more players...
                  </p>
                </div>
              )}

              {currentRound.status === 'judging' && (
                <div>
                  <p className="text-base sm:text-lg font-medium text-foreground">
                    {isJudge ? '⚖️ Choose the winner!' : '⏳ Judge is deciding...'}
                  </p>
                  {isJudge && (
                    <p className="text-sm text-muted-foreground">
                      Tap the funniest combination
                    </p>
                  )}
                </div>
              )}

              {currentRound.status === 'results' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-semibold text-green-400 mb-2">🎉 Round Complete!</p>
                    <p className="text-xl font-bold text-primary">
                      Winner: {currentRoom.players.find(p => p.id === currentRound.winningPlayId)?.name}
                    </p>
                  </div>
                  
                  {currentPlayer.isHost && (
                    <Button 
                      onClick={handleNextRound}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Next Round
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Judging Phase - Show Submissions */}
        {currentRound.status === 'judging' && (
          <div className="flex-1 p-2 sm:p-4 bg-card/30 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                {currentRound.plays.map((play, index) => (
                  <motion.div
                    key={`${play.playerId}-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-2 sm:p-4 border-2 rounded-xl bg-card/50 backdrop-blur ${
                      isJudge 
                        ? 'cursor-pointer hover:bg-primary/10 hover:border-primary/50 hover:shadow-lg transition-all duration-200 active:scale-95' 
                        : 'border-border'
                    }`}
                    onClick={isJudge ? () => handleJudgePlay(play.playerId) : undefined}
                  >
                    <div className="space-y-2 sm:space-y-3">
                      {play.cards.map((card, cardIndex) => (
                        <PlayingCard
                          key={card.id}
                          card={card}
                          type="black"
                          size="sm"
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Player Hand - Bottom with Remaining Space */}
        {currentRound.status === 'playing' && (
          <div className="flex-shrink-0 bg-card/30 border-t border-border p-2 sm:p-4 max-h-80 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
              <PlayerHand
                cards={currentPlayer.hand}
                maxSelection={1}
                onCardsSelected={handlePlayCards}
                isSelectionPhase={!hasPlayedThisRound}
                isJudge={isJudge}
                hasSubmitted={hasPlayedThisRound}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
