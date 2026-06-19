import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  score: number;
  streak: number;
  highScore: number;
  round: number;
}

export default function ScoreDisplay({ score, streak, highScore, round }: Props) {
  return (
    <div className="flex items-center justify-between w-full max-w-2xl mx-auto px-2">
      {/* Round */}
      <div className="bg-poke-card border border-poke-border rounded-xl px-4 py-2 text-center min-w-[70px]">
        <div className="text-slate-500 text-[9px] font-game mb-0.5">ROUND</div>
        <div className="text-white font-game text-lg">{round + 1}</div>
      </div>

      {/* Streak */}
      <div className="flex flex-col items-center">
        <AnimatePresence mode="wait">
          {streak > 0 && (
            <motion.div
              key={streak}
              initial={{ scale: 0.5, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.6 }}
              className="flex items-center gap-1 mb-1"
            >
              {Array.from({ length: Math.min(streak, 5) }).map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="text-poke-yellow text-sm"
                >
                  ★
                </motion.span>
              ))}
              {streak > 5 && (
                <span className="text-poke-yellow font-game text-xs">×{streak}</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="text-slate-500 text-[9px] font-game">STREAK</div>
      </div>

      {/* Score */}
      <div className="bg-poke-card border border-poke-blue/40 rounded-xl px-4 py-2 text-center min-w-[90px]
                      shadow-[0_0_15px_rgba(76,201,240,0.1)]">
        <div className="text-poke-blue text-[9px] font-game mb-0.5">SCORE</div>
        <AnimatePresence mode="wait">
          <motion.div
            key={score}
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-white font-game text-xl"
          >
            {score}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* High Score */}
      <div className="bg-poke-card border border-poke-yellow/30 rounded-xl px-4 py-2 text-center min-w-[80px]">
        <div className="text-poke-yellow text-[9px] font-game mb-0.5">BEST</div>
        <div className="text-poke-yellow font-game text-lg">{highScore}</div>
      </div>
    </div>
  );
}
