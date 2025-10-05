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
      'bg-card/95 backdrop-blur border-t border-border p-3',
      'flex items-center justify-start gap-2 overflow-x-auto',
      'scrollbar-hide', // Hide scrollbar for cleaner look
      className
    )}>
      <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
        {sortedPlayers.map((player, index) => {
          const isCurrentPlayer = player.id === currentPlayerId;
          const isLeader = player.id === leader.id && player.score > 0;
          
          // Truncate name for mobile
          const displayName = player.name.length > 8 
            ? `${player.name.substring(0, 8)}...` 
            : player.name;
          
          return (
            <motion.div
              key={player.id}
              className={cn(
                'flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium',
                'min-w-0 flex-shrink-0 transition-all duration-200',
                'whitespace-nowrap', // Prevent text wrapping
                isCurrentPlayer
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card text-card-foreground hover:bg-accent'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              {/* Leader crown */}
              {isLeader && (
                <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 flex-shrink-0" />
              )}
              
              {/* Player name - truncated on mobile */}
              <span className="truncate max-w-20 sm:max-w-none" title={player.name}>
                {displayName}
              </span>
              
              {/* Score */}
              <span className="font-bold text-xs sm:text-sm flex-shrink-0">
                {player.score}
              </span>
            </motion.div>
          );
        })}
        
        {/* Progress indicator on mobile */}
        <div className="text-xs text-muted-foreground ml-2 flex-shrink-0 hidden sm:block">
          Goal: {maxScore}
        </div>
      </div>
    </div>
  );
};
