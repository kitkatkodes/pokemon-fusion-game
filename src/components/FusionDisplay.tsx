import { motion } from 'framer-motion';

interface Props {
  dataUrl: string | null;
  isLoading?: boolean;
  revealed?: boolean;
  isCorrect?: boolean | null;
}

/** Animated Pokéball loading spinner using pure CSS/SVG. */
function PokeballSpinner() {
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        className="w-20 h-20"
      >
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="48" fill="none" stroke="#2d2d4e" strokeWidth="4" />
          {/* Top half */}
          <path d="M 2 50 A 48 48 0 0 1 98 50" fill="#e63946" />
          {/* Bottom half */}
          <path d="M 2 50 A 48 48 0 0 0 98 50" fill="#1a1a2e" />
          {/* Centre stripe */}
          <line x1="2" y1="50" x2="98" y2="50" stroke="#2d2d4e" strokeWidth="6" />
          {/* Centre button */}
          <circle cx="50" cy="50" r="13" fill="#1a1a2e" stroke="#2d2d4e" strokeWidth="5" />
          <circle cx="50" cy="50" r="7" fill="#4cc9f0" />
        </svg>
      </motion.div>

      <div className="text-center">
        <div className="font-game text-poke-blue text-xs mb-2 animate-pulse">
          FUSING DATA...
        </div>
        <div className="text-slate-500 text-xs font-ui">
          Running CV pipeline
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-48 h-1.5 bg-poke-border rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-poke-blue to-neon-pink rounded-full"
          animate={{ width: ['5%', '90%', '5%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}

export default function FusionDisplay({ dataUrl, isLoading, revealed, isCorrect }: Props) {
  const borderColor =
    isCorrect === true
      ? '#4ade80'
      : isCorrect === false
      ? '#e63946'
      : '#4cc9f0';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="font-game text-xs text-slate-500 tracking-widest mb-1">
        ⚗️ FUSION
      </div>

      <motion.div
        layout
        className="relative flex items-center justify-center rounded-3xl overflow-hidden"
        style={{
          width: 220,
          height: 220,
          background: 'radial-gradient(circle at 40% 35%, #1a1a2e, #0a0a0f)',
          border: `2px solid ${borderColor}`,
          boxShadow: `0 0 30px ${borderColor}30, inset 0 0 40px rgba(0,0,0,0.5)`,
        }}
        animate={{
          boxShadow: isLoading
            ? [
                `0 0 10px ${borderColor}20`,
                `0 0 40px ${borderColor}50`,
                `0 0 10px ${borderColor}20`,
              ]
            : `0 0 30px ${borderColor}30, inset 0 0 40px rgba(0,0,0,0.5)`,
        }}
        transition={{ duration: 1.5, repeat: isLoading ? Infinity : 0 }}
      >
        {/* Corner decorations */}
        {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos) => (
          <div
            key={pos}
            className={`absolute ${pos} w-2 h-2 border-poke-blue opacity-40`}
            style={{
              borderTopWidth: pos.includes('top') ? '2px' : 0,
              borderBottomWidth: pos.includes('bottom') ? '2px' : 0,
              borderLeftWidth: pos.includes('left') ? '2px' : 0,
              borderRightWidth: pos.includes('right') ? '2px' : 0,
            }}
          />
        ))}

        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
          }}
        />

        {isLoading ? (
          <PokeballSpinner />
        ) : dataUrl ? (
          <motion.div
            key="fusion"
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full h-full flex items-center justify-center relative z-0"
          >
            {/* Silhouette mode when not yet revealed */}
            {revealed === false ? (
              <motion.img
                src={dataUrl}
                alt="Mystery Fusion"
                className="w-44 h-44 object-contain"
                style={{
                  filter: 'brightness(0) saturate(0)',
                }}
                animate={{ filter: ['brightness(0) saturate(0)', 'brightness(0.05) saturate(0)'] }}
                transition={{ duration: 1.5, repeat: Infinity, yoyo: true }}
              />
            ) : (
              <motion.img
                src={dataUrl}
                alt="Fusion Pokémon"
                className="w-44 h-44 object-contain drop-shadow-2xl"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </motion.div>
        ) : (
          <div className="text-slate-600 font-ui text-sm">No fusion yet</div>
        )}
      </motion.div>

      {/* Result badge */}
      {isCorrect !== null && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className={`font-game text-xs px-4 py-1.5 rounded-full ${
            isCorrect
              ? 'bg-neon-green/20 text-neon-green border border-neon-green/40'
              : 'bg-poke-red/20 text-poke-red border border-poke-red/40'
          }`}
        >
          {isCorrect ? '✓ CORRECT!' : '✗ WRONG'}
        </motion.div>
      )}
    </div>
  );
}
