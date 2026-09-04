// src/components/Admin/AdminPanel.tsx

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Trash2,
  Edit2,
  LogOut,
  Settings,
  Camera,
  Users,
  Image as ImageIcon,
  X,
  Check,
  Save as SaveIcon,
  Sparkles,
  Layout,
  LayoutDashboard,
  Zap,
  TrendingUp,
  RefreshCw,
  Film,
  ImagePlay,
  Ban,
  Monitor,
  Printer,
  GalleryHorizontalEnd,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  QrCode,
  ExternalLink,
  RotateCw,
  RotateCcw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  PanelTop,
  Focus,
  Volume2,
  VolumeX,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { PrintSheet } from "../ResultView";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { type PhotoStyle } from "../StyleSelector";
import { AccessSessions } from "./AccessSessions";

interface GalleryRowProps {
  no: number;
  id: string;
  createdAt: string;
  selected: boolean;
  shareUrl: string;
  onToggle: () => void;
  onDelete: () => void;
  onPreview: (id: string, index?: number) => void;
  index: number;
}

const GalleryRow: React.FC<GalleryRowProps> = ({
  no,
  id,
  createdAt,
  selected,
  shareUrl,
  onToggle,
  onDelete,
  onPreview,
  index,
}) => {
  const [data, setData] = useState<{
    image: string;
    originalImage: string | null;
  } | null>(null);
  const [qrVisible, setQrVisible] = useState(false);

  useEffect(() => {
    api.photos
      .get(id)
      .then((d) => setData({ image: d.image, originalImage: d.originalImage }))
      .catch(() => {});
  }, [id]);

  return (
    <tr className="border-b border-white/5 hover:bg-white/2 transition-colors">
      <td className="p-3 text-center">
        <button
          onClick={onToggle}
          className="text-white/40 hover:text-white transition-colors"
        >
          {selected ? (
            <CheckSquare size={15} className="text-[#E05555]" />
          ) : (
            <Square size={15} />
          )}
        </button>
      </td>
      <td className="p-3 text-white/30 text-xs font-mono">{no}</td>
      <td className="p-3 text-white/60 text-xs font-mono whitespace-nowrap">
        {new Date(createdAt).toLocaleString("id-ID", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </td>
      <td className="p-3 text-center">
        {data?.originalImage ? (
          <img
            src={data.originalImage}
            className="w-14 h-[4.5rem] object-cover rounded-lg mx-auto cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onPreview(id, index)}
          />
        ) : (
          <div className="w-14 h-[4.5rem] bg-white/5 rounded-lg mx-auto flex items-center justify-center">
            <ImageIcon size={14} className="text-white/20" />
          </div>
        )}
      </td>
      <td className="p-3 text-center">
        {data?.image ? (
          <img
            src={data.image}
            className="w-14 h-[4.5rem] object-cover rounded-lg mx-auto cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onPreview(id, index)}
          />
        ) : (
          <div className="w-14 h-[4.5rem] bg-white/5 rounded-lg mx-auto flex items-center justify-center">
            <RefreshCw size={12} className="animate-spin text-white/20" />
          </div>
        )}
      </td>
      <td className="p-3 text-center">
        {qrVisible ? (
          <div
            className="inline-block bg-white p-1.5 rounded-lg cursor-pointer"
            onClick={() => setQrVisible(false)}
          >
            <QRCodeSVG value={shareUrl} size={56} level="M" fgColor="#000000" />
          </div>
        ) : (
          <button
            onClick={() => setQrVisible(true)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all mx-auto flex items-center justify-center"
          >
            <QrCode size={16} />
          </button>
        )}
      </td>
      <td className="p-3 text-center">
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all mx-auto flex items-center justify-center"
        >
          <ExternalLink size={14} />
        </a>
      </td>
      <td className="p-3 text-center">
        <button
          onClick={onDelete}
          className="p-2 bg-red-400/5 hover:bg-red-400/20 rounded-lg text-red-400 transition-all mx-auto flex items-center justify-center"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
};

interface Props {
  onLogout: () => void;
}

function formatIdr(amount: number) {
  if (amount < 1) return `Rp ${amount.toFixed(4)}`;
  return `Rp ${amount.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const AdminPanel: React.FC<Props> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { section = "dashboard" } = useParams<{ section: string }>();
  const [styles, setStyles] = useState<(PhotoStyle & { id: string })[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [tokenStats, setTokenStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [isEditingStyle, setIsEditingStyle] = useState<string | null>(null);
  const [customizeSection, setCustomizeSection] = useState<string>("identitas");
  const [newStyle, setNewStyle] = useState<Partial<PhotoStyle>>({});
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [galleryPhotos, setGalleryPhotos] = useState<
    { id: string; createdAt: string }[]
  >([]);
  const [galleryTotal, setGalleryTotal] = useState(0);
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryTotalPages, setGalleryTotalPages] = useState(1);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedStyleIds, setSelectedStyleIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkDeletingStyles, setBulkDeletingStyles] = useState(false);
  const [styleFilter, setStyleFilter] = useState<string>("all"); // 'all' | 'universal' | 'male' | 'female' | 'group' | 'live' | 'draft'
  const [styleViewMode, setStyleViewMode] = useState<"grid" | "list">("grid");
  const [previewPhoto, setPreviewPhoto] = useState<{
    id: string;
    image: string;
    originalImage: string | null;
    createdAt: string;
  } | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Which photo's print sheet is open — decoupled from previewPhoto so a
  // row's Print button can open it directly without opening the full preview.
  const [printTargetId, setPrintTargetId] = useState<string | null>(null);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadStats = () => {
    setStatsLoading(true);
    api.tokens
      .stats()
      .then(setTokenStats)
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  };

  useEffect(() => {
    api.styles.list().then(setStyles).catch(console.error);
    api.settings.get().then(setSettings).catch(console.error);
    loadStats();
  }, []);

  const loadGallery = useCallback((page: number) => {
    setGalleryLoading(true);
    api.photos
      .list(page, 20)
      .then((data) => {
        setGalleryPhotos(data.photos);
        setGalleryTotal(data.total);
        setGalleryPage(data.page);
        setGalleryTotalPages(data.totalPages);
        setSelectedIds(new Set());
      })
      .catch(console.error)
      .finally(() => setGalleryLoading(false));
  }, []);

  useEffect(() => {
    if (section === "users") {
      api.users.list().then(setUsers).catch(console.error);
    }
    if (section === "dashboard") {
      loadStats();
    }
    if (section === "gallery") {
      loadGallery(1);
    }
  }, [section, loadGallery]);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Hapus ${selectedIds.size} foto yang dipilih?`)) return;
    setBulkDeleting(true);
    try {
      await api.photos.deleteBulk(Array.from(selectedIds));
      showNotification(`${selectedIds.size} foto berhasil dihapus.`, "success");
      loadGallery(galleryPage);
    } catch (err: any) {
      showNotification(err.message || "Gagal menghapus foto.", "error");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!confirm("Hapus foto ini?")) return;
    try {
      await api.photos.delete(id);
      showNotification("Foto dihapus.", "success");
      loadGallery(galleryPage);
    } catch (err: any) {
      showNotification(err.message || "Gagal menghapus foto.", "error");
    }
  };

  const closePreview = () => {
    setPreviewPhoto(null);
    setPrintTargetId(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === galleryPhotos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(galleryPhotos.map((p) => p.id)));
    }
  };

  const openPreview = (id: string, index?: number) => {
    setPreviewLoading(true);
    setPreviewPhoto(null);
    if (index !== undefined) setPreviewIndex(index);
    api.photos
      .get(id)
      .then(setPreviewPhoto)
      .catch(console.error)
      .finally(() => setPreviewLoading(false));
  };

  const navigatePreview = (dir: 1 | -1) => {
    const next = previewIndex + dir;
    if (next < 0 || next >= galleryPhotos.length) return;
    openPreview(galleryPhotos[next].id, next);
  };

  const handleLogout = () => {
    onLogout();
    navigate("/logTime/login");
  };

  const compressAdminImage = (
    base64: string,
    maxWidth = 800,
    preserveTransparency = false,
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        if (ctx && preserveTransparency) {
          ctx.clearRect(0, 0, width, height);
        }
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(
          preserveTransparency
            ? canvas.toDataURL("image/png")
            : canvas.toDataURL("image/jpeg", 0.7),
        );
      };
    });
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "style" | "settings" | "asset" | "pose" | "frame",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      const isLogo = target === "settings";
      const isPng = file.type === "image/png" || file.name.endsWith(".png");
      const isSvg = file.type === "image/svg+xml" || file.name.endsWith(".svg");
      // SVG: simpan apa adanya tanpa konversi canvas
      if (isSvg) {
        if (isLogo) setSettings({ ...settings, logoUrl: rawBase64 });
        return;
      }
      const base64 = await compressAdminImage(
        rawBase64,
        target === "frame" ? 1024 : 600,
        (isLogo && isPng) || target === "frame",
      );
      if (target === "style") {
        isEditingStyle === "new"
          ? setNewStyle({ ...newStyle, preview: base64 })
          : setStyles(
              styles.map((s) =>
                s.id === isEditingStyle ? { ...s, preview: base64 } : s,
              ),
            );
      } else if (target === "asset") {
        isEditingStyle === "new"
          ? setNewStyle({ ...newStyle, assetImage: base64 })
          : setStyles(
              styles.map((s) =>
                s.id === isEditingStyle ? { ...s, assetImage: base64 } : s,
              ),
            );
      } else if (target === "frame") {
        setSettings({ ...settings, globalFrameUrl: base64 });
      } else if (target === "settings") {
        setSettings({ ...settings, logoUrl: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStyle = async (id?: string) => {
    const styleData = id ? styles.find((s) => s.id === id) : newStyle;
    if (!styleData?.name || !styleData?.prompt) return;
    try {
      if (id) {
        const updated = await api.styles.update(id, styleData);
        setStyles(styles.map((s) => (s.id === id ? updated : s)));
        setIsEditingStyle(null);
      } else {
        const created = await api.styles.create({
          ...styleData,
          isActive: true,
        });
        setStyles(
          [...styles, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setNewStyle({});
        setIsEditingStyle(null);
      }
      showNotification("Style berhasil disimpan!", "success");
    } catch (err: any) {
      showNotification(err.message || "Gagal menyimpan style.", "error");
    }
  };

  // Bulk-import style definitions from a JSON file. Each entry only needs
  // name + prompt (description/genderTarget optional) — preview/assetImage
  // are intentionally NOT part of the import and are added manually by the
  // admin afterwards. Imported styles are saved as drafts (isActive: false)
  // by the server since they have no preview image yet.
  const handleImportStyles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const entries = Array.isArray(data) ? data : data?.styles;

      if (!Array.isArray(entries) || entries.length === 0) {
        showNotification(
          "Format file tidak valid. Harus berupa array style.",
          "error",
        );
        return;
      }

      const validGenders = ["unisex", "male", "female"];
      let importedCount = 0;
      let skippedCount = 0;

      for (const entry of entries) {
        const name = entry?.["Nama Style"] ?? entry?.name;
        const prompt =
          entry?.["AI Prompt (Instruksi Transformasi)"] ??
          entry?.["AI Prompt"] ??
          entry?.prompt;

        if (!name || !prompt) {
          skippedCount++;
          continue;
        }

        const description =
          entry?.["Deskripsi Singkat"] ?? entry?.description ?? "";
        const genderTargetRaw = (
          entry?.["Target Gender"] ??
          entry?.genderTarget ??
          "unisex"
        )
          .toString()
          .toLowerCase();
        const genderMap: Record<string, string> = {
          pria: "male",
          wanita: "female",
          universal: "universal",
          unisex: "universal",
          male: "male",
          female: "female",
          group: "group",
          grup: "group",
        };
        const genderTarget = ["universal", "male", "female", "group"].includes(
          genderMap[genderTargetRaw] || genderTargetRaw,
        )
          ? genderMap[genderTargetRaw] || genderTargetRaw
          : "universal";

        try {
          await api.styles.create({
            name,
            description,
            prompt,
            genderTarget,
            // No preview/assetImage — server saves this as a draft.
          });
          importedCount++;
        } catch {
          skippedCount++;
        }
      }

      const fresh = await api.styles.list();
      setStyles(fresh.sort((a: any, b: any) => a.name.localeCompare(b.name)));

      if (importedCount > 0) {
        showNotification(
          `${importedCount} style berhasil diimport sebagai draft.${
            skippedCount > 0 ? ` ${skippedCount} dilewati.` : ""
          } Tambahkan gambar lalu publikasikan.`,
          "success",
        );
      } else {
        showNotification("Tidak ada style yang berhasil diimport.", "error");
      }
    } catch (err: any) {
      showNotification(
        err.message || "Gagal membaca file. Pastikan formatnya JSON.",
        "error",
      );
    } finally {
      e.target.value = "";
    }
  };

  const handleDeleteStyle = async (id: string) => {
    if (!confirm("Hapus style ini?")) return;
    try {
      await api.styles.delete(id);
      setStyles(styles.filter((s) => s.id !== id));
      showNotification("Style berhasil dihapus.", "success");
    } catch (err: any) {
      showNotification(err.message || "Gagal menghapus style.", "error");
    }
  };

  const handleBulkDeleteStyles = async () => {
    if (selectedStyleIds.size === 0) return;
    if (
      !confirm(
        `Hapus ${selectedStyleIds.size} style yang dipilih? Tindakan ini tidak dapat dibatalkan.`,
      )
    )
      return;
    setBulkDeletingStyles(true);
    let deleted = 0;
    for (const id of selectedStyleIds) {
      try {
        await api.styles.delete(id);
        deleted++;
      } catch {}
    }
    setStyles(styles.filter((s) => !selectedStyleIds.has(s.id)));
    setSelectedStyleIds(new Set());
    setBulkDeletingStyles(false);
    showNotification(`${deleted} style berhasil dihapus.`, "success");
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const updated = await api.styles.update(id, { isActive: !currentActive });
      setStyles(styles.map((s) => (s.id === id ? updated : s)));
      showNotification(
        updated.isActive ? "Style dipublikasikan." : "Style disembunyikan.",
        "success",
      );
    } catch (err: any) {
      showNotification(err.message || "Gagal mengubah status.", "error");
    }
  };

  const handleSaveSettings = async () => {
    try {
      const updated = await api.settings.update(settings);
      setSettings(updated);
      showNotification("Pengaturan berhasil disimpan!", "success");
    } catch (err: any) {
      showNotification(err.message || "Gagal menyimpan pengaturan.", "error");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Hapus user ini?")) return;
    try {
      await api.users.delete(userId);
      setUsers(users.filter((u) => u.id !== userId));
      showNotification("User berhasil dihapus.", "success");
    } catch (err: any) {
      showNotification(err.message || "Gagal menghapus user.", "error");
    }
  };

  return (
    <div className="h-screen bg-[#020205] text-white flex overflow-hidden">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 30, x: "-50%" }}
            exit={{ opacity: 0, y: -50, x: "-50%" }}
            className={cn(
              "fixed top-0 left-1/2 z-[100] px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 border",
              notification.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400",
            )}
          >
            {notification.type === "success" ? (
              <Check size={16} />
            ) : (
              <X size={16} />
            )}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <aside className="w-64 h-screen border-r border-white/5 p-6 flex flex-col gap-8 flex-shrink-0 sticky top-0 overflow-y-auto">
        {/* Logo & nama app dari settings */}
        <div className="flex items-center gap-3">
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              className="h-9 w-auto object-contain max-w-[140px]"
              alt="Logo"
            />
          ) : (
            <>
              <div className="w-8 h-8 bg-[#D32A30] rounded flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <span className="font-bold tracking-tight uppercase truncate">
                {settings?.appName || "LUMINA"}
              </span>
            </>
          )}
        </div>

        <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 -mt-6">
          Admin Panel
        </p>

        <nav className="flex flex-col gap-2">
          {[
            {
              key: "dashboard",
              icon: <LayoutDashboard size={18} />,
              label: "DASHBOARD",
            },
            {
              key: "styles",
              icon: <Camera size={18} />,
              label: "STYLES",
            },
            {
              key: "gallery",
              icon: <GalleryHorizontalEnd size={18} />,
              label: "GALLERY",
            },
            {
              key: "settings",
              icon: <Settings size={18} />,
              label: "CUSTOMIZE",
            },
            { key: "users", icon: <Users size={18} />, label: "USERS" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => navigate(`/logTime/${tab.key}`)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg text-sm transition-all",
                section === tab.key
                  ? "bg-[#D32A30]/20 text-[#E05555]"
                  : "hover:bg-white/5 text-white/40",
              )}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 rounded-lg text-sm transition-all hover:bg-red-500/10 text-white/40 hover:text-red-400 w-full"
          >
            <LogOut size={18} /> LOGOUT
          </button>
          <p className="text-[9px] text-white/15 text-center leading-relaxed font-mono">
            &copy; {new Date().getFullYear()} {settings?.appName || "LUMINA"}
            <br />
            All rights reserved.
          </p>
        </div>
      </aside>

      <main className="flex-1 h-screen p-10 overflow-y-auto">
        {section === "dashboard" && (
          <div className="space-y-8 max-w-5xl">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-light">Token Dashboard</h1>
                <p className="text-white/40 text-sm">
                  Penggunaan API Gemini & estimasi biaya.
                </p>
              </div>
              <button
                onClick={loadStats}
                disabled={statsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/60 hover:text-white transition-all disabled:opacity-40"
              >
                <RefreshCw
                  size={14}
                  className={statsLoading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            {tokenStats && (
              <>
                {/* Harga referensi */}
                <div className="bg-[#D32A30]/5 border border-[#D32A30]/15 rounded-2xl px-6 py-4 flex flex-wrap gap-6 text-[11px] text-white/40 uppercase tracking-widest">
                  <span>
                    Model:{" "}
                    <span className="text-[#EC8B8E]">
                      gemini-2.5-flash-image
                    </span>
                  </span>
                  <span>
                    Biaya per sesi:{" "}
                    <span className="text-emerald-400 font-bold">
                      {formatIdr(tokenStats.costPerSession)}
                    </span>
                  </span>
                </div>

                {/* Hari ini vs All time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Hari ini */}
                  <div className="glass-panel p-6 rounded-3xl space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                        <TrendingUp size={16} className="text-emerald-400" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">
                        Hari Ini
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-3xl font-light text-white">
                          {tokenStats.today.sessions}
                        </p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">
                          Sesi Generate
                        </p>
                      </div>
                      <div>
                        <p className="text-3xl font-light text-emerald-400">
                          {formatIdr(tokenStats.today.costIdr)}
                        </p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">
                          Estimasi Biaya
                        </p>
                      </div>
                      <div>
                        <p className="text-lg font-light text-white">
                          {tokenStats.today.promptTokens.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">
                          Input Token
                        </p>
                      </div>
                      <div>
                        <p className="text-lg font-light text-white">
                          {tokenStats.today.candidateTokens.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">
                          Output Token
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Semua waktu */}
                  <div className="glass-panel p-6 rounded-3xl space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#D32A30]/10 rounded-lg flex items-center justify-center">
                        <Zap size={16} className="text-[#E05555]" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">
                        Semua Waktu
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-3xl font-light text-white">
                          {tokenStats.allTime.sessions}
                        </p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">
                          Total Sesi
                        </p>
                      </div>
                      <div>
                        <p className="text-3xl font-light text-[#E05555]">
                          {formatIdr(tokenStats.allTime.costIdr)}
                        </p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">
                          Total Biaya
                        </p>
                      </div>
                      <div>
                        <p className="text-lg font-light text-white">
                          {tokenStats.allTime.promptTokens.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">
                          Input Token
                        </p>
                      </div>
                      <div>
                        <p className="text-lg font-light text-white">
                          {tokenStats.allTime.candidateTokens.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">
                          Output Token
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rata-rata per sesi */}
                {tokenStats.allTime.sessions > 0 && (
                  <div className="glass-panel p-6 rounded-2xl flex flex-wrap gap-8">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                        Rata-rata Token / Sesi
                      </p>
                      <p className="text-xl font-light text-white">
                        {Math.round(
                          tokenStats.allTime.totalTokens /
                            tokenStats.allTime.sessions,
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                        Rata-rata Biaya / Sesi
                      </p>
                      <p className="text-xl font-light text-[#E05555]">
                        {formatIdr(
                          tokenStats.allTime.costIdr /
                            tokenStats.allTime.sessions,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                        Total Token
                      </p>
                      <p className="text-xl font-light text-white">
                        {tokenStats.allTime.totalTokens.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Riwayat sesi */}
                {tokenStats.recent.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">
                      20 Sesi Terakhir
                    </h2>
                    <div className="glass-panel rounded-2xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="p-4 text-left text-[10px] uppercase tracking-widest text-white/30 font-bold">
                              Waktu
                            </th>
                            <th className="p-4 text-right text-[10px] uppercase tracking-widest text-white/30 font-bold">
                              Input
                            </th>
                            <th className="p-4 text-right text-[10px] uppercase tracking-widest text-white/30 font-bold">
                              Output
                            </th>
                            <th className="p-4 text-right text-[10px] uppercase tracking-widest text-white/30 font-bold">
                              Total
                            </th>
                            <th className="p-4 text-right text-[10px] uppercase tracking-widest text-white/30 font-bold">
                              Biaya
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {tokenStats.recent.map((r: any) => (
                            <tr
                              key={r.id}
                              className="border-b border-white/5 hover:bg-white/2"
                            >
                              <td className="p-4 text-white/50 text-xs font-mono">
                                {new Date(r.createdAt).toLocaleString("id-ID", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </td>
                              <td className="p-4 text-right text-white/70 text-xs">
                                {r.promptTokens.toLocaleString()}
                              </td>
                              <td className="p-4 text-right text-white/70 text-xs">
                                {r.candidateTokens.toLocaleString()}
                              </td>
                              <td className="p-4 text-right text-white font-bold text-xs">
                                {r.totalTokens.toLocaleString()}
                              </td>
                              <td className="p-4 text-right text-[#E05555] font-bold text-xs">
                                {formatIdr(r.costIdr)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {tokenStats.allTime.sessions === 0 && (
                  <div className="glass-panel p-12 rounded-3xl text-center text-white/30">
                    Belum ada data. Lakukan generate foto pertama untuk melihat
                    statistik.
                  </div>
                )}
              </>
            )}

            {!tokenStats && !statsLoading && (
              <div className="glass-panel p-12 rounded-3xl text-center text-white/30">
                Gagal memuat statistik.
              </div>
            )}
          </div>
        )}

        {section === "styles" && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-light">Photo Styles</h1>
                <p className="text-white/40 text-sm">
                  Kelola parameter transformasi AI.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Bulk delete bar — shown when ≥1 style selected */}
                {selectedStyleIds.size > 0 && (
                  <>
                    <span className="text-sm text-white/50 font-mono">
                      {selectedStyleIds.size} dipilih
                    </span>
                    <button
                      onClick={() =>
                        setSelectedStyleIds(
                          selectedStyleIds.size === styles.length
                            ? new Set()
                            : new Set(styles.map((s) => s.id)),
                        )
                      }
                      className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-lg text-xs font-bold text-white/50 hover:text-white transition-all"
                    >
                      {selectedStyleIds.size === styles.length
                        ? "Batal Semua"
                        : "Pilih Semua"}
                    </button>
                    <button
                      onClick={handleBulkDeleteStyles}
                      disabled={bulkDeletingStyles}
                      className="flex items-center gap-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 px-4 py-2 rounded-lg text-sm font-bold text-red-400 transition-all disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      {bulkDeletingStyles
                        ? "Menghapus..."
                        : `Hapus (${selectedStyleIds.size})`}
                    </button>
                    <div className="w-px h-6 bg-white/10" />
                  </>
                )}
                <button
                  onClick={() => {
                    const template = [
                      {
                        "Nama Style": "Contoh Style Universal",
                        "Deskripsi Singkat": "Cocok untuk semua orang.",
                        "Target Gender": "Universal",
                        "AI Prompt (Instruksi Transformasi)":
                          "Transform this person into ...",
                      },
                      {
                        "Nama Style": "Contoh Style Pria",
                        "Deskripsi Singkat": "Khusus untuk Pria.",
                        "Target Gender": "Pria",
                        "AI Prompt (Instruksi Transformasi)":
                          "Transform this man into ...",
                      },
                      {
                        "Nama Style": "Contoh Style Wanita",
                        "Deskripsi Singkat": "Khusus untuk Wanita.",
                        "Target Gender": "Wanita",
                        "AI Prompt (Instruksi Transformasi)":
                          "Transform this woman into ...",
                      },
                      {
                        "Nama Style": "Contoh Style Grup",
                        "Deskripsi Singkat": "Untuk foto bersama / grup.",
                        "Target Gender": "Grup",
                        "AI Prompt (Instruksi Transformasi)":
                          "Transform this group of people into ...",
                      },
                    ];
                    const blob = new Blob([JSON.stringify(template, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "style-import-template.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  title="Unduh template JSON"
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg text-sm font-bold text-white/50 hover:text-white transition-all"
                >
                  Template
                </button>
                <button
                  onClick={() =>
                    document.getElementById("styles-import-input")?.click()
                  }
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg text-sm font-bold text-white/70 hover:text-white transition-all"
                >
                  <ImagePlay size={18} /> IMPORT STYLES
                </button>
                <input
                  id="styles-import-input"
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleImportStyles}
                />
                <button
                  onClick={() => setIsEditingStyle("new")}
                  className="flex items-center gap-2 bg-[#D32A30] px-4 py-2 rounded-lg text-sm font-bold"
                >
                  <Plus size={18} /> ADD STYLE
                </button>
              </div>
            </div>

            {/* ── Filter + view mode bar ── */}
            {(() => {
              const CAT_FILTERS = [
                { value: "all", label: "Semua" },
                { value: "universal", label: "Universal" },
                { value: "male", label: "Pria" },
                { value: "female", label: "Wanita" },
                { value: "group", label: "Grup" },
                { value: "live", label: "Live" },
                { value: "draft", label: "Draft" },
              ];
              const filteredStyles = styles.filter((s) => {
                if (styleFilter === "all") return true;
                if (styleFilter === "live") return s.isActive;
                if (styleFilter === "draft") return !s.isActive;
                return ((s as any).genderTarget || "universal") === styleFilter;
              });
              return (
                <>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    {/* Category / status pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {CAT_FILTERS.map((f) => {
                        const count =
                          f.value === "all"
                            ? styles.length
                            : f.value === "live"
                              ? styles.filter((s) => s.isActive).length
                              : f.value === "draft"
                                ? styles.filter((s) => !s.isActive).length
                                : styles.filter(
                                    (s) =>
                                      ((s as any).genderTarget ||
                                        "universal") === f.value,
                                  ).length;
                        return (
                          <button
                            key={f.value}
                            onClick={() => {
                              setStyleFilter(f.value);
                              setSelectedStyleIds(new Set());
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                              styleFilter === f.value
                                ? "bg-white/15 border-white/30 text-white"
                                : "bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/8",
                            )}
                          >
                            {f.label}
                            <span
                              className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                                styleFilter === f.value
                                  ? "bg-white/20 text-white"
                                  : "bg-white/5 text-white/30",
                              )}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* View mode toggle */}
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                      <button
                        onClick={() => setStyleViewMode("grid")}
                        title="Grid view"
                        className={cn(
                          "p-2 rounded-md transition-all",
                          styleViewMode === "grid"
                            ? "bg-white/15 text-white"
                            : "text-white/30 hover:text-white/60",
                        )}
                      >
                        <LayoutDashboard size={15} />
                      </button>
                      <button
                        onClick={() => setStyleViewMode("list")}
                        title="List view"
                        className={cn(
                          "p-2 rounded-md transition-all",
                          styleViewMode === "list"
                            ? "bg-white/15 text-white"
                            : "text-white/30 hover:text-white/60",
                        )}
                      >
                        <Layout size={15} />
                      </button>
                    </div>
                  </div>

                  {filteredStyles.length === 0 ? (
                    <div className="glass-panel rounded-2xl p-10 text-center text-white/30 text-sm">
                      Tidak ada style untuk filter ini.
                    </div>
                  ) : styleViewMode === "grid" ? (
                    /* ── Grid view ── */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredStyles.map((style) => {
                        const isStyleSelected = selectedStyleIds.has(style.id);
                        return (
                          <div
                            key={style.id}
                            className={cn(
                              "glass-panel p-4 rounded-2xl flex gap-4 transition-all relative",
                              !style.isActive && "opacity-60",
                              isStyleSelected &&
                                "ring-2 ring-[#D32A30] ring-offset-2 ring-offset-[#020205]",
                            )}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() =>
                                setSelectedStyleIds((prev) => {
                                  const n = new Set(prev);
                                  n.has(style.id)
                                    ? n.delete(style.id)
                                    : n.add(style.id);
                                  return n;
                                })
                              }
                              className={cn(
                                "absolute top-3 left-3 z-10 w-5 h-5 rounded flex items-center justify-center transition-all border",
                                isStyleSelected
                                  ? "bg-[#D32A30] border-[#D32A30] text-white"
                                  : "bg-black/40 border-white/20 text-transparent hover:border-white/40",
                              )}
                            >
                              <Check size={11} />
                            </button>

                            {/* Thumbnail */}
                            <div className="relative shrink-0">
                              {style.preview ? (
                                <img
                                  src={style.preview}
                                  className="w-20 h-24 rounded-lg object-cover"
                                />
                              ) : (
                                <div
                                  className="w-20 h-24 rounded-lg bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/20 transition-colors"
                                  onClick={() => setIsEditingStyle(style.id)}
                                  title="Tambahkan gambar"
                                >
                                  <ImageIcon
                                    size={16}
                                    className="text-white/15"
                                  />
                                  <span className="text-[7px] text-white/20 uppercase tracking-wider text-center px-1">
                                    No Image
                                  </span>
                                </div>
                              )}
                              <span
                                className={cn(
                                  "absolute -top-1.5 -right-1.5 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                                  style.isActive
                                    ? "bg-emerald-500 text-white"
                                    : "bg-white/10 text-white/40",
                                )}
                              >
                                {style.isActive ? "Live" : "Draft"}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold truncate">
                                  {style.name}
                                </h3>
                                {(() => {
                                  const cat =
                                    (style as any).genderTarget || "universal";
                                  const badges: Record<
                                    string,
                                    { label: string; className: string }
                                  > = {
                                    male: {
                                      label: "Pria",
                                      className: "bg-blue-500/15 text-blue-400",
                                    },
                                    female: {
                                      label: "Wanita",
                                      className: "bg-pink-500/15 text-pink-400",
                                    },
                                    group: {
                                      label: "Grup",
                                      className:
                                        "bg-amber-500/15 text-amber-400",
                                    },
                                    universal: {
                                      label: "Universal",
                                      className:
                                        "bg-violet-500/15 text-violet-400",
                                    },
                                  };
                                  const badge = badges[cat];
                                  if (!badge) return null;
                                  return (
                                    <span
                                      className={cn(
                                        "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                                        badge.className,
                                      )}
                                    >
                                      {badge.label}
                                    </span>
                                  );
                                })()}
                              </div>
                              <p className="text-[10px] text-white/40 line-clamp-2 mt-1">
                                {style.description}
                              </p>
                              <div className="flex gap-2 mt-4">
                                <button
                                  onClick={() =>
                                    handleToggleActive(
                                      style.id,
                                      style.isActive ?? false,
                                    )
                                  }
                                  title={
                                    style.isActive
                                      ? "Sembunyikan dari publik"
                                      : "Publikasikan"
                                  }
                                  className={cn(
                                    "p-2 rounded-lg text-xs transition-all",
                                    style.isActive
                                      ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                                      : "bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/60",
                                  )}
                                >
                                  {style.isActive ? (
                                    <Check size={14} />
                                  ) : (
                                    <X size={14} />
                                  )}
                                </button>
                                <button
                                  onClick={() => setIsEditingStyle(style.id)}
                                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteStyle(style.id)}
                                  className="p-2 bg-red-400/5 hover:bg-red-400/20 rounded-lg text-red-400 transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* ── List view ── */
                    <div className="glass-panel rounded-2xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5 text-white/40">
                            <th className="p-3 w-8">
                              <button
                                onClick={() =>
                                  setSelectedStyleIds(
                                    selectedStyleIds.size ===
                                      filteredStyles.length
                                      ? new Set()
                                      : new Set(
                                          filteredStyles.map((s) => s.id),
                                        ),
                                  )
                                }
                                className={cn(
                                  "w-5 h-5 rounded flex items-center justify-center border transition-all",
                                  selectedStyleIds.size ===
                                    filteredStyles.length &&
                                    filteredStyles.length > 0
                                    ? "bg-[#D32A30] border-[#D32A30] text-white"
                                    : "bg-black/40 border-white/20 text-transparent hover:border-white/40",
                                )}
                              >
                                <Check size={11} />
                              </button>
                            </th>
                            <th className="p-3 w-12" />
                            <th className="p-3 text-left text-[10px] uppercase tracking-widest font-bold">
                              Nama
                            </th>
                            <th className="p-3 text-left text-[10px] uppercase tracking-widest font-bold">
                              Kategori
                            </th>
                            <th className="p-3 text-left text-[10px] uppercase tracking-widest font-bold">
                              Deskripsi
                            </th>
                            <th className="p-3 text-left text-[10px] uppercase tracking-widest font-bold">
                              Status
                            </th>
                            <th className="p-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStyles.map((style) => {
                            const isStyleSelected = selectedStyleIds.has(
                              style.id,
                            );
                            const cat =
                              (style as any).genderTarget || "universal";
                            const badges: Record<
                              string,
                              { label: string; className: string }
                            > = {
                              male: {
                                label: "Pria",
                                className: "bg-blue-500/15 text-blue-400",
                              },
                              female: {
                                label: "Wanita",
                                className: "bg-pink-500/15 text-pink-400",
                              },
                              group: {
                                label: "Grup",
                                className: "bg-amber-500/15 text-amber-400",
                              },
                              universal: {
                                label: "Universal",
                                className: "bg-violet-500/15 text-violet-400",
                              },
                            };
                            const badge = badges[cat];
                            return (
                              <tr
                                key={style.id}
                                className={cn(
                                  "border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors",
                                  !style.isActive && "opacity-60",
                                  isStyleSelected && "bg-[#D32A30]/5",
                                )}
                              >
                                {/* Checkbox */}
                                <td className="p-3">
                                  <button
                                    onClick={() =>
                                      setSelectedStyleIds((prev) => {
                                        const n = new Set(prev);
                                        n.has(style.id)
                                          ? n.delete(style.id)
                                          : n.add(style.id);
                                        return n;
                                      })
                                    }
                                    className={cn(
                                      "w-5 h-5 rounded flex items-center justify-center border transition-all",
                                      isStyleSelected
                                        ? "bg-[#D32A30] border-[#D32A30] text-white"
                                        : "bg-black/40 border-white/20 text-transparent hover:border-white/40",
                                    )}
                                  >
                                    <Check size={11} />
                                  </button>
                                </td>

                                {/* Thumbnail */}
                                <td className="p-3">
                                  {style.preview ? (
                                    <img
                                      src={style.preview}
                                      className="w-10 h-12 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-12 rounded-lg bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
                                      <ImageIcon
                                        size={12}
                                        className="text-white/15"
                                      />
                                    </div>
                                  )}
                                </td>

                                <td className="p-3 font-bold text-white max-w-[160px] truncate">
                                  {style.name}
                                </td>

                                <td className="p-3">
                                  {badge && (
                                    <span
                                      className={cn(
                                        "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded whitespace-nowrap",
                                        badge.className,
                                      )}
                                    >
                                      {badge.label}
                                    </span>
                                  )}
                                </td>

                                <td className="p-3 text-white/40 text-xs max-w-[220px]">
                                  <span className="line-clamp-1">
                                    {style.description || "—"}
                                  </span>
                                </td>

                                <td className="p-3">
                                  <span
                                    className={cn(
                                      "text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded",
                                      style.isActive
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "bg-white/5 text-white/30",
                                    )}
                                  >
                                    {style.isActive ? "Live" : "Draft"}
                                  </span>
                                </td>

                                <td className="p-3">
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <button
                                      onClick={() =>
                                        handleToggleActive(
                                          style.id,
                                          style.isActive ?? false,
                                        )
                                      }
                                      title={
                                        style.isActive
                                          ? "Sembunyikan"
                                          : "Publikasikan"
                                      }
                                      className={cn(
                                        "p-1.5 rounded-lg transition-all",
                                        style.isActive
                                          ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                                          : "bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/60",
                                      )}
                                    >
                                      {style.isActive ? (
                                        <Check size={13} />
                                      ) : (
                                        <X size={13} />
                                      )}
                                    </button>
                                    <button
                                      onClick={() =>
                                        setIsEditingStyle(style.id)
                                      }
                                      className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteStyle(style.id)
                                      }
                                      className="p-1.5 bg-red-400/5 hover:bg-red-400/20 rounded-lg text-red-400 transition-all"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {section === "settings" && (
          <div className="space-y-6 max-w-3xl">
            {/* ── Header ── */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-light">Customize</h1>
                <p className="text-white/40 text-sm">
                  Atur tampilan dan konten aplikasi photobooth.
                </p>
              </div>
            </div>

            {/* ── Top nav ── */}
            <div className="flex items-center gap-1 flex-wrap">
              {[
                {
                  key: "identitas",
                  icon: <Settings size={13} />,
                  color: "text-white/60",
                  label: "Identitas",
                },
                {
                  key: "lobby",
                  icon: <Sparkles size={13} />,
                  color: "text-emerald-400",
                  label: "Lobby",
                },
                {
                  key: "layar",
                  icon: <Monitor size={13} />,
                  color: "text-blue-400",
                  label: "Layar",
                },
                {
                  key: "background",
                  icon: <Film size={13} />,
                  color: "text-violet-400",
                  label: "Background",
                },
                {
                  key: "print",
                  icon: <Printer size={13} />,
                  color: "text-amber-400",
                  label: "Print",
                },
                {
                  key: "frame",
                  icon: <Layout size={13} />,
                  color: "text-pink-400",
                  label: "Frame",
                },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setCustomizeSection(item.key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                    customizeSection === item.key
                      ? "bg-white/10 border border-white/15 text-white"
                      : "border border-transparent text-white/40 hover:text-white/70 hover:bg-white/5",
                  )}
                >
                  <span
                    className={customizeSection === item.key ? item.color : ""}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>

            {/* ── Content ── */}
            <div>
              {customizeSection === "identitas" && (
                <section className="glass-panel rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/2">
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Settings size={14} className="text-white/60" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white">
                        Identitas Aplikasi
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                        Nama, logo, tema, dan teks footer
                      </p>
                    </div>
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                        App Name
                      </label>
                      <input
                        type="text"
                        value={settings?.appName || ""}
                        onChange={(e) =>
                          setSettings({ ...settings, appName: e.target.value })
                        }
                        className="w-full bg-white/5 border border-white/10 p-3 rounded-lg focus:border-[#D32A30] outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                        App Logo
                      </label>
                      <div className="flex gap-4 items-center">
                        <div
                          className="w-16 h-16 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#D32A30]/50 transition-all overflow-hidden group relative shrink-0"
                          onClick={() =>
                            document.getElementById("logo-upload")?.click()
                          }
                        >
                          {settings?.logoUrl ? (
                            <img
                              src={settings.logoUrl}
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <ImageIcon className="text-white/20" size={20} />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                            <Edit2 size={12} />
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Paste URL logo..."
                          value={settings?.logoUrl || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              logoUrl: e.target.value,
                            })
                          }
                          className="flex-1 bg-white/5 border border-white/10 p-2.5 rounded-lg text-xs outline-none focus:border-[#D32A30]/50"
                        />
                        {settings?.logoUrl && (
                          <button
                            onClick={() =>
                              setSettings({ ...settings, logoUrl: "" })
                            }
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-all shrink-0"
                            title="Hapus logo"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/*,.svg"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "settings")}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Favicon
                      </label>
                      <div className="flex gap-3 items-center">
                        <div
                          className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#D32A30]/50 transition-all overflow-hidden group relative shrink-0"
                          onClick={() =>
                            document.getElementById("favicon-upload")?.click()
                          }
                        >
                          {settings?.faviconUrl ? (
                            <img
                              src={settings.faviconUrl}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <ImageIcon className="text-white/20" size={14} />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                            <Edit2 size={10} />
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Paste URL favicon (.ico / .png)..."
                          value={settings?.faviconUrl || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              faviconUrl: e.target.value,
                            })
                          }
                          className="flex-1 bg-white/5 border border-white/10 p-2.5 rounded-lg text-xs outline-none focus:border-[#D32A30]/50"
                        />
                        {settings?.faviconUrl && (
                          <button
                            onClick={() =>
                              setSettings({ ...settings, faviconUrl: "" })
                            }
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-all shrink-0"
                            title="Hapus favicon"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <input
                          id="favicon-upload"
                          type="file"
                          accept="image/x-icon,image/png,image/svg+xml,.ico"
                          className="hidden"
                          onChange={(
                            e: React.ChangeEvent<HTMLInputElement>,
                          ) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () =>
                              setSettings({
                                ...settings,
                                faviconUrl: reader.result as string,
                              });
                            reader.readAsDataURL(file);
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                          Theme
                        </label>
                        <select
                          value={settings?.theme || "frosted"}
                          onChange={(e) =>
                            setSettings({ ...settings, theme: e.target.value })
                          }
                          className="w-full bg-white/5 border border-white/10 p-3 rounded-lg focus:border-[#D32A30] outline-none cursor-pointer text-sm"
                        >
                          <option value="frosted">Frosted Glass</option>
                          <option value="dark">Modern Dark</option>
                          <option value="minimal">Minimalist</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                          Footer Text
                        </label>
                        <input
                          type="text"
                          value={settings?.footerText || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              footerText: e.target.value,
                            })
                          }
                          className="w-full bg-white/5 border border-white/10 p-3 rounded-lg focus:border-[#D32A30] outline-none text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-white/5 flex justify-end">
                    <button
                      onClick={handleSaveSettings}
                      className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors"
                    >
                      <SaveIcon size={12} /> Simpan
                    </button>
                  </div>
                </section>
              )}

              {customizeSection === "lobby" && (
                <section className="glass-panel rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <Sparkles size={14} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white">
                        Teks Halaman Depan
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                        Badge, judul, subjudul, dan tombol utama
                      </p>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                          Teks Badge
                        </label>
                        <input
                          type="text"
                          placeholder="Pengalaman Seni Neural"
                          value={
                            settings?.lobbyBadgeText ?? "Pengalaman Seni Neural"
                          }
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setSettings({
                              ...settings,
                              lobbyBadgeText: e.target.value,
                            })
                          }
                          className="w-full bg-white/5 border border-white/10 p-2.5 rounded-lg text-xs outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                          Teks Tombol
                        </label>
                        <input
                          type="text"
                          placeholder="MULAI SESI"
                          value={settings?.lobbyButtonText ?? "MULAI SESI"}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setSettings({
                              ...settings,
                              lobbyButtonText: e.target.value,
                            })
                          }
                          className="w-full bg-white/5 border border-white/10 p-2.5 rounded-lg text-xs outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Judul Utama
                      </label>
                      <input
                        type="text"
                        placeholder="Identitas Baru."
                        value={settings?.lobbyHeadingText ?? "Identitas Baru."}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSettings({
                            ...settings,
                            lobbyHeadingText: e.target.value,
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 p-2.5 rounded-lg text-sm outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Subjudul
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Wujudkan dirimu dalam tampilan baru..."
                        value={settings?.lobbySubtitleText ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setSettings({
                            ...settings,
                            lobbySubtitleText: e.target.value,
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 p-2.5 rounded-lg text-xs outline-none focus:border-emerald-500/50 resize-none"
                      />
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-white/5 flex justify-end">
                    <button
                      onClick={handleSaveSettings}
                      className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors"
                    >
                      <SaveIcon size={12} /> Simpan
                    </button>
                  </div>
                </section>
              )}

              {customizeSection === "layar" && (
                <section className="glass-panel rounded-2xl overflow-hidden">
                  {/* ── Tampilan Layar ── */}
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                      <Monitor size={14} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white">
                        Tampilan Layar
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                        Rotasi untuk monitor portrait atau landscape
                      </p>
                    </div>
                  </div>
                  <div className="p-6 border-b border-white/5">
                    <div className="grid grid-cols-3 gap-3">
                      {(
                        [
                          {
                            deg: 0,
                            icon: <Monitor size={22} />,
                            label: "Normal",
                            sub: "Landscape",
                          },
                          {
                            deg: 90,
                            icon: <RotateCw size={22} />,
                            label: "90°",
                            sub: "Putar Kanan",
                          },
                          {
                            deg: 270,
                            icon: <RotateCcw size={22} />,
                            label: "270°",
                            sub: "Putar Kiri",
                          },
                        ] as const
                      ).map(({ deg, icon, label, sub }) => (
                        <button
                          key={deg}
                          onClick={() =>
                            setSettings({ ...settings, screenRotation: deg })
                          }
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all",
                            (settings?.screenRotation ?? 0) === deg
                              ? "bg-blue-500/15 border-blue-500/50 text-blue-300"
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20",
                          )}
                        >
                          {icon}
                          <span>{label}</span>
                          <span className="text-[9px] font-normal normal-case tracking-normal opacity-60">
                            {sub}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Splash Screen ── */}
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/2">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                      <ImagePlay size={14} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white">
                        Splash Screen
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                        Layar awal "Ketuk untuk mulai" sebelum lobby
                      </p>
                    </div>
                  </div>
                  <div className="p-6 border-b border-white/5">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="enable-splash"
                        checked={settings?.enableSplash ?? true}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            enableSplash: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded accent-[#D32A30]"
                      />
                      <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                        Tampilkan Splash Screen
                      </span>
                    </label>
                    <p className="text-[9px] text-white/20 mt-2 uppercase tracking-wider">
                      Jika dimatikan, aplikasi langsung menuju halaman lobby.
                    </p>
                  </div>

                  {/* ── Header Publik ── */}
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/2">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                      <PanelTop size={14} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white">
                        Header Publik
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                        Logo, navigasi step, dan waktu sesi di halaman kiosk
                      </p>
                    </div>
                  </div>
                  <div className="p-6 border-b border-white/5">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="show-header"
                        checked={settings?.showHeader ?? true}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            showHeader: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded accent-[#D32A30]"
                      />
                      <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                        Tampilkan Header (Logo, Step, Waktu)
                      </span>
                    </label>
                    <p className="text-[9px] text-white/20 mt-2 uppercase tracking-wider">
                      Jika dimatikan, header disembunyikan di seluruh halaman publik.
                    </p>
                  </div>

                  {/* ── Overlay Background ── */}
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/2">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                      <Layout size={14} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white">
                        Overlay Bayangan
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                        Gradasi gelap di atas dan bawah halaman publik
                      </p>
                    </div>
                  </div>
                  <div className="p-6 border-b border-white/5">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="show-overlay"
                        checked={settings?.showOverlay ?? true}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            showOverlay: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded accent-[#D32A30]"
                      />
                      <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                        Tampilkan Overlay Bayangan
                      </span>
                    </label>
                    <p className="text-[9px] text-white/20 mt-2 uppercase tracking-wider">
                      Jika dimatikan, latar belakang tampil tanpa gradasi gelap di tepi atas/bawah.
                    </p>
                  </div>

                  {/* ── Blur Background ── */}
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/2">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                      <Focus size={14} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white">
                        Blur Latar Belakang
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                        Efek blur saat keluar dari halaman lobby
                      </p>
                    </div>
                  </div>
                  <div className="p-6 border-b border-white/5 space-y-4">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="show-blur"
                        checked={settings?.showBlur ?? true}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            showBlur: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded accent-[#D32A30]"
                      />
                      <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                        Aktifkan Blur Latar Belakang
                      </span>
                    </label>
                    <p className="text-[9px] text-white/20 uppercase tracking-wider">
                      Jika dimatikan, latar belakang tetap tajam di semua halaman, termasuk setelah "Mulai Sekarang".
                    </p>
                    <div className={cn(settings?.showBlur === false && "opacity-40 pointer-events-none")}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                          Intensitas Blur
                        </span>
                        <span className="text-[10px] text-white/30 font-mono">
                          {settings?.blurAmount ?? 40}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={80}
                        step={4}
                        value={settings?.blurAmount ?? 40}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            blurAmount: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#D32A30]"
                      />
                    </div>
                  </div>

                  {/* ── Backsound ── */}
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/2">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                      {settings?.backsoundEnabled === false ? (
                        <VolumeX size={14} className="text-violet-400" />
                      ) : (
                        <Volume2 size={14} className="text-violet-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white">
                        Backsound
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                        Musik latar dari halaman depan sampai pilih style
                      </p>
                    </div>
                  </div>
                  <div className="p-6 border-b border-white/5 space-y-4">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="backsound-enabled"
                        checked={settings?.backsoundEnabled ?? true}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            backsoundEnabled: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded accent-[#D32A30]"
                      />
                      <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                        Aktifkan Backsound
                      </span>
                    </label>
                    <p className="text-[9px] text-white/20 uppercase tracking-wider">
                      Berhenti otomatis saat masuk ke halaman kamera.
                    </p>
                    <div
                      className={cn(
                        settings?.backsoundEnabled === false &&
                          "opacity-40 pointer-events-none",
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                          Volume
                        </span>
                        <span className="text-[10px] text-white/30 font-mono">
                          {Math.round((settings?.backsoundVolume ?? 0.3) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={settings?.backsoundVolume ?? 0.3}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            backsoundVolume: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-[#D32A30]"
                      />
                    </div>
                  </div>

                  {/* ── Posisi Tombol Kategori ── */}
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/2">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                      <AlignCenter size={14} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white">
                        Posisi Tombol Kategori
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                        Rata kiri, tengah, atau kanan pada halaman pilih style
                      </p>
                    </div>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          {
                            value: "left",
                            label: "Kiri",
                            icon: <AlignLeft size={16} />,
                          },
                          {
                            value: "center",
                            label: "Tengah",
                            icon: <AlignCenter size={16} />,
                          },
                          {
                            value: "right",
                            label: "Kanan",
                            icon: <AlignRight size={16} />,
                          },
                        ] as const
                      ).map((opt) => {
                        const isSelected =
                          (settings?.categoryAlignment ?? "center") ===
                          opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setSettings({
                                ...settings,
                                categoryAlignment: opt.value,
                              })
                            }
                            className={cn(
                              "flex flex-col items-center gap-2 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all",
                              isSelected
                                ? "bg-[#D32A30]/20 border-[#D32A30] text-white"
                                : "bg-white/5 border-white/10 text-white/40 hover:text-white/70",
                            )}
                          >
                            {opt.icon}
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-white/20 uppercase tracking-wider">
                      Perubahan berlaku setelah disimpan.
                    </p>
                  </div>

                  {/* Single save button for the whole card */}
                  <div className="px-6 py-4 border-t border-white/5 flex justify-end">
                    <button
                      onClick={handleSaveSettings}
                      className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors"
                    >
                      <SaveIcon size={12} /> Simpan
                    </button>
                  </div>
                </section>
              )}

              {customizeSection === "background" && (
                <section className="glass-panel rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/2">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                      <Film size={14} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white">
                        Background
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                        Jenis, sumber media, dan opacity
                      </p>
                    </div>
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="grid grid-cols-3 gap-3">
                      {(
                        [
                          {
                            value: "video",
                            icon: <Film size={15} />,
                            label: "Video",
                          },
                          {
                            value: "image",
                            icon: <ImagePlay size={15} />,
                            label: "Gambar",
                          },
                          {
                            value: "none",
                            icon: <Ban size={15} />,
                            label: "Polos",
                          },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            setSettings({ ...settings, bgType: opt.value })
                          }
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all",
                            (settings?.bgType ?? "video") === opt.value
                              ? "bg-violet-500/15 border-violet-500/50 text-violet-300"
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20",
                          )}
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {(settings?.bgType ?? "video") !== "none" && (
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-white/30">
                          {(settings?.bgType ?? "video") === "video"
                            ? "URL Video (MP4)"
                            : "URL atau Upload Gambar"}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={
                              (settings?.bgType ?? "video") === "video"
                                ? "https://example.com/video.mp4"
                                : "https://example.com/image.jpg"
                            }
                            value={settings?.bgSource || ""}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                bgSource: e.target.value,
                              })
                            }
                            className="flex-1 bg-white/5 border border-white/10 p-3 rounded-lg text-xs outline-none focus:border-violet-500/50"
                          />
                          {(settings?.bgType ?? "video") === "image" && (
                            <>
                              <button
                                onClick={() =>
                                  document
                                    .getElementById("bg-image-upload")
                                    ?.click()
                                }
                                className="px-3 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                              >
                                <ImageIcon size={16} />
                              </button>
                              {settings?.bgSource && (
                                <button
                                  onClick={() =>
                                    setSettings({ ...settings, bgSource: "" })
                                  }
                                  className="px-3 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-all"
                                  title="Hapus background"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                              <input
                                id="bg-image-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onloadend = async () => {
                                    const base64 = await compressAdminImage(
                                      reader.result as string,
                                      1920,
                                    );
                                    setSettings({
                                      ...settings,
                                      bgSource: base64,
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-white/30">
                          Opacity Background
                        </label>
                        <span className="text-[10px] font-mono text-violet-400">
                          {Math.round(
                            (settings?.bgOverlayOpacity ?? 0.4) * 100,
                          )}
                          %
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={settings?.bgOverlayOpacity ?? 0.4}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSettings({
                            ...settings,
                            bgOverlayOpacity: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-violet-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-white/20 uppercase tracking-widest">
                        <span>Transparan</span>
                        <span>Penuh</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-white/5 flex justify-end">
                    <button
                      onClick={handleSaveSettings}
                      className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors"
                    >
                      <SaveIcon size={12} /> Simpan
                    </button>
                  </div>
                </section>
              )}

              {customizeSection === "print" && (
                <section className="glass-panel rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                      <Printer size={14} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white">
                        Print Layout
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                        Konten yang tampil pada hasil cetak foto
                      </p>
                    </div>
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Logo Atas
                      </label>
                      <div className="flex gap-3 items-center">
                        <div
                          className="w-14 h-14 bg-white/5 border border-dashed border-white/15 rounded-xl flex items-center justify-center cursor-pointer hover:border-white/30 transition-all overflow-hidden shrink-0 group relative"
                          onClick={() =>
                            document
                              .getElementById("print-top-logo-upload")
                              ?.click()
                          }
                        >
                          {settings?.printTopLogoUrl ? (
                            <img
                              src={settings.printTopLogoUrl}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <ImageIcon className="text-white/20" size={18} />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Edit2 size={10} />
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="URL logo atas..."
                          value={settings?.printTopLogoUrl || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              printTopLogoUrl: e.target.value,
                            })
                          }
                          className="flex-1 bg-white/5 border border-white/10 p-2.5 rounded-lg text-xs outline-none focus:border-amber-500/50"
                        />
                        {settings?.printTopLogoUrl && (
                          <button
                            onClick={() =>
                              setSettings({ ...settings, printTopLogoUrl: "" })
                            }
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-all shrink-0"
                            title="Hapus logo atas"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <input
                          id="print-top-logo-upload"
                          type="file"
                          accept="image/*,.svg"
                          className="hidden"
                          onChange={(
                            e: React.ChangeEvent<HTMLInputElement>,
                          ) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const base64 = await compressAdminImage(
                                reader.result as string,
                                400,
                                file.name.endsWith(".png") ||
                                  file.type === "image/png",
                              );
                              setSettings({
                                ...settings,
                                printTopLogoUrl: base64,
                              });
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                          Teks Ucapan
                        </label>
                        <input
                          type="text"
                          placeholder="THANKS FOR COMING"
                          value={
                            settings?.printThanksText ?? "THANKS FOR COMING"
                          }
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setSettings({
                              ...settings,
                              printThanksText: e.target.value,
                            })
                          }
                          className="w-full bg-white/5 border border-white/10 p-2.5 rounded-lg text-xs outline-none focus:border-amber-500/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                          Teks Footer
                        </label>
                        <input
                          type="text"
                          placeholder="POWERED BY TIMELAB"
                          value={
                            settings?.printFooterText ?? "POWERED BY TIMELAB"
                          }
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setSettings({
                              ...settings,
                              printFooterText: e.target.value,
                            })
                          }
                          className="w-full bg-white/5 border border-white/10 p-2.5 rounded-lg text-xs outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Quote / Kalimat Inspirasi
                      </label>
                      <textarea
                        rows={2}
                        placeholder='"Inspiration quote in here"'
                        value={settings?.printQuoteText || ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setSettings({
                            ...settings,
                            printQuoteText: e.target.value,
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 p-2.5 rounded-lg text-xs outline-none focus:border-amber-500/50 resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Logo Footer
                      </label>
                      <div className="flex gap-3 items-center">
                        <div
                          className="w-14 h-14 bg-white/5 border border-dashed border-white/15 rounded-xl flex items-center justify-center cursor-pointer hover:border-white/30 transition-all overflow-hidden shrink-0 group relative"
                          onClick={() =>
                            document
                              .getElementById("print-footer-logo-upload")
                              ?.click()
                          }
                        >
                          {settings?.printFooterLogoUrl ? (
                            <img
                              src={settings.printFooterLogoUrl}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <ImageIcon className="text-white/20" size={18} />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Edit2 size={10} />
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="URL logo footer..."
                          value={settings?.printFooterLogoUrl || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              printFooterLogoUrl: e.target.value,
                            })
                          }
                          className="flex-1 bg-white/5 border border-white/10 p-2.5 rounded-lg text-xs outline-none focus:border-amber-500/50"
                        />
                        {settings?.printFooterLogoUrl && (
                          <button
                            onClick={() =>
                              setSettings({
                                ...settings,
                                printFooterLogoUrl: "",
                              })
                            }
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-all shrink-0"
                            title="Hapus logo footer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <input
                          id="print-footer-logo-upload"
                          type="file"
                          accept="image/*,.svg"
                          className="hidden"
                          onChange={(
                            e: React.ChangeEvent<HTMLInputElement>,
                          ) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const base64 = await compressAdminImage(
                                reader.result as string,
                                400,
                                file.name.endsWith(".png") ||
                                  file.type === "image/png",
                              );
                              setSettings({
                                ...settings,
                                printFooterLogoUrl: base64,
                              });
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-white/5 flex justify-end">
                    <button
                      onClick={handleSaveSettings}
                      className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors"
                    >
                      <SaveIcon size={12} /> Simpan
                    </button>
                  </div>
                </section>
              )}

              {customizeSection === "frame" && (
                <section className="glass-panel rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/2">
                    <div className="w-7 h-7 rounded-lg bg-pink-500/15 flex items-center justify-center shrink-0">
                      <Layout size={14} className="text-pink-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white">
                        Frame Overlay
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                        Twibbon yang diterapkan ke semua foto
                      </p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex gap-4 items-center">
                      <div
                        className="w-20 h-20 bg-pink-500/5 border border-dashed border-pink-500/20 rounded-xl flex items-center justify-center cursor-pointer hover:border-pink-500/40 transition-all overflow-hidden group relative shrink-0"
                        onClick={() =>
                          document
                            .getElementById("global-frame-upload")
                            ?.click()
                        }
                      >
                        {settings?.globalFrameUrl ? (
                          <img
                            src={settings.globalFrameUrl}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Layout className="text-white/20" size={28} />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Edit2 size={14} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Paste Frame PNG URL..."
                            value={settings?.globalFrameUrl || ""}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                globalFrameUrl: e.target.value,
                              })
                            }
                            className="flex-1 bg-white/5 border border-white/10 p-2.5 rounded-lg text-xs outline-none focus:border-pink-500/50"
                          />
                          {settings?.globalFrameUrl && (
                            <button
                              onClick={() =>
                                setSettings({ ...settings, globalFrameUrl: "" })
                              }
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-all shrink-0"
                              title="Hapus frame"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            id="enable-frame"
                            checked={settings?.enableFrame ?? false}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                enableFrame: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded accent-[#D32A30]"
                          />
                          <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                            Aktifkan Frame Global
                          </span>
                        </label>
                      </div>
                      <input
                        id="global-frame-upload"
                        type="file"
                        accept="image/png"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "frame")}
                      />
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-white/5 flex justify-end">
                    <button
                      onClick={handleSaveSettings}
                      className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors"
                    >
                      <SaveIcon size={12} /> Simpan
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {section === "gallery" && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-light">Photo Gallery</h1>
                <p className="text-white/40 text-sm">
                  {galleryTotal} foto tersimpan.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                    Hapus {selectedIds.size} Terpilih
                  </button>
                )}
                <button
                  onClick={() => loadGallery(galleryPage)}
                  disabled={galleryLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/60 hover:text-white transition-all disabled:opacity-40"
                >
                  <RefreshCw
                    size={14}
                    className={galleryLoading ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {galleryLoading ? (
              <div className="glass-panel p-16 rounded-3xl text-center text-white/30">
                <RefreshCw
                  size={24}
                  className="animate-spin mx-auto mb-3 opacity-40"
                />
                Memuat galeri...
              </div>
            ) : galleryPhotos.length === 0 ? (
              <div className="glass-panel p-16 rounded-3xl text-center text-white/30">
                Belum ada foto tersimpan.
              </div>
            ) : (
              <div className="glass-panel rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="p-3 w-10">
                        <button
                          onClick={toggleSelectAll}
                          className="text-white/40 hover:text-white transition-colors"
                        >
                          {selectedIds.size === galleryPhotos.length ? (
                            <CheckSquare size={15} className="text-[#E05555]" />
                          ) : (
                            <Square size={15} />
                          )}
                        </button>
                      </th>
                      <th className="p-3 text-left text-[10px] uppercase tracking-widest text-white/30 font-bold w-8">
                        #
                      </th>
                      <th className="p-3 text-left text-[10px] uppercase tracking-widest text-white/30 font-bold">
                        Tanggal & Jam
                      </th>
                      <th className="p-3 text-center text-[10px] uppercase tracking-widest text-white/30 font-bold">
                        Foto Asli
                      </th>
                      <th className="p-3 text-center text-[10px] uppercase tracking-widest text-white/30 font-bold">
                        Hasil AI
                      </th>
                      <th className="p-3 text-center text-[10px] uppercase tracking-widest text-white/30 font-bold">
                        QR Code
                      </th>
                      <th className="p-3 text-center text-[10px] uppercase tracking-widest text-white/30 font-bold">
                        Link
                      </th>
                      <th className="p-3 text-center text-[10px] uppercase tracking-widest text-white/30 font-bold">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {galleryPhotos.map((photo, idx) => (
                      <GalleryRow
                        key={photo.id}
                        no={(galleryPage - 1) * 20 + idx + 1}
                        id={photo.id}
                        index={idx}
                        createdAt={photo.createdAt}
                        selected={selectedIds.has(photo.id)}
                        onToggle={() => toggleSelect(photo.id)}
                        onDelete={() => handleDeletePhoto(photo.id)}
                        onPreview={openPreview}
                        shareUrl={`${window.location.origin}/share/${photo.id}`}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {galleryTotal > 0 && (
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] text-white/30 font-mono">
                  Menampilkan {(galleryPage - 1) * 20 + 1}–
                  {Math.min(galleryPage * 20, galleryTotal)} dari {galleryTotal}{" "}
                  foto
                </p>

                {galleryTotalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => loadGallery(galleryPage - 1)}
                      disabled={galleryPage <= 1 || galleryLoading}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-all"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    {(() => {
                      const pages: (number | "...")[] = [];
                      if (galleryTotalPages <= 7) {
                        for (let i = 1; i <= galleryTotalPages; i++)
                          pages.push(i);
                      } else {
                        pages.push(1);
                        if (galleryPage > 3) pages.push("...");
                        for (
                          let i = Math.max(2, galleryPage - 1);
                          i <= Math.min(galleryTotalPages - 1, galleryPage + 1);
                          i++
                        )
                          pages.push(i);
                        if (galleryPage < galleryTotalPages - 2)
                          pages.push("...");
                        pages.push(galleryTotalPages);
                      }
                      return pages.map((p, i) =>
                        p === "..." ? (
                          <span
                            key={`ellipsis-${i}`}
                            className="px-1 text-white/20 text-xs select-none"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => loadGallery(p as number)}
                            disabled={galleryLoading}
                            className={cn(
                              "min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40",
                              galleryPage === p
                                ? "bg-[#D32A30]/20 text-[#E05555] border border-[#D32A30]/30"
                                : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white",
                            )}
                          >
                            {p}
                          </button>
                        ),
                      );
                    })()}

                    <button
                      onClick={() => loadGallery(galleryPage + 1)}
                      disabled={
                        galleryPage >= galleryTotalPages || galleryLoading
                      }
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-all"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {section === "users" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light">Users</h1>
              <p className="text-white/40 text-sm">
                Kelola akun admin yang dapat mengakses panel ini.
              </p>
            </div>
            <div className="glass-panel rounded-3xl overflow-hidden">
              {users.length === 0 ? (
                <p className="p-8 text-center text-white/40">
                  Belum ada user lain.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-white/40">
                      <th className="p-4 text-left text-[10px] uppercase tracking-widest font-bold">
                        Email
                      </th>
                      <th className="p-4 text-left text-[10px] uppercase tracking-widest font-bold">
                        Role
                      </th>
                      <th className="p-4 text-left text-[10px] uppercase tracking-widest font-bold">
                        Bergabung
                      </th>
                      <th className="p-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-white/5 hover:bg-white/2"
                      >
                        <td className="p-4">{u.email}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-[#D32A30]/10 text-[#E05555] rounded text-[10px] uppercase font-bold">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 text-white/40 text-xs">
                          {new Date(u.createdAt).toLocaleDateString("id-ID")}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 bg-red-400/5 hover:bg-red-400/20 rounded-lg text-red-400 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <AccessSessions />
          </div>
        )}
      </main>

      <AnimatePresence>
        {(previewPhoto || previewLoading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
            onClick={closePreview}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") navigatePreview(-1);
              if (e.key === "ArrowRight") navigatePreview(1);
              if (e.key === "Escape") closePreview();
            }}
            tabIndex={0}
            ref={(el) => el?.focus()}
          >
            {/* Close */}
            <button
              className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors z-10"
              onClick={closePreview}
            >
              <X size={28} />
            </button>

            {/* Counter */}
            {previewPhoto && galleryPhotos.length > 0 && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold uppercase tracking-widest text-white/30 z-10">
                {previewIndex + 1} / {galleryPhotos.length}
              </div>
            )}

            {/* Prev arrow */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigatePreview(-1);
              }}
              disabled={previewIndex <= 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 flex items-center justify-center text-white/50 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={22} />
            </button>

            {/* Next arrow */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigatePreview(1);
              }}
              disabled={previewIndex >= galleryPhotos.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 flex items-center justify-center text-white/50 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronRight size={22} />
            </button>

            {previewLoading && (
              <RefreshCw size={32} className="animate-spin text-white/40" />
            )}

            {previewPhoto && (
              <motion.div
                key={previewPhoto.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.18 }}
                className="flex gap-6 max-h-[90vh] max-w-5xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                {previewPhoto.originalImage && (
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 text-center">
                      Foto Asli
                    </p>
                    <img
                      src={previewPhoto.originalImage}
                      className="w-full h-full object-contain rounded-2xl max-h-[80vh]"
                    />
                  </div>
                )}
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 text-center">
                    Hasil AI
                  </p>
                  <img
                    src={previewPhoto.image}
                    className="w-full h-full object-contain rounded-2xl max-h-[80vh]"
                  />
                </div>
              </motion.div>
            )}

            {previewPhoto && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <p className="text-[10px] text-white/30 font-mono">
                  {new Date(previewPhoto.createdAt).toLocaleString("id-ID")}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPrintTargetId(previewPhoto.id);
                  }}
                  className="flex items-center gap-1.5 text-[10px] text-white/60 hover:text-white font-bold uppercase tracking-widest transition-colors"
                >
                  <Printer size={12} /> Print
                </button>
                <button
                  onClick={() => {
                    handleDeletePhoto(previewPhoto.id);
                    closePreview();
                  }}
                  className="flex items-center gap-1.5 text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-widest transition-colors"
                >
                  <Trash2 size={12} /> Hapus
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {printTargetId && (
        <PrintSheet
          show={!!printTargetId}
          onClose={() => setPrintTargetId(null)}
          image={previewPhoto?.image || ""}
          shareUrl={`${window.location.origin}/share/${printTargetId}`}
          printTopLogoUrl={settings?.printTopLogoUrl || ""}
          printThanksText={settings?.printThanksText ?? "THANKS FOR COMING"}
          printQuoteText={settings?.printQuoteText || ""}
          printFooterLogoUrl={settings?.printFooterLogoUrl || ""}
          printFooterText={settings?.printFooterText ?? "POWERED BY TIMELAB"}
          appName={settings?.appName || "PHOTOBOOTH"}
        />
      )}

      <AnimatePresence>
        {isEditingStyle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex justify-center items-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#0a0a0f] border border-white/10 w-full max-w-2xl rounded-[32px] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/2">
                <h2 className="text-xl font-light uppercase tracking-widest">
                  {isEditingStyle === "new"
                    ? "Tambah Style Baru"
                    : "Edit Style"}
                </h2>
                <button
                  onClick={() => setIsEditingStyle(null)}
                  className="text-white/40 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                      Thumbnail
                    </label>
                    <div
                      className="aspect-[4/5] bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-[#D32A30]/50 transition-all cursor-pointer"
                      onClick={() =>
                        document.getElementById("style-upload")?.click()
                      }
                    >
                      {(
                        isEditingStyle === "new"
                          ? newStyle.preview
                          : styles.find((s) => s.id === isEditingStyle)?.preview
                      ) ? (
                        <>
                          <img
                            src={
                              isEditingStyle === "new"
                                ? newStyle.preview
                                : styles.find((s) => s.id === isEditingStyle)
                                    ?.preview
                            }
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                              Ganti Gambar
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-6 space-y-2">
                          <ImageIcon
                            className="mx-auto text-white/20"
                            size={32}
                          />
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                            Tap untuk Upload
                          </p>
                        </div>
                      )}
                      <input
                        id="style-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "style")}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Nama Style
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cyberpunk"
                        value={
                          isEditingStyle === "new"
                            ? newStyle.name || ""
                            : styles.find((s) => s.id === isEditingStyle)
                                ?.name || ""
                        }
                        onChange={(e) => {
                          isEditingStyle === "new"
                            ? setNewStyle({ ...newStyle, name: e.target.value })
                            : setStyles(
                                styles.map((s) =>
                                  s.id === isEditingStyle
                                    ? { ...s, name: e.target.value }
                                    : s,
                                ),
                              );
                        }}
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-[#D32A30]/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Deskripsi Singkat
                      </label>
                      <input
                        type="text"
                        value={
                          isEditingStyle === "new"
                            ? newStyle.description || ""
                            : styles.find((s) => s.id === isEditingStyle)
                                ?.description || ""
                        }
                        onChange={(e) => {
                          isEditingStyle === "new"
                            ? setNewStyle({
                                ...newStyle,
                                description: e.target.value,
                              })
                            : setStyles(
                                styles.map((s) =>
                                  s.id === isEditingStyle
                                    ? { ...s, description: e.target.value }
                                    : s,
                                ),
                              );
                        }}
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-[#D32A30]/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Kategori
                      </label>
                      <p className="text-[9px] text-white/20 uppercase tracking-wider -mt-1">
                        Tentukan untuk siapa style ini ditampilkan
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            { value: "universal", label: "Universal" },
                            { value: "male", label: "Pria" },
                            { value: "female", label: "Wanita" },
                            { value: "group", label: "Grup" },
                          ] as const
                        ).map((opt) => {
                          const current =
                            isEditingStyle === "new"
                              ? (newStyle as any).genderTarget || "universal"
                              : (
                                  styles.find(
                                    (s) => s.id === isEditingStyle,
                                  ) as any
                                )?.genderTarget || "universal";
                          const isSelected = current === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                isEditingStyle === "new"
                                  ? setNewStyle({
                                      ...newStyle,
                                      genderTarget: opt.value,
                                    } as any)
                                  : setStyles(
                                      styles.map((s) =>
                                        s.id === isEditingStyle
                                          ? ({
                                              ...s,
                                              genderTarget: opt.value,
                                            } as any)
                                          : s,
                                      ),
                                    );
                              }}
                              className={cn(
                                "py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                                isSelected
                                  ? "bg-[#D32A30]/20 border-[#D32A30] text-white"
                                  : "bg-white/5 border-white/10 text-white/40 hover:text-white/70",
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                        Atau URL Gambar
                      </label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={
                          isEditingStyle === "new"
                            ? newStyle.preview || ""
                            : styles.find((s) => s.id === isEditingStyle)
                                ?.preview || ""
                        }
                        onChange={(e) => {
                          isEditingStyle === "new"
                            ? setNewStyle({
                                ...newStyle,
                                preview: e.target.value,
                              })
                            : setStyles(
                                styles.map((s) =>
                                  s.id === isEditingStyle
                                    ? { ...s, preview: e.target.value }
                                    : s,
                                ),
                              );
                        }}
                        className="w-full bg-white/5 border border-white/10 p-3 rounded-lg outline-none text-[10px] text-white/40"
                      />
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-[#E05555]">
                        Asset Baju / Logo
                      </label>
                      <div
                        className="h-20 bg-[#D32A30]/5 border border-dashed border-[#D32A30]/20 rounded-xl flex items-center gap-4 px-4 cursor-pointer hover:bg-[#D32A30]/10 transition-all"
                        onClick={() =>
                          document.getElementById("asset-upload")?.click()
                        }
                      >
                        <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                          {(
                            isEditingStyle === "new"
                              ? newStyle.assetImage
                              : styles.find((s) => s.id === isEditingStyle)
                                  ?.assetImage
                          ) ? (
                            <img
                              src={
                                isEditingStyle === "new"
                                  ? newStyle.assetImage
                                  : styles.find((s) => s.id === isEditingStyle)
                                      ?.assetImage
                              }
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Sparkles size={20} className="text-white/20" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-none">
                            Upload Asset
                          </p>
                          <p className="text-[8px] text-white/20 mt-1 uppercase">
                            Akan diintegrasikan ke baju
                          </p>
                        </div>
                        <input
                          id="asset-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "asset")}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                    AI Prompt (Instruksi Transformasi)
                  </label>
                  <textarea
                    rows={4}
                    value={
                      isEditingStyle === "new"
                        ? newStyle.prompt || ""
                        : styles.find((s) => s.id === isEditingStyle)?.prompt ||
                          ""
                    }
                    onChange={(e) => {
                      isEditingStyle === "new"
                        ? setNewStyle({ ...newStyle, prompt: e.target.value })
                        : setStyles(
                            styles.map((s) =>
                              s.id === isEditingStyle
                                ? { ...s, prompt: e.target.value }
                                : s,
                            ),
                          );
                    }}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none resize-none focus:border-[#D32A30]/50 text-sm"
                    placeholder="Deskripsikan cara AI mentransformasi wajah dan scene..."
                  />
                </div>

                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-white/60">
                      Pertahankan Identitas Wajah
                    </p>
                    <p className="text-[10px] text-white/30 mt-1">
                      Matikan kalau prompt di atas sudah mengatur sendiri
                      identitas wajah (atau sengaja ingin wajah
                      generic/blank), supaya tidak bertentangan dengan
                      instruksi AI.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const current =
                        isEditingStyle === "new"
                          ? newStyle.preserveIdentity !== false
                          : (styles.find((s) => s.id === isEditingStyle)
                              ?.preserveIdentity ?? true) !== false;
                      isEditingStyle === "new"
                        ? setNewStyle({
                            ...newStyle,
                            preserveIdentity: !current,
                          })
                        : setStyles(
                            styles.map((s) =>
                              s.id === isEditingStyle
                                ? { ...s, preserveIdentity: !current }
                                : s,
                            ),
                          );
                    }}
                    className={cn(
                      "flex-shrink-0 w-12 h-7 rounded-full border-2 transition-all relative",
                      (isEditingStyle === "new"
                        ? newStyle.preserveIdentity !== false
                        : (styles.find((s) => s.id === isEditingStyle)
                            ?.preserveIdentity ?? true) !== false)
                        ? "bg-[#D32A30] border-[#D32A30]"
                        : "bg-white/10 border-white/20",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all",
                        (isEditingStyle === "new"
                          ? newStyle.preserveIdentity !== false
                          : (styles.find((s) => s.id === isEditingStyle)
                              ?.preserveIdentity ?? true) !== false) &&
                          "translate-x-5",
                      )}
                    />
                  </button>
                </div>
              </div>

              <div className="p-8 border-t border-white/5 flex gap-4">
                <button
                  onClick={() => setIsEditingStyle(null)}
                  className="flex-1 p-4 rounded-xl border border-white/10 font-bold text-xs uppercase tracking-widest hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  onClick={() =>
                    handleSaveStyle(
                      isEditingStyle === "new" ? undefined : isEditingStyle,
                    )
                  }
                  className="flex-1 p-4 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-widest"
                >
                  Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
