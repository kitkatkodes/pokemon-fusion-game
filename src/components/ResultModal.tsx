import { motion, AnimatePresence } from 'framer-motion';
import type { GameState } from '../types';
import PokemonCard from './PokemonCard';

interface Props {
  state: GameState;
  onNext: () => void;
  onMenu: () => void;
}

/** Particle burst for correct answer. */
function Particles({ count = 20 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 360;
        const distance = 60 + Math.random() * 80;
        const size = 4 + Math.random() * 6;
        const colors = ['#4cc9f0', '#f4c430', '#4ade80', '#f472b6', '#e63946'];
        const color = colors[i % colors.length];

        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: color,
              left: '50%',
              top: '40%',
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
            animate={{
              x: Math.cos((angle * Math.PI) / 180) * distance,
              y: Math.sin((angle * Math.PI) / 180) * distance,
              opacity: 0,
              scale: 1,
            }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: Math.random() * 0.2 }}
          />
        );
      })}
    </div>
  );
}

export default function ResultModal({ state, onNext, onMenu }: Props) {
  const { isCorrect, currentRound, score, streak, mode } = state;
  if (!currentRound) return null;

  const isGameOver = state.phase === 'gameover';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.4 }}
          className="relative bg-poke-card border border-poke-border rounded-2xl p-6 max-w-md w-full
                     shadow-2xl overflow-hidden"
        >
          {isCorrect && <Particles />}

          {/* Header */}
          <div className="text-center mb-5">
            {isGameOver ? (
              <>
                <div className="text-5xl mb-2">🏁</div>
                <h2 className="font-game text-xl text-white mb-1">TIME'S UP!</h2>
                <div className="text-slate-400 font-ui text-sm">Great run, trainer!</div>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.6, delay: 0.1 }}
                  className="text-5xl mb-2"
                >
                  {isCorrect ? '🎉' : '😅'}
                </motion.div>
                <h2
                  className={`font-game text-xl mb-1 ${isCorrect ? 'text-neon-green' : 'text-poke-red'}`}
                >
                  {isCorrect ? 'CORRECT!' : 'WRONG!'}
                </h2>
                {isCorrect && streak >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-block bg-poke-yellow/20 text-poke-yellow font-game text-xs
                               px-3 py-1 rounded-full border border-poke-yellow/40 mb-2"
                  >
                    🔥 {streak}× STREAK BONUS +50
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Parents reveal */}
          {!isGameOver && (
            <div className="mb-5">
              <div className="text-center text-slate-500 font-game text-[9px] mb-3 tracking-widest">
                THE FUSION PARENTS WERE
              </div>
              <div className="flex justify-center gap-4">
                <PokemonCard
                  pokemon={currentRound.pokemon1}
                  revealed={true}
                  isCorrect={isCorrect}
                  size="md"
                />
                <div className="flex items-center text-poke-blue font-game text-lg self-center">+</div>
                <PokemonCard
                  pokemon={currentRound.pokemon2}
                  revealed={true}
                  isCorrect={isCorrect}
                  size="md"
                />
              </div>
            </div>
          )}

          {/* Score summary */}
          <div className="bg-poke-dark rounded-xl p-3 mb-5 flex justify-around">
            <div className="text-center">
              <div className="text-poke-blue font-game text-lg">{score}</div>
              <div className="text-slate-500 text-[9px] font-game">SCORE</div>
            </div>
            <div className="text-center">
              <div className="text-poke-yellow font-game text-lg">{streak}</div>
              <div className="text-slate-500 text-[9px] font-game">STREAK</div>
            </div>
            <div className="text-center">
              <div className="text-white font-game text-lg">{state.highScore}</div>
              <div className="text-slate-500 text-[9px] font-game">BEST</div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onMenu}
              className="flex-1 py-2.5 rounded-xl border border-poke-border text-slate-400
                         font-game text-xs hover:border-slate-500 hover:text-white transition-all"
            >
              MENU
            </button>
            {!isGameOver && (
              <motion.button
                onClick={onNext}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex-2 flex-grow py-2.5 rounded-xl bg-poke-blue text-poke-dark
                           font-game text-xs shadow-[0_0_15px_rgba(76,201,240,0.4)]
                           hover:shadow-[0_0_25px_rgba(76,201,240,0.6)] transition-all"
              >
                NEXT FUSION →
              </motion.button>
            )}
            {isGameOver && (
              <motion.button
                onClick={onMenu}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex-grow py-2.5 rounded-xl bg-poke-red text-white
                           font-game text-xs shadow-[0_0_15px_rgba(230,57,70,0.4)]"
              >
                PLAY AGAIN
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
