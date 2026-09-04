// src/components/StyleSelector.tsx

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PhotoStyle {
  id: string;
  name: string;
  description: string;
  preview: string;
  prompt: string;
  assetImage?: string;
  isActive?: boolean;
  // 'unisex' (default, shown for both genders) | 'male' | 'female'
  genderTarget?: "unisex" | "male" | "female";
  // Whether the backend should append its generic face-identity instruction.
  // Off by default in the type only when explicitly set false by styles whose
  // own prompt already dictates face handling (e.g. wants a blank/generic face).
  preserveIdentity?: boolean;
}

interface StyleSelectorProps {
  selectedStyleId: string;
  onSelect: (style: PhotoStyle) => void;
  styles?: PhotoStyle[];
  isPortrait?: boolean;
  viewMode?: "carousel" | "grid";
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  selectedStyleId,
  onSelect,
  styles = [],
  isPortrait = false,
  viewMode = "carousel",
}) => {
  const currentIndex = styles.findIndex(
    (s: PhotoStyle) => s.id === selectedStyleId,
  );
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  const next = () => onSelect(styles[(safeIndex + 1) % styles.length]);
  const prev = () =>
    onSelect(styles[(safeIndex - 1 + styles.length) % styles.length]);

  // ── Grid view ─────────────────────────────────────────────────────────────
  if (viewMode === "grid") {
    return (
      <div className="w-full h-full overflow-y-auto scrollbar-hide">
        <div
          className={cn(
            "grid gap-3 p-2",
            // Landscape containers are wide and short — more columns keeps
            // each aspect-[3/4] card shorter so a row fits without scrolling.
            isPortrait ? "grid-cols-3" : "grid-cols-4 lg:grid-cols-5",
          )}
        >
          {styles.map((style: PhotoStyle) => {
            const isSelected = style.id === selectedStyleId;
            return (
              <motion.div
                key={style.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect(style)}
                className="cursor-pointer"
              >
                {/* Filter (drop-shadow) lives on this non-animated child,
                  not the motion.div above — Chromium smears/ghosts a
                  drop-shadow when it shares an element with an actively
                  animated transform (whileHover/whileTap scale here),
                  especially under rapid repeated clicks. Splitting the
                  transform and the filter onto parent/child fixes it. */}
                <div
                  className={cn(
                    "relative flex flex-col notch-2 notch-lg overflow-hidden transition-all duration-200",
                    isSelected ? "bg-[#D32A30]" : "bg-white/20",
                    isSelected && "drop-shadow-[0_0_10px_rgba(211,42,48,0.5)]",
                  )}
                >
                  {/* Image — clipped short on the LEFT (flat·diagonal·flat,
                    same silhouette as the reference card's seam), leaving a
                    constant 3px gap down to the card's own background
                    color so a thin accent line — not a block — shows
                    through, exactly tracing the plate's edge below. */}
                  <div
                    className="relative aspect-[3/4] bg-[#0a0a10] overflow-hidden"
                    style={{
                      clipPath:
                        "polygon(0 0, 100% 0, 100% calc(100% - 3px), 62% calc(100% - 3px), 57% calc(100% - 13px), 0 calc(100% - 13px))",
                    }}
                  >
                    <img
                      src={style.preview}
                      alt={style.name}
                      className="w-full h-full object-cover"
                      style={{
                        filter: isSelected
                          ? "none"
                          : "brightness(0.75) saturate(0.85)",
                      }}
                    />

                    {/* Selected badge */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          className="absolute top-1.5 right-1.5 bg-[#D32A30] text-white text-[7px] font-black uppercase px-1.5 py-0.5 tracking-wider"
                        >
                          ✓
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Name plate — pulled up 13px to overlap the image's
                    clipped corner, then clipped to the complementary
                    contour so it picks up exactly where the image's edge
                    (plus the 3px line) leaves off. */}
                  <div
                    className="relative bg-white px-2 pt-3 pb-1.5 flex-shrink-0"
                    style={{
                      marginTop: "-13px",
                      clipPath:
                        "polygon(0 3px, 57% 3px, 62% 13px, 100% 13px, 100% 100%, 0 100%)",
                    }}
                  >
                    <h3 className="font-black uppercase tracking-tight leading-none text-[10px] text-black truncate">
                      {style.name}
                    </h3>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Carousel view ────────────────────────────────────────────────────────
  // Fan-spread config. Landscape values are intentionally smaller than
  // portrait so the rotated card corners don't push too far outside the
  // nominal card box.
  const ROTATE_PER_STEP = isPortrait ? 14 : 10;
  const X_PER_STEP = isPortrait ? 190 : 130;
  const ORIGIN_Y = 1.6;

  return (
    // h-full is critical here: the parent wrapper gets its height from
    // flex-1 in ITS flex-column parent, but THIS div's own parent is a
    // plain block — so flex-1/min-h-0 on this element would do nothing
    // and it'd collapse to ~0px (just its padding). h-full makes it
    // inherit that real height so the cards below can center against it.
    <div className="relative w-full max-w-5xl mx-auto h-full py-2">
      {/* Navigasi kiri */}
      <div className="absolute left-2 lg:left-6 top-1/2 -translate-y-1/2 z-[100]">
        <button
          onClick={prev}
          className="w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/20 hover:border-white/30 transition-all text-white/40 hover:text-white shadow-2xl"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Navigasi kanan */}
      <div className="absolute right-2 lg:right-6 top-1/2 -translate-y-1/2 z-[100]">
        <button
          onClick={next}
          className="w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/20 hover:border-white/30 transition-all text-white/40 hover:text-white shadow-2xl"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Fan cards — every card stays mounted for the lifetime of the
          carousel and just tweens between diff positions on selection
          change. Nothing mounts/unmounts as it enters or leaves the
          visible ±2 window, so there is no pop-in/pop-out or "flying in
          from behind" artifact — cards already off-frame just fade to
          opacity 0 and keep sliding along the same track. */}
      <div>
        {styles.map((style: PhotoStyle, index: number) => {
          let diff = index - safeIndex;
          if (diff > styles.length / 2) diff -= styles.length;
          if (diff < -styles.length / 2) diff += styles.length;

          const isCenter = diff === 0;
          const absDiff = Math.abs(diff);
          const isVisible = absDiff <= 2;

          return (
            <motion.div
              key={style.id}
              style={{
                originX: 0.5,
                originY: ORIGIN_Y,
              }}
              animate={{
                rotate: diff * ROTATE_PER_STEP,
                x: diff * X_PER_STEP,
                scale: isCenter ? 1 : 1 - Math.min(absDiff, 2) * 0.07,
                opacity: isVisible ? (isCenter ? 1 : 1 - absDiff * 0.28) : 0,
                zIndex: 50 - Math.min(absDiff, 2) * 10,
              }}
              transition={{
                type: "tween",
                ease: [0.22, 1, 0.36, 1],
                duration: 0.45,
              }}
              onClick={() => onSelect(style)}
              className={cn(
                // inset-0 m-auto centers this fixed-size box both axes
                // within the relative parent — this is what actually
                // centers the fan, since flex alignment doesn't apply
                // to absolutely-positioned children.
                "absolute inset-0 m-auto aspect-[3/4] cursor-pointer",
                !isVisible && "pointer-events-none",
                isPortrait
                  ? "w-[300px] md:w-[360px]"
                  : "w-[190px] md:w-[220px]",
              )}
            >
              {/* Filter (drop-shadow) lives on this non-animated child,
                  not the motion.div above — Chromium smears/ghosts a
                  drop-shadow when it shares an element with an actively
                  animated transform (rotate/x/scale here), especially
                  under rapid repeated clicks through the carousel.
                  Splitting the transform and the filter onto
                  parent/child fixes it. */}
              <div
                className={cn(
                  "relative w-full h-full flex flex-col notch-2 notch-xl overflow-hidden transition-shadow duration-300",
                  isCenter ? "bg-[#D32A30]" : "bg-white/15",
                  isCenter && "drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
                )}
              >
                {/* Image — clipped short on the LEFT (flat·diagonal·flat,
                  same silhouette as the reference card's seam), leaving a
                  constant 4px gap down to the card's own background color
                  so a thin accent line — not a block — shows through,
                  exactly tracing the plate's edge below. */}
                <div
                  className="relative flex-1 min-h-0 bg-[#0a0a10] overflow-hidden"
                  style={{
                    clipPath:
                      "polygon(0 0, 100% 0, 100% calc(100% - 4px), 62% calc(100% - 4px), 57% calc(100% - 16px), 0 calc(100% - 16px))",
                  }}
                >
                  <img
                    src={style.preview}
                    alt={style.name}
                    className="w-full h-full object-cover"
                    style={{
                      filter: isCenter
                        ? "none"
                        : "brightness(0.6) saturate(0.75)",
                    }}
                  />

                  <AnimatePresence>
                    {isCenter && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.6, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        className="absolute top-2.5 right-2.5 bg-[#D32A30] text-white px-2 py-1 flex items-center gap-1.5"
                      >
                        <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          Selected
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Name plate — pulled up 16px to overlap the image's
                  clipped corner, then clipped to the complementary
                  contour so it picks up exactly where the image's edge
                  (plus the 4px line) leaves off. */}
                <div
                  className="relative bg-white px-4 pt-5 pb-3 flex-shrink-0"
                  style={{
                    marginTop: "-16px",
                    clipPath:
                      "polygon(0 4px, 57% 4px, 62% 16px, 100% 16px, 100% 100%, 0 100%)",
                  }}
                >
                  <h3 className="text-lg font-black text-black tracking-tight uppercase leading-none truncate">
                    {style.name}
                  </h3>
                  {isCenter && (
                    <p className="text-[9px] text-black/50 font-bold uppercase tracking-widest leading-relaxed mt-1.5 line-clamp-2">
                      {style.description}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pagination dots */}
      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2 z-[100]">
        {styles.map((_: PhotoStyle, i: number) => (
          <button
            key={i}
            onClick={() => onSelect(styles[i])}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              i === safeIndex
                ? "bg-[#D32A30] w-10 shadow-[0_0_12px_rgba(211,42,48,0.8)]"
                : "bg-white/15 w-1.5 hover:bg-white/30",
            )}
          />
        ))}
      </div>
    </div>
  );
};
