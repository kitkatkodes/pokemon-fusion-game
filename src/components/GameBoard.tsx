import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameState } from '../types';
import FusionDisplay from './FusionDisplay';
import PokemonCard from './PokemonCard';
import GuessPanel from './GuessPanel';
import ScoreDisplay from './ScoreDisplay';
import Timer from './Timer';
import ResultModal from './ResultModal';
import { useSound } from '../hooks/useSound';

interface Props {
  state: GameState;
  onToggle: (id: number) => void;
  onSubmit: () => void;
  onNext: () => void;
  onMenu: () => void;
  onTick: () => void;
}

export default function GameBoard({
  state,
  onToggle,
  onSubmit,
  onNext,
  onMenu,
  onTick,
}: Props) {
  const { phase, mode, currentRound, isCorrect } = state;
  const { playCorrect, playWrong, playStreak } = useSound();

  // Sound on result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase !== 'reveal') return;
    if (isCorrect) {
      state.streak >= 3 ? playStreak() : playCorrect();
    } else {
      playWrong();
    }
  }, [phase, isCorrect]); // intentionally omit sound fns (stable refs)

  const isLoading = phase === 'generating';
  const isReveal = phase === 'reveal' || phase === 'gameover';
  const isPlaying = phase === 'playing';

  return (
    <div className="min-h-screen grid-bg flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={onMenu}
          className="font-game text-xs text-slate-600 hover:text-slate-400 transition-colors
                     flex items-center gap-1.5"
        >
          ← MENU
        </button>

        <div className="font-game text-xs text-poke-blue opacity-60 tracking-wider">
          {mode === 'multiple-choice' && 'PICK THE PARENTS'}
          {mode === 'guess-all' && 'EXPERT MODE'}
          {mode === 'timed' && '⚡ TIMED BLITZ'}
        </div>

        {mode === 'timed' ? (
          <Timer
            timeLeft={state.timeLeft}
            isActive={isPlaying}
            onTick={onTick}
          />
        ) : (
          <div className="w-16" /> // spacer
        )}
      </div>

      {/* Score row */}
      <div className="px-4 pb-3">
        <ScoreDisplay
          score={state.score}
          streak={state.streak}
          highScore={state.highScore}
          round={state.round}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-start gap-6 px-4 pb-6">

        {/* ── FUSION IMAGE ──────────────────────────────────── */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <FusionDisplay
            dataUrl={currentRound?.fusionDataUrl ?? null}
            isLoading={isLoading}
            revealed={true}
            isCorrect={isReveal ? isCorrect : null}
          />
        </motion.div>

        {/* ── PARENT REVEAL CARDS (after guess) ─────────────── */}
        <AnimatePresence>
          {isReveal && currentRound && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 sm:gap-6"
            >
              <div className="text-center">
                <div className="text-slate-500 font-game text-[9px] mb-2">PARENT A</div>
                <PokemonCard
                  pokemon={currentRound.pokemon1}
                  revealed={true}
                  isCorrect={isCorrect}
                  size="md"
                />
              </div>

              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                className="text-2xl self-center"
              >
                ⚗️
              </motion.div>

              <div className="text-center">
                <div className="text-slate-500 font-game text-[9px] mb-2">PARENT B</div>
                <PokemonCard
                  pokemon={currentRound.pokemon2}
                  revealed={true}
                  isCorrect={isCorrect}
                  size="md"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── GUESS PANEL ────────────────────────────────────── */}
        <AnimatePresence>
          {(isPlaying || (isReveal && phase !== 'gameover')) && currentRound && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-2xl"
            >
              {isReveal ? (
                /* After guess: just show Next button */
                <motion.button
                  onClick={onNext}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl bg-poke-blue text-poke-dark font-game text-sm
                             shadow-[0_0_20px_rgba(76,201,240,0.4)] hover:shadow-[0_0_30px_rgba(76,201,240,0.6)]"
                >
                  NEXT FUSION →
                </motion.button>
              ) : (
                <GuessPanel
                  mode={mode}
                  candidates={currentRound.candidates}
                  selected={currentRound.selected}
                  onToggle={onToggle}
                  onSubmit={onSubmit}
                  disabled={!isPlaying}
                  phase={phase}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state instruction */}
        {isLoading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-600 font-ui text-xs text-center max-w-xs"
          >
            Applying Laplacian pyramid blending &amp; colour transfer…
          </motion.p>
        )}

        {/* Error state */}
        {state.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-poke-red/20 border border-poke-red/40 rounded-xl p-4 text-poke-red
                       font-ui text-sm text-center max-w-sm"
          >
            ⚠ {state.error}
            <br />
            <button
              onClick={onMenu}
              className="mt-2 underline text-slate-400 text-xs"
            >
              Back to menu
            </button>
          </motion.div>
        )}
      </div>

      {/* ── GAME OVER MODAL ──────────────────────────────────── */}
      {phase === 'gameover' && (
        <ResultModal state={state} onNext={onNext} onMenu={onMenu} />
      )}
    </div>
  );
}
