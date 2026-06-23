// Regression test: verify the compendium's Research Calculator computes tech-unlock
// paths correctly. Drives the LIVE compendium.html (real getRequiredPath + real
// DEVELOPMENTS data) and checks: dangling requires (silent undercount), orphaned/
// unreachable techs, cross-category prereqs, duplicate DOM node ids (multi-parent),
// tier↔cost sanity, and that the live transitive closure matches an independent
// recomputation. Exits non-zero if any calculator-affecting issue is found.
//
// Run:  node tests/verify-techtree.js     (needs Playwright — see tests/README.md)
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { ({ chromium } = require(path.join(__dirname, '..', 'src_scripts', 'node_modules', 'playwright'))); }

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

    const url = 'file://' + path.resolve(__dirname, '..', 'compendium.html').replace(/\\/g, '/');
    await page.goto(url);
    await page.waitForFunction(() => typeof window.lucide !== 'undefined', { timeout: 20000 });
    await page.click('button[data-category="Tech Trees"]');
    await page.waitForTimeout(700);

    const R = await page.evaluate(() => {
        const cats = ['Economic', 'Military', 'Statecraft', 'Expansion'];
        const all = {};            // name -> {tier, requires, category}
        const multiCategory = [];  // names appearing in >1 category
        cats.forEach(c => (DEVELOPMENTS[c] || []).forEach(t => {
            if (all[t.name]) multiCategory.push(t.name);
            all[t.name] = { tier: t.tier, requires: (t.requires || []).slice(), category: c };
        }));
        const names = Object.keys(all);

        // (1) Dangling requires — a prereq name that doesn't exist in the data at all.
        const dangling = [];
        names.forEach(n => all[n].requires.forEach(r => { if (!all[r]) dangling.push({ tech: n, missingReq: r, category: all[n].category }); }));

        // (2) Cross-category requires — children filter only links within a category,
        // so a prereq in another branch won't draw a line / may break reachability.
        const crossCat = [];
        names.forEach(n => all[n].requires.forEach(r => { if (all[r] && all[r].category !== all[n].category) crossCat.push({ tech: n, req: r, from: all[n].category, to: all[r].category }); }));

        // (3) techNodeMap (what the page actually built/rendered) vs the data.
        const mapKeys = Object.keys(typeof techNodeMap !== 'undefined' ? techNodeMap : {});
        const notRendered = names.filter(n => !mapKeys.includes(n));       // in data, never built → missing from tree+calc
        const renderedNotInData = mapKeys.filter(k => !all[k]);

        // (4) Reachability — does each tech's prereq chain bottom out at a real tier-1 root?
        const expClosure = (n, seen = new Set()) => {
            if (seen.has(n)) return seen; seen.add(n);
            (all[n] ? all[n].requires : []).forEach(r => { if (all[r] && !seen.has(r)) expClosure(r, seen); });
            return seen;
        };
        const noTier1Root = [];
        names.forEach(n => {
            const c = [...expClosure(n)];
            if (!c.some(x => all[x] && all[x].tier === 1)) noTier1Root.push(n);
        });

        // (5) Live closure vs independent recomputation (catches the silent-undercount bug).
        const closureMismatch = [];
        names.forEach(n => {
            if (!mapKeys.includes(n)) return;                 // live fn only works for built nodes
            const live = Array.from(getRequiredPath(n)).sort();
            const exp = Array.from(expClosure(n)).sort();
            if (JSON.stringify(live) !== JSON.stringify(exp)) {
                closureMismatch.push({ tech: n, missingFromLive: exp.filter(x => !live.includes(x)), extraInLive: live.filter(x => !exp.includes(x)) });
            }
        });

        // (6) Multi-parent techs + duplicate DOM node ids (same id rendered twice).
        const multiParent = names.filter(n => all[n].requires.length > 1);
        const idCounts = {};
        document.querySelectorAll('.tech-node-box').forEach(el => { idCounts[el.id] = (idCounts[el.id] || 0) + 1; });
        const dupDomIds = Object.entries(idCounts).filter(([, c]) => c > 1).map(([id, c]) => ({ id, count: c }));

        // (7) Tier / cost sanity — getBaseCost only defines tiers 1-4 (else silently 100).
        const badTier = names.filter(n => ![1, 2, 3, 4].includes(all[n].tier));

        // Depth of a tech = longest requires-chain length back to a tier-1 root (1-based).
        const depthOf = (n, seen = new Set()) => {
            if (!all[n] || seen.has(n)) return 0; seen.add(n);
            const reqs = all[n].requires.filter(r => all[r]);
            if (reqs.length === 0) return 1;
            return 1 + Math.max(...reqs.map(r => depthOf(r, new Set(seen))));
        };
        const detail = list => list.map(n => ({ name: n, tier: all[n].tier, depth: depthOf(n), requires: all[n].requires, cost_now: (typeof techNodeMap !== 'undefined' && techNodeMap[n]) ? techNodeMap[n].cost : null, category: all[n].category }));
        const badTierDetail = detail(badTier);
        // Any tech whose stated tier != chain depth → cost (getBaseCost(tier)) is wrong.
        const tierDepthMismatch = detail(names.filter(n => all[n].tier !== depthOf(n)));
        const multiParentDetail = detail(multiParent);

        const perCat = {};
        cats.forEach(c => {
            const list = (DEVELOPMENTS[c] || []);
            perCat[c] = { total: list.length, tier1roots: list.filter(t => t.tier === 1 && (t.requires || []).length === 0).length };
        });

        const tierDist = {};
        names.forEach(n => { tierDist[all[n].tier] = (tierDist[all[n].tier] || 0) + 1; });

        return {
            totalTechs: names.length, perCat, tierDist,
            multiCategory, dangling, crossCat, notRendered, renderedNotInData,
            noTier1Root, closureMismatch, multiParent, dupDomIds, badTier,
            badTierDetail, multiParentDetail, tierDepthMismatch,
            renderedCount: mapKeys.length,
        };
    });

    const line = '─'.repeat(70);
    const show = (label, arr, fmt = JSON.stringify) => {
        console.log(`\n${label}: ${arr.length}`);
        arr.slice(0, 25).forEach(x => console.log('   • ' + (typeof x === 'string' ? x : fmt(x))));
        if (arr.length > 25) console.log(`   … +${arr.length - 25} more`);
    };

    console.log(line);
    console.log('TECH TREE CALCULATOR VERIFICATION');
    console.log(line);
    console.log(`Total techs in data: ${R.totalTechs} | rendered into techNodeMap: ${R.renderedCount}`);
    console.log('Per-category:', JSON.stringify(R.perCat));
    console.log('Tier distribution:', JSON.stringify(R.tierDist));

    show('Dangling requires (prereq name not found → SILENT undercount)', R.dangling);
    show('Techs in data but NOT rendered/in techNodeMap', R.notRendered);
    show('Live closure != independent recomputation (calculator path wrong)', R.closureMismatch);
    show('Techs whose prereq chain never reaches a tier-1 root', R.noTier1Root);
    show('Tier != chain depth (cost = getBaseCost(tier) is therefore wrong)', R.tierDepthMismatch,
         x => `${x.name}: tier=${x.tier} depth=${x.depth} cost_now=${x.cost_now} (${x.category})`);
    show('Tiers outside 1-4 (getBaseCost silently returns 100)', R.badTier);
    show('Cross-category requires (no connecting line; reachability risk)', R.crossCat);
    show('Duplicate DOM node ids (multi-parent rendered twice)', R.dupDomIds);
    show('Multi-parent techs (requires.length > 1)', R.multiParent);
    show('Tech name in multiple categories', R.multiCategory);
    show('techNodeMap key not in data', R.renderedNotInData);

    console.log('\nconsole/page errors during load:', errors.length);
    errors.forEach(e => console.log('   ' + e));

    // Calculator-affecting failures (any of these means the unlock path or its cost is wrong).
    const blockers = R.dangling.length + R.notRendered.length + R.closureMismatch.length
        + R.noTier1Root.length + R.tierDepthMismatch.length + errors.length;
    console.log('\n' + line);
    console.log(blockers === 0
        ? 'RESULT: PASS — tech-tree calculator data is consistent.'
        : `RESULT: FAIL — ${blockers} calculator-affecting issue(s); see above.`);
    console.log(line);
    await browser.close();
    process.exit(blockers === 0 ? 0 : 1);
})().catch(e => { console.error('CRASH:', e); process.exit(2); });
