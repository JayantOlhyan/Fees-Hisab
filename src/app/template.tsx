'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.995 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              duration: 0.26,
              ease: [0.16, 1, 0.3, 1], // iOS native-like cubic-bezier spring curve
            }
      }
      className="w-full min-h-screen transform-gpu"
    >
      {children}
    </motion.div>
  );
}
