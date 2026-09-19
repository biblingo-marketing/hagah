# Hagah — prototype

A training plan for memorizing whole books of Scripture, built around the hours you
actually have. React + TypeScript + Vite, no backend, no accounts, state in the browser.

See `CLAUDE.md` for how to work in this repo and `docs/engine/protocol.md` for the
invariants every practice mechanic implements. Invariant IDs are cited in comments
wherever they are implemented.

## Where this is

| Piece | State |
| --- | --- |
| Content — Romans 1:1–17 | 10 chunks, verified against the BSB text |
| Content — Romans 1:18–5:21 | **Not chunked yet**, waiting on Nick's review of 1:1–17 |
| Planner | Time blocks in, dated plan out |
| Encode | ACQ-1 → ACQ-6 state machine |
| Recall check | Spoken or typed, word-by-word diff |
| Run card | Read-only, no text, RUN-3 order, grading after |
| Commute | Anticipate-then-check, hands-free |
| Weekly check · integrity runs · random-entry drill | Live |

## Run it

```
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm test         # engine invariant tests
```

## Deploying

Pushes to `main` build and deploy automatically through Cloudflare Workers Builds:
build command `npm run build`, deploy command `npx wrangler deploy`. No API token lives
in this repository and none is needed — Cloudflare holds its own.

`wrangler.jsonc` describes an assets-only Worker named `hagah` serving `./dist`. That name
must match the Worker in the Cloudflare dashboard.

To deploy by hand instead (needs `wrangler login` once):

```
npm run deploy
```

## Content

`src/content/romans.json` is hand-editable. It is generated and, more importantly,
**verified** by `tools/build_chunks.py`, which asserts that every chunk's lines
reassemble into the official Berean Standard Bible text exactly and that the chunks
tile the passage with no gap or overlap. Edit the chunk table in that script, re-run it,
and the JSON is rewritten:

```
python3 tools/build_chunks.py
```

Editing `romans.json` directly is fine too — the script is the safety net, not a gate.
Boundaries are Nick's call and become immutable once practiced against (CHK-1).

Each chunk carries:

- `lines` — the meaningful units (CHK-5). These are also the fixed visual layout that
  must not reflow between sessions (CHK-4), and what ACQ-5's middle weighting operates on.
- `cue` — the opening clause, which is the retrieval cue (CHK-3).
- `landmark` — the structural address (CHK-2, CHK-6).
- `seamNote` — one line on why this chunk follows the previous one.
- `speechAct` — one line of meaning, shown only after a retrieval attempt (ACQ-6).

Seam cards are derived, one per boundary, and are not stored (SCH-2).

## Protocol constants

Every named value from `docs/engine/protocol.md` lives in `src/engine/params.ts` and
nowhere else. Nothing is inlined at a call site.

## Known limitations of the browser placeholders

- **iOS suspends speech synthesis when the screen locks or the browser backgrounds.**
  Commute mode needs the screen awake for now. Real recorded audio in an
  `<audio>` element fixes this; swapping it in means replacing `src/audio/voice.ts`.
- **Speech recognition is unreliable on iOS Safari.** Every flow it appears in has a
  typed path that always works (DIFF-4), so this degrades rather than blocks.
- Greek scoring mechanics are in place (DIFF-2 handles diacritics and final sigma) but
  there is no Greek content yet, and Greek scoring is labelled experimental (SAFE-4).

Scripture quotations are from the Berean Standard Bible (BSB), which is in the public
domain and available at https://bereanbible.com
