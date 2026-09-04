// server/routes/settings.ts

import { Router, Request, Response } from 'express';
import db from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

function rowToSettings(row: any) {
  if (!row) return null;
  return {
    appName:            row.app_name,
    theme:              row.theme,
    logoUrl:            row.logo_url            || '',
    footerText:         row.footer_text         || '',
    enableFrame:        Boolean(row.enable_frame),
    globalFrameUrl:     row.global_frame_url    || '',
    screenRotation:     row.screen_rotation     ?? 0,
    bgType:             row.bg_type             || 'video',
    bgSource:           row.bg_source           || '',
    bgOverlayOpacity:   row.bg_overlay_opacity  ?? 0.4,
    printTopLogoUrl:    row.print_top_logo_url  || '',
    printThanksText:    row.print_thanks_text   || 'THANKS FOR COMING',
    printQuoteText:     row.print_quote_text    || '',
    printFooterLogoUrl: row.print_footer_logo_url || '',
    printFooterText:    row.print_footer_text   || 'POWERED BY TIMELAB',
    lobbyBadgeText:     row.lobby_badge_text    || 'Pengalaman Seni Neural',
    lobbyHeadingText:   row.lobby_heading_text  || 'Identitas Baru.',
    lobbySubtitleText:  row.lobby_subtitle_text || 'Wujudkan dirimu dalam tampilan baru. Didukung kecerdasan buatan generatif.',
    lobbyButtonText:    row.lobby_button_text   || 'MULAI SESI',
    faviconUrl:         row.favicon_url         || '',
    sessionPassword:    row.session_password    || '',
    enableSplash:       row.enable_splash === undefined || row.enable_splash === null
                          ? true
                          : Boolean(row.enable_splash),
    // Alignment of the category selector on the kiosk: 'left' | 'center' | 'right'
    categoryAlignment:  row.category_alignment  || 'center',
    showHeader:         row.show_header === undefined || row.show_header === null
                          ? true
                          : Boolean(row.show_header),
    showOverlay:        row.show_overlay === undefined || row.show_overlay === null
                          ? true
                          : Boolean(row.show_overlay),
    showBlur:           row.show_blur === undefined || row.show_blur === null
                          ? true
                          : Boolean(row.show_blur),
    blurAmount:         row.blur_amount ?? 40,
    backsoundEnabled:   row.backsound_enabled === undefined || row.backsound_enabled === null
                          ? true
                          : Boolean(row.backsound_enabled),
    backsoundVolume:    row.backsound_volume ?? 0.3,
  };
}

// ── GET /api/settings ──────────────────────────────────────────────────────
router.get('/', (_req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('config');
  res.json(rowToSettings(row) || {});
});

// ── PUT /api/settings ──────────────────────────────────────────────────────
router.put('/', requireAdmin, (req: Request, res: Response) => {
  const {
    appName, theme, logoUrl, footerText, enableFrame, globalFrameUrl, screenRotation,
    bgType, bgSource, bgOverlayOpacity,
    printTopLogoUrl, printThanksText, printQuoteText, printFooterLogoUrl, printFooterText,
    lobbyBadgeText, lobbyHeadingText, lobbySubtitleText, lobbyButtonText,
    faviconUrl,
    sessionPassword,
    enableSplash,
    categoryAlignment,
    showHeader,
    showOverlay,
    showBlur,
    blurAmount,
    backsoundEnabled,
    backsoundVolume,
  } = req.body;

  const validRotations  = [0, 90, 270];
  const rotation        = validRotations.includes(Number(screenRotation)) ? Number(screenRotation) : 0;
  const validBgTypes    = ['video', 'image', 'none'];
  const resolvedBgType  = validBgTypes.includes(bgType) ? bgType : 'video';
  const resolvedOpacity = Math.min(1, Math.max(0, parseFloat(bgOverlayOpacity) || 0.4));
  const validAlignments = ['left', 'center', 'right'];
  const resolvedAlignment = validAlignments.includes(categoryAlignment) ? categoryAlignment : 'center';
  const resolvedBlurAmount = Math.min(80, Math.max(0, Number(blurAmount) || 40));
  const resolvedBacksoundVolume = Math.min(1, Math.max(0, parseFloat(backsoundVolume) || 0.3));

  db.prepare(`
    INSERT OR REPLACE INTO settings (
      id, app_name, theme, logo_url, footer_text, enable_frame, global_frame_url,
      screen_rotation, bg_type, bg_source, bg_overlay_opacity,
      print_top_logo_url, print_thanks_text, print_quote_text, print_footer_logo_url, print_footer_text,
      lobby_badge_text, lobby_heading_text, lobby_subtitle_text, lobby_button_text,
      favicon_url,
      session_password,
      enable_splash,
      category_alignment,
      show_header,
      show_overlay,
      show_blur,
      blur_amount,
      backsound_enabled,
      backsound_volume
    ) VALUES ('config', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    appName            || 'LUMINA',
    theme              || 'frosted',
    logoUrl            ?? '',
    footerText         ?? '',
    enableFrame ? 1 : 0,
    globalFrameUrl     ?? '',
    rotation,
    resolvedBgType,
    bgSource           ?? '',
    resolvedOpacity,
    printTopLogoUrl    ?? '',
    printThanksText    ?? 'THANKS FOR COMING',
    printQuoteText     ?? '',
    printFooterLogoUrl ?? '',
    printFooterText    ?? 'POWERED BY TIMELAB',
    lobbyBadgeText     ?? 'Pengalaman Seni Neural',
    lobbyHeadingText   ?? 'Identitas Baru.',
    lobbySubtitleText  ?? 'Wujudkan dirimu dalam tampilan baru. Didukung kecerdasan buatan generatif.',
    lobbyButtonText    ?? 'MULAI SESI',
    faviconUrl         ?? '',
    sessionPassword    ?? '',
    enableSplash === false ? 0 : 1,
    resolvedAlignment,
    showHeader === false ? 0 : 1,
    showOverlay === false ? 0 : 1,
    showBlur === false ? 0 : 1,
    resolvedBlurAmount,
    backsoundEnabled === false ? 0 : 1,
    resolvedBacksoundVolume,
  );

  const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('config');
  res.json(rowToSettings(row));
});

export default router;
