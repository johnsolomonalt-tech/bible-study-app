"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AnimatedStreakFlameProps {
  size?: number;
  streak?: number;
  isGlowing?: boolean;
  className?: string;
}

export const AnimatedStreakFlame: React.FC<AnimatedStreakFlameProps> = ({
  size = 18,
  streak = 1,
  isGlowing = true,
  className = '',
}) => {
  const [hasIgnited, setHasIgnited] = useState(false);

  useEffect(() => {
    if (streak > 0) {
      // Allow the slow 1.4s ignition phase to complete before transitioning into the continuous ambient burning loop
      const timer = setTimeout(() => {
        setHasIgnited(true);
      }, 1450);
      return () => clearTimeout(timer);
    } else {
      setHasIgnited(false);
    }
  }, [streak]);

  const flamePath = "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z";

  if (streak === 0) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`text-muted/50 ${className}`}
      >
        <path d={flamePath} />
      </svg>
    );
  }

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      // Slow startup scale blooming from 0.88 into 1.05 then normal burning breathing loop
      animate={
        hasIgnited
          ? {
              scale: [1, 1.05, 0.98, 1.03, 1],
              rotate: [0, 1.5, -1, 1, 0],
            }
          : {
              scale: [0.88, 0.94, 1.06, 1],
              rotate: [0, -1, 1.5, 0],
            }
      }
      transition={
        hasIgnited
          ? {
              duration: 2.6,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : {
              duration: 1.45,
              ease: [0.22, 1, 0.36, 1],
            }
      }
    >
      {/* Background warm ember glow that blooms during ignition */}
      <motion.div
        className="absolute inset-0 rounded-full blur-[6px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.55) 0%, rgba(234, 88, 12, 0.2) 65%, transparent 100%)',
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={
          hasIgnited
            ? {
                opacity: isGlowing ? [0.75, 1, 0.7, 0.95, 0.75] : 0.4,
                scale: [0.95, 1.15, 0.98, 1.1, 0.95],
              }
            : {
                opacity: [0, 0.3, 0.9, 0.8],
                scale: [0.4, 0.7, 1.2, 1.0],
              }
        }
        transition={
          hasIgnited
            ? {
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : {
                duration: 1.45,
                ease: "easeOut",
              }
        }
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 overflow-visible"
      >
        <defs>
          {/* Flame radiant gradient */}
          <linearGradient id={`streak-flame-grad-${size}`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>

          {/* Ignition reveal clip path: rises up slowly from the bottom */}
          <clipPath id={`ignition-clip-${size}`}>
            <motion.rect
              x="0"
              width="24"
              initial={{ y: 24, height: 0 }}
              animate={{ y: 0, height: 24 }}
              transition={{
                duration: 1.4,
                ease: [0.25, 0.1, 0.25, 1], // Slow startup curve
              }}
            />
          </clipPath>
        </defs>

        {/* 1. Base Blank Outline Flame (Unlit contour) */}
        <path
          d={flamePath}
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-500/40 dark:text-amber-400/35"
        />

        {/* 2. Igniting Flame Body (Fills from bottom to top) */}
        <g clipPath={`url(#ignition-clip-${size})`}>
          <path
            d={flamePath}
            fill={`url(#streak-flame-grad-${size})`}
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: isGlowing ? 'drop-shadow(0 1px 4px rgba(245, 158, 11, 0.5))' : 'none',
            }}
          />

          {/* Inner core bright spark */}
          <path
            d="M10 16a2 2 0 0 0 2-2c0-1-.5-1.5-1-2.2-.5 1-1 1.7-1 2.2 0 .5.5 1 1 1z"
            fill="#ffffff"
            opacity={0.85}
          />
        </g>
      </svg>
    </motion.div>
  );
};
