#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseXSBFile } from "../xsb.ts";
import { buildBoard } from "../board.ts";
import { validateStructure } from "../validate.ts";
import { solve } from "../solver.ts";
import { pushEvents, boxLines, countTouching, score, isAccepted } from "../metrics.ts";
import { hasFreezeDeadlock } from "../deadlock/freezeDeadlock.ts";

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

const HARD_CODES = new Set(["not-closed", "box-goal-mismatch"]);

interface ScoredLevel {
  level: number;
  title: string;
  score: number;
  accepted: boolean;
  pushes: number;
  lines: number;
  boxes: number;
  trapped: boolean;
}

function main(): number {
  const { file, timeoutMs } = parseArgs(process.argv.slice(2));

  if (!file) {
    return emitError("usage: score-microban.ts <file.txt> [--timeout <ms>]");
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

  const scored: ScoredLevel[] = [];
  let structuralFailures = 0;
  let unsolved = 0;

  // No generator batch exists yet (Phase 5), so every level is scored as if
  // it had no siblings at its search depth, and the tie-breaking jitter term
  // is fixed at 0 for a reproducible report -- see docs/level-generation.md's
  // Phase 4 note.
  for (const [i, level] of levels.entries()) {
    const n = i + 1;
    const title = level.comments.join(" ");

    const { board, state } = buildBoard(level.rows);

    const issues = validateStructure(board, state);
    if (issues.some((issue) => HARD_CODES.has(issue.code))) {
      structuralFailures++;
      continue;
    }

    const result = solve(board, state, { timeoutMs });
    if (!result.solvable) {
      unsolved++;
      continue;
    }

    const events = pushEvents(board, state, result.solution);
    const s = score({
      pushes: result.pushes,
      lines: boxLines(events),
      boxes: state.boxes.length,
      siblingLevels: 0,
      trapped: hasFreezeDeadlock(board, state.boxes),
      touching: countTouching(board, state),
      random: 0,
    });

    scored.push({
      level: n,
      title,
      score: s,
      accepted: isAccepted(s),
      pushes: result.pushes,
      lines: boxLines(events),
      boxes: state.boxes.length,
      trapped: hasFreezeDeadlock(board, state.boxes),
    });
  }

  const scores = scored.map((s) => s.score);
  const distribution =
    scores.length === 0
      ? null
      : {
          min: Math.min(...scores),
          max: Math.max(...scores),
          mean: scores.reduce((a, b) => a + b, 0) / scores.length,
        };

  const report = {
    total: levels.length,
    structural_failures: structuralFailures,
    unsolved,
    scored,
    accepted: scored.filter((s) => s.accepted).length,
    rejected: scored.filter((s) => !s.accepted).length,
    distribution,
  };

  console.log(JSON.stringify(report));

  return 0;
}

process.exit(main());
