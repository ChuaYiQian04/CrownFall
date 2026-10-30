import { useCallback, useEffect, useRef, useState } from "react";
import type { NightStep } from "../services/game";
function initialPreferences() {
  try {
    const p = JSON.parse(localStorage.getItem("crownfall-preferences") || "{}");
    return {
      volume:
        typeof p.volume === "number" ? Math.min(1, Math.max(0, p.volume)) : 0.8,
      speed:
        typeof p.speed === "number" ? Math.min(1.5, Math.max(0.5, p.speed)) : 1,
      voice: typeof p.voice === "string" ? p.voice : "",
    };
  } catch {
    return { volume: 0.8, speed: 1, voice: "" };
  }
}
export function useNarration(
  step: NightStep | undefined,
  index: number,
  paused: boolean,
  isHost: boolean,
) {
  const [preferences, setPreferences] = useState(initialPreferences),
    [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]),
    [enabled, setEnabled] = useState(false),
    [audioError, setAudioError] = useState("");
  const utterance = useRef<SpeechSynthesisUtterance | null>(null),
    last = useRef(index);
  const supported =
    typeof window.speechSynthesis !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined";
  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    }
    utterance.current = null;
  }, [supported]);
  const speak = useCallback(() => {
    if (!isHost || !supported || !step || paused) return;
    stop();
    setAudioError("");
    const text = new SpeechSynthesisUtterance(step.text);
    text.volume = preferences.volume;
    text.rate = preferences.speed;
    text.voice = voices.find((v) => v.voiceURI === preferences.voice) || null;
    text.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted")
        setAudioError(
          "Audio could not play. Follow the caption or press Replay.",
        );
    };
    utterance.current = text;
    window.speechSynthesis.speak(text);
  }, [isHost, supported, step, paused, stop, preferences, voices]);
  useEffect(() => {
    if (!supported) return;
    const read = () => setVoices(window.speechSynthesis.getVoices());
    read();
    window.speechSynthesis.addEventListener("voiceschanged", read);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", read);
      stop();
    };
  }, [supported, stop]);
  useEffect(() => {
    if (!supported) return;
    if (paused) window.speechSynthesis.pause();
    else window.speechSynthesis.resume();
  }, [paused, supported]);
  useEffect(() => {
    if (last.current !== index) {
      last.current = index;
      stop();
      if (enabled) speak();
    }
  }, [index, enabled, speak, stop]);
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState !== "visible") {
        stop();
        setEnabled(false);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [stop]);
  function updatePreferences(next: typeof preferences) {
    setPreferences(next);
    try {
      const stored = JSON.parse(
        localStorage.getItem("crownfall-preferences") || "{}",
      );
      localStorage.setItem(
        "crownfall-preferences",
        JSON.stringify({ ...stored, ...next }),
      );
    } catch {
      localStorage.setItem("crownfall-preferences", JSON.stringify(next));
    }
  }
  return {
    supported,
    enabled,
    audioError,
    voices,
    preferences,
    updatePreferences,
    play: () => {
      setEnabled(true);
      speak();
    },
    mute: () => {
      setEnabled(false);
      stop();
    },
    stop,
  };
}
