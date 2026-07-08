import React from "react";
import { motion } from "motion/react";

export default function MusicWave() {
  return (
    <div id="music-wave-container" className="relative h-12 w-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-30">
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.span
            key={i}
            className="w-1 bg-gradient-to-t from-cyan-500 to-rose-500 rounded-full"
            animate={{
              height: [12, 48, 12],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.03,
              ease: "easeInOut",
            }}
            style={{ height: "12px" }}
          />
        ))}
      </div>
    </div>
  );
}
