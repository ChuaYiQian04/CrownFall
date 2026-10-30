import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Crown,
  DoorOpen,
  LoaderCircle,
  ArrowRight,
  QrCode,
  Shield,
} from "lucide-react";
import Button from "../components/Button";
import Scanner from "../components/Scanner";
import { createRoom, joinRoom, isDemo } from "../services/rooms";
import { message } from "../utils/errors";
export default function Entry({ host = false }: { host?: boolean }) {
  const { code: invite } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState(
    localStorage.getItem("crownfall-nickname") || "",
  );
  const [code, setCode] = useState(invite || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = host ? await createRoom(name) : await joinRoom(code, name);
      localStorage.setItem("crownfall-nickname", name.trim());
      navigate(`/room/${result}`);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page narrow">
      <Link className="back-link" to="/">
        <ArrowLeft size={16} /> Back to the realm
      </Link>
      <div className="panel entry-panel">
        <span className="large-icon">{host ? <Crown /> : <DoorOpen />}</span>
        <div className="eyebrow">
          {host ? "SUMMON YOUR FELLOWSHIP" : "YOUR SEAT AWAITS"}
        </div>
        <h1>{host ? "Create a council" : "Enter the council"}</h1>
        <p>
          {host
            ? "Gather your friends. The story begins with you."
            : "A familiar face. An unknown loyalty."}
        </p>
        {isDemo && (
          <div className="notice">
            Local demo · Rooms are stored in this browser only. No secure
            multiplayer or secret roles.
          </div>
        )}
        <form onSubmit={submit}>
          <label htmlFor="nickname">Your name</label>
          <input
            id="nickname"
            autoComplete="nickname"
            minLength={2}
            maxLength={24}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What shall we call you?"
          />
          {!host && (
            <>
              <label htmlFor="room-code">Room code</label>
              <input
                id="room-code"
                className="code-input"
                autoCapitalize="characters"
                maxLength={6}
                minLength={6}
                pattern="[A-Za-z2-9]{6}"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="K7M4Q2"
              />
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : host ? (
              <Crown size={18} />
            ) : (
              <DoorOpen size={18} />
            )}{" "}
            {busy ? "Opening the gates…" : host ? "Create room" : "Join room"}
            <ArrowRight size={17} />
          </Button>
        </form>
        {!host && (
          <>
            <div className="or-divider">or</div>
            <Button secondary onClick={() => setScanning(!scanning)}>
              <QrCode size={18} />
              {scanning ? "Close scanner" : "Scan an invitation"}
            </Button>
            {scanning && (
              <Scanner
                onCode={(value) => {
                  setCode(value);
                  setScanning(false);
                }}
              />
            )}
          </>
        )}
        <p className="form-footnote">
          <Shield size={13} />{" "}
          {host
            ? "Private room. No registration required."
            : "Your identity is restored in this browser."}
        </p>
      </div>
    </main>
  );
}
