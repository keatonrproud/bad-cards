import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GameProvider } from './context/GameContext';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';
import { Toaster } from './components/ui/toaster';

// Page transition animations
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -20,
  }
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.3
};

function App() {
  return (
    <GameProvider>
      <div className="App">
        <AnimatePresence mode="wait">
          <Routes>
            <Route 
              path="/" 
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <HomePage />
                </motion.div>
              } 
            />
            <Route 
              path="/game" 
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <GamePage />
                </motion.div>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
        <Toaster />
      </div>
    </GameProvider>
  );
}

export default App;
