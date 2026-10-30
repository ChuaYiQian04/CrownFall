import { identity, isDemo, supabase } from "./rooms";
import type { PrivateCharacter } from "../game/characters";
import type { OptionalRole } from "../game/rules";
export type GamePlayer = {
  id: string;
  user_id: string;
  nickname: string;
  ready: boolean;
};
export type NightStep = { title: string; text: string };
export type GameSnapshot = {
  room_code?: string;
  id: string;
  phase:
    | "ROLE_REVEAL"
    | "NIGHT_PHASE"
    | "TEAM_PROPOSAL"
    | "TEAM_VOTING"
    | "QUEST_VOTING"
    | "QUEST_RESULT"
    | "ASSASSINATION"
    | "GAME_OVER";
  version: number;
  host_user_id: string;
  leader_player_id: string;
  night_step: number;
  night_paused: boolean;
  roles: OptionalRole[];
  night_script: NightStep[];
  players: GamePlayer[];
  quest_number?: number;
  proposal_attempt?: number;
  required_team_size?: number;
  fail_threshold?: number;
  winner?: "GOOD" | "EVIL" | null;
  victory_reason?: string | null;
  proposal?: {
    id: string;
    quest_number: number;
    attempt_number: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
    selected_players: string[];
  } | null;
  team_vote_count?: number;
  my_team_vote?: boolean | null;
  quest_submission_count?: number;
  my_quest_submitted?: boolean;
  quest_results?: {
    quest_number: number;
    result: "SUCCESS" | "FAIL";
    fail_count: number;
  }[];
  proposals?: {
    id: string;
    quest_number: number;
    attempt_number: number;
    leader_player_id: string;
    selected_players: string[];
    status: string;
    votes: { player_id: string; approve: boolean }[] | null;
  }[];
  revealed_roles?:
    | {
        player_id: string;
        role: PrivateCharacter["role"];
        faction: PrivateCharacter["faction"];
      }[]
    | null;
};
export type GameAction =
  | "ready"
  | "begin_night"
  | "next_step"
  | "pause_night"
  | "resume_night"
  | "abandon"
  | "propose_team"
  | "team_vote"
  | "quest_submit"
  | "continue_quest"
  | "assassinate"
  | "return_lobby";
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  await identity();
  if (isDemo || !supabase)
    throw new Error(
      "Secure role assignment requires Supabase. The local lobby demo does not assign roles.",
    );
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    if (error.code === "PGRST202")
      throw new Error(
        "A database update is missing. Apply the remaining migrations through 202610300004_quest_gameplay.sql in Supabase SQL Editor.",
      );
    throw new Error(error.message);
  }
  return data as T;
}
export const startGame = (code: string, version: number) =>
  rpc<string>("start_game", { p_code: code, p_version: version });
export const getGame = (code: string) =>
  isDemo
    ? Promise.resolve(null)
    : rpc<GameSnapshot | null>("get_game", { p_code: code });
export const getMyRole = (gameId: string) =>
  rpc<PrivateCharacter>("get_my_role", { p_game_id: gameId });
export const gameAction = (
  game: GameSnapshot,
  action: GameAction,
  payload: unknown = {},
) =>
  [
    "ready",
    "begin_night",
    "next_step",
    "pause_night",
    "resume_night",
    "abandon",
  ].includes(action)
    ? rpc<void>("game_action", {
        p_game_id: game.id,
        p_action: action,
        p_version: game.version,
      })
    : playAction(game, action, payload);

async function playAction(
  game: GameSnapshot,
  action: GameAction,
  payload: unknown,
) {
  await identity();
  if (!supabase) throw new Error("Gameplay requires Supabase.");
  let version = game.version;
  // Retry only an explicitly rolled-back stale ballot. Never retry a network
  // error, a leader action, or a choice already recorded by the server.
  for (let attempt = 0; attempt < 4; attempt++) {
    const { error } = await supabase.rpc("play_action", {
      p_game_id: game.id,
      p_action: action,
      p_payload: payload,
      p_version: version,
    });
    if (!error) return;
    if (
      error.code !== "40001" ||
      !["team_vote", "quest_submit"].includes(action) ||
      attempt === 3
    ) {
      if (error.code === "PGRST202")
        throw new Error(
          "Install migration 202610300004_quest_gameplay.sql in Supabase SQL Editor.",
        );
      throw new Error(error.message);
    }
    if (!game.room_code)
      throw new Error("The match changed. Refresh and try again.");
    const { data, error: refreshError } = await supabase.rpc("get_game", {
      p_code: game.room_code,
    });
    if (refreshError || !data || data.id !== game.id)
      throw new Error("The match changed. Refresh and try again.");
    if (
      action === "team_vote" &&
      (data.phase !== "TEAM_VOTING" ||
        data.proposal?.id !== game.proposal?.id ||
        data.my_team_vote !== null)
    )
      throw new Error(
        "Team voting has changed. Your choice was not resubmitted.",
      );
    if (
      action === "quest_submit" &&
      (data.phase !== "QUEST_VOTING" ||
        data.quest_number !== game.quest_number ||
        data.my_quest_submitted)
    )
      throw new Error(
        "Quest voting has changed. Your choice was not resubmitted.",
      );
    version = data.version;
  }
}
