import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  timeLeft: number;
  isActive: boolean;
  onTick: () => void;
}

export default function Timer({ timeLeft, isActive, onTick }: Props) {
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(onTick, 1000);
    return () => clearInterval(id);
  }, [isActive, onTick]);

  const pct = timeLeft / 60;
  const urgent = timeLeft <= 10;
  const color = timeLeft > 20 ? '#4cc9f0' : timeLeft > 10 ? '#f4c430' : '#e63946';

  // Circumference of r=20 circle ≈ 125.66
  const circum = 2 * Math.PI * 20;
  const dash = pct * circum;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 50 50" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle cx="25" cy="25" r="20" fill="none" stroke="#2d2d4e" strokeWidth="4" />
          {/* Progress */}
          <motion.circle
            cx="25" cy="25" r="20"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circum}`}
            animate={{ stroke: color }}
            transition={{ duration: 0.5 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            animate={urgent ? { scale: [1, 1.15, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="font-game text-xs"
            style={{ color }}
          >
            {timeLeft}
          </motion.span>
        </div>
      </div>
      {urgent && (
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
          className="text-poke-red font-game text-xs"
        >
          ⚠ HURRY!
        </motion.div>
      )}
    </div>
  );
}
