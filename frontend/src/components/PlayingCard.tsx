import React from 'react';
import { motion } from 'framer-motion';
import { WhiteCard, BlackCard } from '../types/game';
import { cn } from '../utils/cn';

interface PlayingCardProps {
  card: WhiteCard | BlackCard;
  type: 'white' | 'black';
  isSelected?: boolean;
  isSelectable?: boolean;
  onClick?: () => void;
  className?: string;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  type,
  isSelected = false,
  isSelectable = false,
  onClick,
  className
}) => {
  const baseClasses = cn(
    'playing-card p-4 flex items-center justify-center text-center font-medium select-none',
    type === 'white' ? 'white-card' : 'black-card',
    isSelectable && 'card-hover',
    isSelected && 'card-selected',
    className
  );

  const cardContent = (
    <div className="w-full h-full flex items-center justify-center">
      <p className={cn(
        'text-sm leading-relaxed',
        type === 'white' ? 'text-gray-900' : 'text-white'
      )}>
        {card.text}
      </p>
    </div>
  );

  if (isSelectable && onClick) {
    return (
      <motion.div
        className={baseClasses}
        onClick={onClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={baseClasses}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {cardContent}
    </motion.div>
  );
};
