export type Role =
  | "Merlin"
  | "Percival"
  | "Loyal Servant"
  | "Assassin"
  | "Morgana"
  | "Mordred"
  | "Oberon"
  | "Minion of Evil";
export type Faction = "GOOD" | "EVIL";
export const CHARACTER_ART: Record<Role, { file: string; alt: string }> = {
  Merlin: {
    file: "merlin.webp",
    alt: "Merlin in embroidered navy robes holding a luminous blue flame",
  },
  Percival: {
    file: "percival.webp",
    alt: "Percival in engraved steel armor and a blue cloak, guarding an upright sword",
  },
  "Loyal Servant": {
    file: "loyal-servant.webp",
    alt: "A royal oathkeeper with braided hair and a blue shield on the castle ramparts",
  },
  Assassin: {
    file: "assassin.webp",
    alt: "A hooded Assassin holding a concealed dagger in a moonlit castle alley",
  },
  Morgana: {
    file: "morgana.webp",
    alt: "Morgana in dark embroidered robes weaving a violet flame in a royal library",
  },
  Mordred: {
    file: "mordred.webp",
    alt: "Mordred in blackened royal armor beneath an eclipsed moon",
  },
  Oberon: {
    file: "oberon.webp",
    alt: "Oberon in a thorn-woven cloak carrying a blackthorn staff in a misty forest",
  },
  "Minion of Evil": {
    file: "minion-of-evil.webp",
    alt: "A court conspirator in burgundy brocade concealing a sealed letter",
  },
};
export type PrivateCharacter = {
  role: Role;
  faction: Faction;
  known_players: { id: string; nickname: string }[];
};
export const CHARACTERS: Record<
  Role,
  { title: string; description: string; knowledge: string }
> = {
  Merlin: {
    title: "Keeper of the hidden flame",
    description:
      "You see the shadows gathering around the throne. Guide the loyal without letting the Assassin discover your gift.",
    knowledge:
      "These players threaten the crown. Mordred, if present, is hidden from your sight.",
  },
  Percival: {
    title: "Guardian of the vision",
    description:
      "Protect the realm’s seer. You recognize the faces linked to the vision, but deception may wear the same mask.",
    knowledge:
      "These are the possible seers. When Morgana is present, one is Merlin and one is Morgana; you do not know which.",
  },
  "Loyal Servant": {
    title: "Oathkeeper of the crown",
    description:
      "Your oath belongs to the realm. Read the council, choose your allies, and help three quests succeed.",
    knowledge:
      "You have no privileged knowledge. Trust must be earned at the council.",
  },
  Assassin: {
    title: "The last blade",
    description:
      "Work from within to undo the fellowship. If three quests succeed, your last chance is to identify Merlin.",
    knowledge:
      "These are your fellow traitors. Oberon, if present, is unknown to you.",
  },
  Morgana: {
    title: "Weaver of false visions",
    description:
      "Your face echoes the seer’s light. Confuse Percival and lead the fellowship toward ruin.",
    knowledge:
      "These are your fellow traitors. Oberon, if present, is unknown to you.",
  },
  Mordred: {
    title: "The unseen shadow",
    description:
      "Even Merlin cannot see through your disguise. Turn that silence into the council’s undoing.",
    knowledge:
      "These are your fellow traitors. Oberon, if present, is unknown to you.",
  },
  Oberon: {
    title: "The solitary thorn",
    description:
      "You serve the downfall of the crown alone. Your fellow traitors do not recognize you, and you do not recognize them.",
    knowledge: "You know no teammates. Merlin can see your allegiance.",
  },
  "Minion of Evil": {
    title: "Whisper beneath the throne",
    description:
      "Speak as an ally, act as a traitor. Break the fellowship’s quests while keeping your allegiance concealed.",
    knowledge:
      "These are your fellow traitors. Oberon, if present, is unknown to you.",
  },
};
