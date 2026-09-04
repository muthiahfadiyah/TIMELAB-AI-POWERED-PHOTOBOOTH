// src/components/ResultView.tsx

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Printer, ArrowLeft, RotateCcw, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "../lib/utils";

interface PrintSettings {
  printTopLogoUrl?: string;
  printThanksText?: string;
  printQuoteText?: string;
  printFooterLogoUrl?: string;
  printFooterText?: string;
  appName?: string;
}

interface ResultViewProps {
  image: string;
  shareId: string | null;
  onReset: () => void;
  onRetry?: () => void;
  isPortrait?: boolean;
  printSettings?: PrintSettings;
}

// ── Print sheet — rendered outside ResultView so it's never re-created
//    on state changes inside the parent (that was causing the refresh loop).
//    Exported so other views (e.g. admin gallery) can reuse the exact same
//    print layout instead of duplicating it.
export interface PrintSheetProps {
  show: boolean;
  onClose: () => void;
  image: string;
  shareUrl: string;
  printTopLogoUrl: string;
  printThanksText: string;
  printQuoteText: string;
  printFooterLogoUrl: string;
  printFooterText: string;
  appName: string;
}

export const PrintSheet: React.FC<PrintSheetProps> = ({
  show,
  onClose,
  image,
  shareUrl,
  printTopLogoUrl,
  printThanksText,
  printQuoteText,
  printFooterLogoUrl,
  printFooterText,
  appName,
}) => {
  const handlePrint = () => {
    const style = document.createElement("style");
    style.setAttribute("data-print-override", "");
    style.textContent = `
      @media print {
        @page { margin: 0; size: 58mm 210mm; }
        body * { visibility: hidden !important; }
        #pb-print-root,
        #pb-print-root * { visibility: visible !important; }
        #pb-print-root {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 58mm !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => style.remove(), 1500);
  };

  return (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="relative flex flex-col items-center"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="notch notch-xs btn-sharp absolute -top-3 -right-3 z-10 w-8 h-8 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={14} />
          </button>

          {/* Print sheet preview — mirrors what actually gets sent to the
              thermal printer: logo/app name -> QR -> AI photo -> footer */}
          <div
            id="pb-print-root"
            style={{
              width: "58mm",
              background: "#fff",
              fontFamily: "Consolas, 'Courier New', monospace",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              // 5mm left/right keeps content inside the ~48mm printable head width
              // of a 58mm roll; 4/5mm top/bottom keeps it off the tear edge.
              padding: "4mm 5mm 5mm 5mm",
              gap: "3mm",
              borderRadius: 8,
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Top logo or app name */}
            {printTopLogoUrl ? (
              <img
                src={printTopLogoUrl}
                style={{
                  maxWidth: 34 * 3.78,
                  maxHeight: 16 * 3.78,
                  objectFit: "contain",
                }}
                alt=""
              />
            ) : (
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#111",
                  margin: 0,
                }}
              >
                {appName || "PHOTOBOOTH"}
              </p>
            )}

            {/* QR code — scan to open/save the photo on a phone */}
            {shareUrl ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2mm",
                }}
              >
                <div
                  style={{
                    padding: "2mm",
                    background: "#fff",
                    border: "1px solid #eee",
                    borderRadius: 6,
                  }}
                >
                  <QRCodeSVG
                    value={shareUrl}
                    size={Math.round(38 * 3.78)}
                    level="M"
                    fgColor="#111111"
                  />
                </div>
                <p
                  style={{
                    fontSize: 7,
                    color: "#888",
                    textAlign: "center",
                    margin: 0,
                    letterSpacing: "0.03em",
                  }}
                >
                  Scan untuk melihat &amp; simpan foto
                </p>
              </div>
            ) : (
              <p
                style={{
                  fontSize: 9,
                  color: "#aaa",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                Foto tersedia di perangkat
              </p>
            )}

            {/* AI result photo — printed below the QR code */}
            {image && (
              <img
                src={image}
                style={{
                  width: "100%",
                  borderRadius: 4,
                  border: "1px solid #eee",
                }}
                alt=""
              />
            )}

            {/* Thanks text */}
            {printThanksText && (
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#111",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                {printThanksText}
              </p>
            )}

            {/* Quote */}
            {printQuoteText && (
              <>
                <div
                  style={{ width: 14 * 3.78, height: 1, background: "#ddd" }}
                />
                <p
                  style={{
                    fontSize: 10,
                    color: "#444",
                    textAlign: "center",
                    lineHeight: 1.5,
                    padding: "0 1mm",
                    margin: 0,
                  }}
                >
                  {printQuoteText}
                </p>
              </>
            )}

            {/* Footer */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2mm",
              }}
            >
              {printFooterLogoUrl && (
                <img
                  src={printFooterLogoUrl}
                  style={{
                    maxWidth: 20 * 3.78,
                    maxHeight: 9 * 3.78,
                    objectFit: "contain",
                  }}
                  alt=""
                />
              )}
              {printFooterText && (
                <p
                  style={{
                    fontSize: 7,
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#aaa",
                    margin: 0,
                  }}
                >
                  {printFooterText}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={onClose}
              className="notch notch-sm btn-sharp px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="notch notch-sm btn-sharp flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-slate-100 text-black text-xs font-bold uppercase tracking-widest transition-colors"
            >
              <Printer size={13} /> Cetak
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
  );
};

export const ResultView: React.FC<ResultViewProps> = ({
  image,
  shareId,
  onReset,
  onRetry,
  isPortrait = false,
  printSettings = {} as PrintSettings,
}) => {
  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : "";
  const [showPrint, setShowPrint] = useState(false);

  const {
    printTopLogoUrl = "",
    printThanksText = "THANKS FOR COMING",
    printQuoteText = "",
    printFooterLogoUrl = "",
    printFooterText = "POWERED BY TIMELAB",
  } = printSettings;

  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = image;
    link.download = `ai-photobooth-${Date.now()}.png`;
    link.click();
  };

  const sharedProps = {
    show: showPrint,
    onClose: () => setShowPrint(false),
    image,
    shareUrl,
    printTopLogoUrl,
    printThanksText,
    printQuoteText,
    printFooterLogoUrl,
    printFooterText,
    appName: printSettings.appName || "PHOTOBOOTH",
  };

  /* ── Portrait layout ── */
  if (isPortrait) {
    return (
      // scrollbar-hide: hides scrollbar visually while keeping scroll functional
      <div className="flex flex-col gap-6 w-full overflow-y-auto scrollbar-hide">
        <PrintSheet {...sharedProps} />

        {/* Foto hasil */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full flex justify-center"
        >
          <div className="glass-panel rounded-3xl p-3 shadow-2xl w-full max-w-lg">
            <img
              src={image}
              alt="AI Generated Result"
              referrerPolicy="no-referrer"
              className="w-full rounded-2xl shadow-lg"
            />
          </div>
        </motion.div>

        {/* Info + aksi */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel rounded-3xl p-6 space-y-6"
        >
          <div className="space-y-2">
            <h2 className="text-3xl font-light tracking-tight leading-none">
              Foto Selesai!
            </h2>
            <p className="text-white/40 text-[10px] uppercase tracking-widest leading-loose">
              Scan QR atau unduh foto hasil AI-mu.
            </p>
          </div>

          {shareId && (
            <div className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.15)]">
              <QRCodeSVG
                value={shareUrl}
                size={140}
                level="M"
                fgColor="#000000"
              />
              <div className="text-center space-y-0.5">
                <p className="text-black text-xs font-bold uppercase tracking-widest">
                  Scan untuk Simpan
                </p>
                <p className="text-black/40 text-[10px] uppercase tracking-wider">
                  Buka &amp; simpan foto ke ponselmu
                </p>
              </div>
            </div>
          )}

          <div className={cn("grid gap-2", onRetry ? "grid-cols-3" : "grid-cols-2")}>
            <button
              onClick={downloadImage}
              className="notch notch-xs flex items-center justify-center gap-1.5 w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold uppercase tracking-widest text-[10px] transition-all"
            >
              <Download size={12} /> Unduh
            </button>
            <button
              onClick={() => setShowPrint(true)}
              className="notch notch-xs flex items-center justify-center gap-1.5 w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold uppercase tracking-widest text-[10px] transition-all"
            >
              <Printer size={12} /> Print
            </button>
            {onRetry && (
              <button
                onClick={onRetry}
                className="notch notch-xs flex items-center justify-center gap-1.5 w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold uppercase tracking-widest text-[10px] transition-all"
              >
                <RotateCcw size={12} /> Ulang
              </button>
            )}
          </div>

          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 w-full pt-2 text-white/25 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-[0.2em]"
          >
            <ArrowLeft size={13} /> Sesi Baru
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── Landscape layout ── */
  return (
    // scrollbar-hide: hides scrollbar visually while keeping scroll functional
    <div className="flex flex-col lg:flex-row gap-8 items-start max-w-6xl mx-auto py-10 overflow-y-auto scrollbar-hide">
      <PrintSheet {...sharedProps} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full lg:w-2/3 glass-panel rounded-3xl p-3 shadow-2xl"
      >
        <img
          src={image}
          alt="AI Generated Result"
          referrerPolicy="no-referrer"
          className="w-full rounded-2xl shadow-lg"
        />
      </motion.div>

      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        <div className="glass-panel p-8 rounded-3xl space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl font-light tracking-tight leading-none">
              Foto <br />
              Selesai!
            </h2>
            <p className="text-white/40 text-xs uppercase tracking-widest leading-loose">
              Scan QR atau unduh foto hasil AI-mu.
            </p>
          </div>

          {shareId && (
            <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.15)]">
              <QRCodeSVG
                value={shareUrl}
                size={170}
                level="M"
                fgColor="#000000"
              />
              <div className="text-center space-y-1">
                <p className="text-black text-xs font-bold uppercase tracking-widest">
                  Scan untuk Simpan
                </p>
                <p className="text-black/40 text-[10px] leading-relaxed uppercase tracking-wider">
                  Buka &amp; simpan foto ke ponselmu
                </p>
              </div>
            </div>
          )}

          <div className={cn("grid gap-2 pt-2", onRetry ? "grid-cols-3" : "grid-cols-2")}>
            <button
              onClick={downloadImage}
              className="notch notch-xs flex items-center justify-center gap-1.5 w-full py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-[10px] transition-all"
            >
              <Download size={12} /> Unduh
            </button>
            <button
              onClick={() => setShowPrint(true)}
              className="notch notch-xs flex items-center justify-center gap-1.5 w-full py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-[10px] transition-all"
            >
              <Printer size={12} /> Cetak
            </button>
            {onRetry && (
              <button
                onClick={onRetry}
                className="notch notch-xs flex items-center justify-center gap-1.5 w-full py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-[10px] transition-all"
              >
                <RotateCcw size={12} /> Ulang
              </button>
            )}
          </div>
        </div>

        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 p-4 text-white/20 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-[0.2em]"
        >
          <ArrowLeft size={14} /> Sesi Baru
        </button>
      </div>
    </div>
  );
};
