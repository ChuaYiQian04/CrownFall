export const QUEST_DESTINATIONS = [
  { name: "Whisperwood", shortName: "Woodland", file: "quest-woodland.webp" },
  { name: "Watchtower", shortName: "Tower", file: "quest-watchtower.webp" },
  { name: "Old Abbey", shortName: "Abbey", file: "quest-abbey.webp" },
  { name: "Frost Pass", shortName: "Pass", file: "quest-mountain.webp" },
  { name: "Crown Citadel", shortName: "Citadel", file: "quest-citadel.webp" },
] as const;
export const questArtUrl = (file: string) =>
  `${import.meta.env.BASE_URL}assets/quests/${file}`;
