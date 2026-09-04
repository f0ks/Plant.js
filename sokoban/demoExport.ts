import { parseXSB } from "./xsb.ts";
import { buildBoard, boardToRows } from "./board.ts";

export interface DemoSourceLevel {
  xsb: string;
  score: number;
  accepted: boolean;
  pushes: number;
}

const XSB_TO_DEMO: Record<string, string> = {
  "#": "D",
  "@": "@",
  "+": "%",
  "$": "B",
  "*": "$",
  ".": "*",
  " ": "-",
};

/**
 * Converts one XSB level into the demo's `string[][]` grid format,
 * remapping the char set (note '*'/'.'/'$' mean different things in each
 * format) and padding with a 1-cell 'G' (grass) border on all sides to
 * match the demo's existing decorative style.
 */
export function xsbToDemoGrid(xsb: string): string[][] {
  const { rows } = parseXSB(xsb);
  const { board, state } = buildBoard(rows);
  const normalized = boardToRows(board, state);

  const border = new Array(board.width + 2).fill("G") as string[];
  const grid: string[][] = [border];

  for (const row of normalized) {
    const mapped = [...row].map((ch) => {
      const demo = XSB_TO_DEMO[ch];
      if (demo === undefined) {
        throw new Error(`xsbToDemoGrid: unmapped XSB character ${JSON.stringify(ch)}`);
      }
      return demo;
    });
    grid.push(["G", ...mapped, "G"]);
  }

  grid.push([...border]);
  return grid;
}

/**
 * Filters to accepted levels, takes the top `count` by score, then
 * re-sorts that selection by push count ascending so the demo still
 * ramps up in difficulty the way its hand-authored levels did — "best by
 * score" and "presented easiest-to-hardest" are different orderings.
 */
export function selectDemoLevels(
  levels: DemoSourceLevel[],
  count: number,
): DemoSourceLevel[] {
  const accepted = levels.filter((l) => l.accepted);
  const byScore = [...accepted].sort((a, b) => b.score - a.score);
  const top = byScore.slice(0, count);
  return top.sort((a, b) => a.pushes - b.pushes);
}
