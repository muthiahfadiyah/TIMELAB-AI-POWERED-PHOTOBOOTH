// src/lib/sound.ts

import { useEffect } from "react";
import clickSoundUrl from "../assets/clicksound.mp3";
import loadingMusicUrl from "../assets/Loading.mp3";
import backgroundMusicUrl from "../assets/latarbelakang.mp3";
import openingSoundUrl from "../assets/suarapembuka.mp3";
import captureInstructionUrl from "../assets/instruksicapture.mp3";
import loadingInstructionUrl from "../assets/suara-loading.mp3";

export function playClickSound() {
  const audio = new Audio(clickSoundUrl);
  audio.volume = 0.5;
  audio.play().catch(() => {});
}

export function playOpeningSound() {
  const audio = new Audio(openingSoundUrl);
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

export function playCaptureInstruction() {
  const audio = new Audio(captureInstructionUrl);
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

export function playLoadingInstruction() {
  const audio = new Audio(loadingInstructionUrl);
  audio.volume = 0.6;
  audio.play().catch(() => {});
}

let loadingAudio: HTMLAudioElement | null = null;

export function startLoadingMusic() {
  if (loadingAudio) return;
  loadingAudio = new Audio(loadingMusicUrl);
  loadingAudio.loop = true;
  loadingAudio.volume = 0.4;
  loadingAudio.play().catch(() => {});
}

export function stopLoadingMusic() {
  if (!loadingAudio) return;
  loadingAudio.pause();
  loadingAudio.currentTime = 0;
  loadingAudio = null;
}

let backgroundAudio: HTMLAudioElement | null = null;

export function startBackgroundMusic(volume = 0.3) {
  if (!backgroundAudio) {
    backgroundAudio = new Audio(backgroundMusicUrl);
    backgroundAudio.loop = true;
    backgroundAudio.play().catch(() => {});
  }
  backgroundAudio.volume = volume;
}

export function stopBackgroundMusic() {
  if (!backgroundAudio) return;
  backgroundAudio.pause();
  backgroundAudio.currentTime = 0;
  backgroundAudio = null;
}

// Plays the click sound for any button or card click inside the wrapped
// page, without needing to wire onClick on every individual element.
export function useGlobalClickSound() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest(
        "button, [role='button'], .cursor-pointer",
      );
      if (!target || (target as HTMLButtonElement).disabled) return;
      playClickSound();
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);
}
