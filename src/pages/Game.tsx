import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Crown, LoaderCircle, Shield, Users, Wifi } from "lucide-react";
import { useGame } from "../hooks/useGame";
import CharacterCard from "../components/CharacterCard";
import NightCeremony from "../components/NightCeremony";
import Button from "../components/Button";
import { TEAM_SIZES } from "../game/rules";
import { isDemo } from "../services/rooms";

export default function Game() {
  const { code = "" } = useParams(),
    navigate = useNavigate();
  const { game, user, error, fetchError, loading, busy, status, act, refresh } =
    useGame(code);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [readGame, setReadGame] = useState("");
  useEffect(() => {
    if (!loading && !game && !fetchError && !isDemo)
      navigate(`/room/${code}`, { replace: true });
  }, [loading, game, fetchError, code, navigate]);
  if (!game)
    return (
      <main className="page narrow">
        <div className="panel">
          <h1>{isDemo ? "The local council" : "Finding your fellowship"}</h1>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : loading ? (
            <LoaderCircle className="spin" />
          ) : (
            <p>
              No active match. Secure role assignment is available in Supabase
              mode.
            </p>
          )}
          <Button secondary onClick={() => void refresh()}>
            Try again
          </Button>
          <Link className="back-link" to={`/room/${code}`}>
            Return to room
          </Link>
        </div>
      </main>
    );
  const isHost = user === game.host_user_id,
    me = game.players.find((p) => p.user_id === user),
    ready = game.players.filter((p) => p.ready).length,
    allReady = ready === game.players.length;
  return (
    <main className="page game-page">
      <div className="lobby-heading">
        <div>
          <div className="eyebrow">COUNCIL {code}</div>
          <h1>
            {game.phase === "ROLE_REVEAL"
              ? "Your oath awaits"
              : game.phase === "NIGHT_PHASE"
                ? "A realm of secrets"
                : "The first council"}
          </h1>
        </div>
        <span className="connection">
          <Wifi size={14} />
          {status}
        </span>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {game.phase === "ROLE_REVEAL" ? (
        <div className="reveal-grid">
          <div>
            <CharacterCard
              key={game.id}
              gameId={game.id}
              allowReveal={!me?.ready}
              onRead={() => setReadGame(game.id)}
            />
            {me?.ready ? (
              <div className="ready-confirmed" role="status">
                <Check size={19} /> Your oath is sealed. Waiting for other
                players…
              </div>
            ) : (
              <Button
                disabled={busy || !me || readGame !== game.id}
                onClick={() => void act("ready")}
              >
                <Shield size={18} /> I know my role · Ready
              </Button>
            )}
          </div>
          <section className="panel ready-panel">
            <div className="panel-title">
              <h2>The fellowship</h2>
              <span>
                {ready} / {game.players.length} ready
              </span>
            </div>
            <p>
              Reveal your character privately, read your knowledge, then
              confirm. Hide your screen from nearby players.
            </p>
            {game.players.map((p) => (
              <div className="player" key={p.id}>
                <span className="avatar">{p.nickname.charAt(0)}</span>
                <span>
                  {p.nickname}
                  {p.user_id === user && <small> (you)</small>}
                </span>
                <span className={`ready-status ${p.ready ? "is-ready" : ""}`}>
                  {p.ready ? (
                    <>
                      <Check size={14} /> Ready
                    </>
                  ) : (
                    "Reading"
                  )}
                </span>
              </div>
            ))}
            {isHost ? (
              <>
                <Button
                  disabled={busy || !allReady}
                  onClick={() => void act("begin_night")}
                >
                  <Crown size={18} /> Start ceremony
                </Button>
                <small>
                  After all players are ready, gather everyone’s attention.
                  Audio starts only when you enable narration.
                </small>
              </>
            ) : (
              <p className="private-hint">
                <Users size={14} />{" "}
                {allReady
                  ? "Everyone is ready. Waiting for the host to begin."
                  : "The host begins once everyone is ready."}
              </p>
            )}
          </section>
        </div>
      ) : game.phase === "NIGHT_PHASE" ? (
        <NightCeremony
          key={game.id}
          game={game}
          isHost={isHost}
          busy={busy}
          act={act}
        />
      ) : (
        <section className="panel dawn-panel">
          <Crown size={45} className="gold" />
          <div className="eyebrow">DAWN BREAKS</div>
          <h1>The fellowship is ready</h1>
          <p>
            <strong>
              {
                game.players.find((p) => p.id === game.leader_player_id)
                  ?.nickname
              }
            </strong>{" "}
            leads the first quest. The first team requires{" "}
            <strong>{TEAM_SIZES[game.players.length]?.[0]}</strong> players.
          </p>
          <div className="notice">
            You have reached the end of this milestone. Team selection, approval
            voting and quests arrive in the next development phase.
          </div>
          <CharacterCard gameId={game.id} />
        </section>
      )}
      {isHost && (
        <section className="abandon-controls">
          {confirmAbandon ? (
            <div className="panel">
              <h2>Return everyone to the lobby?</h2>
              <p>
                This ends the current match without a winner. Existing
                characters will be retired, and a new start will assign fresh
                roles.
              </p>
              <div className="share-buttons">
                <Button
                  secondary
                  disabled={busy}
                  onClick={() => setConfirmAbandon(false)}
                >
                  Keep playing
                </Button>
                <Button disabled={busy} onClick={() => void act("abandon")}>
                  End match & return
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="text-button"
              onClick={() => setConfirmAbandon(true)}
            >
              End this match and return to lobby
            </button>
          )}
        </section>
      )}
    </main>
  );
}
