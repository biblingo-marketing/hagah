# Decisions

**Note on platform (added for the prototype).** This repository is the **web prototype**: React + Vite, deployed to Cloudflare Pages, tested on Nick's phone through a URL. The Flutter/native decision below stands for **launch**, not for this build. Native is what the thesis eventually needs — CarPlay, a watch run card, Siri, true background audio — but none of that is needed to find out whether the method works. Do not build Flutter here.

Everything else in this file applies to both.

Locked. Read-only. Changing anything here is Nick's call, made deliberately and not in the middle of a build task.

| Decision | Call |
| --- | --- |
| Name | **Hagah**. Verified once (trademark, domain, handles), then never revisited. Fallback if a live US mark blocks it: Melete. |
| Ownership | Standalone app, bylined "by Biblingo". |
| Model | **Free, no upsell.** Success is measured in Biblingo trials, not Hagah revenue. Free is also a proven review virtue in this category. |
| Platform | **Flutter** for launch. iOS and Android first-class; Flutter web secondary, no parity QA. Marketing site is static HTML on Cloudflare Pages. |
| Distribution | TestFlight and Play internal for alpha. Store approval in hand before public launch sends. |
| Text | Whole Bible eventually: **BSB** (public domain since 2023-04-30) and **SBLGNT** (free license, attribution required). No licensed translation until there is a retention number. |
| Front door | Curated programs, not a passage picker. Default program **Philippians**; also Ephesians, James, Romans 5–8, Matthew 5–7. Any passage reachable by search, labeled auto-chunked where unverified. |
| Chunking | LLM discourse chunking, English and Greek aligned, seam note and Greek particle cue per chunk. Hand-verified for the curated programs. Boundaries immutable once used. |
| Scheduling | FSRS live. Sequence-aware model in shadow only, until 30 days of calibration data say otherwise. |
| Positioning | Lead with the job: a training plan for memorizing whole books around the hours you actually have. The hagah etymology is an essay and About-page topic, never the store subtitle or SEO title — a live "Hagah" meditation app makes that framing actively harmful. |
| Lead claims | 1. Schedule generator mapped to your real day. 2. Hands-free anticipate-then-check audio. 3. Seam drills. Speech scoring ships but is not a lead claim. |
| What we are not | A verse-a-day game. A Bible-study or AI suite. A devotional or meditation app. |

## Why these are fixed

Code is nearly free; the binding constraints are Nick's verification bandwidth, data only users can produce, third-party gates (licensing, app review), and hypothesis clarity. Scope expands where the only gate was code. It holds where the gate is data or a third party.
