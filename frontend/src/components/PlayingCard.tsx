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
  size?: 'sm' | 'md' | 'lg';
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  type,
  isSelected = false,
  isSelectable = false,
  onClick,
  className,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-32 h-24 sm:w-36 sm:h-28 text-xs sm:text-sm p-2',
    md: 'w-40 h-32 sm:w-44 sm:h-36 text-sm sm:text-base p-3',
    lg: 'w-48 h-36 sm:w-56 sm:h-44 text-base sm:text-lg p-4'
  };

  const baseClasses = cn(
    // Base card styling with consistent aspect ratio
    'relative rounded-xl border-2 transition-all duration-200 select-none',
    'flex items-center justify-center text-center font-medium',
    'shadow-md hover:shadow-lg overflow-hidden', // Add overflow hidden
    
    // Size classes
    sizeClasses[size],
    
    // Card type styling using theme colors
    type === 'white' 
      ? 'bg-card text-card-foreground border-border' 
      : 'bg-background text-foreground border-border',
    
    // Interactive states
    isSelectable && 'cursor-pointer hover:scale-105 active:scale-95',
    isSelected && 'ring-4 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-xl',
    
    className
  );

  return (
    <motion.div
      className={baseClasses}
      onClick={isSelectable ? onClick : undefined}
      whileHover={isSelectable ? { scale: 1.02 } : {}}
      whileTap={isSelectable ? { scale: 0.98 } : {}}
      layout
    >
      {/* Card content with proper text containment */}
      <div className="w-full h-full flex items-center justify-center p-1">
        <p className={cn(
          'leading-tight text-center break-words hyphens-auto',
          'overflow-hidden', // Prevent text overflow
          // Responsive line clamping
          size === 'sm' && 'line-clamp-3 sm:line-clamp-4',
          size === 'md' && 'line-clamp-4 sm:line-clamp-5', 
          size === 'lg' && 'line-clamp-5 sm:line-clamp-6'
        )}>
          {card.text}
        </p>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 bg-primary/20 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      {/* Hover effect for selectable cards */}
      {isSelectable && (
        <motion.div
          className="absolute inset-0 bg-primary/10 rounded-xl opacity-0 hover:opacity-100 transition-opacity"
        />
      )}
    </motion.div>
  );
};
