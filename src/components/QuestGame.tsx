import { useEffect, useState } from "react";
import {
  Check,
  Crown,
  Shield,
  Swords,
  Skull,
  LoaderCircle,
  ChevronRight,
} from "lucide-react";
import type { GameSnapshot, GameAction } from "../services/game";
import { getMyRole } from "../services/game";
import type { PrivateCharacter } from "../game/characters";
import { message } from "../utils/errors";
import Button from "./Button";
import CharacterCard from "./CharacterCard";
import { WorldImage } from "./WorldArt";
import QuestBoard from "./QuestBoard";
type Props = {
  game: GameSnapshot;
  user: string;
  busy: boolean;
  act: (action: GameAction, payload?: unknown) => Promise<boolean>;
};
export default function QuestGame({ game, user, busy, act }: Props) {
  const [selected, setSelected] = useState<string[]>([]),
    [target, setTarget] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const me = game.players.find((p) => p.user_id === user),
    host = game.host_user_id === user,
    leader = me?.id === game.leader_player_id;
  const name = (id: string) =>
    game.players.find((p) => p.id === id)?.nickname || "Unknown player";
  const results = game.quest_results || [],
    proposal = game.proposal;
  const onQuest =
    !!me &&
    !!proposal?.selected_players.includes(me.id) &&
    game.phase === "QUEST_VOTING";
  const needRole = onQuest || game.phase === "ASSASSINATION";
  const [character, setCharacter] = useState<PrivateCharacter | null>(null),
    [privateError, setPrivateError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setCharacter(null);
    setPrivateError("");
    if (needRole)
      void getMyRole(game.id)
        .then((data) => {
          if (active) setCharacter(data);
        })
        .catch((e) => {
          if (active) setPrivateError(message(e));
        });
    return () => {
      active = false;
    };
  }, [game.id, needRole, retry]);
  const privateRetry = privateError ? (
    <div>
      <p className="error" role="alert">
        {privateError}
      </p>
      <Button secondary onClick={() => setRetry(retry + 1)}>
        Retry private permissions
      </Button>
    </div>
  ) : null;
  if (!game.quest_number)
    return (
      <section className="panel">
        <h2>Install the gameplay update</h2>
        <p>
          Run 202610300004_quest_gameplay.sql in your Supabase SQL Editor, then
          refresh.
        </p>
      </section>
    );
  return (
    <>
      <QuestBoard game={game} />
      {game.phase === "TEAM_PROPOSAL" ? (
        <section className="panel quest-panel">
          <div className="eyebrow">
            QUEST {game.quest_number} · CHOOSE THE FELLOWSHIP
          </div>
          <h2>
            {leader
              ? "Who will you trust?"
              : `${name(game.leader_player_id)} is choosing a team`}
          </h2>
          <p>
            {leader
              ? `Select exactly ${game.required_team_size} players, including yourself if you wish. Everyone will vote on your proposal.`
              : "Discuss the quest with your council. The leader will propose a fellowship for everyone to approve or reject."}
          </p>
          {game.fail_threshold === 2 && (
            <div className="notice">
              This quest needs two Fail submissions to fail.
            </div>
          )}
          <div className="team-picker">
            {game.players.map((p) => (
              <label
                className={`team-option ${selected.includes(p.id) ? "selected" : ""}`}
                key={p.id}
              >
                <span className="avatar" aria-hidden="true">
                  {p.nickname.charAt(0)}
                </span>
                <span>
                  {p.nickname}
                  {p.id === game.leader_player_id && <Crown size={14} />}
                </span>
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  disabled={
                    !leader ||
                    busy ||
                    (!selected.includes(p.id) &&
                      selected.length === (game.required_team_size || 0))
                  }
                  onChange={() =>
                    setSelected((old) =>
                      old.includes(p.id)
                        ? old.filter((id) => id !== p.id)
                        : [...old, p.id],
                    )
                  }
                />
              </label>
            ))}
          </div>
          {leader && (
            <Button
              disabled={busy || selected.length !== game.required_team_size}
              onClick={() => void act("propose_team", { players: selected })}
            >
              Propose team · {selected.length} / {game.required_team_size}
              <ChevronRight size={16} />
            </Button>
          )}
        </section>
      ) : null}
      {game.phase === "TEAM_VOTING" ? (
        <section className="panel quest-panel">
          <div className="eyebrow">THE COUNCIL DECIDES</div>
          <h2>Approve this fellowship?</h2>
          <TeamNames ids={proposal?.selected_players || []} name={name} />
          <p>
            More than half the council must approve. A tie rejects. Five
            consecutive rejected proposals lose the kingdom.
          </p>
          <p className="vote-progress" role="status">
            {game.team_vote_count} / {game.players.length} votes sealed
          </p>
          {typeof game.my_team_vote === "boolean" ? (
            <div className="ready-confirmed">
              <Check size={18} /> Your vote is sealed. Waiting for the council.
            </div>
          ) : (
            <div className="share-buttons">
              <Button
                disabled={busy}
                onClick={() => void act("team_vote", { approve: true })}
              >
                <Shield size={18} /> Approve
              </Button>
              <Button
                secondary
                disabled={busy}
                onClick={() => void act("team_vote", { approve: false })}
              >
                <Swords size={18} /> Reject
              </Button>
            </div>
          )}
          <small className="private-hint">
            Votes remain hidden until everyone submits.
          </small>
        </section>
      ) : null}
      {game.phase === "QUEST_VOTING" ? (
        <section className="panel quest-panel">
          <div className="eyebrow">ON THE ROAD TO DESTINY</div>
          <h2>The quest is underway</h2>
          <TeamNames ids={proposal?.selected_players || []} name={name} />
          <p>
            {game.fail_threshold === 2
              ? "Two Fail submissions are needed to defeat this quest."
              : "One Fail submission defeats this quest."}{" "}
            Only the chosen fellowship submits.
          </p>
          <p className="vote-progress" role="status">
            {game.quest_submission_count} / {game.required_team_size} choices
            sealed
          </p>
          {!onQuest ? (
            <div className="notice">
              You are observing this quest. Wait for the fellowship to submit.
            </div>
          ) : game.my_quest_submitted ? (
            <div className="ready-confirmed">
              <Check size={18} /> Your choice is sealed. Its author stays
              secret.
            </div>
          ) : (
            <>
              {privateRetry}
              {!character && !privateError ? (
                <p>
                  <LoaderCircle size={18} className="spin" /> Checking your
                  private permissions…
                </p>
              ) : (
                character && (
                  <>
                    <p>
                      {character.faction === "GOOD"
                        ? "Your loyal oath permits Success only."
                        : "You may support the quest or betray the fellowship."}
                    </p>
                    <div className="share-buttons">
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void act("quest_submit", { submission: "SUCCESS" })
                        }
                      >
                        <Shield size={18} /> Success
                      </Button>
                      {character.faction === "EVIL" && (
                        <Button
                          secondary
                          disabled={busy}
                          onClick={() =>
                            void act("quest_submit", { submission: "FAIL" })
                          }
                        >
                          <Swords size={18} /> Fail
                        </Button>
                      )}
                    </div>
                  </>
                )
              )}
            </>
          )}
          <small className="private-hint">
            Only the final total is revealed. Individual choices stay private.
          </small>
        </section>
      ) : null}
      {game.phase === "QUEST_RESULT" ? (
        <section
          className={`panel quest-panel result-panel illustrated-result ${results.at(-1)?.result === "SUCCESS" ? "result-success" : "result-failure"}`}
        >
          <div className="result-illustration">
            <WorldImage
              name={
                results.at(-1)?.result === "SUCCESS"
                  ? "quest-success"
                  : "quest-failure"
              }
              decorative
              eager
            />
          </div>
          <div className="result-copy">
            <div className="eyebrow">
              QUEST {game.quest_number} · THE VERDICT
            </div>
            <h2>
              {results.at(-1)?.result === "SUCCESS"
                ? "The fellowship prevails"
                : "Betrayal on the road"}
            </h2>
            <p>
              {results.at(-1)?.fail_count} Fail submission(s).{" "}
              {game.fail_threshold} required to fail.
            </p>
            {host ? (
              <Button
                disabled={busy}
                onClick={() => void act("continue_quest")}
              >
                Open the next quest
                <ChevronRight size={17} />
              </Button>
            ) : (
              <p>Waiting for the host to open the next quest.</p>
            )}
          </div>
        </section>
      ) : null}
      {game.phase === "ASSASSINATION" ? (
        <section className="panel quest-panel assassination-panel">
          <Skull size={36} />
          <div className="eyebrow">ONE FINAL SHADOW</div>
          <h2>Three quests. One last blade.</h2>
          <p>
            The Assassin has one chance to identify Merlin. All characters
            remain hidden until that choice is made.
          </p>
          {privateRetry}
          {!character && !privateError ? (
            <p>Checking your private permissions…</p>
          ) : character?.role === "Assassin" ? (
            <>
              <p>Select your final target. This decision cannot be undone.</p>
              <div className="team-picker">
                {game.players
                  .filter((p) => p.id !== me?.id)
                  .map((p) => (
                    <label
                      className={`team-option ${target === p.id ? "selected" : ""}`}
                      key={p.id}
                    >
                      <span>{p.nickname}</span>
                      <input
                        type="radio"
                        name="assassination-target"
                        checked={target === p.id}
                        disabled={busy || confirmed}
                        onChange={() => setTarget(p.id)}
                      />
                    </label>
                  ))}
              </div>
              {confirmed ? (
                <div className="notice">
                  <p>
                    Strike at <strong>{name(target)}</strong>?
                  </p>
                  <div className="share-buttons">
                    <Button
                      secondary
                      disabled={busy}
                      onClick={() => setConfirmed(false)}
                    >
                      Choose again
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void act("assassinate", { player_id: target })
                      }
                    >
                      Confirm final strike
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  disabled={!target || busy}
                  onClick={() => setConfirmed(true)}
                >
                  Choose {target ? name(target) : "a target"}
                </Button>
              )}
            </>
          ) : (
            character && (
              <div className="notice">
                Discuss your suspicions. Waiting for the Assassin’s final
                decision.
              </div>
            )
          )}
        </section>
      ) : null}
      {game.phase === "GAME_OVER" ? (
        <section
          className={`panel quest-panel victory-panel illustrated-victory ${game.winner === "EVIL" ? "evil-victory" : "good-victory"}`}
        >
          <div className="victory-illustration">
            <WorldImage
              name={game.winner === "GOOD" ? "quest-success" : "quest-failure"}
              decorative
              eager
            />
          </div>
          <Crown size={52} />
          <div className="eyebrow">
            {game.winner === "GOOD" ? "THE LOYAL PREVAIL" : "EVIL PREVAILS"}
          </div>
          <h1>
            {game.winner === "GOOD"
              ? "The Crown Endures"
              : "The Crown Has Fallen"}
          </h1>
          <p>{game.victory_reason}</p>
          <div className="role-reveals">
            {game.players.map((p) => {
              const role = game.revealed_roles?.find(
                (r) => r.player_id === p.id,
              );
              return (
                <div className="player" key={p.id}>
                  <span>{p.nickname}</span>
                  <span
                    className={`revealed-role ${role?.faction === "EVIL" ? "evil" : "good"}`}
                  >
                    {role?.role}
                  </span>
                </div>
              );
            })}
          </div>
          {host ? (
            <Button disabled={busy} onClick={() => void act("return_lobby")}>
              Play again · Return to lobby
            </Button>
          ) : (
            <p>Waiting for the host to return everyone to the lobby.</p>
          )}
        </section>
      ) : null}
      {!!game.proposals?.length && (
        <details className="panel public-history">
          <summary>Public council history</summary>
          {game.proposals.map((p) => (
            <article
              key={p.id}
              className={p.status !== "PENDING" ? "history-verdict" : ""}
            >
              {p.status !== "PENDING" && (
                <div className="history-illustration">
                  <WorldImage
                    name={
                      p.status === "APPROVED"
                        ? "quest-success"
                        : "quest-failure"
                    }
                    decorative
                  />
                </div>
              )}
              <h3>
                Quest {p.quest_number} · Proposal {p.attempt_number} ·{" "}
                {p.status.toLowerCase()}
              </h3>
              <p>
                {name(p.leader_player_id)} proposed{" "}
                {p.selected_players.map(name).join(", ")}.
              </p>
              {p.votes ? (
                <ul>
                  {p.votes.map((v) => (
                    <li key={v.player_id}>
                      {name(v.player_id)}{" "}
                      <span>{v.approve ? "Approved" : "Rejected"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Votes are still sealed.</p>
              )}
            </article>
          ))}
        </details>
      )}
      {game.phase !== "GAME_OVER" && (
        <details className="panel recall-card">
          <summary>Recall my private character</summary>
          <CharacterCard gameId={game.id} />
        </details>
      )}
    </>
  );
}
function TeamNames({
  ids,
  name,
}: {
  ids: string[];
  name: (id: string) => string;
}) {
  return (
    <ul className="proposed-team">
      {ids.map((id) => (
        <li key={id}>{name(id)}</li>
      ))}
    </ul>
  );
}
