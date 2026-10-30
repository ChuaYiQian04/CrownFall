export const WORLD_ART = {
  "realm-background": {
    file: "realm-background.webp",
    alt: "A moonlit royal citadel above a mist-filled valley",
  },
  "council-background": {
    file: "council-background.webp",
    alt: "An ancient candlelit council chamber with a crown on a round table",
  },
  "quest-success": {
    file: "quest-success.webp",
    alt: "An intact royal shield and blue banner on a sunlit bridge to the citadel",
  },
  "quest-failure": {
    file: "quest-failure.webp",
    alt: "A broken shield and fallen blue banner on a ruined crossing",
  },
  "tutorial-council": {
    file: "tutorial-council.webp",
    alt: "Six medieval councilors weighing their loyalties around the crown",
  },
  "crown-relic": {
    file: "crown-relic.webp",
    alt: "An engraved gold crown with blue gemstones resting on navy velvet",
  },
} as const;
export type WorldArtName = keyof typeof WORLD_ART;
export const worldArtUrl = (name: WorldArtName) =>
  `${import.meta.env.BASE_URL}assets/world/${WORLD_ART[name].file}`;
