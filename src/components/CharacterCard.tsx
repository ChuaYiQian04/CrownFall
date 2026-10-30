import { useEffect, useRef, useState } from "react";
import {
  Crown,
  Eye,
  EyeOff,
  LoaderCircle,
  Shield,
  Swords,
  Sparkles,
  ShieldCheck,
  Sword,
  Moon,
  Eclipse,
  TreePine,
  Flame,
} from "lucide-react";
import { CHARACTERS, type PrivateCharacter } from "../game/characters";
import { getMyRole } from "../services/game";
import { message } from "../utils/errors";
import Button from "./Button";

export default function CharacterCard({
  gameId,
  allowReveal = true,
  onRead,
}: {
  gameId: string;
  allowReveal?: boolean;
  onRead?: () => void;
}) {
  const [character, setCharacter] = useState<PrivateCharacter | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const serial = useRef(0);
  function hide() {
    serial.current++;
    setCharacter(null);
    setLoading(false);
  }
  useEffect(() => {
    hide();
    const away = () => {
      if (document.visibilityState !== "visible") hide();
    };
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", away);
    return () => {
      serial.current++;
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", away);
    };
  }, [gameId, allowReveal]);
  async function reveal() {
    if (!allowReveal || loading) return;
    const seq = ++serial.current;
    setLoading(true);
    setError("");
    try {
      const data = await getMyRole(gameId);
      if (seq === serial.current) {
        setCharacter(data);
        onRead?.();
      }
    } catch (e) {
      if (seq === serial.current) setError(message(e));
    } finally {
      if (seq === serial.current) setLoading(false);
    }
  }
  const details = character ? CHARACTERS[character.role] : null;
  const Emblem = character
    ? {
        Merlin: Sparkles,
        Percival: ShieldCheck,
        "Loyal Servant": Shield,
        Assassin: Sword,
        Morgana: Moon,
        Mordred: Eclipse,
        Oberon: TreePine,
        "Minion of Evil": Flame,
      }[character.role]
    : Crown;
  return (
    <section className="character-section" aria-label="Your private character">
      {!character || !allowReveal ? (
        <button
          className="character-card card-back"
          onClick={() => void reveal()}
          disabled={!allowReveal || loading}
          aria-label="Reveal my character"
        >
          <span className="card-ornament">◆</span>
          <Crown size={70} strokeWidth={1} />
          <span className="card-brand">CROWNFALL</span>
          <span className="card-motto">An oath. A secret. A destiny.</span>
          <span className="card-reveal">
            {loading ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <Eye size={18} />
            )}{" "}
            {loading
              ? "Unveiling…"
              : allowReveal
                ? "Tap to reveal your character"
                : "Your character is safely hidden"}
          </span>
          <span className="card-ornament">◆</span>
        </button>
      ) : (
        <div
          className={`character-card card-front ${character.faction === "EVIL" ? "evil-card" : "good-card"}`}
        >
          <span className="faction-label">
            {character.faction === "GOOD" ? (
              <Shield size={17} />
            ) : (
              <Swords size={17} />
            )}{" "}
            {character.faction === "GOOD"
              ? "Loyal to the crown"
              : "Enemy of the crown"}
          </span>
          <Emblem className="character-emblem" size={60} strokeWidth={1} />
          <h2>{character.role}</h2>
          <div className="character-title">{details?.title}</div>
          <p>{details?.description}</p>
          <div className="private-knowledge">
            <h3>Your private knowledge</h3>
            <p>{details?.knowledge}</p>
            {character.known_players.length > 0 && (
              <ul>
                {character.known_players.map((p) => (
                  <li key={p.id}>{p.nickname}</li>
                ))}
              </ul>
            )}
            {character.known_players.length === 0 &&
              character.role !== "Loyal Servant" &&
              character.role !== "Oberon" && (
                <p>No other players are visible to you.</p>
              )}
          </div>
          <Button secondary onClick={hide}>
            <EyeOff size={17} /> Hide character
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p className="private-hint">
        <Shield size={13} /> Private to you. Hidden when you switch away.
      </p>
    </section>
  );
}
