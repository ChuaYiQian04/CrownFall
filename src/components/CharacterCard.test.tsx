import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CharacterCard from "./CharacterCard";
import { StrictMode, useLayoutEffect, useRef } from "react";
import { getMyRole } from "../services/game";
vi.mock("../services/game", () => ({ getMyRole: vi.fn() }));
beforeEach(() => {
  vi.mocked(getMyRole).mockReset();
  localStorage.clear();
});
afterEach(cleanup);
const character = {
  role: "Merlin",
  faction: "GOOD",
  known_players: [{ id: "hidden-1", nickname: "Rowan" }],
} as const;
it.each([false, true])(
  "preserves an immediate mount-time reveal (Strict Mode: %s)",
  async (strict) => {
    vi.mocked(getMyRole).mockResolvedValue({
      ...character,
      known_players: [...character.known_players],
    });
    function ImmediateReveal() {
      const root = useRef<HTMLDivElement>(null);
      useLayoutEffect(() => {
        root.current?.querySelector("button")?.click();
      }, []);
      return (
        <div ref={root}>
          <CharacterCard gameId="match-immediate" />
        </div>
      );
    }
    render(
      strict ? (
        <StrictMode>
          <ImmediateReveal />
        </StrictMode>
      ) : (
        <ImmediateReveal />
      ),
    );
    expect(
      await screen.findByRole("heading", { name: "Merlin" }),
    ).toBeVisible();
  },
);
it("discards a private response after switching to another match", async () => {
  let resolve!: (value: Awaited<ReturnType<typeof getMyRole>>) => void;
  vi.mocked(getMyRole).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const { rerender } = render(<CharacterCard gameId="old-match" />);
  fireEvent.click(screen.getByRole("button", { name: "Reveal my character" }));
  rerender(<CharacterCard gameId="new-match" />);
  await act(async () => {
    resolve({ ...character, known_players: [...character.known_players] });
  });
  expect(
    screen.queryByRole("heading", { name: "Merlin" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Rowan")).not.toBeInTheDocument();
});
it("fetches only on explicit reveal and removes private information when hidden", async () => {
  vi.mocked(getMyRole).mockResolvedValue({
    ...character,
    known_players: [...character.known_players],
  });
  render(<CharacterCard gameId="match-1" />);
  expect(getMyRole).not.toHaveBeenCalled();
  expect(screen.queryByText("Rowan")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reveal my character" }));
  expect(await screen.findByRole("heading", { name: "Merlin" })).toBeVisible();
  expect(screen.getByText("Rowan")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Hide character" }));
  expect(screen.queryByText("Rowan")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Merlin" }),
  ).not.toBeInTheDocument();
  expect(localStorage.getItem("Merlin")).toBeNull();
  expect(JSON.stringify({ ...localStorage })).not.toContain("hidden-1");
});
it("hides the card when the window loses focus", async () => {
  vi.mocked(getMyRole).mockResolvedValue({
    ...character,
    known_players: [...character.known_players],
  });
  render(<CharacterCard gameId="match-1" />);
  fireEvent.click(screen.getByRole("button", { name: "Reveal my character" }));
  await screen.findByText("Rowan");
  fireEvent(window, new Event("blur"));
  expect(screen.queryByText("Rowan")).not.toBeInTheDocument();
});
it("ignores a private response that arrives after the tab was hidden", async () => {
  let resolve!: (value: Awaited<ReturnType<typeof getMyRole>>) => void;
  vi.mocked(getMyRole).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render(<CharacterCard gameId="match-1" />);
  fireEvent.click(screen.getByRole("button", { name: "Reveal my character" }));
  fireEvent(window, new Event("blur"));
  await act(async () => {
    resolve({ ...character, known_players: [...character.known_players] });
  });
  expect(screen.queryByText("Rowan")).not.toBeInTheDocument();
});
it("does not fetch when the character is locked after confirmation", () => {
  render(<CharacterCard gameId="match-1" allowReveal={false} />);
  expect(
    screen.getByRole("button", { name: "Reveal my character" }),
  ).toBeDisabled();
  expect(getMyRole).not.toHaveBeenCalled();
});
it("shows retrieval errors without revealing a card", async () => {
  vi.mocked(getMyRole).mockRejectedValue(
    new Error("No private character is available"),
  );
  render(<CharacterCard gameId="match-1" />);
  fireEvent.click(screen.getByRole("button", { name: "Reveal my character" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("No private character"),
  );
});
