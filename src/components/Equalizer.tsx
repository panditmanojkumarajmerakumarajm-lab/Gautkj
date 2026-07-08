import React, { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";

interface EqualizerProps {
  analyser?: AnalyserNode | null;
}

export default function Equalizer({ analyser }: EqualizerProps) {
  const [heights, setHeights] = useState<number[]>(Array(16).fill(20));
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (analyser) {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateEqualizer = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Map 32 analyser bins into 16 bars
        const newHeights = Array(16).fill(0).map((_, i) => {
          const val = dataArray[i * 2] || 0;
          // Normalize to percentage (0 - 255 -> 10% - 100%)
          return Math.max(12, Math.min(100, Math.floor((val / 255) * 100)));
        });
        setHeights(newHeights);
        animationRef.current = requestAnimationFrame(updateEqualizer);
      };

      updateEqualizer();
    } else {
      // Gentle ambient idle animation
      const interval = setInterval(() => {
        setHeights(
          Array(16)
            .fill(0)
            .map(() => Math.floor(Math.random() * 30) + 12)
        );
      }, 150);

      return () => {
        clearInterval(interval);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser]);

  const barColors = [
    "bg-cyan-500 shadow-[0_0_8px_#06b6d4]",
    "bg-rose-500 shadow-[0_0_8px_#f43f5e]",
    "bg-purple-500 shadow-[0_0_8px_#a855f7]",
    "bg-pink-500 shadow-[0_0_8px_#ec4899]",
  ];

  return (
    <div id="dj-equalizer" className="flex items-end justify-center gap-1.5 h-20 w-full px-4 overflow-hidden rounded-xl bg-black/50 border border-zinc-800 py-2.5">
      {heights.map((height, index) => {
        const colorClass = barColors[index % barColors.length];
        return (
          <motion.div
            key={index}
            animate={{ height: `${height}%` }}
            transition={{ type: "spring", stiffness: 350, damping: 15 }}
            className={`w-2.5 rounded-full ${colorClass}`}
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
}
