# Compendium content roadmap

Planning doc for expanding `compendium.html` with content found in the game database
(`data.cdb`, extracted from the install — see the project memory on game-data extraction).
Derived from the multi-agent gap audit. Sequenced from quick text fixes → new sections →
larger systems. Each item notes its **data source**, **schema**, **UI placement**, and **effort**.

> Source-of-truth rule: pull values from the game DB. Where a value isn't stored as readable
> text in `data.cdb` (the engine generates it), confirm from an in-game tooltip rather than guess.

---

## Status

- ✅ **Done** (PR #10): unit stats/cost-model refresh, tech-tree faction effects + main-base
  unlocks, sietch Water cost, and the accuracy-bug fixes (fabricated Vernius buildings, wrong
  Smugglers councilor, stale hegemony/councilor effects, removed Treachery op).
- ⏳ **This roadmap**: the add-content PRs and the two larger builds below.

---

## Add-content PRs (high value, medium effort)

### PR A — Victory Conditions  *(do first; currently 0% covered)*
- **Why:** the single most-asked "how do I win" facts; verified absent from the compendium.
- **Data:** `victoryConds` (12 rows) + `constant` thresholds. Confirmed values:
  - **Domination** — eliminate all opponents.
  - **Hegemony** — reach **30,000** Hegemony (the race UI surfaces at 20,000).
  - **Political** — hold the **Dune Governorship** charter for **30 days** (25 in Kanly).
  - **Economic** — control **50% of CHOAM shares** (race surfaces at 40%).
  - Plus the **Assassinations** win toggle (assassinate every rival leader).
- **Schema:** small `VICTORY_CONDITIONS = [{name, type, threshold, detail}]`.
- **UI:** a "How to Win" panel — either a new card in **Factions Overview** or a small new
  **Victory Conditions** category. Static (no search needed).
- **Effort:** Small.

### PR B — Landsraad Charters  *(extends the resolutions data)*
- **Why:** the compendium covers 38/46 resolutions but **0 of 7 Charters** — high-value strategic info.
- **Data:** `resolution` sheet (type=Charter, 7 rows) + their trait effects + `eligibilityConds`
  + `firstElectionEffects`. The 7: Speaker of the Council, Judge of the Council, Dune Governorship,
  [Territory] Consul, Council Representative, Water Seller's Union, Eye of the Council. Include
  eligibility thresholds (e.g. Speaker = 250 Standing + 600 Influence spent on votes; Governorship =
  450 Standing + own 1 Charter) and first-election rewards (Governorship pays 10,000 Solari).
- **Schema:** add a `CHARTERS` array (or extend the existing resolution structures with a `type` field
  so Charters/Economic/Military/Statecraft are distinguishable). Also add **Water Subsidies** (missing
  Military resolution) and fix names "Imperium Summit"/"Land Sales".
- **UI:** new sub-section in **Landsraad & Politics**.
- **Effort:** Medium.

### PR C — ~~Pre-match Faction Bonuses~~ → Conquest Campaign Bonuses  *(DE-PRIORITIZED — niche)*
- **Correction:** the gap audit mislabeled these as a draftable pre-match system. They are
  **single-player Conquest-campaign content**, NOT a skirmish draft and NOT tied to advisors.
  Verified: all 126 entries (`bonus` type 0 + type 1) use `UI/conquest/` art, their effect
  traits are `CB_*` (Conquest Bonus), and props are Conquest-specific (`battlePickChance`,
  `onlyForConquestOwner`). `faction.conquest` defines a campaign map (pawns, intro speeches);
  the `battle` sheet holds the scripted scenarios. No structural link to councilors.
- **Implication:** standard-game faction customization is the **councilors** (already covered in
  Factions Overview). These bonuses only matter to Conquest-campaign players → low priority.
- **If built later:** a clearly-labeled **"Conquest Campaign Bonuses"** section — 9 bonuses +
  mission rewards per faction, beginner-friendly ones tagged. Source: `bonus` sheet (type 0/1).
- **Effort:** Medium. **Priority:** Low (single-player-campaign only).

### Also-medium (batch into A–C or a follow-up)
- **Operations cleanup** (deferred from the quick-win): replace the 14 "Variable" faction-op costs with
  tier-fixed values — **Very Easy 100 Intel / Easy 200 Intel + 200 Solari / Medium 500 Intel + 500 Solari**
  (verified in the `mission` sheet); confirm the Gear Sabotage ↔ Defense Breaches display-name swap from
  an in-game tooltip; add the ~9 missing spy ops + an Infiltration-fields table.
- **Treaties** (deferred): add the per-treaty costs + the hidden −10% Authority treaty upkeep, and fix the
  Non-Aggression Pact description (the "open borders / no supply drain" effect belongs to the separate
  *Land Agreement*). Treaty *numbers* aren't cleanly in `data.cdb` — confirm from tooltips.
- **Special Regions** (16), **Region quirks**, **Hegemony-source ledger** (how to earn Hegemony + the
  2,500 build-in-main-base milestone) — all `partial`/`missing`, medium effort.

---

## Larger builds (high value, plan separately)

### Build 1 — Heroes section  ✅ DONE — see detailed plan below (shipped as a `hero` unit type)
### Build 2 — Armory / Equipment  ✅ DONE — shipped as interactive per-unit customization
- **Shipped:** rather than a separate Armory catalog, gear was added directly to the **unit cards** as an
  interactive customization panel (matches the in-game loadout screen). Each equippable unit has **2 gear
  slots** (Fremen **Altar** = 4), and **each slot is a binary choice between 2 options**. Clicking an
  option recomputes a **live stat panel** (Health/Power/Armor/Range/Attack Speed) from the gear's decoded
  stat modifiers — 36 units, 148 options. Also added the 2 missing Vernius units (Suboid Soldier, Railgun
  Drone) so all 36 loadouts have a home.
- **Data reality (corrected):** `equipment` has 157 rows = **112 equippable** (attached to a unit's slots)
  + **44 orphaned/cut** (referenced by no unit, no dev, no inherit chain) + **1** legacy `*_Old`. The
  original "~45 legacy" was actually the orphan count, not `*_Old`-named. Only the 112 are shown.
- **Decoding:** effects come from each gear's `trait` attributes (`ref` + `val`). `_MRatio` stores a
  *multiplier* (`1.3` → +30%); the shared `resolveDesc` mis-formatted these as `val×100` (+130%) — fixed
  in the generator with multiplier-correct formatters used ahead of the desc path.
- **Caveat:** ~34 conditional/aura options (trait-grants, per-stack, ally auras) aren't fully resolvable
  from the DB and are flagged "?" — exact values pending in-game tooltip confirmation (same pattern as
  unit abilities / sietch magnitudes).

---

## Detailed plan: Heroes section  ✅ IMPLEMENTED

> Shipped: all 14 heroes added to `UNITS` with a new `hero` type (TYPE_META + filter pill +
> `--tag-hero` styling), each card showing stats + the signature trait's effects (the generic
> combat traits are omitted — their effect text isn't fully resolvable from the CDB). Faction
> leaders were left out (cosmetic in-game). Original plan retained below for reference.

**Why:** the compendium curates 56 units but **0 of the 14 faction heroes**, even though several
councilors (FACTIONS_DATA) deploy as these hero units. High player interest.

**Data source:** `unit` sheet ids `*_Hero_1` / `*_Hero_2` (effective stats via the `inherits` resolver
in `src_scripts/_lib.js`); signature ability = the hero's `*_Hero*` trait (name in the `trait` sheet,
effect text via `resolveDesc`). Verified roster:

| Faction | Hero | Health | Power | Armor | Range | Signature trait |
|---|---|---|---|---|---|---|
| Atreides | Duncan Idaho | 1000 | 20 | 6 | melee | Heroic Figure |
| Atreides | Gurney Halleck | 1000 | 18 | 8 | melee | Exemplar Teacher |
| Harkonnen | Glossu "Beast" Rabban | 1000 | 15 | 5 | 10 | Unbridled Order |
| Harkonnen | Iakin Nefud | 800 | 20 | 5 | melee | Survival of the Fittest |
| Corrino | Wensicia | 500 | 16 | 2 | 35 | Beloved Princess |
| Corrino | Aramsham | 1000 | 20 | 5 | melee | Hand of the Emperor |
| Fremen | Chani | 600 | 18 | 4 | melee | Ghost Army |
| Fremen | Otheym | 600 | 36 | 3 | 35 | Confusing Assault |
| Smugglers | Drisq | 600 | 40 | 2 | 80 | Vigilance |
| Smugglers | Bannerjee | 1000 | 20 | 5 | melee | Thug Leader |
| Ecaz | Whitmore Bludd | 1000 | 20 | 6 | melee | Legendary Swordmaster |
| Ecaz | Ilesa | 600 | 20 | 2 | 35 | Thorny Rose |
| Vernius | Nuwa Cenva | 800 | 35 | 2 | 35 | Machine's Mother |
| Vernius | C'Tair Pilru | 600 | 18 | 3 | 3 | Dissident Tinkerer |

(Confirm exact display names + signature-ability *text* from in-game tooltips where the trait text
isn't fully resolvable from the DB — same caveat as unit abilities.)

**Schema:** reuse the `UNITS` entry shape with `type:"hero"`, adding the signature-trait line(s) to
`effects`. Either:
- (a) add them to the `UNITS` array with a new `hero` type + a TYPE_META entry + a "Heroes" filter, or
- (b) a separate `HEROES` array + a new top-level **Heroes** category card.

Recommend **(a)** — least new code (heroes render through the existing unit card), with a `hero` type
tag and a filter chip.

**UI:** a "Heroes" filter/tag under the Units category (or a dedicated category). Each card: stats +
signature trait + which councilor (if any) deploys them — link `FACTIONS_DATA[faction].councilors`
↔ the hero where they match (e.g. some councilors are deployable heroes).

**Effort:** Large-ish (14 entries + type/filter wiring + tooltip confirmation of ability text).
Lower if we ship stats-only first and add ability text from tooltips in a follow-up.

**Open questions for the maintainer:**
- Heroes as a `type` within Units, or a separate category? (recommend type-within-Units)
- Include faction **leaders** too (Leto, Shaddam, etc.) or heroes only? Leaders are largely cosmetic
  in-game per the audit.
