import { describe, it, expect } from "vitest";
import { parseXSBFile, serializeXSBFile } from "../xsb";

describe("parseXSBFile", () => {
  it("parses a single simple level into its raw rows with no comments", () => {
    const text = "#####\n#@$.#\n#####";
    const file = parseXSBFile(text);

    expect(file.levels).toHaveLength(1);
    expect(file.levels[0].rows).toEqual(["#####", "#@$.#", "#####"]);
    expect(file.levels[0].comments).toEqual([]);
  });

  it("attaches leading semicolon lines to the level as comments", () => {
    const text = "; Title: Simple\n; by Someone\n#####\n#@$.#\n#####";
    const file = parseXSBFile(text);

    expect(file.levels).toHaveLength(1);
    expect(file.levels[0].comments).toEqual([
      "; Title: Simple",
      "; by Someone",
    ]);
    expect(file.levels[0].rows).toEqual(["#####", "#@$.#", "#####"]);
  });

  it("splits a multi-level file on blank lines", () => {
    const text = ["#####", "#@$.#", "#####", "", "; Level 2", "######", "#@$$.#", "######"].join(
      "\n",
    );
    const file = parseXSBFile(text);

    expect(file.levels).toHaveLength(2);
    expect(file.levels[0].comments).toEqual([]);
    expect(file.levels[1].comments).toEqual(["; Level 2"]);
    expect(file.levels[1].rows).toEqual(["######", "#@$$.#", "######"]);
  });

  it("preserves ragged row lengths exactly (no padding on parse)", () => {
    const text = ["#####", "#.@ #", "#  $#", "#####"].join("\n");
    const file = parseXSBFile(text);

    expect(file.levels[0].rows).toEqual(["#####", "#.@ #", "#  $#", "#####"]);
  });

  it("throws on an empty file", () => {
    expect(() => parseXSBFile("")).toThrow();
  });

  it("treats a leading non-semicolon metadata line (no grid chars) as a comment", () => {
    // Real Skinner/Microban files use a bare quoted title line, e.g. 'Duh!',
    // with no leading semicolon.
    const text = "'Duh!'\n#####\n#@$.#\n#####";
    const file = parseXSBFile(text);

    expect(file.levels).toHaveLength(1);
    expect(file.levels[0].comments).toEqual(["'Duh!'"]);
    expect(file.levels[0].rows).toEqual(["#####", "#@$.#", "#####"]);
  });

  it("merges a blank-line-separated title block into the following grid block", () => {
    // Real Microban files put a blank line between the "; N" title and the
    // grid itself: "; 44\n\n#####\n#@$.#\n#####". That blank line must not
    // be treated as a level separator when nothing but metadata precedes it.
    const text = "; 44\n\n#####\n#@$.#\n#####";
    const file = parseXSBFile(text);

    expect(file.levels).toHaveLength(1);
    expect(file.levels[0].comments).toEqual(["; 44"]);
    expect(file.levels[0].rows).toEqual(["#####", "#@$.#", "#####"]);
  });

  it("merges a blank-line-separated title with both a number and quoted description", () => {
    const text = "; 44\n'Duh!'\n\n#####\n#@$.#\n#####";
    const file = parseXSBFile(text);

    expect(file.levels).toHaveLength(1);
    expect(file.levels[0].comments).toEqual(["; 44", "'Duh!'"]);
    expect(file.levels[0].rows).toEqual(["#####", "#@$.#", "#####"]);
  });

  it("parses consecutive Microban-style levels with blank-line-separated titles", () => {
    const text = [
      "; 1",
      "",
      "#####",
      "#@$.#",
      "#####",
      "",
      "; 2",
      "'Second'",
      "",
      "######",
      "#@$$.#",
      "######",
    ].join("\n");
    const file = parseXSBFile(text);

    expect(file.levels).toHaveLength(2);
    expect(file.levels[0].comments).toEqual(["; 1"]);
    expect(file.levels[0].rows).toEqual(["#####", "#@$.#", "#####"]);
    expect(file.levels[1].comments).toEqual(["; 2", "'Second'"]);
    expect(file.levels[1].rows).toEqual(["######", "#@$$.#", "######"]);
  });

  it("throws when a metadata-only block has no following grid block", () => {
    expect(() => parseXSBFile("; 44\n'Duh!'")).toThrow();
  });
});

describe("serializeXSBFile", () => {
  it("round-trips a single level with no comments exactly", () => {
    const text = "#####\n#@$.#\n#####";
    const file = parseXSBFile(text);
    expect(serializeXSBFile(file)).toBe(text);
  });

  it("round-trips a level with title/comment lines exactly", () => {
    const text = "; Title: Simple\n; by Someone\n#####\n#@$.#\n#####";
    const file = parseXSBFile(text);
    expect(serializeXSBFile(file)).toBe(text);
  });

  it("round-trips a multi-level file exactly", () => {
    const text = [
      "; Level 1",
      "#####",
      "#@$.#",
      "#####",
      "",
      "; Level 2",
      "######",
      "#@$$.#",
      "######",
    ].join("\n");
    const file = parseXSBFile(text);
    expect(serializeXSBFile(file)).toBe(text);
  });

  it("round-trips ragged row lengths exactly", () => {
    const text = ["#####", "#.@ #", "#  $#", "#####"].join("\n");
    const file = parseXSBFile(text);
    expect(serializeXSBFile(file)).toBe(text);
  });
});

describe("parseXSBFile / serializeXSBFile round-trip property", () => {
  // Lightweight hand-rolled property test (no new test dependency): generate
  // many random small synthetic XSB files and assert parse->serialize is
  // the identity function on well-formed input.
  function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const CHARS = ["#", "@", "+", "$", "*", ".", " ", "-", "_"];

  function randomLevelBlock(rand: () => number): string[] {
    const width = 3 + Math.floor(rand() * 8);
    const height = 3 + Math.floor(rand() * 8);
    const rows: string[] = [];
    for (let y = 0; y < height; y++) {
      let row = "";
      const rowLen = 1 + Math.floor(rand() * width);
      for (let x = 0; x < rowLen; x++) {
        row += CHARS[Math.floor(rand() * CHARS.length)];
      }
      rows.push(row);
    }
    return rows;
  }

  function randomComments(rand: () => number): string[] {
    const count = Math.floor(rand() * 3);
    const comments: string[] = [];
    for (let i = 0; i < count; i++) {
      comments.push(`; comment ${Math.floor(rand() * 1000)}`);
    }
    return comments;
  }

  it("round-trips 200 random synthetic multi-level files", () => {
    const rand = mulberry32(12345);

    for (let trial = 0; trial < 200; trial++) {
      const levelCount = 1 + Math.floor(rand() * 4);
      const blocks: string[] = [];
      for (let i = 0; i < levelCount; i++) {
        const comments = randomComments(rand);
        const rows = randomLevelBlock(rand);
        blocks.push([...comments, ...rows].join("\n"));
      }
      const text = blocks.join("\n\n");

      const file = parseXSBFile(text);
      expect(serializeXSBFile(file)).toBe(text);
    }
  });
});
