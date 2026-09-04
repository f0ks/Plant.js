#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { mulberry32 } from "../rng.ts";
import { generateLevel } from "../generator.ts";
import { boardToRows } from "../board.ts";
import { serializeXSB } from "../xsb.ts";
import { pushEvents, boxLines, countTouching, score, isAccepted } from "../metrics.ts";
import { hasFreezeDeadlock } from "../deadlock/freezeDeadlock.ts";

interface Args {
  count: number;
  seed: number;
  boxCount: number;
  blockCols: number;
  blockRows: number;
  out?: string;
  maxAttempts: number;
  timeoutMs: number;
}

function parseArgs(argv: string[]): Args {
  const command = argv[0];
  if (command !== "batch") {
    throw new Error(`gen.ts: unknown command ${JSON.stringify(command)} (expected "batch")`);
  }

  let count = 10;
  let seed = 1;
  let boxCount = 3;
  let blockCols = 2;
  let blockRows = 2;
  let out: string | undefined;
  let maxAttempts = 0;
  let timeoutMs = 2000;

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--count") count = Number(argv[++i]);
    else if (arg === "--seed") seed = Number(argv[++i]);
    else if (arg === "--box-count") boxCount = Number(argv[++i]);
    else if (arg === "--block-cols") blockCols = Number(argv[++i]);
    else if (arg === "--block-rows") blockRows = Number(argv[++i]);
    else if (arg === "--out") out = argv[++i];
    else if (arg === "--max-attempts") maxAttempts = Number(argv[++i]);
    else if (arg === "--timeout") timeoutMs = Number(argv[++i]);
    else throw new Error(`gen.ts: unknown argument ${JSON.stringify(arg)}`);
  }

  return { count, seed, boxCount, blockCols, blockRows, out, maxAttempts: maxAttempts || count * 20, timeoutMs };
}

interface JSONLLevel {
  seed: number;
  attempt: number;
  xsb: string;
  distance: number;
  pushes: number;
  lines: number;
  boxes: number;
  siblingLevels: number;
  score: number;
  accepted: boolean;
}

function main(): number {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.log(JSON.stringify({ error: (err as Error).message }));
    return 3;
  }

  const rng = mulberry32(args.seed);
  const levels: JSONLLevel[] = [];
  let attempts = 0;

  while (levels.length < args.count && attempts < args.maxAttempts) {
    attempts++;
    const result = generateLevel(rng, {
      blockCols: args.blockCols,
      blockRows: args.blockRows,
      boxCount: args.boxCount,
      farthestState: { timeoutMs: args.timeoutMs },
    });
    if (result === null) continue;

    const events = pushEvents(result.board, result.state, result.solution);
    const s = score({
      pushes: result.distance,
      lines: boxLines(events),
      boxes: result.state.boxes.length,
      siblingLevels: result.siblingLevels,
      trapped: hasFreezeDeadlock(result.board, result.state.boxes),
      touching: countTouching(result.board, result.state),
      random: 0,
    });

    levels.push({
      seed: args.seed,
      attempt: attempts,
      xsb: serializeXSB({
        comments: [`; generated seed=${args.seed} attempt=${attempts}`],
        rows: boardToRows(result.board, result.state),
      }),
      distance: result.distance,
      pushes: result.distance,
      lines: boxLines(events),
      boxes: result.state.boxes.length,
      siblingLevels: result.siblingLevels,
      score: s,
      accepted: isAccepted(s),
    });
  }

  const jsonl = levels.map((l) => JSON.stringify(l)).join("\n") + (levels.length > 0 ? "\n" : "");
  if (args.out) {
    try {
      writeFileSync(args.out, jsonl);
    } catch (err) {
      // Same clean `{"error": ...}` / exit 3 shape parseArgs failures use,
      // rather than a raw stack trace, for e.g. a missing parent directory.
      console.log(JSON.stringify({ error: `cannot write ${args.out}: ${(err as Error).message}` }));
      return 3;
    }
  } else {
    process.stdout.write(jsonl);
  }

  console.error(JSON.stringify({ requested: args.count, generated: levels.length, attempts }));

  return levels.length === args.count ? 0 : 1;
}

process.exit(main());
