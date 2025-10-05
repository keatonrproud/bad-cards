import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlackCard } from '../types/game';
import { PlayingCard } from './PlayingCard';
import { Button } from './ui/Button';

interface PlayerHandProps {
  cards: BlackCard[];
  maxSelection: number;
  onCardsSelected: (cards: BlackCard[]) => void;
  isSelectionPhase: boolean;
  isJudge: boolean;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  maxSelection,
  onCardsSelected,
  isSelectionPhase,
  isJudge
}) => {
  const [selectedCards, setSelectedCards] = useState<BlackCard[]>([]);

  const handleCardClick = (card: BlackCard) => {
    if (!isSelectionPhase || isJudge) return;

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

  const canSubmit = selectedCards.length === maxSelection && isSelectionPhase && !isJudge;

  if (isJudge) {
    return (
      <div className="bg-card rounded-lg p-4 border">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-semibold mb-2">You are the judge this round!</p>
          <p>Wait for other players to submit their cards, then choose the winner.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selection status */}
      {isSelectionPhase && (
        <div className="bg-card rounded-lg p-3 border">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Select {maxSelection} card{maxSelection > 1 ? 's' : ''}
              {selectedCards.length > 0 && ` (${selectedCards.length}/${maxSelection})`}
            </p>
            {canSubmit && (
              <Button onClick={handleSubmit} size="sm">
                Submit Cards
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <AnimatePresence>
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ delay: index * 0.1 }}
            >
              <PlayingCard
                card={card}
                type="black"
                isSelected={selectedCards.some(c => c.id === card.id)}
                isSelectable={isSelectionPhase && !isJudge}
                onClick={() => handleCardClick(card)}
                className="h-32"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {cards.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <p>No cards in hand</p>
        </div>
      )}
    </div>
  );
};
