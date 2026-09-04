#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { emitError, parseJSONLRecords, parsePositiveInt } from "./_shared.ts";

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

interface Args {
  file?: string;
  top: number;
  acceptedOnly: boolean;
}

function parseArgs(argv: string[]): Args {
  let file: string | undefined;
  let top = 10;
  let acceptedOnly = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    // `--top nonsense` used to slip through as NaN and silently print
    // nothing at exit 0 — parsePositiveInt rejects it instead.
    if (arg === "--top") top = parsePositiveInt("render.ts", "--top", argv[++i]);
    else if (arg === "--accepted-only") acceptedOnly = true;
    else if (!arg.startsWith("--") && file === undefined) file = arg;
    else throw new Error(`render.ts: unknown argument ${JSON.stringify(arg)}`);
  }

  return { file, top, acceptedOnly };
}

function main(): number {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    return emitError((err as Error).message);
  }

  if (!args.file) {
    return emitError("usage: render.ts <levels.jsonl> [--top N] [--accepted-only]");
  }

  let text: string;
  try {
    text = readFileSync(args.file, "utf8");
  } catch (err) {
    return emitError(`cannot read file: ${(err as Error).message}`);
  }

  let levels: JSONLLevel[];
  try {
    // A malformed line used to throw out of main() as an uncaught exception.
    levels = parseJSONLRecords(text) as unknown as JSONLLevel[];
  } catch (err) {
    return emitError(`parse error: ${(err as Error).message}`);
  }

  const filtered = args.acceptedOnly ? levels.filter((l) => l.accepted) : levels;
  const sorted = [...filtered].sort((a, b) => b.score - a.score).slice(0, args.top);

  for (const [i, level] of sorted.entries()) {
    console.log(
      `; rank ${i + 1}  score ${Math.round(level.score)}  pushes ${level.pushes}  lines ${level.lines}  boxes ${level.boxes}  seed ${level.seed} attempt ${level.attempt}`,
    );
    console.log(level.xsb);
    console.log("");
  }

  return 0;
}

process.exit(main());
