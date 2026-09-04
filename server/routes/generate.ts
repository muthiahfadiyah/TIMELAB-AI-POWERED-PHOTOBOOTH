// server/routes/generate.ts

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { GoogleGenAI } from '@google/genai';
import db from '../db.js';
import { requireSessionAccess } from '../middleware/sessionGate.js';
import { generateLimiter } from '../middleware/rateLimit.js';

const router = Router();

const GENERATE_TIMEOUT_MS = 180_000; // model gambar bisa butuh >1 menit, default SDK cuma 60s
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2_000;

const isRetryableError = (err: any) =>
  err?.cause?.code === 'UND_ERR_HEADERS_TIMEOUT' ||
  err?.message?.includes('fetch failed') ||
  err?.status === 503 ||
  err?.status === 429;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

router.post('/', requireSessionAccess, generateLimiter, async (req: Request, res: Response) => {
  const { photoBase64, stylePrompt, assetBase64, gender, isHijab, ageGroup, preserveIdentity } = req.body;

  if (!photoBase64 || !stylePrompt) {
    res.status(400).json({ error: 'photoBase64 dan stylePrompt diperlukan' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY tidak dikonfigurasi di server' });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const contentsParts: any[] = [
      { inlineData: { data: photoBase64, mimeType: 'image/jpeg' } }
    ];

    const attributeInstruction = gender === 'female'
      ? `Target Character: Female. ${isHijab ? 'IMPORTANT: The character MUST be wearing a modest hijab/headscarf that covers the hair and neck normally.' : 'The character should have hair visible as per the style.'}`
      : `Target Character: Male. Ensure masculine features as per the style.`;

    const ageInstruction =
      ageGroup === 'child'
        ? ' Target Age: Child (under 12). The result MUST depict a child with childlike facial proportions and features, NOT an adult or teenager, regardless of the style.'
        : ageGroup === 'teen'
          ? ' Target Age: Teenager (13-17). The result MUST depict a teenager, not a fully matured adult.'
          : '';

    let finalPrompt = stylePrompt;
    finalPrompt += ` ${attributeInstruction}`;
    finalPrompt += ageInstruction;
    // Some style prompts already dictate their own face handling (e.g. explicitly
    // preserving identity, or deliberately wanting a blank/generic face) — appending
    // this generic instruction on top can contradict them. Default on for styles
    // that don't mention identity at all.
    if (preserveIdentity !== false) {
      finalPrompt += ` Carefully detect the facial identity of the person in the first image and map it onto this ${gender} character. Maintain their specific facial features and ethnicity accurately.`;
    }

    if (assetBase64) {
      contentsParts.push({ inlineData: { data: assetBase64, mimeType: 'image/png' } });
      finalPrompt += ` Clothing Component: Integrate the design from the next image seamlessly onto the person's clothing.`;
    }

    let response;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [...contentsParts, { text: finalPrompt }] },
          config: {
            imageConfig: { aspectRatio: '3:4' },
            httpOptions: { timeout: GENERATE_TIMEOUT_MS }
          }
        });
        break;
      } catch (err: any) {
        const isLastAttempt = attempt === MAX_ATTEMPTS;
        if (isLastAttempt || !isRetryableError(err)) throw err;
        console.warn(`Gemini request gagal (attempt ${attempt}/${MAX_ATTEMPTS}), retry...`, err?.message);
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }

    const usage = response!.usageMetadata;
    if (usage) {
      const id = randomUUID();
      db.prepare('INSERT INTO token_logs (id, prompt_tokens, candidate_tokens, total_tokens) VALUES (?, ?, ?, ?)')
        .run(id, usage.promptTokenCount ?? 0, usage.candidatesTokenCount ?? 0, usage.totalTokenCount ?? 0);
    }

    let generatedBase64: string | null = null;
    for (const part of response!.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        generatedBase64 = part.inlineData.data ?? null;
        break;
      }
    }

    if (!generatedBase64) {
      res.status(500).json({ error: 'Gagal menghasilkan gambar AI' });
      return;
    }

    res.json({ imageBase64: generatedBase64 });
  } catch (err: any) {
    console.error('Gemini error:', err);
    res.status(500).json({ error: err?.message || 'Gagal memproses gambar' });
  }
});

export default router;
