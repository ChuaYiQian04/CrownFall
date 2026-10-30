export const DISTRIBUTIONS: Record<number, readonly [number, number]> = {
  5: [3, 2],
  6: [4, 2],
  7: [4, 3],
  8: [5, 3],
  9: [6, 3],
  10: [6, 4],
};
export const TEAM_SIZES: Record<number, readonly number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};
export type OptionalRole = "Percival" | "Morgana" | "Mordred" | "Oberon";
export const OPTIONAL_ROLES: OptionalRole[] = [
  "Percival",
  "Morgana",
  "Mordred",
  "Oberon",
];
export function validateRoles(count: number, roles: OptionalRole[]) {
  if (!DISTRIBUTIONS[count]) return "Gather 5–10 players to begin.";
  if (
    new Set(roles).size !== roles.length ||
    roles.some((r) => !OPTIONAL_ROLES.includes(r))
  )
    return "Unknown or duplicate role.";
  if (roles.includes("Morgana") && !roles.includes("Percival"))
    return "Morgana requires Percival.";
  if (
    1 + roles.filter((r) => r !== "Percival").length >
    DISTRIBUTIONS[count][1]
  )
    return "Too many evil characters for this player count.";
  return null;
}
export const failThreshold = (players: number, quest: number) =>
  players >= 7 && quest === 4 ? 2 : 1;
export const approved = (yes: number, total: number) => yes > total / 2;
export const nextLeader = (seat: number, count: number) => (seat + 1) % count;
export const PHASES = [
  "LOBBY",
  "ROLE_REVEAL",
  "NIGHT_PHASE",
  "TEAM_PROPOSAL",
  "TEAM_VOTING",
  "QUEST_VOTING",
  "QUEST_RESULT",
  "ASSASSINATION",
  "GAME_OVER",
] as const;
