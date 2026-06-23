// Regression test: verify the Vernius "Patent & Obfuscate" calculator in the live
// compendium — milestone thresholds (Patent 5,000 / Obfuscate 10,000 Hegemony),
// the days-to-milestone ETA, the 1,000-Solari-per-patent cost, and that the panel
// is shown only when the Vernius faction tab is selected. Exits non-zero on failure.
//
// Run:  node tests/verify-vernius.js     (needs Playwright — see tests/README.md)
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { ({ chromium } = require(path.join(__dirname, '..', 'src_scripts', 'node_modules', 'playwright'))); }

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 1200 } });
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'compendium.html').replace(/\\/g, '/'));
  await p.waitForFunction(() => typeof window.lucide !== 'undefined', { timeout: 20000 });
  await p.click('button[data-category="Tech Trees"]');
  await p.waitForTimeout(400);

  let fails = 0;
  const check = (n, c, extra = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (extra ? '  -> ' + extra : '')); if (!c) fails++; };
  const txt = id => p.$eval('#' + id, e => e.textContent.trim()).catch(() => '(absent)');
  const vis = id => p.$eval('#' + id, e => getComputedStyle(e).display !== 'none').catch(() => false);

  check('panel hidden for "All Factions"', (await p.$('#vernius-ability-panel')) === null);

  await p.click('button[data-faction="Vernius"]');
  await p.waitForTimeout(400);
  check('panel visible for Vernius', (await p.$('#vernius-ability-panel')) !== null);

  // Defaults: Hegemony 0, hpd 50, patents 1
  check('Patent status = "5,000 to go"', (await txt('vn-patent-status')) === '5,000 to go', await txt('vn-patent-status'));
  check('Patent ETA shown = 100 days', (await vis('vn-patent-eta')) && /100/.test(await txt('vn-patent-eta')), await txt('vn-patent-eta'));
  check('Obfuscate status = "10,000 to go"', (await txt('vn-obfuscate-status')) === '10,000 to go', await txt('vn-obfuscate-status'));
  check('Obfuscate ETA = 200 days', /200/.test(await txt('vn-obfuscate-eta')), await txt('vn-obfuscate-eta'));
  check('Patent cost = "1,000 Solari"', (await txt('vn-patent-cost')) === '1,000 Solari', await txt('vn-patent-cost'));

  await p.fill('#vn-hegemony', '6000'); await p.waitForTimeout(150);
  check('Heg 6000: Patent Unlocked', (await txt('vn-patent-status')) === 'Unlocked', await txt('vn-patent-status'));
  check('Heg 6000: Patent ETA hidden', !(await vis('vn-patent-eta')));
  check('Heg 6000: Obfuscate "4,000 to go"', (await txt('vn-obfuscate-status')) === '4,000 to go', await txt('vn-obfuscate-status'));
  check('Heg 6000: Obfuscate ETA = 80', /80/.test(await txt('vn-obfuscate-eta')), await txt('vn-obfuscate-eta'));

  await p.fill('#vn-hegemony', '12000'); await p.waitForTimeout(150);
  check('Heg 12000: both Unlocked', (await txt('vn-patent-status')) === 'Unlocked' && (await txt('vn-obfuscate-status')) === 'Unlocked');

  await p.fill('#vn-patents', '3'); await p.waitForTimeout(150);
  check('3 patents = "3,000 Solari"', (await txt('vn-patent-cost')) === '3,000 Solari', await txt('vn-patent-cost'));

  await p.fill('#vn-hegemony', '0'); await p.fill('#vn-hpd', '0'); await p.waitForTimeout(150);
  check('hpd 0: Patent ETA hidden', !(await vis('vn-patent-eta')));

  await p.click('button[data-faction="Atreides"]'); await p.waitForTimeout(300);
  check('panel removed when leaving Vernius', (await p.$('#vernius-ability-panel')) === null);

  console.log('\nconsole/page errors:', errors.length); errors.forEach(e => console.log('  ' + e));
  if (errors.length) fails++;
  await b.close();
  console.log(fails === 0 ? '\nRESULT: PASS — Vernius calculator works.' : `\nRESULT: FAIL — ${fails} check(s).`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH:', e); process.exit(2); });
