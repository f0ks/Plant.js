#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseXSBFile } from "../xsb.ts";
import { buildBoard } from "../board.ts";
import { validateStructure, everyBoxMovedInSolution } from "../validate.ts";
import { solve } from "../solver.ts";

interface Args {
  file?: string;
  timeoutMs: number;
}

function parseArgs(argv: string[]): Args {
  let file: string | undefined;
  let timeoutMs = 5000;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--timeout") {
      timeoutMs = Number(argv[++i]);
      continue;
    }
    if (!arg.startsWith("--") && file === undefined) {
      file = arg;
    }
  }
  return { file, timeoutMs };
}

function emitError(message: string): number {
  console.log(JSON.stringify({ error: message }));
  return 3;
}

// Only these two are universal invariants of a well-formed level. The other
// StructuralIssue codes (isolated-floor, box-on-goal-at-start) are real
// conditions that legitimately occur in professionally designed levels —
// see docs/level-generation.md's Phase 3 note — so they're reported for
// visibility but don't gate the run.
const HARD_CODES = new Set(["not-closed", "box-goal-mismatch"]);

interface StructuralFailure {
  level: number;
  title: string;
  codes: string[];
}

interface StructuralNote {
  level: number;
  title: string;
  codes: string[];
}

interface SolveFailure {
  level: number;
  title: string;
  deadlock_reason: string | null;
}

function main(): number {
  const { file, timeoutMs } = parseArgs(process.argv.slice(2));

  if (!file) {
    return emitError(
      "usage: validate-microban.ts <file.txt> [--timeout <ms>]",
    );
  }

  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (err) {
    return emitError(`cannot read file: ${(err as Error).message}`);
  }

  let levels;
  try {
    levels = parseXSBFile(text).levels;
  } catch (err) {
    return emitError(`parse error: ${(err as Error).message}`);
  }

  const structuralFailures: StructuralFailure[] = [];
  const structuralNotes: StructuralNote[] = [];
  const solveFailures: SolveFailure[] = [];
  const boxMoveFailures: number[] = [];
  let solved = 0;
  let totalNodes = 0;
  let totalTimeMs = 0;

  levels.forEach((level, i) => {
    const n = i + 1;
    const title = level.comments.join(" ");

    let board;
    let state;
    try {
      ({ board, state } = buildBoard(level.rows));
    } catch (err) {
      structuralFailures.push({ level: n, title, codes: [`board-error: ${(err as Error).message}`] });
      return;
    }

    const issues = validateStructure(board, state);
    const hard = issues.filter((i) => HARD_CODES.has(i.code));
    const soft = issues.filter((i) => !HARD_CODES.has(i.code));
    if (soft.length > 0) {
      structuralNotes.push({ level: n, title, codes: soft.map((i) => i.code) });
    }
    if (hard.length > 0) {
      structuralFailures.push({ level: n, title, codes: hard.map((i) => i.code) });
      return;
    }

    const result = solve(board, state, { timeoutMs });
    totalNodes += result.nodes;
    totalTimeMs += result.timeMs;

    if (!result.solvable) {
      solveFailures.push({ level: n, title, deadlock_reason: result.deadlockReason });
      return;
    }

    solved++;
    if (result.pushes > 0 && !everyBoxMovedInSolution(board, state, result.solution)) {
      boxMoveFailures.push(n);
    }
  });

  const report = {
    total: levels.length,
    structural_failures: structuralFailures,
    structural_notes: structuralNotes,
    solved,
    solve_failures: solveFailures,
    box_move_failures: boxMoveFailures,
    total_nodes: totalNodes,
    total_time_ms: Math.round(totalTimeMs),
  };

  console.log(JSON.stringify(report));

  return structuralFailures.length > 0 ? 1 : 0;
}

process.exit(main());
