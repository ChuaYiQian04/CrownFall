import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useNarration } from "./useNarration";
const synth = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: () => [],
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const first = { title: "Quiet", text: "Everyone, close your eyes." },
  second = { title: "Dawn", text: "Everyone, open your eyes." };
it("never plays automatically and plays only after host activation", () => {
  const { result } = renderHook(() => useNarration(first, 0, false, true));
  expect(synth.speak).not.toHaveBeenCalled();
  act(() => result.current.play());
  expect(synth.speak).toHaveBeenCalledTimes(1);
  expect(synth.speak.mock.calls[0][0].text).toBe(first.text);
});
it("does not narrate on guest devices", () => {
  const { result } = renderHook(() => useNarration(first, 0, false, false));
  act(() => result.current.play());
  expect(synth.speak).not.toHaveBeenCalled();
});
it("continues enabled narration for a synchronized next step, and stops on unmount", () => {
  const { result, rerender, unmount } = renderHook(
    ({ index }) =>
      useNarration(index === 0 ? first : second, index, false, true),
    { initialProps: { index: 0 } },
  );
  act(() => result.current.play());
  rerender({ index: 1 });
  expect(synth.speak).toHaveBeenCalledTimes(2);
  expect(synth.speak.mock.calls[1][0].text).toBe(second.text);
  unmount();
  expect(synth.cancel).toHaveBeenCalled();
});
it("applies synchronized pause/resume without playing another instruction", () => {
  const { rerender } = renderHook(
    ({ paused }) => useNarration(first, 0, paused, true),
    { initialProps: { paused: false } },
  );
  rerender({ paused: true });
  expect(synth.pause).toHaveBeenCalled();
  rerender({ paused: false });
  expect(synth.resume).toHaveBeenCalled();
  expect(synth.speak).not.toHaveBeenCalled();
});
it("handles unsupported speech and stores only non-sensitive preferences", () => {
  vi.stubGlobal("speechSynthesis", undefined);
  const { result } = renderHook(() => useNarration(first, 0, false, true));
  expect(result.current.supported).toBe(false);
  act(() => result.current.play());
  expect(synth.speak).not.toHaveBeenCalled();
  act(() =>
    result.current.updatePreferences({ volume: 0.4, speed: 1.2, voice: "" }),
  );
  expect(JSON.parse(localStorage.getItem("crownfall-preferences")!)).toEqual({
    volume: 0.4,
    speed: 1.2,
    voice: "",
  });
});
