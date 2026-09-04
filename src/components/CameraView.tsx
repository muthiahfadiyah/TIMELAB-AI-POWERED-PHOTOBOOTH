// src/components/CameraView.tsx

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  RefreshCw,
  ArrowLeft,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { cn } from "../lib/utils";
import { playCaptureInstruction } from "../lib/sound";

interface CameraViewProps {
  onCapture: (image: string) => void;
  onBack?: () => void;
  isPortrait?: boolean;
  processingError?: string | null;
}

export const CameraView: React.FC<CameraViewProps> = ({
  onCapture,
  onBack,
  isPortrait = false,
  processingError,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // ── Use a ref (not state) to store the stream so the cleanup function
  //    always has access to the current value, not a stale closure copy.
  const streamRef = useRef<MediaStream | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    playCaptureInstruction();
    return () => {
      // Reliably stop all tracks when the component unmounts (user leaves
      // the camera step) — the ref always holds the current stream.
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const startCamera = async () => {
    // Stop any existing stream before starting a new one
    streamRef.current?.getTracks().forEach((t) => t.stop());

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: isPortrait ? 720 : 1280 },
          height: { ideal: isPortrait ? 1280 : 720 },
        },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Izin kamera ditolak atau perangkat tidak ditemukan.");
    }
  };

  const takePhoto = () => {
    if (countdown !== null) return;
    let c = 3;
    setCountdown(c);
    const iv = setInterval(() => {
      c -= 1;
      if (c <= 0) {
        clearInterval(iv);
        setCountdown(null);
        setTimeout(capture, 50);
      } else setCountdown(c);
    }, 1000);
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  };

  const handleConfirm = () => {
    if (capturedImage) onCapture(capturedImage);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black">
      {/* Camera feed — always rendered so stream stays alive */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-300",
          capturedImage ? "opacity-0" : "opacity-100",
        )}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Error state ── */}
      {error && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/75 gap-4">
          <p className="text-white/50 text-sm text-center px-8">{error}</p>
          <button
            onClick={startCamera}
            className="notch notch-sm btn-sharp flex items-center gap-2 px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest"
          >
            <RefreshCw size={14} /> Coba Lagi
          </button>
        </div>
      )}

      {!error && (
        <>
          {/* ── Review overlay ── */}
          <AnimatePresence>
            {capturedImage && (
              <motion.div
                key="review"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 z-40 flex flex-col"
              >
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30" />

                {/* Top bar */}
                <div
                  className="relative z-10 px-8 py-6 flex items-center justify-between flex-shrink-0"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
                  }}
                >
                  <div />
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/90">
                      Cek Fotomu
                    </p>
                    <p className="text-[10px] text-white/45 mt-0.5 uppercase tracking-widest">
                      Sudah oke? Atau mau ambil ulang?
                    </p>
                  </div>
                  <div className="w-20" />
                </div>

                {/* Bottom action bar */}
                <div
                  className="relative z-10 mt-auto px-8 pb-10 pt-16 flex items-center justify-center gap-4 flex-shrink-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
                  }}
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRetake}
                    className="notch notch-md btn-sharp flex items-center gap-2.5 px-7 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    <RotateCcw size={16} />
                    Ambil Ulang
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConfirm}
                    className="notch notch-md btn-sharp flex items-center gap-2.5 px-9 py-4 bg-white text-black font-bold text-xs uppercase tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-all"
                  >
                    <Sparkles size={16} />
                    Gunakan Foto Ini
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Live camera UI ── */}
          <AnimatePresence>
            {!capturedImage && (
              <motion.div
                key="live"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-20"
              >
                {/* Scanline effect */}
                <div className="scanline" />

                {/* Vignette */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse 58% 72% at 50% 40%, transparent 22%, rgba(0,0,0,0.62) 100%)",
                  }}
                />

                {/* Countdown */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <AnimatePresence mode="wait">
                    {countdown !== null && (
                      <motion.div
                        key={countdown}
                        initial={{ scale: 0, opacity: 0, rotate: -20 }}
                        animate={{ scale: 1.2, opacity: 1, rotate: 0 }}
                        exit={{ scale: 2.5, opacity: 0, filter: "blur(10px)" }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                        className="relative"
                      >
                        <span className="text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(211,42,48,0.8)]">
                          {countdown}
                        </span>
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.5, opacity: 0 }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="absolute inset-0 border-4 border-white/50 rounded-full"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Top bar */}
                <div
                  className="absolute top-0 left-0 right-0 px-8 py-6 flex items-center justify-between"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)",
                  }}
                >
                  {onBack ? (
                    <button
                      onClick={onBack}
                      className="flex items-center gap-2 text-white/55 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest"
                    >
                      <ArrowLeft size={14} /> Back
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">
                      Ambil Foto
                    </p>
                    <p className="text-[10px] text-white/35 mt-0.5 uppercase tracking-widest">
                      Step 02 / 04
                    </p>
                  </div>

                  <div className="w-20" />
                </div>

                {/* Processing error toast */}
                <AnimatePresence>
                  {processingError && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute bottom-32 left-1/2 -translate-x-1/2 px-5 py-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold uppercase tracking-widest whitespace-nowrap"
                    >
                      {processingError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Capture button */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                  <button
                    id="capture-button"
                    onClick={takePhoto}
                    disabled={countdown !== null}
                    className={cn(
                      "notch notch-md btn-sharp group relative p-4 bg-white text-black transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]",
                      countdown !== null
                        ? "opacity-50 scale-95"
                        : "hover:scale-105 active:scale-95",
                    )}
                  >
                    <div className="flex items-center gap-3 px-6 py-1">
                      <Camera size={18} />
                      <span className="text-xs font-black uppercase tracking-[0.2em]">
                        Ambil Foto
                      </span>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};
