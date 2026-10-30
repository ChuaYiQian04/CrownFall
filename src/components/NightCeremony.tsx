import {
  Headphones,
  Pause,
  Play,
  RotateCcw,
  ChevronRight,
  VolumeX,
  Moon,
} from "lucide-react";
import type { GameAction, GameSnapshot } from "../services/game";
import { useNarration } from "../hooks/useNarration";
import Button from "./Button";
export default function NightCeremony({
  game,
  isHost,
  busy,
  act,
}: {
  game: GameSnapshot;
  isHost: boolean;
  busy: boolean;
  act: (a: GameAction) => Promise<boolean>;
}) {
  const step = game.night_script[game.night_step];
  const audio = useNarration(step, game.night_step, game.night_paused, isHost);
  return (
    <section className="panel night-panel">
      <Moon size={36} className="gold" />
      <div className="eyebrow">
        THE NIGHT CEREMONY · {game.night_step + 1} / {game.night_script.length}
      </div>
      <h1>{step?.title || "The council waits"}</h1>
      <p className="night-caption" aria-live="polite">
        {step?.text}
      </p>
      {game.night_paused && (
        <div className="notice" role="status">
          The host has paused the ceremony. Keep your eyes as instructed.
        </div>
      )}
      <div
        className="night-progress"
        aria-label={`Instruction ${game.night_step + 1} of ${game.night_script.length}`}
      >
        {game.night_script.map((s, i) => (
          <span
            key={s.title}
            className={i <= game.night_step ? "complete" : ""}
          />
        ))}
      </div>
      {isHost ? (
        <>
          <div className="notice">
            You are the narrator. Enable audio on this phone only. Advance each
            step after everyone has had time to follow the instruction.
          </div>
          {!audio.supported && (
            <p role="status">
              Speech is unavailable on this browser. Read the captions aloud and
              use Next instruction.
            </p>
          )}
          {audio.audioError && (
            <p className="error" role="alert">
              {audio.audioError}
            </p>
          )}
          <div className="ceremony-controls">
            <Button
              secondary
              disabled={!audio.supported || game.night_paused}
              onClick={audio.play}
            >
              {audio.enabled ? (
                <RotateCcw size={17} />
              ) : (
                <Headphones size={17} />
              )}{" "}
              {audio.enabled ? "Replay instruction" : "Enable narration"}
            </Button>
            <Button
              secondary
              disabled={busy}
              onClick={() =>
                void act(game.night_paused ? "resume_night" : "pause_night")
              }
            >
              {game.night_paused ? <Play size={17} /> : <Pause size={17} />}{" "}
              {game.night_paused ? "Resume ceremony" : "Pause ceremony"}
            </Button>
          </div>
          <Button
            disabled={busy || game.night_paused}
            onClick={() => void act("next_step")}
          >
            {game.night_step === game.night_script.length - 1
              ? "Complete ceremony"
              : "Next instruction"}
            <ChevronRight size={17} />
          </Button>
          {audio.enabled && (
            <button className="text-button" onClick={audio.mute}>
              <VolumeX size={16} /> Continue without audio
            </button>
          )}
          <details className="narration-settings">
            <summary>Voice, volume & speed</summary>
            <label htmlFor="night-volume">
              Volume · {Math.round(audio.preferences.volume * 100)}%
            </label>
            <input
              id="night-volume"
              type="range"
              min="0"
              max="1"
              step=".05"
              value={audio.preferences.volume}
              onChange={(e) =>
                audio.updatePreferences({
                  ...audio.preferences,
                  volume: +e.target.value,
                })
              }
            />
            <label htmlFor="night-speed">
              Speed · {audio.preferences.speed.toFixed(1)}×
            </label>
            <input
              id="night-speed"
              type="range"
              min=".5"
              max="1.5"
              step=".1"
              value={audio.preferences.speed}
              onChange={(e) =>
                audio.updatePreferences({
                  ...audio.preferences,
                  speed: +e.target.value,
                })
              }
            />
            <label htmlFor="night-voice">Narrator voice</label>
            <select
              id="night-voice"
              value={audio.preferences.voice}
              onChange={(e) =>
                audio.updatePreferences({
                  ...audio.preferences,
                  voice: e.target.value,
                })
              }
            >
              <option value="">Device default</option>
              {audio.voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </details>
          <p className="private-hint">
            Captions stay available. Audio completion never advances the game.
          </p>
        </>
      ) : (
        <p className="private-hint">
          Follow the host’s voice. This phone does not play narration.
        </p>
      )}
    </section>
  );
}
