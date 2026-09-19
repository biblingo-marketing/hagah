# Hagah — prototype

A training plan for memorizing whole books of Scripture, built around the hours you
actually have. React + TypeScript + Vite, no backend, no accounts, state in the browser.

See `CLAUDE.md` for how to work in this repo and `docs/engine/protocol.md` for the
invariants every practice mechanic implements.

## Run it

```
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm test         # engine unit tests
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

Scripture quotations are from the Berean Standard Bible (BSB), which is in the public
domain and available at https://bereanbible.com
