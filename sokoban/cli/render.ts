#!/usr/bin/env node
import { readFileSync } from "node:fs";

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
    if (arg === "--top") top = Number(argv[++i]);
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
    console.log((err as Error).message);
    return 3;
  }

  if (!args.file) {
    console.log("usage: render.ts <levels.jsonl> [--top N] [--accepted-only]");
    return 3;
  }

  let text: string;
  try {
    text = readFileSync(args.file, "utf8");
  } catch (err) {
    console.log(`cannot read file: ${(err as Error).message}`);
    return 3;
  }

  const levels: JSONLLevel[] = text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));

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
