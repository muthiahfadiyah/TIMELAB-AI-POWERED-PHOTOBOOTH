// src/views/Photobooth.tsx

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  ArrowRight,
  Users,
  Users2,
  LayoutGrid,
  GalleryHorizontalEnd,
  LogOut,
  Clock,
  ChevronDown,
} from "lucide-react";
import { cn } from "../lib/utils";
import { StyleSelector, type PhotoStyle } from "../components/StyleSelector";
import { CameraView } from "../components/CameraView";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { ResultView } from "../components/ResultView";
import { SplashScreen } from "../components/SplashScreen";
import { api, getSessionTimeRemaining } from "../lib/api";
import {
  startLoadingMusic,
  stopLoadingMusic,
  startBackgroundMusic,
  stopBackgroundMusic,
  playOpeningSound,
  playLoadingInstruction,
} from "../lib/sound";
import individuIcon from "../assets/Individu.png";
import groupIcon from "../assets/Group.png";
import maleIcon from "../assets/Male.png";
import femaleIcon from "../assets/Female.png";
import anakIcon from "../assets/anak.png";
import remajaIcon from "../assets/remaja.png";
import dewasaIcon from "../assets/dewasa.png";

// ── Steps ──────────────────────────────────────────────────────────────────
enum Step {
  Lobby = 1,
  ChooseCategory = 2,
  ChooseGender = 3,
  ChooseAge = 4,
  ChooseStyle = 5,
  Capture = 6,
  Processing = 7,
  Result = 8,
}

// ── Category ────────────────────────────────────────────────────────────────
// Top-level choice: foto sendiri (Individu) atau bersama-sama (Grup)
type MainCategory = "individu" | "group" | null;
// Hanya relevan kalau MainCategory === "individu"
type Gender = "male" | "female" | null;
// Hanya relevan kalau MainCategory === "individu" — dipakai untuk instruksi usia ke AI
type AgeGroup = "child" | "teen" | "adult" | null;
// Target style filter — gabungan dari mainCategory + gender, dipakai untuk filter `photo_styles`
// null = belum ada yang dipilih (hanya tampil style universal)
type Category = "male" | "female" | "group" | "universal" | null;
type StyleGenderTarget = "universal" | "unisex" | "male" | "female" | "group";

type ViewMode = "carousel" | "grid";

interface PhotoboothProps {
  onLock?: () => void;
}

const MAIN_CATEGORIES: {
  value: NonNullable<MainCategory>;
  label: string;
  icon: React.ReactNode;
  // RGB triplets (no "rgb(...)" wrapper) driving the card-cut accent
  // colors when this category is selected — same blue/amber pairing the
  // Gender step uses (border-{color}-400 + bg-{color}-500/15), just
  // routed through CSS custom properties so the notch border can carry it.
  accentBorder: string;
  accentBg: string;
}[] = [
  {
    value: "individu",
    label: "Individu",
    icon: <img src={individuIcon} alt="Individu" className="w-[120px] h-[120px] object-contain" />,
    accentBorder: "96, 165, 250", // blue-400
    accentBg: "59, 130, 246", // blue-500
  },
  {
    value: "group",
    label: "Grup",
    icon: <img src={groupIcon} alt="Grup" className="w-[120px] h-[120px] object-contain" />,
    accentBorder: "251, 191, 36", // amber-400
    accentBg: "245, 158, 11", // amber-500
  },
];

const GENDERS: {
  value: NonNullable<Gender>;
  label: string;
  icon: React.ReactNode;
  // RGB triplets driving the card-cut accent colors when selected — same
  // shade pairing as before (border-{color}-400 + bg-{color}-500/15), just
  // routed through CSS custom properties for the notched card shape.
  accentBorder: string;
  accentBg: string;
}[] = [
  {
    value: "male",
    label: "Pria",
    icon: <img src={maleIcon} alt="Pria" className="w-[120px] h-[120px] object-contain" />,
    accentBorder: "96, 165, 250", // blue-400
    accentBg: "59, 130, 246", // blue-500
  },
  {
    value: "female",
    label: "Wanita",
    icon: <img src={femaleIcon} alt="Wanita" className="w-[120px] h-[120px] object-contain" />,
    accentBorder: "244, 114, 182", // pink-400
    accentBg: "236, 72, 153", // pink-500
  },
];

const AGE_GROUPS: {
  value: NonNullable<AgeGroup>;
  label: string;
  icon: React.ReactNode;
  accentBorder: string;
  accentBg: string;
}[] = [
  {
    value: "child",
    label: "Anak-anak",
    icon: <img src={anakIcon} alt="Anak-anak" className="w-[120px] h-[120px] object-contain" />,
    accentBorder: "251, 146, 60", // orange-400
    accentBg: "249, 115, 22", // orange-500
  },
  {
    value: "teen",
    label: "Remaja",
    icon: <img src={remajaIcon} alt="Remaja" className="w-[120px] h-[120px] object-contain" />,
    accentBorder: "45, 212, 191", // teal-400
    accentBg: "20, 184, 166", // teal-500
  },
  {
    value: "adult",
    label: "Dewasa",
    icon: <img src={dewasaIcon} alt="Dewasa" className="w-[120px] h-[120px] object-contain" />,
    accentBorder: "129, 140, 248", // indigo-400
    accentBg: "99, 102, 241", // indigo-500
  },
];

// Formatting helper
function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0)
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// null (nothing selected) → show universal styles only
// category "group" → show group styles only (universal is excluded for group)
// category "male"/"female" → show that category's styles + universal styles (union)
function visibleStylesForCategory(
  styles: PhotoStyle[],
  category: Category,
): PhotoStyle[] {
  if (!category)
    return styles.filter(
      (s) => (s.genderTarget || "universal") === "universal",
    );
  if (category === "group")
    return styles.filter((s) => {
      const target = (s.genderTarget ?? "universal") as string;
      return target === "group";
    });
  return styles.filter((s) => {
    const target = (s.genderTarget ?? "universal") as string;
    return target === category || target === "universal";
  });
}

export default function Photobooth({ onLock }: PhotoboothProps) {
  const [step, setStep] = useState<Step>(Step.Lobby);
  const [dbStyles, setDbStyles] = useState<PhotoStyle[]>([]);
  const [appSettings, setAppSettings] = useState<any>(null);
  const [selectedStyle, setSelectedStyle] = useState<PhotoStyle | null>(null);
  const [mainCategory, setMainCategory] = useState<MainCategory>(null);
  const [gender, setGender] = useState<Gender>(null);
  const [isHijab, setIsHijab] = useState(false);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [splashDismissed, setSplashDismissed] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("carousel");

  const [timeRemainingMs, setTimeRemainingMs] = useState<number | null>(
    getSessionTimeRemaining(),
  );
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const sessionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSessionMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sessionMenuRef.current &&
        !sessionMenuRef.current.contains(e.target as Node)
      ) {
        setShowSessionMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSessionMenu]);

  useEffect(() => {
    const interval = setInterval(
      () => setTimeRemainingMs(getSessionTimeRemaining()),
      1000,
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [styles, settings] = await Promise.all([
          api.styles.list(),
          api.settings.get(),
        ]);
        const activeStyles = styles.filter((s: any) => s.isActive);
        setDbStyles(activeStyles);
        setAppSettings(settings);
        if (settings.faviconUrl) {
          const link = (document.querySelector("link[rel~='icon']") ||
            Object.assign(document.createElement("link"), {
              rel: "icon",
            })) as HTMLLinkElement;
          link.href = settings.faviconUrl;
          document.head.appendChild(link);
        }
        if (activeStyles.length > 0) setSelectedStyle(activeStyles[0]);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    const settingsInterval = setInterval(
      () =>
        api.settings
          .get()
          .then(setAppSettings)
          .catch(() => {}),
      15_000,
    );
    return () => clearInterval(settingsInterval);
  }, []);

  const OUTPUT_SIZE = 1024;

  const resizeImage = (
    base64: string,
    maxSize: number,
    quality = 0.85,
  ): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas
          .getContext("2d")
          ?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
    });

  const overlayFrame = (
    base64Image: string,
    frameBase64: string,
  ): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image(),
        frame = new Image();
      let loaded = 0;
      const onLoaded = () => {
        if (++loaded < 2) return;
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
        }
        resolve(canvas.toDataURL("image/png"));
      };
      img.onload = frame.onload = onLoaded;
      img.src = base64Image;
      frame.src = frameBase64;
    });

  const processImage = async (base64Image: string) => {
    if (!selectedStyle) return;
    setCapturedImage(base64Image);
    setStep(Step.Processing);
    setProcessingProgress(0);
    startLoadingMusic();
    playLoadingInstruction();
    const progressInterval = setInterval(() => {
      setProcessingProgress((p) => (p >= 95 ? p : p + Math.random() * 5));
    }, 400);
    try {
      const resizedInput = await resizeImage(base64Image, OUTPUT_SIZE, 0.9);
      const photoBase64 = resizedInput.split(",")[1];
      const assetBase64 = selectedStyle.assetImage
        ? selectedStyle.assetImage.split(",")[1]
        : null;
      const { imageBase64 } = await api.generate.image({
        photoBase64,
        stylePrompt: selectedStyle.prompt,
        assetBase64,
        gender: gender === "female" ? "female" : "male",
        isHijab,
        ageGroup,
        preserveIdentity: selectedStyle.preserveIdentity,
      });
      let finalOutput = `data:image/png;base64,${imageBase64}`;
      if (appSettings?.enableFrame && appSettings?.globalFrameUrl) {
        finalOutput = await overlayFrame(
          finalOutput,
          appSettings.globalFrameUrl,
        );
      }
      const resizedOutput = await resizeImage(finalOutput, OUTPUT_SIZE, 0.92);
      try {
        const { id } = await api.photos.create(resizedOutput, resizedInput);
        setShareId(id);
      } catch {}
      clearInterval(progressInterval);
      setProcessingProgress(100);
      stopLoadingMusic();
      setTimeout(() => {
        setResultImage(finalOutput);
        setStep(Step.Result);
      }, 800);
    } catch (err: any) {
      clearInterval(progressInterval);
      stopLoadingMusic();
      setError(`Gagal memproses: ${err?.message || "Unknown error"}`);
      setStep(Step.Capture);
    }
  };

  // Backsound plays from Lobby through ChooseStyle, stops once the user
  // reaches the camera step (and beyond). Admin can disable it or adjust
  // its volume via Settings — re-applied whenever appSettings refreshes.
  useEffect(() => {
    if (step < Step.Capture && appSettings?.backsoundEnabled !== false) {
      startBackgroundMusic(appSettings?.backsoundVolume ?? 0.3);
    } else {
      stopBackgroundMusic();
    }
  }, [step, appSettings?.backsoundEnabled, appSettings?.backsoundVolume]);
  useEffect(() => () => stopBackgroundMusic(), []);

  // Navigation
  const handleStart = () => {
    playOpeningSound();
    setStep(Step.ChooseCategory);
  };
  const handleNextToCapture = () => {
    if (!currentStyle) return;
    setStep(Step.Capture);
  };
  const handleBackToStyle = () => setStep(Step.ChooseStyle);
  const handleRetry = () => {
    if (capturedImage) processImage(capturedImage);
  };
  const handleBackToCategory = () => setStep(Step.ChooseCategory);
  const handleBackToGender = () => setStep(Step.ChooseGender);
  const handleBackFromStyle = () =>
    setStep(mainCategory === "group" ? Step.ChooseCategory : Step.ChooseAge);
  const handleReset = () => {
    setStep(Step.Lobby);
    setMainCategory(null);
    setGender(null);
    setIsHijab(false);
    setAgeGroup(null);
    setResultImage(null);
    setShareId(null);
  };

  // Toggle main category — clicking active one deselects
  const toggleMainCategory = (cat: NonNullable<MainCategory>) => {
    setMainCategory((prev) => (prev === cat ? null : cat));
    setGender(null);
    setIsHijab(false);
    setAgeGroup(null);
  };
  const handleProceedFromCategory = () => {
    if (!mainCategory) return;
    setStep(mainCategory === "group" ? Step.ChooseStyle : Step.ChooseGender);
  };

  // Toggle gender — clicking active one deselects
  const toggleGender = (g: NonNullable<Gender>) => {
    setGender((prev) => (prev === g ? null : g));
    if (g !== "female") setIsHijab(false);
  };
  const handleProceedFromGender = () => {
    if (!gender) return;
    setStep(Step.ChooseAge);
  };

  // Toggle age group — clicking active one deselects
  const toggleAgeGroup = (a: NonNullable<AgeGroup>) => {
    setAgeGroup((prev) => (prev === a ? null : a));
  };
  const handleProceedFromAge = () => {
    if (!ageGroup) return;
    setStep(Step.ChooseStyle);
  };

  const stepVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  // Resolved style-filter target: "group" kalau Grup, gender kalau Individu, null kalau belum dipilih
  const styleCategory: Category =
    mainCategory === "group" ? "group" : mainCategory === "individu" ? gender : null;

  const activeStyles = dbStyles;
  const visibleStyles = visibleStylesForCategory(activeStyles, styleCategory);
  const currentStyle =
    selectedStyle && visibleStyles.find((s) => s.id === selectedStyle.id)
      ? selectedStyle
      : (visibleStyles[0] ?? null);

  // When category changes, auto-select first visible style if current is no longer visible
  useEffect(() => {
    if (visibleStyles.length === 0) return;
    if (selectedStyle && visibleStyles.find((s) => s.id === selectedStyle.id))
      return;
    setSelectedStyle(visibleStyles[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleCategory, dbStyles]);

  // Jumlah style yang akan terlihat untuk masing-masing pilihan di tab Kategori
  const individuStyleCount = activeStyles.filter((s) =>
    ["male", "female", "universal"].includes(s.genderTarget || "universal"),
  ).length;
  const groupStyleCount = activeStyles.filter(
    (s) => (s.genderTarget || "universal") as string === "group",
  ).length;

  const rotation = appSettings?.screenRotation ?? 0;
  const isRotated = rotation === 90 || rotation === 270;
  const splashEnabled = appSettings?.enableSplash !== false;
  const showSplash = !loading && splashEnabled && !splashDismissed;

  const blurAmount = appSettings?.blurAmount ?? 40;
  const isBgBlurred = appSettings?.showBlur !== false && step !== Step.Lobby;

  const handleLogoutClick = () => {
    setShowSessionMenu(false);
    onLock?.();
  };

  const stepLabels: [Step, string, string][] = (
    [
      [Step.ChooseCategory, "KATEGORI"],
      ...(mainCategory !== "group"
        ? ([
            [Step.ChooseGender, "GENDER"],
            [Step.ChooseAge, "USIA"],
          ] as [Step, string][])
        : []),
      [Step.ChooseStyle, "STYLE"],
      [Step.Capture, "KAMERA"],
      [Step.Processing, "PROSES"],
      [Step.Result, "HASIL"],
    ] as [Step, string][]
  ).map(
    ([s, label], i) =>
      [s, String(i + 1).padStart(2, "0"), label] as [Step, string, string],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020205] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#D32A30] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <SplashScreen
            appName={appSettings?.appName}
            onStart={() => setSplashDismissed(true)}
            rotation={appSettings?.screenRotation ?? 0}
          />
        )}
      </AnimatePresence>

      <div
        className="bg-[#020205] text-zinc-100 font-gff relative flex flex-col"
        style={
          isRotated
            ? {
                transform: `rotate(${rotation}deg)`,
                transformOrigin: "center center",
                width: "100vh",
                height: "100vw",
                position: "fixed",
                top: "50%",
                left: "50%",
                marginTop: "-50vw",
                marginLeft: "-50vh",
                overflow: "hidden",
              }
            : { height: "100vh" }
        }
      >
        {/* Background */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          {(appSettings?.bgType === "video" || !appSettings?.bgType) && (
            <video
              key={appSettings?.bgSource || "default"}
              autoPlay
              muted
              loop
              playsInline
              className={cn(
                "w-full h-full object-cover transition-all duration-700 ease-out",
                isBgBlurred && "scale-110",
              )}
              style={{
                opacity: appSettings?.bgOverlayOpacity ?? 0.4,
                filter: isBgBlurred ? `blur(${blurAmount}px)` : undefined,
              }}
            >
              <source
                src={
                  appSettings?.bgSource ||
                  "https://www.pexels.com/download/video/11727415/"
                }
                type="video/mp4"
              />
            </video>
          )}
          {appSettings?.bgType === "image" && appSettings?.bgSource && (
            <img
              src={appSettings.bgSource}
              className={cn(
                "w-full h-full object-cover transition-all duration-700 ease-out",
                isBgBlurred && "scale-110",
              )}
              style={{
                opacity: appSettings?.bgOverlayOpacity ?? 0.4,
                filter: isBgBlurred ? `blur(${blurAmount}px)` : undefined,
              }}
              alt=""
            />
          )}
          {appSettings?.showOverlay !== false && (
            <div className="absolute inset-0 bg-gradient-to-b from-[#020205]/80 via-transparent to-[#020205]" />
          )}
        </div>

        {/* Header */}
        {appSettings?.showHeader !== false && step !== Step.Capture && (
          <header className="relative z-20 flex-shrink-0 px-8 py-5 grid grid-cols-3 items-center">
            {/* Left — logo */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center justify-center transition-all duration-500",
                  appSettings?.logoUrl
                    ? "w-auto h-12 bg-transparent"
                    : "w-9 h-9 bg-[#D32A30] rounded-lg shadow-[0_0_20px_rgba(211,42,48,0.4)]",
                )}
              >
                {appSettings?.logoUrl ? (
                  <img
                    src={appSettings.logoUrl}
                    className="h-full w-auto object-contain max-w-[180px]"
                    alt="Logo"
                  />
                ) : (
                  <Sparkles className="text-white" size={18} />
                )}
              </div>
              {!appSettings?.logoUrl && (
                <h1 className="text-lg font-bold tracking-tight uppercase">
                  {appSettings?.appName || "LUMINA"}{" "}
                  <span className="text-[#E05555]">AI</span>
                </h1>
              )}
            </div>

            {/* Center — step nav, genuinely centered (hidden on Lobby) */}
            <nav
              className={cn(
                "justify-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30",
                step === Step.Lobby ? "hidden" : "hidden md:flex",
              )}
            >
              {stepLabels.map(([s, num, label]) => (
                <span key={num} className={cn(step === s && "text-[#E05555]")}>
                  {num} {label}
                </span>
              ))}
            </nav>

            {/* Right — session badge (pinned to the true top-right corner on Lobby, since the nav column is hidden there) */}
            <div
              className={cn(
                "flex justify-end",
                step === Step.Lobby && "absolute right-8 top-5",
              )}
            >
              {onLock && (
                <div className="relative" ref={sessionMenuRef}>
                  <button
                    onClick={() => setShowSessionMenu((v) => !v)}
                    className={cn(
                      "notch notch-xs btn-sharp flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-bold uppercase tracking-widest font-mono transition-all",
                      timeRemainingMs !== null &&
                        timeRemainingMs < 5 * 60 * 1000
                        ? "bg-[#D32A30]/15 border-[#D32A30]/30 text-[#E05555]"
                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70",
                    )}
                  >
                    <Clock size={12} />
                    {timeRemainingMs !== null
                      ? formatTimeRemaining(timeRemainingMs)
                      : "Session"}
                    <ChevronDown
                      size={12}
                      className={cn(
                        "transition-transform",
                        showSessionMenu && "rotate-180",
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {showSessionMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-white/10 bg-[#0a0a10] shadow-2xl z-[200]"
                      >
                        {timeRemainingMs !== null && (
                          <div className="px-4 py-3 border-b border-white/5">
                            <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1">
                              Sisa Waktu
                            </p>
                            <p
                              className={cn(
                                "text-lg font-mono font-bold",
                                timeRemainingMs < 5 * 60 * 1000
                                  ? "text-[#E05555]"
                                  : "text-white",
                              )}
                            >
                              {formatTimeRemaining(timeRemainingMs)}
                            </p>
                          </div>
                        )}
                        <button
                          onClick={handleLogoutClick}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-[#E05555] hover:bg-[#D32A30]/10 transition-all"
                        >
                          <LogOut size={13} /> Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </header>
        )}

        {/* Main content */}
        <main className="relative z-10 flex-1 container mx-auto px-6 py-4 flex flex-col items-center overflow-y-auto overflow-x-hidden scrollbar-hide">
          <AnimatePresence mode="wait">
            {/* ── Lobby ── */}
            {step === Step.Lobby && (
              <motion.div
                key="lobby"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-center max-w-2xl space-y-12 flex-1 flex flex-col items-center justify-center w-full"
              >
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#D32A30]/10 text-[#E05555] px-4 py-1.5 rounded-full inline-block text-[10px] font-black tracking-[0.2em] uppercase border border-[#D32A30]/20"
                  >
                    {appSettings?.lobbyBadgeText || "AI Photobooth"}
                  </motion.div>
                  <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9]">
                    {appSettings?.lobbyHeadingText || "Tampil Beda\nHari Ini."}
                  </h1>
                  <p className="text-white/40 text-lg md:text-xl font-light leading-relaxed max-w-lg mx-auto">
                    {appSettings?.lobbySubtitleText ||
                      "Pilih gaya favoritmu dan biarkan AI mengubah fotomu jadi karya yang luar biasa."}
                  </p>
                </div>
                <motion.button
                  id="start-session"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStart}
                  className="notch notch-lg btn-sharp group relative inline-flex items-center gap-4 bg-white text-black px-12 py-6 font-bold text-lg hover:bg-slate-50 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                >
                  {appSettings?.lobbyButtonText || "START"}
                  <ArrowRight
                    size={20}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </motion.button>
              </motion.div>
            )}

            {/* ── Choose Category (Individu / Grup) ── */}
            {step === Step.ChooseCategory && (
              <motion.div
                key="category"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-center max-w-2xl space-y-10 flex-1 flex flex-col items-center justify-center w-full"
              >
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-white/30">
                    Langkah 1
                  </p>
                  <h2 className="text-4xl md:text-5xl font-light tracking-tight">
                    Pilih Kategori
                  </h2>
                  <p className="text-white/40 text-sm">
                    Foto sendiri atau bersama-sama?
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {MAIN_CATEGORIES.map((cat) => {
                    const isActive = mainCategory === cat.value;
                    const count =
                      cat.value === "individu"
                        ? individuStyleCount
                        : groupStyleCount;
                    if (count === 0) return null;
                    return (
                      <motion.button
                        key={cat.value}
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.03 }}
                        onClick={() => toggleMainCategory(cat.value)}
                        className={cn(
                          "card-cut flex flex-col items-center gap-2 px-6 py-8 font-bold text-base uppercase tracking-widest transition-all w-[220px] backdrop-blur-xl",
                          isActive ? "text-white shadow-lg" : "text-white/70 hover:text-white",
                        )}
                        style={
                          {
                            "--card-border-color": isActive
                              ? `rgba(${cat.accentBorder}, 0.9)`
                              : "rgba(255, 255, 255, 0.3)",
                            "--card-bg-color": isActive
                              ? `rgba(${cat.accentBg}, 0.15)`
                              : "rgba(255, 255, 255, 0.07)",
                          } as React.CSSProperties
                        }
                      >
                        <span
                          className={cn(
                            "transition-all",
                            isActive && "scale-110",
                          )}
                        >
                          {cat.icon}
                        </span>
                        {cat.label}
                        <span
                          className={cn(
                            "text-[9px] px-2 py-0.5 rounded-full font-bold",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-white/10 text-white/40",
                          )}
                        >
                          {count}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!mainCategory}
                  onClick={handleProceedFromCategory}
                  className={cn(
                    "notch notch-md btn-sharp group flex items-center gap-3 px-10 py-5 font-bold text-lg transition-all",
                    mainCategory
                      ? "bg-white text-black shadow-xl hover:bg-zinc-100"
                      : "bg-white/5 text-white/20 cursor-not-allowed border border-white/5",
                  )}
                >
                  NEXT
                  <ArrowRight
                    size={20}
                    className={cn(
                      "transition-transform",
                      mainCategory && "group-hover:translate-x-1",
                    )}
                  />
                </motion.button>
              </motion.div>
            )}

            {/* ── Choose Gender ── */}
            {step === Step.ChooseGender && (
              <motion.div
                key="gender"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-center max-w-2xl space-y-10 flex-1 flex flex-col items-center justify-center w-full"
              >
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-white/30">
                    Langkah 2
                  </p>
                  <h2 className="text-4xl md:text-5xl font-light tracking-tight">
                    Pilih Gender
                  </h2>
                  <p className="text-white/40 text-sm">
                    Pilih karakter yang ingin ditampilkan di hasil AI
                  </p>
                </div>

                <div className="flex items-start justify-center gap-4 flex-wrap">
                  {GENDERS.map((g) => {
                    const isActive = gender === g.value;
                    const count = visibleStylesForCategory(
                      activeStyles,
                      g.value,
                    ).length;
                    if (count === 0) return null;
                    return (
                      <div
                        key={g.value}
                        className="flex flex-col items-center gap-2"
                      >
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.03 }}
                          onClick={() => toggleGender(g.value)}
                          className={cn(
                            "card-cut flex flex-col items-center gap-2 px-6 py-8 font-bold text-base uppercase tracking-widest transition-all w-[220px] backdrop-blur-xl",
                            isActive ? "text-white shadow-lg" : "text-white/70 hover:text-white",
                          )}
                          style={
                            {
                              "--card-border-color": isActive
                                ? `rgba(${g.accentBorder}, 0.9)`
                                : "rgba(255, 255, 255, 0.3)",
                              "--card-bg-color": isActive
                                ? `rgba(${g.accentBg}, 0.15)`
                                : "rgba(255, 255, 255, 0.07)",
                            } as React.CSSProperties
                          }
                        >
                          <span
                            className={cn(
                              "transition-all",
                              isActive && "scale-110",
                            )}
                          >
                            {g.icon}
                          </span>
                          {g.label}
                          <span
                            className={cn(
                              "text-[9px] px-2 py-0.5 rounded-full font-bold",
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-white/10 text-white/40",
                            )}
                          >
                            {count}
                          </span>
                        </motion.button>

                        {/* Hijab toggle — drops under the Wanita button only */}
                        {g.value === "female" && (
                          <AnimatePresence>
                            {gender === "female" && (
                              <motion.button
                                initial={{ opacity: 0, y: -8, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.9 }}
                                transition={{ duration: 0.18 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsHijab(!isHijab)}
                                className={cn(
                                  "flex items-center gap-1.5 px-4 py-2 border-2 font-bold text-[10px] uppercase tracking-widest transition-all w-full justify-center",
                                  isHijab
                                    ? "bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                                    : "bg-white/5 border-white/15 text-white/50 hover:bg-white/10 hover:text-white/80",
                                )}
                              >
                                <Sparkles size={12} />
                                Hijab
                              </motion.button>
                            )}
                          </AnimatePresence>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleBackToCategory}
                    className="text-white/30 hover:text-white/60 text-xs uppercase tracking-widest font-bold transition-all"
                  >
                    ← Back
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!gender}
                    onClick={handleProceedFromGender}
                    className={cn(
                      "notch notch-md btn-sharp group flex items-center gap-3 px-10 py-5 font-bold text-lg transition-all",
                      gender
                        ? "bg-white text-black shadow-xl hover:bg-zinc-100"
                        : "bg-white/5 text-white/20 cursor-not-allowed border border-white/5",
                    )}
                  >
                    NEXT
                    <ArrowRight
                      size={20}
                      className={cn(
                        "transition-transform",
                        gender && "group-hover:translate-x-1",
                      )}
                    />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── Choose Age ── */}
            {step === Step.ChooseAge && (
              <motion.div
                key="age"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-center max-w-3xl space-y-10 flex-1 flex flex-col items-center justify-center w-full"
              >
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-white/30">
                    Langkah 3
                  </p>
                  <h2 className="text-4xl md:text-5xl font-light tracking-tight">
                    Pilih Usia
                  </h2>
                  <p className="text-white/40 text-sm">
                    Pastikan hasil AI sesuai usia asli
                  </p>
                </div>

                <div className="flex items-start justify-center gap-4 flex-wrap">
                  {AGE_GROUPS.map((a) => {
                    const isActive = ageGroup === a.value;
                    return (
                      <motion.button
                        key={a.value}
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.03 }}
                        onClick={() => toggleAgeGroup(a.value)}
                        className={cn(
                          "card-cut flex flex-col items-center gap-2 px-6 py-8 font-bold text-base uppercase tracking-widest transition-all w-[220px] backdrop-blur-xl",
                          isActive ? "text-white shadow-lg" : "text-white/70 hover:text-white",
                        )}
                        style={
                          {
                            "--card-border-color": isActive
                              ? `rgba(${a.accentBorder}, 0.9)`
                              : "rgba(255, 255, 255, 0.3)",
                            "--card-bg-color": isActive
                              ? `rgba(${a.accentBg}, 0.15)`
                              : "rgba(255, 255, 255, 0.07)",
                          } as React.CSSProperties
                        }
                      >
                        <span
                          className={cn(
                            "transition-all",
                            isActive && "scale-110",
                          )}
                        >
                          {a.icon}
                        </span>
                        {a.label}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleBackToGender}
                    className="text-white/30 hover:text-white/60 text-xs uppercase tracking-widest font-bold transition-all"
                  >
                    ← Back
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!ageGroup}
                    onClick={handleProceedFromAge}
                    className={cn(
                      "notch notch-md btn-sharp group flex items-center gap-3 px-10 py-5 font-bold text-lg transition-all",
                      ageGroup
                        ? "bg-white text-black shadow-xl hover:bg-zinc-100"
                        : "bg-white/5 text-white/20 cursor-not-allowed border border-white/5",
                    )}
                  >
                    NEXT
                    <ArrowRight
                      size={20}
                      className={cn(
                        "transition-transform",
                        ageGroup && "group-hover:translate-x-1",
                      )}
                    />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── Choose Style ── */}
            {step === Step.ChooseStyle && (
              <motion.div
                key="styles"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full flex flex-col gap-3 flex-1 min-h-0"
              >
                {/* ── Title + view toggle row ── */}
                <div className="flex items-end justify-between border-b border-white/5 pb-3 flex-shrink-0">
                  <div>
                    <button
                      onClick={handleBackFromStyle}
                      className="text-white/30 hover:text-white/60 text-[10px] uppercase tracking-widest font-bold transition-all mb-1"
                    >
                      ← Back
                    </button>
                    <h2 className="text-3xl font-light tracking-tight">
                      {mainCategory === "group"
                        ? "Style Grup"
                        : `Style ${GENDERS.find((g) => g.value === gender)?.label ?? ""}`}
                    </h2>
                    <p className="text-white/30 text-xs mt-0.5">
                      {visibleStyles.length} style tersedia · pilih yang
                      paling cocok
                    </p>
                  </div>
                  {/* View toggle */}
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode("carousel")}
                      className={cn(
                        "p-2 transition-all",
                        viewMode === "carousel"
                          ? "bg-white/15 text-white"
                          : "text-white/30 hover:text-white/60",
                      )}
                      title="Carousel"
                    >
                      <GalleryHorizontalEnd size={14} />
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-2 transition-all",
                        viewMode === "grid"
                          ? "bg-white/15 text-white"
                          : "text-white/30 hover:text-white/60",
                      )}
                      title="Grid"
                    >
                      <LayoutGrid size={14} />
                    </button>
                  </div>
                </div>

                {/* ── Style list ── */}
                {visibleStyles.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                    <Sparkles size={32} className="text-white/10" />
                    <p className="text-white/30 text-sm uppercase tracking-widest font-mono">
                      Belum ada style untuk kategori ini.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 flex-1 min-h-0">
                    <div
                      className={cn(
                        "flex-1 min-h-0",
                        viewMode === "grid"
                          ? "overflow-y-auto scrollbar-hide"
                          : "",
                      )}
                    >
                      <StyleSelector
                        styles={visibleStyles}
                        selectedStyleId={currentStyle?.id ?? ""}
                        onSelect={(s) => setSelectedStyle(s)}
                        isPortrait={isRotated}
                        viewMode={viewMode}
                      />
                    </div>

                    {/* Proceed */}
                    <div className="flex justify-center flex-shrink-0 pb-2">
                      <button
                        disabled={!currentStyle}
                        onClick={handleNextToCapture}
                        className={cn(
                          "notch notch-md btn-sharp group flex items-center gap-3 px-10 py-5 font-bold text-lg transition-all",
                          currentStyle
                            ? "bg-white text-black shadow-xl hover:bg-zinc-100"
                            : "bg-white/5 text-white/20 cursor-not-allowed border border-white/5",
                        )}
                      >
                        AMBIL FOTO
                        <ArrowRight
                          size={20}
                          className={cn(
                            "transition-transform",
                            currentStyle && "group-hover:translate-x-1",
                          )}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Capture ── */}
            {step === Step.Capture && (
              <motion.div
                key="capture"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="contents"
              >
                <CameraView
                  onCapture={processImage}
                  onBack={handleBackToStyle}
                  isPortrait={isRotated}
                  processingError={error}
                />
              </motion.div>
            )}

            {/* ── Processing ── */}
            {step === Step.Processing && (
              <motion.div
                key="processing"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={cn(
                  "w-full",
                  isRotated && "flex-1 flex flex-col justify-center",
                )}
              >
                <LoadingOverlay
                  progress={processingProgress}
                  capturedImage={capturedImage}
                  isPortrait={isRotated}
                />
              </motion.div>
            )}

            {/* ── Result ── */}
            {step === Step.Result && resultImage && (
              <motion.div
                key="result"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={cn(
                  "w-full",
                  isRotated && "flex-1 flex flex-col justify-center",
                )}
              >
                <ResultView
                  image={resultImage}
                  shareId={shareId}
                  onReset={handleReset}
                  onRetry={handleRetry}
                  isPortrait={isRotated}
                  printSettings={appSettings}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        {step !== Step.Capture && (
          <footer className="relative z-10 flex-shrink-0 px-8 py-3 flex justify-between items-center text-[10px] text-white/20 uppercase tracking-[0.2em] font-mono pointer-events-none">
            <span>
              {appSettings?.footerText ||
                "Powered by Generative Neural Networks"}
            </span>
            <div className="flex gap-8">
              <span>AI ENGINE V2.4.0</span>
              <span>© 2026 {appSettings?.appName || "LUMINA"}</span>
            </div>
          </footer>
        )}
      </div>
    </>
  );
}
