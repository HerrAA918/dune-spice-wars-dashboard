# To-Do

- [x] Share/export results to someone else — "Share Link" button copies a
      self-contained URL (gzipped data in the `#` fragment); recipients see
      the same stats with no upload and no server involved.

- [x] Verify the tech tree calculator computes unlocks correctly — built a harness
      that drives the live compendium and checks every node (dangling requires,
      orphans, transitive-closure correctness vs. an independent recompute, tier→cost,
      cycles). The calculator logic is sound. Found & fixed corrupted data in 3
      Economic techs (Modular Parts / CHOAM Integration / Crew Training Program):
      tiers were 8/9/10 → corrected to 2/3/4 (cost had been silently defaulting to
      100), and a circular "Modular Parts ⇄ CHOAM Integration" dependency was removed.
      Chain confirmed against the wiki; re-verified fully clean (e.g. Crew Training
      Program path now totals 1000, was 400).

- [~] Verify the sietch information — structure verified: 4 alliance specialty types
      (Military / Militia / Economy / Manpower) and a 100-relationship requirement,
      both consistent with sources. Flagged for in-game confirmation (NOT yet fixed):
      (1) the "Fremen build Main Base buildings at 10k Hegemony" line sits only under
      Military but is a general Fremen mechanic; (2) several effect lines are editorial
      commentary, not game text; (3) the Water cost (5) and the exact per-type effects
      could not be confirmed — the canonical Fandom wiki blocks automated access and
      other sources lack the values, so verify against in-game tooltips.

- [ ] Fill in missing faction-specific tech effects — every faction has 11–14 unique
      tech replacements, but 18 of them carry only a name and an empty effects list
      (14 are Fremen, e.g. "Sky Gazing", "Desert Trekkers"; plus a few Ecaz/Corrino/
      Vernius). They render as a faction tech with a blank effect. Source the effect
      text (in-game tooltips) and populate `replacements[faction].effects` in the
      compendium's DEVELOPMENTS data.
