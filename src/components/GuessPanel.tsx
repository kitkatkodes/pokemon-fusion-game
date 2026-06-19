import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Pokemon, GameMode } from '../types';
import { GEN1_POKEMON } from '../data/pokemon';

interface Props {
  mode: GameMode;
  candidates: Pokemon[];       // 6 for multiple-choice, all 151 for expert
  selected: number[];
  onToggle: (id: number) => void;
  onSubmit: () => void;
  disabled?: boolean;
  phase?: string;
}

const GRID_COLS = 'grid-cols-3 sm:grid-cols-6';
const EXPERT_COLS = 'grid-cols-4 sm:grid-cols-8 md:grid-cols-10';

export default function GuessPanel({
  mode,
  candidates,
  selected,
  onToggle,
  onSubmit,
  disabled = false,
  phase,
}: Props) {
  const [search, setSearch] = useState('');

  const isExpert = mode === 'guess-all';
  const pool = isExpert
    ? GEN1_POKEMON.filter((p) =>
        search === '' || p.name.toLowerCase().includes(search.toLowerCase()),
      )
    : candidates;

  const canSubmit = selected.length === 2 && !disabled;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      {/* Instructions */}
      <div className="text-center">
        <span className="font-ui text-slate-400 text-sm">
          Pick <span className="text-poke-blue font-bold">2 Pokémon</span> that were fused
        </span>
        {selected.length > 0 && (
          <span className="ml-2 text-poke-yellow font-game text-xs">
            [{selected.length}/2]
          </span>
        )}
      </div>

      {/* Expert search bar */}
      {isExpert && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <input
            type="text"
            placeholder="🔍  Search Pokémon…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-poke-card border border-poke-border rounded-xl px-4 py-2.5
                       text-white font-ui text-sm placeholder-slate-600 focus:outline-none
                       focus:border-poke-blue/60 transition-colors"
          />
        </motion.div>
      )}

      {/* Pokémon grid */}
      <div
        className={`grid ${isExpert ? EXPERT_COLS : GRID_COLS} gap-2 max-h-72 overflow-y-auto
                    rounded-xl p-2 bg-poke-card/40 border border-poke-border`}
        style={{ scrollbarWidth: 'thin' }}
      >
        <AnimatePresence>
          {pool.map((p) => (
            <motion.button
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => !disabled && onToggle(p.id)}
              disabled={disabled}
              className={`
                relative flex flex-col items-center gap-0.5 rounded-xl p-1.5 transition-all
                border-2 ${selected.includes(p.id)
                  ? 'border-poke-blue bg-poke-blue/10 shadow-[0_0_10px_rgba(76,201,240,0.3)]'
                  : 'border-transparent hover:border-poke-border hover:bg-poke-card'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                alt={p.name}
                className={`${isExpert ? 'w-9 h-9' : 'w-14 h-14'} object-contain`}
                loading="lazy"
              />
              {!isExpert && (
                <span className="text-[9px] font-ui text-slate-300 text-center leading-tight">
                  {p.name}
                </span>
              )}
              {selected.includes(p.id) && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-poke-blue rounded-full
                             flex items-center justify-center text-[9px] text-poke-dark font-bold"
                >
                  ✓
                </motion.div>
              )}
            </motion.button>
          ))}
        </AnimatePresence>

        {pool.length === 0 && (
          <div className="col-span-full text-center text-slate-600 font-ui text-sm py-6">
            No Pokémon found for &ldquo;{search}&rdquo;
          </div>
        )}
      </div>

      {/* Submit button */}
      <motion.button
        onClick={onSubmit}
        disabled={!canSubmit}
        whileHover={canSubmit ? { scale: 1.03 } : undefined}
        whileTap={canSubmit ? { scale: 0.97 } : undefined}
        className={`w-full py-3 rounded-xl font-game text-sm transition-all duration-200
          ${canSubmit
            ? 'bg-poke-blue text-poke-dark shadow-[0_0_20px_rgba(76,201,240,0.4)] hover:shadow-[0_0_30px_rgba(76,201,240,0.6)]'
            : 'bg-poke-border text-slate-600 cursor-not-allowed'
          }`}
      >
        {phase === 'reveal' ? 'NEXT ROUND →' : '⚡ SUBMIT GUESS'}
      </motion.button>
    </div>
  );
}
