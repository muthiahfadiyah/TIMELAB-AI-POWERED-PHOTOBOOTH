// src/views/ShareView.tsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { motion } from "motion/react";
import { Download, Printer, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";
import { useGlobalClickSound } from "../lib/sound";
import { PrintSheet } from "../components/ResultView";

export const ShareView: React.FC = () => {
  useGlobalClickSound();
  const { photoId } = useParams<{ photoId: string }>();
  const [image, setImage] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    if (!photoId) return;
    Promise.all([api.photos.get(photoId), api.settings.get()])
      .then(([photo, s]) => {
        setImage(photo.image);
        setSettings(s);
      })
      .catch((err) => console.error("Fetch Error:", err))
      .finally(() => setLoading(false));
  }, [photoId]);

  const downloadImage = () => {
    if (!image) return;
    const link = document.createElement("a");
    link.href = image;
    link.download = `${settings?.appName || "lumina"}-ai-${photoId}.jpg`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020205] flex items-center justify-center">
        <p className="text-white/20 uppercase tracking-widest text-xs animate-pulse">
          Retrieving from Neural Matrix...
        </p>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="min-h-screen bg-[#020205] flex items-center justify-center">
        <p className="text-red-400 uppercase tracking-widest text-xs">
          Art Piece Not Found
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020205] text-white font-gff relative overflow-hidden flex flex-col">
      {/* Background — sama persis dengan halaman utama */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {(settings?.bgType === "video" || !settings?.bgType) && (
          <video
            key={settings?.bgSource || "default"}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            style={{ opacity: settings?.bgOverlayOpacity ?? 0.4 }}
          >
            <source
              src={
                settings?.bgSource ||
                "https://www.pexels.com/download/video/11727415/"
              }
              type="video/mp4"
            />
          </video>
        )}
        {settings?.bgType === "image" && settings?.bgSource && (
          <img
            src={settings.bgSource}
            className="w-full h-full object-cover"
            style={{ opacity: settings?.bgOverlayOpacity ?? 0.4 }}
            alt=""
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020205]/80 via-transparent to-[#020205]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex-shrink-0 px-8 py-5 flex items-center">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center justify-center transition-all duration-500",
              settings?.logoUrl
                ? "w-auto h-12 bg-transparent"
                : "w-9 h-9 bg-[#D32A30] rounded-lg shadow-[0_0_20px_rgba(211,42,48,0.4)]",
            )}
          >
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                className="h-full w-auto object-contain max-w-[180px]"
                alt="Logo"
              />
            ) : (
              <Sparkles className="text-white" size={18} />
            )}
          </div>
          {!settings?.logoUrl && (
            <h1 className="text-lg font-bold tracking-tight uppercase">
              {settings?.appName || "LUMINA"}{" "}
              <span className="text-[#E05555]">AI</span>
            </h1>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#E05555]">
              {settings?.appName || "LUMINA"} AI Photobooth
            </p>
            <h2 className="text-2xl font-light tracking-tight">
              Your AI Masterpiece
            </h2>
          </div>

          <div className="glass-panel p-3 rounded-[32px] shadow-2xl relative">
            <img
              src={image}
              className="w-full rounded-[24px] shadow-lg"
              alt="AI Generated"
            />
            <div className="absolute top-6 right-6 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-[8px] font-bold tracking-widest uppercase">
              Digitally Synthesized
            </div>
          </div>

          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={downloadImage}
              className="notch notch-lg btn-sharp flex-1 bg-white text-black p-5 font-bold uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-3 transition-all"
            >
              <Download size={18} /> Save to Gallery
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowPrint(true)}
              className="notch notch-lg btn-sharp bg-white/10 text-white p-5 font-bold uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-3 transition-all"
            >
              <Printer size={18} />
            </motion.button>
          </div>

          <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-mono">
            {settings?.footerText || "Powered by Generative Neural Networks"}
          </p>
        </motion.div>
      </main>

      <PrintSheet
        show={showPrint}
        onClose={() => setShowPrint(false)}
        image={image || ""}
        shareUrl={window.location.href}
        printTopLogoUrl={settings?.printTopLogoUrl || ""}
        printThanksText={settings?.printThanksText ?? "THANKS FOR COMING"}
        printQuoteText={settings?.printQuoteText || ""}
        printFooterLogoUrl={settings?.printFooterLogoUrl || ""}
        printFooterText={settings?.printFooterText ?? "POWERED BY TIMELAB"}
        appName={settings?.appName || "PHOTOBOOTH"}
      />
    </div>
  );
};
