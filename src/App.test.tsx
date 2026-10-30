import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import App from "./App";
afterEach(cleanup);
it("presents host, join and tutorial paths", () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: /host a game/i })).toHaveAttribute(
    "href",
    "/host",
  );
  expect(screen.getByRole("link", { name: /join a game/i })).toHaveAttribute(
    "href",
    "/join",
  );
  expect(screen.getByText(/local demo/i)).toBeVisible();
});
it("creates a local room through the host form", async () => {
  render(
    <MemoryRouter initialEntries={["/host"]}>
      <App />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Your name"), {
    target: { value: "Arden" },
  });
  fireEvent.click(screen.getByRole("button", { name: /create room/i }));
  expect(await screen.findByText("Your council chamber")).toBeVisible();
  expect(screen.getByText("Arden")).toBeVisible();
  expect(screen.getByRole("button", { name: /start game/i })).toBeDisabled();
});
it("offers an interactive tutorial", () => {
  render(
    <MemoryRouter initialEntries={["/how-to-play"]}>
      <App />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("heading", { name: "A divided kingdom" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(
    screen.getByRole("heading", { name: "A secret to keep" }),
  ).toBeVisible();
});
