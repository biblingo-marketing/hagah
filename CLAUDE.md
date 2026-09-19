# Hagah — prototype

A training plan for memorizing whole books of Scripture, built around the hours the user actually has.

This repository is a **high-fidelity prototype**, not the production app. Its only job is to let Nick test the method on himself — on his morning encode, his commute, and his run — and find out whether it works before anything bigger is built.

## Who you are working with

Nick is the founder of Biblingo and is **not a developer**. He will not read code and cannot judge it. So:

- Explain what you are doing in plain English as you go.
- Do not ask him to make technical choices. Decide, act, and tell him what you chose and why.
- Do ask him about Scripture content, chunk boundaries, wording, and how something felt to use. That is his expertise and yours is no substitute.
- Commit and push after each working piece. He tests through a deployed URL on his phone, so unpushed work is invisible to him — and this runs in an ephemeral cloud container, so unpushed work is also unprotected.

## Read before writing anything

1. `docs/engine/protocol.md` — how every practice mechanic must behave, as numbered invariants with parameters. **Follow it exactly.** Where it names a parameter, use that value. Cite the invariant ID in a comment wherever you implement one (`// ACQ-3: no feedback after a clean attempt`).
2. `docs/decisions.md` — locked product decisions. Read the note at the top about prototype platform versus launch platform.
3. `docs/product.md` — who this is for, the three block types, the non-goals, the UX principles.
4. `docs/research/` — an index of the research behind the protocol, and the evidence review summary.

The full research (evidence review, phase 4–6 memos, audience and competitor reports) lives in Nick's Claude project, not in this repo. If you need reasoning the protocol and summary don't give, **ask him rather than guessing**.

## Stack

React + TypeScript + Vite, Tailwind for styling, deployed automatically to Cloudflare Pages on every push to `main`.

No backend, no database, no accounts, no sign-in. State persists in the browser. Nick is the only user. No API keys anywhere — the prototype must have no secrets, and `.env` stays in `.gitignore` regardless.

Audio uses the browser's built-in speech synthesis for now, and speech recognition via the Web Speech API. Both are placeholders good enough to test timing and feel.

## Content

Romans, Berean Standard Bible (public domain; include its attribution string in the app). Chapters 1–5 only for now. Chunked at discourse boundaries per CHK-1 and CHK-5, stored as a JSON file that Nick can edit by hand.

**Chunk boundaries are Nick's call, not yours.** Propose them, show your work, and let him correct. Once he has practiced against a boundary it is immutable (CHK-1).

## Guardrails

1. **Speech recognition never gates progress.** Every flow it appears in has a typed or self-graded path (DIFF-4).
2. **Commute mode requires no screen interaction** (SAFE-1). Large targets, audio-first.
3. **No copy anywhere claims general memory improvement** (SAFE-2). The evidence says there is no far transfer.
4. **No streaks, badges, leaderboards, or celebration animations.** This is a training tool, not a habit game.
5. **Missed days re-plan silently** (PLAN-3). No debt counter, no scolding.
6. `docs/engine/protocol.md` and `docs/decisions.md` are read-only. If the work seems to require changing one, stop and ask.
7. Named constants from the protocol live in one file, not scattered inline.

## Design

Dark by default, high contrast, large type, one action per screen, no scrolling during encode. Readable at arm's length in a moving car. A serif with real Greek support for Scripture text; a separate face for interface chrome.

## Build order

Content → planner → encode → recall check → run card → commute → scheduling. Push after each and tell Nick when it is live so he can test it.
