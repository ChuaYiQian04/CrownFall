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
  id: string;
  phase: "ROLE_REVEAL" | "NIGHT_PHASE" | "TEAM_PROPOSAL";
  version: number;
  host_user_id: string;
  leader_player_id: string;
  night_step: number;
  night_paused: boolean;
  roles: OptionalRole[];
  night_script: NightStep[];
  players: GamePlayer[];
};
export type GameAction =
  | "ready"
  | "begin_night"
  | "next_step"
  | "pause_night"
  | "resume_night"
  | "abandon";
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
        "The role and night update is not installed. Run migration 202610300003_roles_and_night.sql in your Supabase SQL Editor.",
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
export const gameAction = (game: GameSnapshot, action: GameAction) =>
  rpc<void>("game_action", {
    p_game_id: game.id,
    p_action: action,
    p_version: game.version,
  });
