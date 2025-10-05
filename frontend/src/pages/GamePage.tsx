import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { socketService } from '../services/socket';
import { GameBoard } from '../components/GameBoard';
import { Button } from '../components/ui/Button';
import { ArrowLeft, WifiOff, Users, Signal } from 'lucide-react';

export const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRoom, isConnected } = useGame();

  const handleLeaveRoom = () => {
    if (currentRoom) {
      socketService.leaveRoom(currentRoom.id);
    }
    socketService.disconnect();
    navigate('/');
  };

  if (!currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-bg">
        <motion.div 
          className="text-center text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-xl mb-4">No active game found</p>
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
            className="border-white text-white hover:bg-white hover:text-black"
          >
            Back to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg">
      {/* Redesigned Compact Header */}
      <header className="relative">
        {/* Main header bar */}
        <div className="bg-black/40 backdrop-blur-md border-b border-white/30 shadow-lg">
          <div className="container mx-auto px-4 py-2">
            <div className="relative flex items-center justify-between">
              {/* Left section - Leave button and room info */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLeaveRoom}
                  className="text-white hover:text-white hover:bg-white/30 transition-all duration-200 px-3 py-1.5 rounded-full border border-white/20"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline font-medium">Leave</span>
                </Button>
                
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-sm"></div>
                  <div className="text-white">
                    <h1 className="font-bold text-base leading-tight text-shadow">{currentRoom.name}</h1>
                  </div>
                </div>
              </div>

              {/* Center section - Player count (absolutely positioned for true centering) */}
              <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/25 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
                <Users className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-bold">
                  {currentRoom.players.length}/{currentRoom.maxPlayers}
                </span>
              </div>

              {/* Right section - Connection status */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${
                  isConnected 
                    ? 'bg-green-600/80 text-white border-green-400/50 shadow-green-500/20 shadow-md' 
                    : 'bg-red-600/80 text-white border-red-400/50 shadow-red-500/20 shadow-md'
                }`}>
                  {isConnected ? (
                    <Signal className="w-3.5 h-3.5" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-purple-600/10 pointer-events-none"></div>
      </header>

      {/* Game Content */}
      <main className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GameBoard />
        </motion.div>
      </main>
    </div>
  );
};
