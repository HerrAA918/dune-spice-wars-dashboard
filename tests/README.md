# Tests

Headless-browser regression checks for the compendium's interactive tools. They load
`compendium.html` from disk with Playwright (Chromium) and assert behavior — no server,
no build step.

## Requirements

[Node.js](https://nodejs.org/) and [Playwright](https://playwright.dev/). If you don't
have Playwright on your `NODE_PATH`, install it once:

```bash
npm install playwright
npx playwright install chromium
```

(The scripts also fall back to a Playwright install under `src_scripts/node_modules` if
one is present, so on a machine already set up for the `src_scripts` tooling they run
as-is.)

## Running

From the repository root:

```bash
node tests/verify-techtree.js   # tech-tree Research Calculator data integrity
node tests/verify-vernius.js    # Vernius "Patent & Obfuscate" calculator
```

Each prints a report and exits `0` on success, non-zero on failure (CI-friendly).

## What they cover

- **`verify-techtree.js`** — walks the live `DEVELOPMENTS` data and `techNodeMap`:
  no dangling `requires`, no orphaned/unrendered techs, the live `getRequiredPath`
  closure matches an independent recomputation, every chain reaches a tier-1 root,
  and each tech's `tier` equals its chain depth (so `getBaseCost(tier)` is correct).
  This is what caught the corrupted Economic chain (tiers 8/9/10 + a circular
  `Modular Parts ⇄ CHOAM Integration` dependency).
- **`verify-vernius.js`** — the Patent (≥5,000 Hegemony) / Obfuscate (≥10,000)
  milestone logic, the days-to-milestone ETA, the 1,000-Solari-per-patent cost, and
  that the panel is shown only on the Vernius tech-tree tab.
