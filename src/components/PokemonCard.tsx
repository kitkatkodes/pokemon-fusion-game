import { motion, AnimatePresence } from 'framer-motion';
import type { Pokemon } from '../types';
import { TYPE_COLORS } from '../types';
import { getSpriteUrl } from '../data/pokemon';

interface Props {
  pokemon: Pokemon | null;
  label?: string;
  revealed?: boolean;
  isCorrect?: boolean | null;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
}

const SIZE_MAP = {
  sm: { card: 'w-24 h-24', img: 'w-16 h-16', text: 'text-xs' },
  md: { card: 'w-32 h-36', img: 'w-20 h-20', text: 'text-sm' },
  lg: { card: 'w-44 h-48', img: 'w-28 h-28', text: 'text-base' },
};

export default function PokemonCard({
  pokemon,
  label,
  revealed = true,
  isCorrect = null,
  size = 'md',
  onClick,
  selected = false,
}: Props) {
  const sz = SIZE_MAP[size];
  const typeColor = pokemon ? TYPE_COLORS[pokemon.types[0]] : '#4cc9f0';

  return (
    <motion.div
      layout
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2
        ${sz.card} cursor-pointer select-none overflow-hidden transition-all duration-200
        ${selected
          ? 'border-poke-blue shadow-[0_0_20px_rgba(76,201,240,0.4)] bg-poke-card'
          : 'border-poke-border bg-poke-card hover:border-slate-500'
        }
        ${isCorrect === true ? 'border-neon-green shadow-[0_0_20px_rgba(74,222,128,0.35)]' : ''}
        ${isCorrect === false ? 'border-poke-red shadow-[0_0_20px_rgba(230,57,70,0.35)]' : ''}
      `}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
    >
      {/* Type colour gradient background */}
      <div
        className="absolute inset-0 opacity-10 rounded-xl"
        style={{ background: `radial-gradient(circle at 50% 30%, ${typeColor}, transparent 70%)` }}
      />

      {/* Card flip container */}
      <AnimatePresence mode="wait" initial={false}>
        {revealed && pokemon ? (
          <motion.div
            key="revealed"
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex flex-col items-center gap-1 relative z-10 p-2"
          >
            <img
              src={getSpriteUrl(pokemon.id)}
              alt={pokemon.name}
              className={`${sz.img} object-contain drop-shadow-lg`}
              loading="lazy"
            />
            <div className={`font-ui font-bold text-white ${sz.text} text-center leading-tight`}>
              {pokemon.name}
            </div>
            <div className="flex gap-1 mt-0.5 flex-wrap justify-center">
              {pokemon.types.map((t) => (
                <span
                  key={t}
                  className="text-[9px] font-game px-1.5 py-0.5 rounded-full capitalize"
                  style={{ background: TYPE_COLORS[t] + '30', color: TYPE_COLORS[t], border: `1px solid ${TYPE_COLORS[t]}50` }}
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="hidden"
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex flex-col items-center gap-2 relative z-10"
          >
            {/* Unknown Pokémon silhouette */}
            <div
              className={`${sz.img} rounded-full flex items-center justify-center text-3xl
                         border-2 border-dashed border-poke-border`}
              style={{ background: 'rgba(76,201,240,0.05)' }}
            >
              ❓
            </div>
            {label && (
              <div className={`font-game text-poke-blue ${sz.text} opacity-60`}>{label}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1.5 right-1.5 w-5 h-5 bg-poke-blue rounded-full
                     flex items-center justify-center text-xs font-bold text-poke-dark z-20"
        >
          ✓
        </motion.div>
      )}
    </motion.div>
  );
}
