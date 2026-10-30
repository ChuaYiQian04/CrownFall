import { beforeEach, describe, expect, it } from "vitest";
import { createRoom, getRoom, joinRoom, roomAction } from "./rooms";
describe("explicit local lobby demo", () => {
  beforeEach(() => localStorage.clear());
  it("creates a room, restores membership, changes settings, and fills sample seats", async () => {
    const code = await createRoom("Arden");
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(await joinRoom(code, "Arden")).toBe(code);
    let room = await getRoom(code);
    expect(room.players).toHaveLength(1);
    await roomAction(room, "fill");
    room = await getRoom(code);
    expect(room.players).toHaveLength(5);
    await roomAction(room, "settings", { roles: ["Percival"] });
    expect((await getRoom(code)).settings.roles).toEqual(["Percival"]);
  });
  it("rejects short names and unknown rooms", async () => {
    await expect(createRoom("x")).rejects.toThrow("2–24");
    await expect(joinRoom("ABCDEF", "Arden")).rejects.toThrow("not be found");
  });
  it("keeps room codes unique", async () => {
    const a = await createRoom("Arden"),
      b = await createRoom("Arden");
    expect(a).not.toBe(b);
  });
});
