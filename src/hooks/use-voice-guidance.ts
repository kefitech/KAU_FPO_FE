"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "fpo_voice_guidance";
const EVENT_NAME = "fpo-voice-change";

function speakText(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export function useVoiceGuidance() {
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  // Sync all hook instances in the same tab via custom event
  useEffect(() => {
    function handleChange(e: Event) {
      setVoiceEnabled((e as CustomEvent<{ enabled: boolean }>).detail.enabled);
    }
    window.addEventListener(EVENT_NAME, handleChange);
    return () => window.removeEventListener(EVENT_NAME, handleChange);
  }, []);

  function toggleVoice() {
    const next = !voiceEnabledRef.current;
    localStorage.setItem(STORAGE_KEY, String(next));
    if (!next) window.speechSynthesis?.cancel();
    setVoiceEnabled(next);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { enabled: next } }));
  }

  // Always call latest speak via ref so closures in useEffect never go stale
  const voiceEnabledRef = useRef(voiceEnabled);
  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);

  const speak = useCallback((text: string) => {
    if (voiceEnabledRef.current) speakText(text);
  }, []);

  return { voiceEnabled, toggleVoice, speak };
}
