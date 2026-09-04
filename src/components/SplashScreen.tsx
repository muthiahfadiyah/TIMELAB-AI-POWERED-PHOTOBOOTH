// src/components/SplashScreen.tsx

import React from "react";
import { motion } from "motion/react";

interface SplashScreenProps {
  appName?: string;
  onStart: () => void;
  rotation?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  appName = "PHOTOBOOTH",
  onStart,
  rotation = 0,
}) => {
  const isRotated = rotation === 90 || rotation === 270;

  const rotatedStyle = isRotated
    ? {
        backgroundColor: "#D32A30",
        paddingTop: "14%",
        paddingBottom: "14%",
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center center",
        width: "100vh",
        height: "100vw",
        position: "fixed" as const,
        top: "50%",
        left: "50%",
        marginTop: "-50vw",
        marginLeft: "-50vh",
      }
    : { backgroundColor: "#D32A30", paddingTop: "14%", paddingBottom: "14%" };

  return (
    <motion.div
      className={
        isRotated
          ? "z-[300] flex flex-col items-center justify-between cursor-pointer select-none"
          : "fixed inset-0 z-[300] flex flex-col items-center justify-between cursor-pointer select-none"
      }
      style={rotatedStyle}
      onClick={onStart}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
    >
      {/* App name — atas */}
      <div className="text-center text-white space-y-1">
        <p className="text-xl font-black tracking-[0.15em] opacity-85">
          {appName}
        </p>
        <p className="text-2xl font-bold tracking-[0.08em]">Photobooth AI</p>
      </div>

      {/* Ikon smiley — tengah */}
      <div className="flex items-center justify-center flex-1">
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg
            width="240"
            height="240"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Lingkaran luar */}
            <circle cx="100" cy="100" r="88" stroke="white" strokeWidth="10" />
            {/* Mata kiri (persegi panjang rounded) */}
            <rect x="60" y="68" width="20" height="28" rx="4" fill="white" />
            {/* Mata kanan */}
            <rect x="120" y="68" width="20" height="28" rx="4" fill="white" />
            {/* Senyuman */}
            <path
              d="M 52 122 Q 100 165 148 122"
              stroke="white"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>
      </div>

      {/* Tap to start — bawah */}
      <motion.p
        className="text-white text-2xl font-bold tracking-[0.06em]"
        animate={{ opacity: [1, 0.55, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        Ketuk untuk mulai
      </motion.p>
    </motion.div>
  );
};
