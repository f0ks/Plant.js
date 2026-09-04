#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { selectDemoLevels, xsbToDemoGrid } from "../demoExport.ts";
import type { DemoSourceLevel } from "../demoExport.ts";
import { emitError, parseJSONLRecords, parsePositiveInt } from "./_shared.ts";

interface Args {
  file?: string;
  count: number;
  out?: string;
}

function parseArgs(argv: string[]): Args {
  let file: string | undefined;
  let count = 5;
  let out: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--count") count = parsePositiveInt("export-demo.ts", "--count", argv[++i]);
    else if (arg === "--out") {
      // `--out` as the last token used to silently fall back to stdout —
      // require an operand the same way --count does.
      const next = argv[++i];
      if (next === undefined) {
        throw new Error("export-demo.ts: --out expects a file path");
      }
      out = next;
    } else if (!arg.startsWith("--") && file === undefined) file = arg;
    else throw new Error(`export-demo.ts: unknown argument ${JSON.stringify(arg)}`);
  }

  return { file, count, out };
}

function formatGrid(grid: string[][]): string {
  const rows = grid.map((row) => `    [${row.map((c) => JSON.stringify(c)).join(", ")}],`);
  return `  [\n${rows.join("\n")}\n  ],`;
}

function formatLevelsFile(levels: DemoSourceLevel[]): string {
  const header = [
    "// @ player",
    "// G grass",
    "// D block (wall)",
    "// B box",
    "// * spot (target)",
    "// $ box on spot",
    "// % player on spot",
    "// - empty floor",
    "",
    "export const levels: string[][][] = [",
  ].join("\n");

  const body = levels.map((l) => formatGrid(xsbToDemoGrid(l.xsb))).join("\n");

  return `${header}\n${body}\n];\n`;
}

function main(): number {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    return emitError((err as Error).message);
  }

  if (!args.file) {
    return emitError("usage: export-demo.ts <levels.jsonl> [--count N] [--out path]");
  }

  let text: string;
  try {
    text = readFileSync(args.file, "utf8");
  } catch (err) {
    return emitError(`cannot read file: ${(err as Error).message}`);
  }

  let levels: DemoSourceLevel[];
  try {
    levels = parseJSONLRecords(text) as unknown as DemoSourceLevel[];
  } catch (err) {
    return emitError(`parse error: ${(err as Error).message}`);
  }

  const selected = selectDemoLevels(levels, args.count);
  if (selected.length < args.count) {
    return emitError(
      `not enough accepted levels: found ${selected.length}, need ${args.count}`,
    );
  }

  let output: string;
  try {
    output = formatLevelsFile(selected);
  } catch (err) {
    return emitError(`cannot build demo grid: ${(err as Error).message}`);
  }

  if (args.out) {
    try {
      writeFileSync(args.out, output);
    } catch (err) {
      return emitError(`cannot write ${args.out}: ${(err as Error).message}`);
    }
  } else {
    process.stdout.write(output);
  }

  return 0;
}

process.exit(main());
