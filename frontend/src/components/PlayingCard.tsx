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
    sm: 'w-24 h-32 text-xs p-2',
    md: 'w-32 h-44 text-sm p-3',
    lg: 'w-40 h-56 text-base p-4'
  };

  const baseClasses = cn(
    // Base card styling with consistent aspect ratio
    'relative rounded-xl border-2 transition-all duration-200 select-none',
    'flex items-center justify-center text-center font-medium',
    'shadow-md hover:shadow-lg',
    
    // Size classes
    sizeClasses[size],
    
    // Card type styling
    type === 'white' 
      ? 'bg-white text-gray-900 border-gray-300' 
      : 'bg-gray-900 text-white border-gray-700',
    
    // Interactive states
    isSelectable && 'cursor-pointer hover:scale-105 active:scale-95',
    isSelected && 'ring-4 ring-blue-500 ring-offset-2 scale-105 shadow-xl',
    
    className
  );

  const cardContent = (
    <div className="w-full h-full flex items-center justify-center p-1">
      <p className={cn(
        'leading-relaxed text-center break-words hyphens-auto',
        type === 'white' ? 'text-gray-900' : 'text-white'
      )}>
        {card.text}
      </p>
    </div>
  );

  const motionProps = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3, ease: "easeOut" },
    layout: true
  };

  if (isSelectable && onClick) {
    return (
      <motion.div
        className={baseClasses}
        onClick={onClick}
        whileHover={{ scale: isSelected ? 1.05 : 1.08 }}
        whileTap={{ scale: 0.95 }}
        {...motionProps}
      >
        {cardContent}
        
        {/* Selection indicator */}
        {isSelected && (
          <motion.div
            className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            ✓
          </motion.div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={baseClasses}
      {...motionProps}
    >
      {cardContent}
    </motion.div>
  );
};
