import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { socketService } from '../services/socket';
import { GameBoard } from '../components/GameBoard';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';

export const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRoom, isConnected, error } = useGame();

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
      {/* Header */}
      <header className="bg-black/20 backdrop-blur border-b border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLeaveRoom}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Leave Game
              </Button>
              <div className="text-white">
                <h1 className="font-bold text-lg">{currentRoom.name}</h1>
                <p className="text-sm text-white/70">
                  {currentRoom.players.length}/{currentRoom.maxPlayers} players
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <div className={`flex items-center gap-1 text-sm ${
                isConnected ? 'text-green-400' : 'text-red-400'
              }`}>
                {isConnected ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <motion.div 
          className="bg-red-500 text-white px-4 py-2 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

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
