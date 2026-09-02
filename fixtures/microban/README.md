# Microban

`m1.txt` is David W. Skinner's **Microban** set: 155 levels, released April
2000. It's a good set for beginners and children — most puzzles are small
and each illustrates a particular concept, which is exactly why it's used
here as Phase 3's validation gate for the solver and structural checks.

Source: fetched from the mirror of Skinner's original page at
<https://www.onlinespiele-sammlung.de/sokoban/sokobangames/skinner/m1.txt>,
verbatim (no edits). Skinner's page states these sets "may be freely
distributed provided they remain properly credited" — this file is included
under that term, credited to David W. Skinner.

The file is plain XSB text (see `docs/level-generation.md` §2), 155
blank-line-separated levels each preceded by a `; N` title line and, for some
levels, an additional bare quoted description line (e.g. `'Duh!'`) — both
forms are parsed as leading comment/metadata lines by `sokoban/xsb.ts`'s
`parseXSBFile`.
