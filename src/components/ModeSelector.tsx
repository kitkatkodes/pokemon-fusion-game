import { motion } from 'framer-motion';
import type { GameMode } from '../types';

interface Props {
  onSelect: (mode: GameMode) => void;
  highScore: number;
}

const MODES = [
  {
    id: 'multiple-choice' as GameMode,
    label: 'Pick the Parents',
    icon: '🔍',
    description: 'See the fusion. Pick which 2 Pokémon created it from 6 candidates.',
    color: '#4cc9f0',
    difficulty: 'Medium',
  },
  {
    id: 'guess-all' as GameMode,
    label: 'Expert Mode',
    icon: '🧠',
    description: 'See the fusion. Identify BOTH parents from the entire Gen I Pokédex!',
    color: '#f4c430',
    difficulty: 'Hard',
  },
  {
    id: 'timed' as GameMode,
    label: 'Timed Blitz',
    icon: '⚡',
    description: 'Multiple choice vs the clock. 60 seconds, max fusions!',
    color: '#e63946',
    difficulty: 'Expert',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.35 } },
};

export default function ModeSelector({ onSelect, highScore }: Props) {
  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }}
        className="text-center mb-10"
      >
        <div className="font-game text-xs text-poke-blue mb-3 tracking-widest opacity-70">
          GEN I · AI EDITION
        </div>
        <h1 className="font-game text-3xl sm:text-4xl leading-tight mb-2">
          <span className="text-white">WHO'S THAT</span>
          <br />
          <span
            className="neon-text"
            style={{ color: '#4cc9f0' }}
          >
            FUSION?
          </span>
        </h1>
        <p className="text-slate-400 font-ui mt-4 text-sm max-w-sm mx-auto">
          Laplacian pyramid fusion · Sobel edge detection · colour transfer
        </p>

        {highScore > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 inline-block bg-poke-card border border-poke-border rounded-full px-5 py-1.5 text-poke-yellow font-ui text-sm font-bold"
          >
            🏆 High Score: {highScore}
          </motion.div>
        )}
      </motion.div>

      {/* Floating Pokéball decoration */}
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="text-6xl mb-8 select-none"
      >
        ⚙️
      </motion.div>

      {/* Mode cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl"
      >
        {MODES.map((mode) => (
          <motion.button
            key={mode.id}
            variants={item}
            whileHover={{ scale: 1.04, y: -4 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelect(mode.id)}
            className="group relative bg-poke-card border border-poke-border rounded-2xl p-6 text-left
                       hover:border-opacity-80 transition-all duration-200 card-glow overflow-hidden"
            style={{ '--hover-color': mode.color } as React.CSSProperties}
          >
            {/* Background glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl"
              style={{ background: mode.color }}
            />

            <div className="relative z-10">
              <div className="text-4xl mb-3">{mode.icon}</div>
              <div
                className="text-xs font-game mb-1"
                style={{ color: mode.color }}
              >
                {mode.difficulty}
              </div>
              <h2 className="text-white font-ui font-bold text-lg mb-2">{mode.label}</h2>
              <p className="text-slate-400 text-sm font-ui leading-relaxed">{mode.description}</p>
            </div>

            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: mode.color }}
            />
          </motion.button>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-10 text-slate-600 text-xs font-ui text-center"
      >
        Pokémon © Nintendo/Game Freak. Fan project — not affiliated with or endorsed by Nintendo.
      </motion.p>
    </div>
  );
}
