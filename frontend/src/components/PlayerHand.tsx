import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlackCard } from '../types/game';
import { PlayingCard } from './PlayingCard';
import { Button } from './ui/Button';
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
  const [selectedCards, setSelectedCards] = useState<BlackCard[]>([]);

  const handleCardClick = (card: BlackCard) => {
    if (!isSelectionPhase || isJudge || hasSubmitted) return;

    if (selectedCards.some(c => c.id === card.id)) {
      // Deselect card
      setSelectedCards(prev => prev.filter(c => c.id !== card.id));
    } else if (selectedCards.length < maxSelection) {
      // Select card
      setSelectedCards(prev => [...prev, card]);
    }
  };

  const handleSubmit = () => {
    if (selectedCards.length === maxSelection) {
      onCardsSelected(selectedCards);
      setSelectedCards([]); // Clear selection after submission
    }
  };

  const canSubmit = selectedCards.length === maxSelection && isSelectionPhase && !isJudge && !hasSubmitted;

  if (isJudge) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <div className="text-blue-800">
          <p className="font-semibold mb-1">👨‍⚖️ You are the judge!</p>
          <p className="text-sm">Wait for submissions, then pick the winner.</p>
        </div>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <div className="text-green-800">
          <p className="font-semibold mb-1">✅ Cards submitted!</p>
          <p className="text-sm">Waiting for other players and judge decision.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selection status and submit button */}
      {isSelectionPhase && (
        <div className="flex items-center justify-between bg-white/80 backdrop-blur rounded-lg p-3 border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Select {maxSelection} card{maxSelection > 1 ? 's' : ''}
            </span>
            {selectedCards.length > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                {selectedCards.length}/{maxSelection}
              </span>
            )}
          </div>
          
          {canSubmit && (
            <Button 
              onClick={handleSubmit} 
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Submit Cards
            </Button>
          )}
        </div>
      )}

      {/* Compact cards grid - mobile optimized */}
      <div className={cn(
        'grid gap-2',
        // Responsive grid: 3 cols on mobile, 4 on tablet, 5+ on desktop
        'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
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
            >
              <PlayingCard
                card={card}
                type="black"
                size="sm"
                isSelected={selectedCards.some(c => c.id === card.id)}
                isSelectable={isSelectionPhase && !isJudge && !hasSubmitted}
                onClick={() => handleCardClick(card)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {cards.length === 0 && (
        <div className="text-center text-gray-500 py-6">
          <p className="text-sm">No cards in hand</p>
        </div>
      )}
    </div>
  );
};
