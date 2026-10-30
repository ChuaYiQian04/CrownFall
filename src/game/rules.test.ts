import { describe, expect, it } from "vitest";
import {
  approved,
  DISTRIBUTIONS,
  failThreshold,
  nextLeader,
  TEAM_SIZES,
  validateRoles,
} from "./rules";
describe("classic game configuration", () => {
  it.each([5, 6, 7, 8, 9, 10])("validates %i players", (count) => {
    expect(DISTRIBUTIONS[count][0] + DISTRIBUTIONS[count][1]).toBe(count);
    expect(TEAM_SIZES[count]).toHaveLength(5);
    expect(TEAM_SIZES[count].every((n) => n <= count)).toBe(true);
    expect(validateRoles(count, [])).toBeNull();
    expect(nextLeader(count - 1, count)).toBe(0);
  });
  it("requires a strict majority including ties", () => {
    expect(approved(3, 5)).toBe(true);
    expect(approved(3, 6)).toBe(false);
    expect(approved(2, 5)).toBe(false);
  });
  it("applies two failures only on the fourth quest with 7+ players", () => {
    for (let n = 5; n <= 10; n++)
      for (let q = 1; q <= 5; q++)
        expect(failThreshold(n, q)).toBe(n >= 7 && q === 4 ? 2 : 1);
  });
  it("rejects unsupported counts, excess evil roles, duplicate and incompatible roles", () => {
    expect(validateRoles(4, [])).toBeTruthy();
    expect(validateRoles(11, [])).toBeTruthy();
    expect(validateRoles(5, ["Percival", "Morgana", "Mordred"])).toBeTruthy();
    expect(
      validateRoles(10, ["Percival", "Morgana", "Mordred", "Oberon"]),
    ).toBeNull();
    expect(validateRoles(7, ["Morgana"])).toBeTruthy();
    expect(validateRoles(5, ["Percival", "Percival"])).toBeTruthy();
  });
});
