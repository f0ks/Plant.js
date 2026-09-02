#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseXSBFile } from "../xsb.ts";
import { buildBoard } from "../board.ts";
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
    if (arg === "--json") continue; // output is always JSON; accepted for compatibility
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

function main(): number {
  const { file, timeoutMs } = parseArgs(process.argv.slice(2));

  if (!file) {
    return emitError("usage: solve.ts <file.xsb> [--json] [--timeout <ms>]");
  }

  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (err) {
    return emitError(`cannot read file: ${(err as Error).message}`);
  }

  let rows: string[];
  try {
    rows = parseXSBFile(text).levels[0].rows;
  } catch (err) {
    return emitError(`parse error: ${(err as Error).message}`);
  }

  let board;
  let state;
  try {
    ({ board, state } = buildBoard(rows));
  } catch (err) {
    return emitError(`board error: ${(err as Error).message}`);
  }

  const result = solve(board, state, { timeoutMs });

  console.log(
    JSON.stringify({
      solvable: result.solvable,
      push_optimal: result.pushOptimal,
      moves: result.moves,
      pushes: result.pushes,
      solution: result.solution,
      nodes: result.nodes,
      time_ms: Math.round(result.timeMs),
      deadlock_reason: result.deadlockReason,
    }),
  );

  if (result.deadlockReason === "timeout") return 2;
  if (!result.solvable) return 1;
  return 0;
}

process.exit(main());
