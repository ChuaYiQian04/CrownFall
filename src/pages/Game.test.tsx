import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Game from "./Game";
import type { GameSnapshot } from "../services/game";
const api = vi.hoisted(() => ({
  getGame: vi.fn(),
  getMyRole: vi.fn(),
  gameAction: vi.fn(),
}));
vi.mock("../services/game", () => api);
vi.mock("../services/rooms", () => ({
  isDemo: false,
  identity: () => Promise.resolve("host"),
  subscribeRoom: (
    _code: string,
    _refresh: () => void,
    status: (s: string) => void,
  ) => {
    status("Live");
    return () => {};
  },
}));
let snapshot: GameSnapshot;
function mount() {
  return render(
    <MemoryRouter initialEntries={["/game/ABCDEF"]}>
      <Routes>
        <Route path="/game/:code" element={<Game />} />
        <Route path="/room/:code" element={<h1>Returned to lobby</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  snapshot = {
    id: "match-1",
    phase: "ROLE_REVEAL",
    version: 0,
    host_user_id: "host",
    leader_player_id: "p1",
    night_step: 0,
    night_paused: false,
    roles: [],
    night_script: [
      { title: "The realm grows quiet", text: "Everyone, close your eyes." },
      { title: "Dawn", text: "Everyone, open your eyes." },
    ],
    players: Array.from({ length: 5 }, (_, i) => ({
      id: `p${i + 1}`,
      user_id: i === 0 ? "host" : `u${i + 1}`,
      nickname: `Knight ${i + 1}`,
      ready: i !== 0,
    })),
  };
  api.getGame.mockImplementation(() =>
    Promise.resolve(structuredClone(snapshot)),
  );
  api.getMyRole.mockResolvedValue({
    role: "Merlin",
    faction: "GOOD",
    known_players: [],
  });
  api.gameAction.mockImplementation(async (_game, action) => {
    if (action === "ready") snapshot.players[0].ready = true;
    if (action === "begin_night") snapshot.phase = "NIGHT_PHASE";
    snapshot.version++;
  });
});
afterEach(cleanup);
it("requires private reveal before confirming and gates night on all players", async () => {
  mount();
  const ready = await screen.findByRole("button", { name: /I know my role/ });
  expect(ready).toBeDisabled();
  expect(screen.getByRole("button", { name: "Start ceremony" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Reveal my character" }));
  await screen.findByRole("heading", { name: "Merlin" });
  expect(ready).toBeEnabled();
  fireEvent.click(ready);
  expect(await screen.findByText("5 / 5 ready")).toBeVisible();
  expect(
    screen.queryByRole("heading", { name: "Merlin" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Start ceremony" }));
  expect(
    await screen.findByRole("heading", { name: "The realm grows quiet" }),
  ).toBeVisible();
  expect(api.gameAction.mock.calls.map((c) => c[1])).toEqual([
    "ready",
    "begin_night",
  ]);
});
it("keeps captions and manual progression available without speech support", async () => {
  snapshot.phase = "NIGHT_PHASE";
  mount();
  expect(await screen.findByText("Everyone, close your eyes.")).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Next instruction" }),
  ).toBeEnabled();
});
it("preserves failed action errors after refetching authoritative state", async () => {
  snapshot.players[0].ready = true;
  api.gameAction.mockRejectedValue(
    new Error("The match changed. Please try again."),
  );
  mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "Start ceremony" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The match changed",
  );
  expect(
    await screen.findByRole("heading", { name: "Your oath awaits" }),
  ).toBeVisible();
});
it("requires confirmation before abandoning and returns to the lobby", async () => {
  api.gameAction.mockImplementation(async () => {
    api.getGame.mockResolvedValue(null);
  });
  mount();
  fireEvent.click(
    await screen.findByRole("button", {
      name: "End this match and return to lobby",
    }),
  );
  expect(api.gameAction).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "End match & return" }));
  expect(
    await screen.findByRole("heading", { name: "Returned to lobby" }),
  ).toBeVisible();
});
