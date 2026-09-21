import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const started = Date.now();
const log = (step) => console.log(JSON.stringify({ t: ((Date.now() - started) / 1000).toFixed(2), step }));
const cdpPort = process.env.CDP_PORT || '9222';

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      return await puppeteer.connect({
        browserURL: `http://127.0.0.1:${cdpPort}`,
        defaultViewport: null
      });
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`Could not connect to Chrome CDP on ${cdpPort}`);
}

async function readyPage(browser) {
  for (let i = 0; i < 40; i++) {
    const pages = await browser.pages();
    const page = pages.find((p) => (p.url() || '').includes('rails_studio')) || pages[pages.length - 1];
    try {
      await page.waitForFunction(
        () => [...document.querySelectorAll('aside button span')].some((el) => el.textContent?.trim() === 'articles'),
        { timeout: 1000 }
      );
      return page;
    } catch {
      await sleep(250);
    }
  }
  throw new Error('Rails Studio UI did not load');
}

async function findEl(page, fn, arg) {
  const handle = await page.evaluateHandle(fn, arg);
  const el = handle.asElement();
  if (!el) throw new Error('element not found: ' + String(arg));
  return el;
}

async function clickEl(page, el, opts = {}) {
  const box = await el.boundingBox();
  if (!box) throw new Error('no bounding box');
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(box.height / 2, 12);
  await page.mouse.move(x, y, { steps: opts.steps ?? 10 });
  await sleep(80);
  if (opts.dbl) {
    await page.mouse.click(x, y, { clickCount: 2 });
  } else {
    await page.mouse.click(x, y);
  }
}

const sidebarExact = (name) => (n) => {
  const buttons = [...document.querySelectorAll('aside button')];
  return buttons.find((b) => [...b.querySelectorAll('span')].some((s) => s.textContent.trim() === n)) || null;
};

async function findButton(page, needle) {
  return findEl(
    page,
    (n) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(n)) || null,
    needle
  );
}

async function evalRuby(page, code) {
  const consoleInput = await page.$('input[placeholder*="Active Record"]');
  if (!consoleInput) throw new Error('console input missing');
  await clickEl(page, consoleInput);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(code, { delay: 40 });
  await page.keyboard.press('Escape');
  await sleep(150);
  await clickEl(page, await findButton(page, 'Eval'));
}

async function run() {
  const browser = await connect();
  const page = await readyPage(browser);
  page.setDefaultTimeout(8000);

  log('ready');
  await sleep(800);
  log('intro');
  await sleep(5200);

  log('shortcuts');
  await page.mouse.click(640, 80);
  await sleep(200);
  await clickEl(page, await findEl(page, () => document.querySelector('[aria-label="Keyboard shortcuts"]')));
  await page.waitForFunction(() => document.body.innerText.includes('Keyboard Shortcuts') || document.body.innerText.includes('cheat sheet') || document.body.innerText.includes('Global & Navigation'), { timeout: 5000 });
  await sleep(3200);
  await page.keyboard.press('Escape');
  await sleep(600);

  log('open-articles');
  await clickEl(page, await findEl(page, sidebarExact('articles'), 'articles'));
  await page.waitForFunction(() => document.body.innerText.includes('Building Modern Rails'), { timeout: 8000 });
  await sleep(2200);

  log('sort-title');
  await clickEl(
    page,
    await findEl(page, () =>
      [...document.querySelectorAll('th')].find((th) => /titlestring/i.test(th.textContent || '')) || null
    )
  );
  await sleep(1500);

  log('filter-bar');
  await clickEl(page, await findButton(page, 'Filter'));
  await sleep(800);
  await clickEl(page, await findButton(page, 'Add condition'));
  await sleep(400);
  await page.evaluate(() => {
    const s = document.querySelector('select');
    if (!s) return;
    s.value = 'title';
    s.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const valueInput = await page.$('input[placeholder*="Filter value"]');
  if (valueInput) {
    await clickEl(page, valueInput);
    await page.keyboard.type('Rails', { delay: 70 });
    await sleep(250);
    await page.keyboard.press('Enter');
  }
  await sleep(1800);

  log('clear-filter');
  const clearBtn = await page.evaluateHandle(
    () => [...document.querySelectorAll('button')].find((b) => /Clear All/i.test(b.textContent)) || null
  );
  if (clearBtn.asElement()) await clickEl(page, clearBtn.asElement());
  await page.keyboard.press('Escape');
  await sleep(400);
  await page.mouse.click(400, 80);
  await sleep(200);
  await page.keyboard.press('f');
  await sleep(700);

  log('inline-edit');
  const views = await findEl(
    page,
    () => [...document.querySelectorAll('td')].find((td) => td.textContent.trim() === '1420') || null
  );
  await clickEl(page, views, { dbl: true });
  await sleep(250);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.type('2048', { delay: 80 });
  await page.keyboard.press('Enter');
  await sleep(2400);

  log('discard-edit');
  await clickEl(page, await findButton(page, 'Discard'));
  await sleep(900);

  log('open-fk');
  await clickEl(
    page,
    await findEl(page, () => [...document.querySelectorAll('button')].find((b) => /users #/.test(b.textContent)) || null)
  );
  await sleep(2800);
  await page.keyboard.press('Escape');
  await sleep(700);

  log('sql-runner');
  await clickEl(page, await findButton(page, 'SQL Runner'));
  await sleep(1200);
  const browse = await page.evaluateHandle(
    () => [...document.querySelectorAll('button')].find((b) => /Browse articles/.test(b.textContent)) || null
  );
  if (browse.asElement()) {
    await clickEl(page, browse.asElement());
  } else {
    const ta = await page.$('textarea');
    if (ta) {
      await clickEl(page, ta);
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await page.keyboard.type('SELECT id, title, views_count FROM articles ORDER BY views_count DESC;', { delay: 16 });
      await page.keyboard.down('Control');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Control');
    }
  }
  await sleep(2800);

  log('console');
  await page.keyboard.down('Control');
  await page.keyboard.press('`');
  await page.keyboard.up('Control');
  await sleep(900);
  await evalRuby(page, 'User.count');
  await page.waitForFunction(() => /=>\s*\d+/.test(document.body.innerText), { timeout: 8000 }).catch(() => {});
  await sleep(1600);
  await evalRuby(page, 'Article.first.title');
  await page.waitForFunction(() => document.body.innerText.includes('Building Modern Rails') || document.body.innerText.includes('Article.first'), { timeout: 8000 }).catch(() => {});
  await sleep(2200);

  log('command-palette');
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  await sleep(700);
  await page.keyboard.type('comments', { delay: 80 });
  await sleep(1400);
  await page.keyboard.press('Enter');
  await sleep(1800);

  log('theme-toggle');
  const themeBtn = await page.$('[data-theme-toggle]');
  if (themeBtn) {
    await clickEl(page, themeBtn);
    await sleep(1600);
    await clickEl(page, themeBtn);
  }
  await sleep(2000);

  log('done');
  browser.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
