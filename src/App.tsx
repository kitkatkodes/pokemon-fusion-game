import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ModeSelector from './components/ModeSelector';
import GameBoard from './components/GameBoard';
import { useGameState } from './hooks/useGameState';
import { preloadNeuralModel } from './utils/neuralFusion';

export default function App() {
  const { state, startGame, nextRound, toggleSelect, submitGuess, goMenu, tick } = useGameState();

  useEffect(() => { preloadNeuralModel(); }, []);

  const showMenu = state.phase === 'menu';

  return (
    <div className="dark min-h-screen bg-poke-dark">
      {/* Ambient glow orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute w-96 h-96 rounded-full opacity-5 blur-3xl"
          style={{ background: '#4cc9f0', top: '-10%', left: '-10%' }}
        />
        <div
          className="absolute w-96 h-96 rounded-full opacity-5 blur-3xl"
          style={{ background: '#e63946', bottom: '-10%', right: '-10%' }}
        />
        <div
          className="absolute w-64 h-64 rounded-full opacity-3 blur-2xl"
          style={{ background: '#f4c430', top: '40%', left: '50%', transform: 'translateX(-50%)' }}
        />
      </div>

      <AnimatePresence mode="wait">
        {showMenu ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <ModeSelector onSelect={startGame} highScore={state.highScore} />
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GameBoard
              state={state}
              onToggle={toggleSelect}
              onSubmit={submitGuess}
              onNext={nextRound}
              onMenu={goMenu}
              onTick={tick}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
