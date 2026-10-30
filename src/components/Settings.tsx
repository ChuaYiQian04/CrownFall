import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Headphones } from "lucide-react";
import Button from "./Button";
type Preferences = {
  volume: number;
  speed: number;
  motion: boolean;
  sound: boolean;
  voice: string;
};
export default function Settings({ close }: { close: () => void }) {
  const [prefs, setPrefs] = useState<Preferences>(() => {
    try {
      return {
        ...{ volume: 0.8, speed: 1, motion: false, sound: true, voice: "" },
        ...JSON.parse(localStorage.getItem("crownfall-preferences") || "{}"),
      };
    } catch {
      return { volume: 0.8, speed: 1, motion: false, sound: true, voice: "" };
    }
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const read = () => setVoices(window.speechSynthesis?.getVoices() || []);
    read();
    window.speechSynthesis?.addEventListener("voiceschanged", read);
    return () => {
      window.speechSynthesis?.removeEventListener("voiceschanged", read);
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    localStorage.setItem("crownfall-preferences", JSON.stringify(prefs));
    document.documentElement.dataset.reducedMotion = String(prefs.motion);
  }, [prefs]);
  return (
    <motion.dialog
      ref={dialog}
      className="settings-dialog panel"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onCancel={close}
      aria-labelledby="settings-title"
    >
      <div className="panel-title">
        <h2 id="settings-title">Your preferences</h2>
        <button
          autoFocus
          className="icon-button"
          aria-label="Close settings"
          onClick={close}
        >
          <X />
        </button>
      </div>
      <p>Make the realm your own. Saved on this device.</p>
      <label className="range-label">
        Narration volume <span>{Math.round(prefs.volume * 100)}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step=".05"
          value={prefs.volume}
          onChange={(e) => setPrefs({ ...prefs, volume: +e.target.value })}
        />
      </label>
      <label className="range-label">
        Narration speed <span>{prefs.speed}×</span>
        <input
          type="range"
          min=".5"
          max="1.5"
          step=".1"
          value={prefs.speed}
          onChange={(e) => setPrefs({ ...prefs, speed: +e.target.value })}
        />
      </label>
      <label htmlFor="voice">Narrator voice</label>
      <select
        id="voice"
        value={prefs.voice}
        onChange={(e) => setPrefs({ ...prefs, voice: e.target.value })}
      >
        <option value="">Device default</option>
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name} ({v.lang})
          </option>
        ))}
      </select>
      <Button
        secondary
        onClick={() => {
          if (!window.speechSynthesis) return;
          window.speechSynthesis.cancel();
          const text = new SpeechSynthesisUtterance(
            "The council gathers. Every crown hides a traitor.",
          );
          text.volume = prefs.volume;
          text.rate = prefs.speed;
          text.voice = voices.find((v) => v.voiceURI === prefs.voice) || null;
          window.speechSynthesis.speak(text);
        }}
      >
        <Headphones size={16} /> Preview narration
      </Button>
      <label className="toggle-row">
        Sound effects
        <input
          type="checkbox"
          checked={prefs.sound}
          onChange={(e) => setPrefs({ ...prefs, sound: e.target.checked })}
        />
      </label>
      <label className="toggle-row">
        Reduce animations
        <input
          type="checkbox"
          checked={prefs.motion}
          onChange={(e) => setPrefs({ ...prefs, motion: e.target.checked })}
        />
      </label>
      <p className="muted">
        Language: English · more languages planned.
        <br />
        Sound and narration preferences are prepared for gameplay.
      </p>
    </motion.dialog>
  );
}
