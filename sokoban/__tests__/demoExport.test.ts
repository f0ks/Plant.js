import { describe, it, expect } from "vitest";
import { selectDemoLevels, xsbToDemoGrid } from "../demoExport";
import type { DemoSourceLevel } from "../demoExport";

describe("selectDemoLevels", () => {
  it("drops rejected levels, keeps only accepted ones", () => {
    const levels: DemoSourceLevel[] = [
      { xsb: "A", score: 100, accepted: true, pushes: 5 },
      { xsb: "B", score: 900, accepted: false, pushes: 1 },
    ];
    const selected = selectDemoLevels(levels, 1);
    expect(selected.map((l) => l.xsb)).toEqual(["A"]);
  });

  it("selects the top `count` accepted levels by score, then re-sorts the selection by pushes ascending", () => {
    const levels: DemoSourceLevel[] = [
      { xsb: "L1-high-score-high-pushes", score: 500, accepted: true, pushes: 20 },
      { xsb: "L2-low-score", score: 10, accepted: true, pushes: 1 },
      { xsb: "L3-mid-score-low-pushes", score: 300, accepted: true, pushes: 5 },
    ];
    const selected = selectDemoLevels(levels, 2);
    // L2 (score 10) is excluded by the score cutoff even though it has the
    // fewest pushes; among the two selected (L1, L3), output order is by
    // pushes ascending, not by score.
    expect(selected.map((l) => l.xsb)).toEqual([
      "L3-mid-score-low-pushes",
      "L1-high-score-high-pushes",
    ]);
  });

  it("returns fewer than `count` levels if fewer accepted levels exist", () => {
    const levels: DemoSourceLevel[] = [
      { xsb: "A", score: 100, accepted: true, pushes: 5 },
    ];
    const selected = selectDemoLevels(levels, 5);
    expect(selected.length).toBe(1);
  });
});

describe("xsbToDemoGrid", () => {
  it("maps walls, player, box, box-on-goal, goal and floor to the demo char set", () => {
    const grid = xsbToDemoGrid("#####\n#@$.#\n#####");
    // Interior row (index 2 of 5 after the +1 border row) is:
    // border G, D (wall), @, B (box), * (goal), D (wall), border G
    expect(grid[2]).toEqual(["G", "D", "@", "B", "*", "D", "G"]);
  });

  it("maps box-on-goal ('*' in XSB) to '$' and player-on-goal ('+' in XSB) to '%'", () => {
    const grid = xsbToDemoGrid("#####\n#@*.#\n#####");
    expect(grid[2]).toEqual(["G", "D", "@", "$", "*", "D", "G"]);

    const onGoalGrid = xsbToDemoGrid("#####\n#+  #\n#####");
    expect(onGoalGrid[2]).toEqual(["G", "D", "%", "-", "-", "D", "G"]);
  });

  it("pads the parsed board with a 1-cell grass border on all four sides", () => {
    const grid = xsbToDemoGrid("#####\n#@$.#\n#####");
    // 5 wide x 3 tall board -> 7 wide x 5 tall grid after the border.
    expect(grid.length).toBe(5);
    for (const row of grid) expect(row.length).toBe(7);
    expect(grid[0]).toEqual(["G", "G", "G", "G", "G", "G", "G"]);
    expect(grid[4]).toEqual(["G", "G", "G", "G", "G", "G", "G"]);
    for (const row of grid) {
      expect(row[0]).toBe("G");
      expect(row[row.length - 1]).toBe("G");
    }
  });
});
