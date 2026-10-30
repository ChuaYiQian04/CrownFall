import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { gameAction, type GameSnapshot } from "./game";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("./rooms", () => ({
  identity: () => Promise.resolve("self"),
  isDemo: false,
  supabase: { rpc },
}));
const game = {
  id: "match",
  room_code: "ABCDEF",
  phase: "TEAM_VOTING",
  version: 4,
  proposal: { id: "proposal" },
  quest_number: 1,
} as GameSnapshot;
beforeEach(() => rpc.mockReset());
afterEach(() => vi.clearAllMocks());
it("retries only a rolled-back stale ballot against the same proposal", async () => {
  rpc
    .mockResolvedValueOnce({ error: { code: "40001", message: "stale" } })
    .mockResolvedValueOnce({
      data: { ...game, version: 5, my_team_vote: null },
    })
    .mockResolvedValueOnce({ error: null });
  await gameAction(game, "team_vote", { approve: true });
  expect(rpc).toHaveBeenCalledTimes(3);
  expect(rpc.mock.calls[2][1]).toMatchObject({
    p_version: 5,
    p_payload: { approve: true },
  });
});
it("does not retry when the server already has a vote", async () => {
  rpc
    .mockResolvedValueOnce({ error: { code: "40001", message: "stale" } })
    .mockResolvedValueOnce({
      data: { ...game, version: 5, my_team_vote: true },
    });
  await expect(
    gameAction(game, "team_vote", { approve: false }),
  ).rejects.toThrow("not resubmitted");
  expect(rpc).toHaveBeenCalledTimes(2);
});
it("never retries across a proposal change", async () => {
  rpc
    .mockResolvedValueOnce({ error: { code: "40001", message: "stale" } })
    .mockResolvedValueOnce({
      data: {
        ...game,
        version: 5,
        my_team_vote: null,
        proposal: { id: "new" },
      },
    });
  await expect(
    gameAction(game, "team_vote", { approve: true }),
  ).rejects.toThrow("not resubmitted");
  expect(rpc).toHaveBeenCalledTimes(2);
});
it("never retries network failures or leader actions", async () => {
  rpc.mockRejectedValueOnce(new Error("Network failed"));
  await expect(
    gameAction(game, "quest_submit", { submission: "SUCCESS" }),
  ).rejects.toThrow("Network failed");
  expect(rpc).toHaveBeenCalledTimes(1);
  rpc
    .mockReset()
    .mockResolvedValueOnce({ error: { code: "40001", message: "stale" } });
  await expect(
    gameAction(game, "propose_team", { players: ["a", "b"] }),
  ).rejects.toThrow("stale");
  expect(rpc).toHaveBeenCalledTimes(1);
});
it("retries a stale quest choice only within the same unsubmitted quest", async () => {
  const quest = { ...game, phase: "QUEST_VOTING" as const };
  rpc
    .mockResolvedValueOnce({ error: { code: "40001", message: "stale" } })
    .mockResolvedValueOnce({
      data: { ...quest, version: 5, my_quest_submitted: false },
    })
    .mockResolvedValueOnce({ error: null });
  await gameAction(quest, "quest_submit", { submission: "SUCCESS" });
  expect(rpc).toHaveBeenCalledTimes(3);
});
