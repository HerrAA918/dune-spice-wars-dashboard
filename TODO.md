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

- [x] Deep-dive the tech trees — the calculator "still didn't look right" (user-reported,
      2026-06-23; symptom: initial-tech unlock *time* off). **Root cause (now fully resolved):**
      `getBaseCost` dropped the cost formula's step-sum factor. The real game formula (CDB
      `constant` sheet) is `cost = BaseCost(10) · ScalePerStep(1.036)^TotalStepResearched ·
      (ScalePerStep^stepsForDev − 1)/(ScalePerStep − 1)`, with a dev worth `StepsPerTier=[2,3,4,5]`
      steps by tier. At game start (TotalStepResearched=0) a tier-1 dev costs `10·(1.036²−1)/0.036 ≈
      20`, **not** the 10 the earlier focused fix used (which itself had corrected a worse 100).
      **Fixed:** per-tier base is now the formula's R=0 cost **20 / 31 / 42 / 54** (was 10/11/12/14),
      `TECH_COST_OVERRIDES` now carries all **6** explicit DB costs (added CHOAM Support 40, Siege
      Incentives 80), and the calculator shows a caveat that real costs rise ~3.6% per development
      step already researched (the `^TotalStepResearched` term can't be shown statically).
      **Audit (vs an independent CDB recompute, src_scripts/_techaudit.js) is fully clean:** 36/36
      generics, 0 tier/category/requires mismatches, no fabricated multi-requires; requires-chain
      cumulative totals are correct (e.g. Siege Incentives path = 80+42+31+20 = 173). Faction
      replacements: 85/85 names match after 3 in-game-spelling fixes (Guerrilla Tactics, Foot In the
      Door, Enhanced Questionning). **Vernius Patent/Obfuscate calc fixed:** filing cost 1000→**600
      Solari** (PatentDev ability cost), surfaced the rival-pays **500 Solari** and Obfuscate's **20
      Standing / single use**; the 5,000 / 10,000 Hegemony thresholds were already correct.
      Verified headless (Playwright) with 0 console errors.

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

- [ ] (PLANNING — investigated 2026-06-23) Connect a Steam account to pull records —
      **not feasible from the hosted static page; feasible only as a local helper.** The
      Steam Web API requires a secret API key (can't ship in client-side code) and sends no
      CORS headers, so a GitHub-Pages browser app cannot call it directly — it would need a
      backend/proxy, which breaks the no-server design. What the API *would* add: achievements
      (107 exist in `data.cdb`; their Steam API names are NOT stored here — `achievement@platforms.steamId`
      is empty, 0/107 — so pull names from Steam `GetSchemaForGame` and match by display name),
      plus playtime / owned / recently-played (`GetOwnedGames`, `GetRecentlyPlayedGames`). What it
      would NOT add: the real career/match records (Games started, Victory ratio, Factions ratio,
      Conquest best time, per-match faction/resource data — see the `profileStatsTracking` sheet,
      16 entries). Those live in the local `profile_stats_*.sav` and are NOT Steam cloud stats
      (no steamId mapping), and the dashboard already parses them (`parsed_result.json` → conquest,
      games). **Recommended path:** a local-only helper (like the `src_scripts`) that takes the
      user's Steam Web API key + SteamID64, fetches achievements + playtime for appid **1605220**,
      and emits a JSON the dashboard loads — key kept private/gitignored, same handling as the .sav.
      Net: Steam adds achievements + playtime on top of the richer .sav data; it cannot replace it.

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

- [x] Add the two generic techs missing from the tree — added **CHOAM Support** (Economic,
      tier 4, requires CHOAM Integration, cost 40) and **Siege Incentives** (Military, tier 4,
      requires Parallel Training, cost 80) so the compendium now has all 36 generic developments.
      Effects + faction replacements (Corrino "CHOAM Manipulation"; Atreides "Proud Liberator")
      resolved from the CDB. The tree is requires-driven (no gridX/gridY needed); both render as
      children of the correct parent. Done as part of the tech-tree deep-dive above.

- [x] Re-derive unit ability/trait text from the CDB — the stat/cost refresh had kept the
      existing curated prose, which turned out to be **substantially outdated** (e.g. Trooper
      "Coordination" said "10% Power per ally bonus" → really **+3 Power** when under an ally
      bonus; Ranger "Focus Fire: allies +5% Power" → really **"Suppressive Fire: target −10%
      damage"**; Support Drone "Medkits: +20% heal" → really **"Life Pods: +2 Carry Capacity"**).
      Extracted the gear decoder into a shared `src_scripts/_decoder.js` and regenerated each
      unit's ability lines from its traits (own + inherited type traits) as clean `Name: eff;
      eff` bullets. **52 regular units regenerated**; the 14 heroes were left alone (their
      signature abilities were already CDB-derived/verified in the Heroes task and reference
      other hero units that don't auto-clean well), and 6 generic Neutral units (Militia,
      Veteran Militia, Ornithopter, Mercenary, Landsraad Guard, Sardaukar) kept their text (no
      unambiguous CDB match — fixed the one clear stale value there: Sardaukar execute 20%→5%).
      An independent multi-agent CDB re-derivation then caught **6 sign/magnitude bugs** I'd have
      shipped, all from two decoder gaps: (1) three `Entity_DamageReceived_*_MRatio` refs were
      missing from REFMAP so they rendered `+v×100` instead of `(v−1)×100` (Hawk +70→**−30%**,
      Fencer +60→**−40%**, Ornithopter "Swift" +30→**−70%**); (2) the `CustomProperty_Inverted`
      handling must key off the desc token — `::s_percent::` is a multiplier `(v−1)×100`
      (Banshee −50%, Loud Bang −10%) while `::*_value::` is additive `+v×100` (Cronos +30%,
      Incinerator 1%). Also fixed unit matching to prefer the canonical **base** unit (variants
      carry `props.baseUnit`) — a campaign variant `C_Trooper_Aramsham` had been masking the
      Conscripts' real "Protection/Targeting Support" traits. Unified the gear generator onto the
      same `_decoder.js` (one source of truth), which also corrected a shipped gear bug (Skirmisher
      "Loud Bang" +90%→−10%). Re-verified headless: 36 loadout panels / 148 options / 0 pending,
      0 console errors.

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

- [~] Operations cleanup — **costs done (2026-06-23).** All 21 faction-op "Variable" costs
      replaced with the CDB-verified tier values (VeryEasy 100 Intel / Easy 200 Intel + 200
      Solari / Medium 500 Intel + 500 Solari) and now rendered on the faction-op cards; the
      Gear Sabotage ↔ Defense Breaches mix-up was a **cost** swap (not a name swap) — corrected
      to Gear Sabotage = 100 Intel (VeryEasy, ope `GearSabotage`) and Defense Breaches = 500
      Intel + 500 Solari (Medium, ope `DefenseSabotage`); Probe Setup is the lone 50-Intel
      outlier. **Still open:** add the ~9 missing spy/infiltration ops (MScavengerTeam,
      MSupplyCaches, MDecoyThumper, MEMPBomb, MAdministrativeBurden, InfiltrationCells,
      CellSearch, the CB_* Conquest ops) + an Infiltration-fields table.

- [x] Differentiate buildings by build location + fix faction availability (2026-06-23) —
      reworked the Buildings tab from a 2-way Main Base/Village split into **5 location
      categories** verified against the CDB: **Main Base (HQ)** (`Main_*`), **Village**,
      **Sietch** (Fremen settlement buildings, `SI*` — tagged Fremen), **Underworld** (Smuggler
      Underworld-HQ buildings in enemy/neutral villages — the covert 1-day set, tagged Smugglers),
      and **Enemy Main Base** (Smuggler Underworld in enemy Main Bases, `MB*` — tagged Smugglers).
      Each gets a colored badge + lucide icon + its own filter pill. Fixed faction availability
      from the CDB `onlyForFactions`/`notForFactions` (e.g. Windtrap is Fremen-only not "All";
      Dew Collector/Water Extractor/Recycling Vats/Embassy/etc. exclude Fremen but now correctly
      include Vernius), and fixed the faction filter to honor multi-faction lists (was exact-match,
      so multi-faction buildings only showed under "All"). 3 buildings have no clean CDB match and
      kept their curated faction (flagged): **Ceremonial Caves, Concord Chamber, Underground Tunnels**.
      Also: charter resolution **schedule logic** documented on the Landsraad page (3 drawn/Council,
      2-Council cooldown, eligibility-gated — not random); operation costs (above); type-badge icons
      on all unit/building cards; and the `MAIN_BASE` → "Main Base" badge formatting fix.

- [x] Authoritative building re-derivation + Smuggler confirmation (2026-06-24, multi-agent
      workflow + adversarial verify) — confirmed via the game files: **Smuggler Underworld
      buildings (28: 19 village `HeadquartersBuilding` + 9 enemy-Main-Base `MB*`) are
      Smuggler-EXCLUSIVE**, and `SI*` Sietch buildings (12) are Fremen-exclusive — gated by the
      Smuggler-only `InstallUWHeadquarter` / Fremen-only `AlliedSietch_BuildLocalSietch` unlocks,
      NOT by the building row (which is untagged), so they must be faction-gated in the UI (they are).
      Location is now taken from the authoritative `building.props.tip.cat` (was a construction-time
      heuristic). **Provenance audit found ~50/80 building COSTS were data-entry errors** — regenerated
      every cost/upkeep straight from `building@states[0].cost`/`.upkeep`: Water moved from cost to
      **upkeep** (~24 buildings), Smuggler Underworld 200→**100** Solari, MB enemy-base 2000→**1000
      Solari + 100 Intel** (MBHiddenExplosives 500), SI* Plascrete 1000→**800** (Hidden Plascrete 250),
      Vernius HQ upkeep 0→10 Solari. Qualitative data (all 7 factions' bonuses, 28 councillors,
      hegemony 5k/10k tiers, building effect text) verified fully CDB-traceable. Added `authority` to
      the cost-chip icons; hid the ugly "None/day" upkeep chip. Flagged (kept as-is, need in-game check):
      dead-stub rows Spice Collectors / Underground Tunnels / Clandestine Scouts, untagged Support Station,
      and unmatched Ceremonial Caves / Concord Chamber.

- [x] Main Base Planner (district-bonus calculator) (2026-06-24) — new **Main Base** tab. Per-faction
      district layouts from `structure.props.districtSlots` (Atreides 1-2-3-2-1-1, Harkonnen 3-2-1-2-3,
      Smugglers 3-2-1-1-1-1, Fremen 3-2-1, Corrino 3-2-1 ×up-to-3 bases, Ecaz 1-3-2-3-1, Vernius S-Vault
      3-3-3). Districts are domain-agnostic (`nbSlots` only): assign Economy/Military/Statecraft to each,
      and filling an N-slot district grants that domain's **tier-N** bonus from `domain.districtLevels`
      (Economy: Investment Offices/Insurance Banks +30 Solari/Economic Lobbies +10% Solari; Military:
      Military Academy/Master Armorers +1 Armor [Fremen: Master Raiders +10% atk spd]/Military Investments
      +20% Health; Statecraft: Administrative Complex/Senate Envoys +3 Influence +5 Intel/Political Forum
      +150 Council Votes [Smugglers & Fremen: +150 max Influence +6 Influence]). Live bonus rollup + Corrino
      multi-base (5k/10k Hegemony) + faction-correct variant reference table. Verified headless, 0 errors.

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
      **All 148 options now resolve cleanly (0 pending).** The ~34 conditional/aura options that were
      flagged "?" are nearly all "grant-a-trait" wrappers: the gear's `desc` carries the condition/target
      with a `::target_effects::` placeholder and the granted trait holds the real stat values (with no
      inline desc), so the decoder now recursively expands the placeholder via REFMAP and pulls
      durations/stacking limits from the granted trait's `props` (e.g. Distracting Flashes → "−10% damage
      received to allied units at melee range"; Morbid Climax → "keeps fighting for 5 seconds…").

- [ ] Add a DPS stat to unit cards — **feasible, model validated (investigated 2026-06-23).**
      Each unit's attack is exactly one `combo` → one `sequence` (no multi-hit: `multiSeq=0`
      across all 65 combos): damage per hit = the unit's `power` stat (× `sequence.powerRatio`,
      default 1; only the 0.5 agent-handgun and a few `*_Death_Attack` explosions override via
      `powerOverride`), and `sequence.duration` is the attack period in seconds. Confirmed three
      ways: the global constants `Army_Attack_Time = 2` / `Army_Attack_WindUp = 0.5` equal the
      generic combo's duration/windUp; the game itself displays `unit_attack_speed` ("Attack
      speed: ::speed::"); and only 2 of 23 projectiles carry damage (special siege units), so
      `power` is the damage source for ~all units. **DPS = power / duration**, computable for all
      110 combat units (Sardaukar 17/1.5 ≈ 11.3, Ranger 17/2 = 8.5, Trooper 14/2 = 7, Chani
      18/1 = 18). The loadout panel already renders an "Atk Spd" row and the 36 customizable units
      already carry `attackSpeed` gear mods, so DPS can recompute live with the loadout for free
      (effective DPS = power × powerMult × atkSpeed% ÷ baseDuration). `engageSpeed` is a movement
      closing-speed (pairs with `Unit_Speed_EngageFactor`), NOT attack rate — exclude it. Caveat:
      raw DPS ignores target armor; it's offensive output, not effective damage vs a specific target.

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
