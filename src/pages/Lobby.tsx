import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  LoaderCircle,
  Wifi,
  Users,
  Crown,
  X,
  Swords,
  Check,
  Copy,
  Share2,
  Settings2,
  DoorOpen,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  getRoom,
  identity,
  isDemo,
  roomAction,
  subscribeRoom,
  type Room,
} from "../services/rooms";
import { OPTIONAL_ROLES, validateRoles } from "../game/rules";
import Button from "../components/Button";
import { message } from "../utils/errors";
import { startGame } from "../services/game";
export default function Lobby() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [user, setUser] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Connecting");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (room?.status === "PLAYING")
      navigate(`/game/${code}`, { replace: true });
  }, [room?.status, code, navigate]);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void getRoom(code)
        .then((r) => {
          if (active) {
            setRoom(r);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(message(e));
        });
    };
    void identity()
      .then((id) => {
        if (active) setUser(id);
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    refresh();
    const unsubscribe = subscribeRoom(code, refresh, setStatus);
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      active = false;
      unsubscribe();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [code]);
  async function action(name: string, payload: unknown = {}) {
    if (!room) return;
    setBusy(true);
    try {
      await roomAction(room, name, payload);
      if (name === "leave") navigate("/");
      else setRoom(await getRoom(code));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    if (!room || busy) return;
    setBusy(true);
    setError("");
    try {
      await startGame(room.code, room.version);
      navigate(`/game/${room.code}`, { replace: true });
    } catch (e) {
      setError(message(e));
      try {
        setRoom(await getRoom(code));
      } catch {
        /* Retain the start error. */
      }
    } finally {
      setBusy(false);
    }
  }
  if (!room)
    return (
      <main className="page narrow">
        <div className="panel">
          <h1>{error ? "The gates are closed" : "Gathering the council…"}</h1>
          {error ? (
            <>
              <p role="alert" className="error">
                {error}
              </p>
              <Link className="button" to={`/join/${code}`}>
                Join this room
              </Link>
            </>
          ) : (
            <LoaderCircle className="spin" />
          )}
        </div>
      </main>
    );
  const host = room.host_user_id === user;
  const invite = `${location.origin}/join/${room.code}`;
  const validation = validateRoles(room.players.length, room.settings.roles);
  async function copy() {
    try {
      await navigator.clipboard.writeText(invite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(
        "Clipboard unavailable. Copy the invitation from the field below.",
      );
    }
  }
  return (
    <main className="page lobby-page">
      <div className="lobby-heading">
        <div>
          <div className="eyebrow">THE FELLOWSHIP GATHERS</div>
          <h1>Your council chamber</h1>
          <p>Invite your allies. Keep an eye on your enemies.</p>
        </div>
        <span className="connection">
          <Wifi size={14} />
          {status}
        </span>
      </div>
      {isDemo && (
        <div className="notice">
          Local demo · This browser only. Sample players do not represent real
          people.
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="lobby-grid">
        <section className="panel">
          <div className="panel-title">
            <h2>The fellowship</h2>
            <span>{room.players.length} / 10</span>
          </div>
          <div className="player-list">
            {room.players.map((p) => (
              <div className="player" key={p.id}>
                <span className="avatar">
                  {p.nickname.charAt(0).toUpperCase()}
                </span>
                <span>
                  {p.nickname} {p.user_id === user && <small>(you)</small>}
                </span>
                {p.user_id === room.host_user_id ? (
                  <span className="host-badge">
                    <Crown size={13} /> Host
                  </span>
                ) : (
                  host && (
                    <button
                      aria-label={`Remove ${p.nickname}`}
                      className="icon-button"
                      disabled={busy}
                      onClick={() => void action("remove", p.id)}
                    >
                      <X size={15} />
                    </button>
                  )
                )}
              </div>
            ))}
            {Array.from(
              { length: Math.max(0, 5 - room.players.length) },
              (_, i) => (
                <div className="player empty-seat" key={i}>
                  <span className="avatar">
                    <Users size={17} />
                  </span>{" "}
                  An empty seat awaits…
                </div>
              ),
            )}
          </div>
          {isDemo && host && room.players.length < 5 && (
            <Button
              secondary
              disabled={busy}
              onClick={() => void action("fill")}
            >
              Add sample players
            </Button>
          )}
          <div className="lobby-bottom">
            <p>
              <Users size={16} />
              {validation || "Your fellowship is ready. Let the secrets begin."}
            </p>
            <Button
              disabled={!host || busy || !!validation || isDemo}
              onClick={() => void start()}
            >
              {" "}
              <Swords size={17} /> {busy ? "Preparing…" : "Start game"}
            </Button>
            <small>
              {isDemo
                ? "Connect Supabase to assign secret roles. Local demo seats cannot start a match."
                : host
                  ? "Roles are assigned privately on the server. Team and quest gameplay follows in the next milestone."
                  : "The host will start once the fellowship is ready."}
            </small>
          </div>
        </section>
        <aside>
          <section className="panel invitation">
            <div className="eyebrow">INVITE TO THE COUNCIL</div>
            <div className="room-code">{room.code}</div>
            <div className="qr-frame">
              <QRCodeSVG
                value={invite}
                size={146}
                bgColor="#f2e8d5"
                fgColor="#0b1120"
                level="M"
              />
            </div>
            <p>Scan to take your seat</p>
            <label className="sr-only" htmlFor="invitation">
              Invitation URL
            </label>
            <input
              id="invitation"
              value={invite}
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <div className="share-buttons">
              <Button secondary onClick={() => void copy()}>
                {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button
                secondary
                onClick={() => {
                  void (async () => {
                    try {
                      if (navigator.share)
                        await navigator.share({
                          title: "Join my Crownfall council",
                          url: invite,
                        });
                      else await copy();
                    } catch (e) {
                      if (!(
                        e instanceof DOMException && e.name === "AbortError"
                      ))
                        setError(
                          "Sharing unavailable. Copy the invitation instead.",
                        );
                    }
                  })();
                }}
              >
                <Share2 size={16} /> Share
              </Button>
            </div>
          </section>
          <section className="panel role-settings">
            <div className="panel-title">
              <h2>Royal decree</h2>
              <Settings2 size={17} />
            </div>
            <p>
              Merlin and the Assassin are always included. Add intrigue with
              optional roles.
            </p>
            {OPTIONAL_ROLES.map((role) => (
              <label className="toggle-row" key={role}>
                <span>{role}</span>
                <input
                  type="checkbox"
                  checked={room.settings.roles.includes(role)}
                  disabled={!host || busy}
                  onChange={() =>
                    void action("settings", {
                      roles: room.settings.roles.includes(role)
                        ? room.settings.roles.filter((r) => r !== role)
                        : [...room.settings.roles, role],
                    })
                  }
                />
              </label>
            ))}
            {!host && <small>Only the host can change the decree.</small>}
          </section>
        </aside>
      </div>
      <button
        className="text-button leave-button"
        disabled={busy}
        onClick={() => void action("leave")}
      >
        <DoorOpen size={16} /> Leave room
      </button>
    </main>
  );
}
