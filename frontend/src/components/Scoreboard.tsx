import React from 'react';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { Player } from '../types/game';
import { cn } from '../utils/cn';

interface ScoreboardProps {
  players: Player[];
  currentPlayerId: string;
  maxScore: number;
  className?: string;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  players,
  currentPlayerId,
  maxScore,
  className
}) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const leader = sortedPlayers[0];

  return (
    <div className={cn(
      'bg-white/95 backdrop-blur border-t border-gray-200 p-3',
      'flex items-center justify-center gap-2 overflow-x-auto',
      className
    )}>
      <div className="flex items-center gap-2 min-w-0">
        {sortedPlayers.map((player, index) => {
          const isCurrentPlayer = player.id === currentPlayerId;
          const isLeader = player.id === leader.id && player.score > 0;
          
          return (
            <motion.div
              key={player.id}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium',
                'min-w-0 flex-shrink-0 transition-all duration-200',
                isCurrentPlayer
                  ? 'bg-game-blue text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              {/* Leader crown */}
              {isLeader && (
                <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              )}
              
              {/* Player name */}
              <span className="truncate max-w-20 sm:max-w-24">
                {player.name}
              </span>
              
              {/* Score */}
              <div className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold',
                isCurrentPlayer
                  ? 'bg-white/20 text-white'
                  : 'bg-white text-gray-700'
              )}>
                <span>{player.score}</span>
                <span className="text-xs opacity-70">/{maxScore}</span>
              </div>
              
              {/* Connection status */}
              {!player.isConnected && (
                <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
