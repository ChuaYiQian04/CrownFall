import { createClient } from "@supabase/supabase-js";
import type { OptionalRole } from "../game/rules";
export type Player = {
  id: string;
  user_id: string;
  nickname: string;
  seat_order: number;
};
export type Room = {
  id: string;
  code: string;
  host_user_id: string;
  status: string;
  version: number;
  settings: { roles: OptionalRole[] };
  players: Player[];
};
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const isDemo = !url && !key;
export let configurationError = "";
function configuredClient() {
  if (isDemo) return null;
  if (!url || !key) {
    configurationError =
      "Supabase setup is incomplete. Set both environment variables and restart the app.";
    return null;
  }
  try {
    return createClient(url, key);
  } catch {
    configurationError =
      "Supabase configuration is invalid. Check the project URL and publishable key.";
    return null;
  }
}
export const supabase = configuredClient();
function assertConfiguration() {
  if (configurationError) throw new Error(configurationError);
}
const DEMO_KEY = "crownfall-demo-rooms";
const demoUser =
  sessionStorage.getItem("crownfall-demo-user") || crypto.randomUUID();
sessionStorage.setItem("crownfall-demo-user", demoUser);
let identityPromise: Promise<string> | null = null;
export function identity(): Promise<string> {
  if (configurationError) return Promise.reject(new Error(configurationError));
  if (!supabase) return Promise.resolve(demoUser);
  if (!identityPromise)
    identityPromise = (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) return data.session.user.id;
      const result = await supabase.auth.signInAnonymously();
      if (result.error) throw result.error;
      return result.data.user!.id;
    })().catch((error) => {
      identityPromise = null;
      throw error;
    });
  return identityPromise;
}
const read = (): Room[] => JSON.parse(localStorage.getItem(DEMO_KEY) || "[]");
function save(rooms: Room[]) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(rooms));
  window.dispatchEvent(new Event("crownfall-room"));
}
async function rpc(name: string, args: Record<string, unknown>) {
  await identity();
  const { data, error } = await supabase!.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}
export function validateNickname(name: string) {
  if (name.trim().length < 2 || name.trim().length > 24)
    throw new Error("Choose a name with 2–24 characters.");
}
export async function createRoom(nickname: string): Promise<string> {
  assertConfiguration();
  validateNickname(nickname);
  if (supabase) return rpc("create_room", { p_nickname: nickname.trim() });
  const rooms = read();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code: string;
  do {
    code = Array.from(
      crypto.getRandomValues(new Uint8Array(6)),
      (x) => alphabet[x % alphabet.length],
    ).join("");
  } while (rooms.some((r) => r.code === code));
  rooms.push({
    id: crypto.randomUUID(),
    code,
    host_user_id: demoUser,
    status: "LOBBY",
    version: 0,
    settings: { roles: [] },
    players: [
      {
        id: crypto.randomUUID(),
        user_id: demoUser,
        nickname: nickname.trim(),
        seat_order: 0,
      },
    ],
  });
  save(rooms);
  return code;
}
export async function joinRoom(code: string, nickname: string) {
  assertConfiguration();
  validateNickname(nickname);
  code = code.trim().toUpperCase();
  if (supabase)
    return rpc("join_room", { p_code: code, p_nickname: nickname.trim() });
  const rooms = read(),
    room = rooms.find((r) => r.code === code);
  if (!room) throw new Error("That room could not be found. Check the code.");
  if (room.players.some((p) => p.user_id === demoUser)) return code;
  if (room.status !== "LOBBY")
    throw new Error("This room is no longer accepting players.");
  if (room.players.length >= 10) throw new Error("This room is full.");
  if (
    room.players.some(
      (p) => p.nickname.toLowerCase() === nickname.trim().toLowerCase(),
    )
  )
    throw new Error("That name is already taken in this room.");
  room.players.push({
    id: crypto.randomUUID(),
    user_id: demoUser,
    nickname: nickname.trim(),
    seat_order: Math.max(-1, ...room.players.map((p) => p.seat_order)) + 1,
  });
  room.version++;
  save(rooms);
  return code;
}
export async function getRoom(code: string): Promise<Room> {
  assertConfiguration();
  if (supabase) return rpc("get_room", { p_code: code });
  const room = read().find((r) => r.code === code);
  if (!room || !room.players.some((p) => p.user_id === demoUser))
    throw new Error("Join this room first, or check your room code.");
  return room;
}
export async function roomAction(
  room: Room,
  action: string,
  payload: unknown = {},
) {
  assertConfiguration();
  if (supabase)
    return rpc("lobby_action", {
      p_code: room.code,
      p_action: action,
      p_payload: payload,
      p_version: room.version,
    });
  const rooms = read(),
    r = rooms.find((x) => x.code === room.code);
  if (!r || !r.players.some((p) => p.user_id === demoUser))
    throw new Error("You are not seated in this room.");
  if (r.version !== room.version)
    throw new Error("The council changed. Refresh and try again.");
  if (action === "leave") {
    r.players = r.players.filter((p) => p.user_id !== demoUser);
    if (r.host_user_id === demoUser)
      r.host_user_id = r.players[0]?.user_id || "";
  } else {
    if (r.host_user_id !== demoUser)
      throw new Error("Only the host can do that.");
    if (action === "settings") r.settings = payload as Room["settings"];
    if (action === "remove") {
      if (r.players.some((p) => p.id === payload && p.user_id === demoUser))
        throw new Error("Use Leave room to leave your own seat.");
      r.players = r.players.filter((p) => p.id !== payload);
    }
    if (action === "fill")
      ["Rowan", "Elara", "Cassian", "Lyra"].forEach((n) => {
        if (r.players.length < 5) {
          let nickname = n;
          while (
            r.players.some(
              (p) => p.nickname.toLowerCase() === nickname.toLowerCase(),
            )
          )
            nickname += " II";
          r.players.push({
            id: crypto.randomUUID(),
            user_id: crypto.randomUUID(),
            nickname,
            seat_order: Math.max(-1, ...r.players.map((p) => p.seat_order)) + 1,
          });
        }
      });
  }
  r.version++;
  save(rooms);
}
export function subscribeRoom(
  code: string,
  refresh: () => void,
  onStatus: (s: string) => void,
) {
  if (configurationError) {
    onStatus("Setup required");
    return () => {};
  }
  if (!supabase) {
    const fn = () => refresh();
    window.addEventListener("storage", fn);
    window.addEventListener("crownfall-room", fn);
    onStatus("Local demo");
    return () => {
      window.removeEventListener("storage", fn);
      window.removeEventListener("crownfall-room", fn);
    };
  }
  const channel = supabase
    .channel(`room:${code}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rooms",
        filter: `code=eq.${code}`,
      },
      refresh,
    )
    .subscribe((status) => {
      onStatus(status === "SUBSCRIBED" ? "Live" : "Reconnecting");
      if (status === "SUBSCRIBED") refresh();
    });
  return () => {
    void supabase!.removeChannel(channel);
  };
}
