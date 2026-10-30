import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import QuestGame from "./QuestGame";
import { getMyRole, type GameSnapshot } from "../services/game";
vi.mock("../services/game", () => ({ getMyRole: vi.fn() }));
const players = Array.from({ length: 5 }, (_, i) => ({
  id: `p${i}`,
  user_id: `u${i}`,
  nickname: `Knight ${i}`,
  ready: true,
}));
const base: GameSnapshot = {
  id: "match",
  phase: "TEAM_PROPOSAL",
  version: 0,
  host_user_id: "u0",
  leader_player_id: "p0",
  night_step: 0,
  night_paused: false,
  roles: [],
  night_script: [],
  players,
  quest_number: 1,
  proposal_attempt: 1,
  required_team_size: 2,
  fail_threshold: 1,
  quest_results: [],
  proposals: [],
  proposal: {
    id: "proposal",
    quest_number: 1,
    attempt_number: 1,
    status: "PENDING",
    selected_players: ["p0", "p1"],
  },
  my_team_vote: null,
  team_vote_count: 0,
  my_quest_submitted: false,
  quest_submission_count: 0,
};
const act = vi.fn().mockResolvedValue(true);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMyRole).mockResolvedValue({
    role: "Loyal Servant",
    faction: "GOOD",
    known_players: [],
  });
});
afterEach(cleanup);
it("allows only the leader to select exactly the required team", () => {
  render(<QuestGame game={base} user="u0" busy={false} act={act} />);
  expect(screen.getByRole("button", { name: /Propose team/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: "Knight 0" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Knight 1" }));
  fireEvent.click(screen.getByRole("button", { name: /Propose team/ }));
  expect(act).toHaveBeenCalledWith("propose_team", { players: ["p0", "p1"] });
});
it("keeps other players from proposing teams", () => {
  render(<QuestGame game={base} user="u2" busy={false} act={act} />);
  expect(
    screen.queryByRole("button", { name: /Propose team/ }),
  ).not.toBeInTheDocument();
  expect(
    screen
      .getAllByRole("checkbox")
      .every((e) => (e as HTMLInputElement).disabled),
  ).toBe(true);
});
it("locks the voting controls once the caller has submitted", () => {
  render(
    <QuestGame
      game={{
        ...base,
        phase: "TEAM_VOTING",
        my_team_vote: false,
        team_vote_count: 3,
      }}
      user="u0"
      busy={false}
      act={act}
    />,
  );
  expect(screen.getByText(/Your vote is sealed/)).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Approve" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("3 / 5 votes sealed")).toBeVisible();
});
it("offers only Success to loyal quest members", async () => {
  render(
    <QuestGame
      game={{ ...base, phase: "QUEST_VOTING" }}
      user="u0"
      busy={false}
      act={act}
    />,
  );
  expect(await screen.findByRole("button", { name: "Success" })).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Fail" }),
  ).not.toBeInTheDocument();
});
it("offers Success and Fail to evil quest members", async () => {
  vi.mocked(getMyRole).mockResolvedValue({
    role: "Assassin",
    faction: "EVIL",
    known_players: [],
  });
  render(
    <QuestGame
      game={{ ...base, phase: "QUEST_VOTING" }}
      user="u0"
      busy={false}
      act={act}
    />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Fail" }));
  expect(act).toHaveBeenCalledWith("quest_submit", { submission: "FAIL" });
});
it("keeps observers from submitting and does not fetch their role", () => {
  render(
    <QuestGame
      game={{ ...base, phase: "QUEST_VOTING" }}
      user="u3"
      busy={false}
      act={act}
    />,
  );
  expect(screen.getByText(/You are observing/)).toBeVisible();
  expect(getMyRole).not.toHaveBeenCalled();
});
it("requires two steps before the Assassin submits a target", async () => {
  vi.mocked(getMyRole).mockResolvedValue({
    role: "Assassin",
    faction: "EVIL",
    known_players: [],
  });
  render(
    <QuestGame
      game={{ ...base, phase: "ASSASSINATION" }}
      user="u0"
      busy={false}
      act={act}
    />,
  );
  fireEvent.click(await screen.findByRole("radio", { name: "Knight 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Choose Knight 1" }));
  expect(act).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm final strike" }));
  expect(act).toHaveBeenCalledWith("assassinate", { player_id: "p1" });
});
it("reveals roles only from an endgame snapshot and offers the host a rematch", () => {
  render(
    <QuestGame
      game={{
        ...base,
        phase: "GAME_OVER",
        winner: "GOOD",
        victory_reason: "Merlin survived.",
        revealed_roles: [{ player_id: "p1", role: "Merlin", faction: "GOOD" }],
      }}
      user="u0"
      busy={false}
      act={act}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "The Crown Endures" }),
  ).toBeVisible();
  expect(screen.getByText("Merlin")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /Play again/ }));
  expect(act).toHaveBeenCalledWith("return_lobby");
});
