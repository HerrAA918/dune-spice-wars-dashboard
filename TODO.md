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

- [ ] Deep-dive the tech trees — the calculator STILL doesn't look right (user-reported,
      2026-06-23). **Symptom:** the unlock *time* for an initial tech is off. **Root cause found:**
      the compendium fabricates tech cost with a flat per-tier table —
      `getBaseCost(tier)` returns 100/200/300/400 (default 100) — which is NOT the game's model. The
      game DB stores `Development_BaseCost = 10`, `Development_ScalePerStep = 1.036`,
      `Development_StepsPerTier = [2,3,4,5]`, and a handful of developments carry an explicit `costs`
      value (e.g. **Intelligence Network**, a tier-0 *initial* tech, = **20**; Lay of the Land = 80;
      Valuable Trinkets = 40). So a real initial-tech cost ≈ 20 but the compendium shows 100 → the
      `cost ÷ knowledge-per-day` time in `updateCalcTime()` is ~5× too high.
      **Cost magnitude fixed** (this PR): `getBaseCost` now returns the CDB formula's per-tier base
      (10/11/12/14) and a `TECH_COST_OVERRIDES` map applies the explicit DB costs (Intelligence
      Network 20, Lay of the Land 80, Valuable Trinkets 40, Wonders of the Desert 80); the calc time
      is now grounded in real data. **Caveat to validate:** non-explicit costs use the formula
      default (~10–14, a deliberately flat curve) and the static view can't show the runtime
      per-step scaling — sanity-check a few nodes against in-game tooltips and recalibrate if needed.
      Still open — finish the broader audit: (1) `requires` chains + cumulative cost totals vs an
      independent CDB recompute; (2) faction replacements — does each faction's *effective* tree
      compute the right unlocks/costs?; (3) the Vernius Patent/Obfuscate calc; (4) the 2 known-missing
      generic techs (CHOAM Support, Siege Incentives) + any other missing/mis-tiered nodes.

- [x] Verify the sietch information — verified against the game database (data.cdb,
      extracted from the install). Confirmed: 4 alliance specialty types and the
      100-relationship requirement (`Sietch_AtbRelationThreshold = 100`). Fixed:
      (1) Water cost was 5 → corrected to 4 (`Sietch_Trade_WaterCost = 4`);
      (2) removed the "Fremen build Main Base buildings at 10k Hegemony" line from the
      Military type — it is a general Fremen Hegemony bonus (`AlliedSietch_BuildLocalSietch`),
      already covered in the faction overview, not a Military-alliance effect;
      (3) removed the editorial commentary lines (e.g. "Massive late-game economic boost").
      The exact per-type bonus magnitudes are not stored as plain values in the CDB
      (computed at runtime); those lines remain community-sourced.

- [x] Fill in missing faction-specific tech effects — filled 17 of the 18 empty
      replacements from the game database (data.cdb), populating
      `replacements[faction].effects` with the real in-game effect text. The last one,
      Fremen "Fremen Solidarity", has no player-facing effect text in the data and was
      left empty. Also corrected filled replacement names (Artistic Asperations →
      Aspirations, Imperial Eyes → Emperor Eyes).

- [ ] Add a mouse-over tooltip explaining "Incomplete / Abandoned" — on the
      Incomplete outcome badge (and the "Abandoned / Incomplete" victory condition)
      in the match table, clarify that these are games that ended with no recorded
      result (quit or unfinished), so they are not counted as wins or losses in the
      win rate.

- [ ] Prettify unrecognized end-reason tags (e.g. "ConcededSupremacy") — concede-type
      endings show the raw tag with no spacing in the Victory Condition column. Handle
      concede endings (and/or split unknown camelCase tags) in `getVictoryCondition`
      and the detail-modal reason text, e.g. render "Conceded (Supremacy)".

- [x] Confirm unit data is on the latest patch — refreshed all 55 matched units
      against the game database (data.cdb): Health/Power/Armor, Supply, Range, and the
      cost model. The old schema was wrong (Water is no longer a recruit cost,
      CommandPoint is upkeep not recruit, Manpower is recruit not upkeep); now uses the
      current recruit (Manpower/Solari/Guild Favor/Spice/Scraps) and upkeep
      (Solari/Command Point/Fuel Cell) model. Renamed units to current in-game names and
      replaced fabricated Vernius entries with real data. "Veteran Militia" has no
      current game unit and is flagged (left unchanged). Ability/trait prose was kept;
      re-deriving it needs the trait-attribute layer and is left for a later pass.

- [x] Verify the tech tree includes the 1-slot main-base bonuses — verified against the
      game database. ~17 developments unlock a Main Base building (`Unlock_TBuilding`
      targeting a `Main_*` building, "[!Building_MB] in [$my(mainbase)]"). Added the two
      generic unlocks that were missing: Mechanization → Fusion Plant, Diplomatic
      Maneuvers → Landsraad Quarters. Faction-specific Main Base unlocks were filled as
      part of the faction-effects task above.

- [ ] Add the two generic techs missing from the tree — the game has 36 generic
      developments; the compendium has 34. "CHOAM Support" (Economic, tier 4) and
      "Siege Incentives" (Military, tier 4) are absent. Adding them touches tree layout
      (tier/requires/gridX/gridY), so it was deferred from the data-refresh pass.

- [ ] Re-derive unit ability/trait text from the CDB — the stat/cost refresh kept the
      existing curated ability prose. The authoritative text lives in the `trait` /
      `equipment` sheets behind the same templated-attribute layer as developments;
      resolve and refresh those lines for accuracy.

## Compendium expansion (from the game-DB gap audit — see docs/compendium-roadmap.md)

Add-content PRs (high value, medium effort):

- [x] Add a Victory Conditions section — added a "Victory Conditions" category with the 5
      win types (Domination, Hegemony 30,000 / race at 20,000, Political 30 days as Governor
      / 25 in Kanly, Economic 50% CHOAM / race at 40%, optional Assassination) plus the 3
      game modes (Skirmish / Kanly Duel / Conquest). All thresholds verified against the
      game database (Game_Victory_* constants, Game_Victory_GovernorDuration values).

- [x] Add the 7 Landsraad Charters (+ Water Subsidies, + "Imperium Summit"/"Land Sales"
      name fixes) — added a Charters section to the Landsraad & Politics view with all 6
      distinct charters (Consul is the Conquest-mode name for the Governorship), each with
      effect, eligibility (general + Fremen path / "not available to Fremen"), and
      first-election reward, all verified against the resolution sheet. Fixed the two
      stale names and added the Water Subsidies global resolution.

- [ ] (LOW PRIORITY) Conquest Campaign Bonuses — the audit's "63 Faction Bonuses" are NOT a
      pre-match draft and are NOT tied to advisors; they are single-player Conquest-campaign
      content (CON: `UI/conquest/` art, `CB_*` effect traits, `battlePickChance` /
      `onlyForConquestOwner` props). Standard-game faction customization is the councilors
      (already covered). If built: a clearly-labeled "Conquest Campaign Bonuses" section.

- [ ] Operations cleanup (deferred from the quick-win fix) — replace the 14 "Variable"
      faction-op costs with the tier-fixed values (VeryEasy 100 Intel / Easy 200 Intel +
      200 Solari / Medium 500 Intel + 500 Solari, verified in `mission`); confirm the
      Gear Sabotage ↔ Defense Breaches name swap from a tooltip; add ~9 missing spy ops +
      an Infiltration-fields table.

- [ ] Treaties cleanup (deferred) — add per-treaty costs + the hidden −10% Authority
      treaty upkeep, and fix the Non-Aggression Pact description (the open-borders / no-
      supply-drain effect belongs to the separate Land Agreement). Treaty numbers aren't
      cleanly in the CDB — confirm from in-game tooltips.

- [x] Special Regions & Region Specializations — reworked the old "Village Bonuses" page
      (which duplicated the Buildings section) into the **Regions** tab with two CDB-verified
      sections: **6 Region Specializations** (natural-resource nodes — Spice Field, Geothermal,
      Rare Elements, Minerals, Research Station, wind strength) and **15 Special Regions**
      (named landmarks that each grant a flat Hegemony income + a unique bonus). 7 effect-less
      named-terrain regions omitted. Hegemony per-day magnitude is intentionally *not* stamped
      as a number — `Region_HegemonyProd_Flat` is uniform across landmarks but its data-scale→
      per-day conversion isn't cleanly exposed; confirm the exact rate from an in-game tooltip.
      Still open: the **2,500-Hegemony build-in-main-base milestone** and a fuller Hegemony-source
      ledger (these are a separate Hegemony-mechanics writeup, not region data).

Larger builds (high value, plan separately — see roadmap):

- [x] Heroes section — added all 14 faction heroes (2/faction) to UNITS as a new `hero` type
      (filter pill + tag styling), each card showing stats + the signature trait's effects,
      verified against the CDB unit/trait sheets. Generic combat traits and faction leaders
      were omitted (placeholder text / cosmetic respectively).

- [x] Armory / Equipment — implemented as **interactive per-unit customization on the unit cards**
      (not a separate category). Verified against the game DB: each equippable unit has **2 gear
      slots** (Fremen Altar = 4), and **each slot is a binary choice between 2 options** — 36 units,
      148 options. Clicking an option recomputes a live stat panel (Health/Power/Armor/Range/Attack
      Speed) from the gear's decoded stat modifiers (green = up, red = down). The "157 equipment rows"
      breaks down as 112 equippable + 44 orphaned/cut (referenced by no unit) + 1 legacy `*_Old`; only
      the 112 are shown. Also added the 2 Vernius combat units missing from the compendium (Suboid
      Soldier, Railgun Drone). Fixed an `_MRatio` formatting bug (multiplier `1.3` → +30%, not +130%).
      ~34 conditional/aura options are flagged "?" (exact values pending in-game tooltip confirmation).

- [ ] Audit all icons/graphics across the dashboard and add relevant game art — the
      dashboard and compendium currently lean on external wiki image URLs (WIKI_IMAGES),
      emoji, and lucide icons. The game pak (`res.compressed.pak`) holds the real art:
      unit/leader portraits (`unit@images` smallPortrait/bigPortrait/symbol), development
      icons (`UI/developments/techIcons*.png`), building thumbnails (`building@visuals`),
      resource/UI icons (`UI/icons/*`), and faction crests. Review every place we show an
      icon/image, identify mismatches or low-quality/missing art, and source the matching
      sprite from the pak (each `gfx` entry is a {file, size, x, y} sprite-sheet cell —
      extract the cell, not the whole sheet). Decide how to host/bundle the art and mind
      that it's proprietary game art (same caution as not committing raw game data).
