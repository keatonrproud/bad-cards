import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlackCard } from '../types/game';
import { PlayingCard } from './PlayingCard';
import { cn } from '../utils/cn';

interface PlayerHandProps {
  cards: BlackCard[];
  maxSelection: number;
  onCardsSelected: (cards: BlackCard[]) => void;
  isSelectionPhase: boolean;
  isJudge: boolean;
  hasSubmitted?: boolean;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  maxSelection,
  onCardsSelected,
  isSelectionPhase,
  isJudge,
  hasSubmitted = false
}) => {
  const handleCardClick = (card: BlackCard) => {
    if (!isSelectionPhase || isJudge || hasSubmitted) return;
    
    // Instant submit - always 1 card, no selection state needed
    onCardsSelected([card]);
  };

  if (isJudge) {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-6 text-center">
        <div className="text-primary">
          <p className="font-semibold mb-2 text-base sm:text-lg">👨‍⚖️ You are the judge!</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Wait for submissions, then pick the winner.</p>
        </div>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 sm:p-6 text-center">
        <div className="text-green-400">
          <p className="font-semibold mb-2 text-base sm:text-lg">✅ Card submitted!</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Waiting for other players and judge decision.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Simple instruction text - only on larger screens */}
      {isSelectionPhase && cards.length > 0 && (
        <div className="text-center mb-2 sm:mb-4 hidden sm:block">
          <p className="text-sm text-muted-foreground">
            Tap any card to play it
          </p>
        </div>
      )}

      {/* Mobile-first responsive cards grid */}
      <div className={cn(
        'grid gap-2 sm:gap-3',
        // Mobile: 2 columns, Tablet: 3 columns, Desktop: horizontal layout
        'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7'
      )}>
        <AnimatePresence mode="popLayout">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ 
                delay: index * 0.05,
                duration: 0.2,
                layout: { duration: 0.3 }
              }}
              className="min-h-0" // Prevent flex item growth
            >
              <PlayingCard
                card={card}
                type="black"
                size="sm"
                isSelected={false} // No selection state needed since it's instant
                isSelectable={isSelectionPhase && !isJudge && !hasSubmitted}
                onClick={() => handleCardClick(card)}
                className="w-full h-full min-h-24 sm:min-h-32" // Ensure minimum touch target
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {cards.length === 0 && (
        <div className="text-center text-muted-foreground py-4 sm:py-6">
          <p className="text-sm">No cards in hand</p>
        </div>
      )}
    </div>
  );
};
