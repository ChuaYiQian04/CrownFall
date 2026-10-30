import { useState, type CSSProperties } from "react";
import {
  Crown,
  Shield,
  Swords,
  Check,
  Users,
  ScrollText,
  Compass,
} from "lucide-react";
import type { GameSnapshot } from "../services/game";
import { QUEST_DESTINATIONS, questArtUrl } from "../game/quest-art";

function DestinationArt({ file }: { file: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <Compass className="quest-art-fallback" aria-hidden="true" />
  ) : (
    <img
      src={questArtUrl(file)}
      alt=""
      width={288}
      height={288}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export default function QuestBoard({ game }: { game: GameSnapshot }) {
  const results = game.quest_results || [];
  const loyal = results.filter((r) => r.result === "SUCCESS").length,
    evil = results.filter((r) => r.result === "FAIL").length;
  const finished = game.phase === "GAME_OVER" || game.phase === "ASSASSINATION";
  const leader =
    game.players.find((p) => p.id === game.leader_player_id)?.nickname ||
    "Waiting";
  return (
    <section
      className="panel scoreboard quest-board"
      aria-label="Quest scoreboard"
    >
      <picture className="quest-map-art" aria-hidden="true">
        <source
          media="(max-width: 600px)"
          srcSet={questArtUrl("quest-map-mobile.webp")}
        />
        <img src={questArtUrl("quest-map.webp")} alt="" loading="lazy" />
      </picture>
      <div className="score-heading">
        <span className="loyal-score">
          <span className="faction-score-seal">
            <Shield size={18} />
          </span>
          <span>
            <strong>{loyal}</strong> loyal{" "}
            {loyal === 1 ? "victory" : "victories"}
          </span>
        </span>
        <span className="board-legend" aria-hidden="true">
          THE FIVE QUESTS
        </span>
        <span className="evil-score">
          <span>
            <strong>{evil}</strong> {evil === 1 ? "betrayal" : "betrayals"}
          </span>
          <span className="faction-score-seal">
            <Swords size={18} />
          </span>
        </span>
      </div>
      <ol
        className="quest-track"
        style={
          {
            "--journey-progress": `${Math.max(0, ((game.quest_number || 1) - 1) * 25)}%`,
          } as CSSProperties
        }
      >
        {QUEST_DESTINATIONS.map((destination, index) => {
          const q = index + 1,
            result = results.find((r) => r.quest_number === q);
          const current = !result && !finished && game.quest_number === q;
          const status = result
            ? result.result === "SUCCESS"
              ? "Success"
              : "Failed"
            : current
              ? "Current"
              : finished
                ? "Not played"
                : "Awaiting";
          return (
            <li
              key={q}
              className={`${result?.result.toLowerCase() || "pending"} ${current ? "current" : ""}`}
              aria-current={current ? "step" : undefined}
            >
              <div className="quest-medallion" aria-hidden="true">
                {current && (
                  <span className="quest-current-crown">
                    <Crown size={15} />
                  </span>
                )}
                <div className="quest-medallion-image">
                  <DestinationArt file={destination.file} />
                </div>
                <span className="quest-number-tab">{q}</span>
                {result && (
                  <span className="quest-outcome-seal">
                    {result.result === "SUCCESS" ? (
                      <Check size={17} />
                    ) : (
                      <Swords size={17} />
                    )}
                  </span>
                )}
              </div>
              <span className="quest-label">Quest {q}</span>
              <span className="quest-location" title={destination.name}>
                <span className="quest-location-full">{destination.name}</span>
                <span className="quest-location-short">
                  {destination.shortName}
                </span>
              </span>
              <span className="quest-status">{status}</span>
            </li>
          );
        })}
      </ol>
      {game.phase !== "GAME_OVER" && (
        <div className="quest-meta">
          <div>
            <Crown size={17} aria-hidden="true" />
            <span>
              Leader<strong title={leader}>{leader}</strong>
            </span>
          </div>
          <div>
            <Users size={17} aria-hidden="true" />
            <span>
              Team<strong>{game.required_team_size} players</strong>
            </span>
          </div>
          <div>
            <ScrollText size={17} aria-hidden="true" />
            <span>
              Proposal<strong>{game.proposal_attempt} / 5</strong>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
