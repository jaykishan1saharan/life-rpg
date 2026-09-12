'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface LevelUpModalProps {
  open: boolean;
  level: number;
  onClose: () => void;
}

export default function LevelUpModal({
  open,
  level,
  onClose,
}: LevelUpModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* particles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-cyan-400"
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  x: Math.cos(i) * (120 + i * 7),
                  y: Math.sin(i) * (120 + i * 7),
                  opacity: 0,
                  scale: 0,
                }}
                transition={{
                  duration: 1.2,
                  delay: i * 0.02,
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{
              scale: 0.7,
              y: 30,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              y: 0,
              opacity: 1,
            }}
            exit={{
              scale: 0.8,
              opacity: 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 14,
            }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-400/30 bg-[#090d14] p-8 text-center shadow-[0_0_80px_rgba(34,211,238,0.18)]"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-cyan-400" />

            <div className="text-6xl">
              ⚔️
            </div>

            <p className="mt-6 text-xs font-black tracking-[0.4em] text-cyan-400">
              CHARACTER EVOLUTION
            </p>

            <h2 className="mt-3 text-5xl font-black tracking-tight text-white">
              LEVEL UP!
            </h2>

            <div className="mt-5 text-7xl font-black text-cyan-300">
              {level}
            </div>

            <p className="mt-2 text-sm uppercase tracking-[0.25em] text-gray-500">
              New Level Unlocked
            </p>

            <button
              onClick={onClose}
              className="mt-8 w-full rounded-xl bg-cyan-400 px-6 py-3 font-black text-black transition hover:scale-[1.02] hover:bg-cyan-300"
            >
              CONTINUE ADVENTURE
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}