import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const STUDIO_URL = process.env.STUDIO_URL || 'http://127.0.0.1:3000/rails_studio';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'capture');
const WIDTH = 1440;
const HEIGHT = 900;
const FPS = 60;
const ONLY = process.env.SCENES ? process.env.SCENES.split(',') : null;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function injectCursor() {
  const install = () => {
    const cursor = document.createElement('div');
    cursor.id = '__intro_cursor';
    cursor.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M5 3l14 8-6.5 1.5L9 19z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    Object.assign(cursor.style, {
      position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none',
      transform: 'translate(-100px,-100px)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.5))'
    });
    document.body.appendChild(cursor);
    addEventListener('mousemove', (e) => {
      cursor.style.transform = `translate(${e.clientX - 5}px,${e.clientY - 3}px)`;
    }, true);
    addEventListener('mousedown', (e) => {
      const ring = document.createElement('div');
      Object.assign(ring.style, {
        position: 'fixed', left: `${e.clientX - 18}px`, top: `${e.clientY - 18}px`, width: '36px', height: '36px',
        borderRadius: '50%', border: '2px solid rgba(225,29,72,.9)', zIndex: '2147483646', pointerEvents: 'none',
        transition: 'transform .45s ease-out, opacity .45s ease-out', transform: 'scale(.3)', opacity: '1'
      });
      document.body.appendChild(ring);
      requestAnimationFrame(() => { ring.style.transform = 'scale(1.4)'; ring.style.opacity = '0'; });
      setTimeout(() => ring.remove(), 500);
    }, true);
  };
  if (document.body) install();
  else addEventListener('DOMContentLoaded', install);
}

class Director {
  constructor(page) {
    this.page = page;
    this.x = WIDTH / 2;
    this.y = HEIGHT / 2;
    this.started = null;
    this.events = [];
  }

  now() {
    return Number(((performance.now() - this.started) / 1000).toFixed(3));
  }

  mark(type, extra = {}) {
    if (this.started !== null) this.events.push({ type, t: this.now(), ...extra });
  }

  async moveTo(x, y, ms = 600) {
    const steps = Math.max(8, Math.round(ms / 16));
    const [x0, y0] = [this.x, this.y];
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      await this.page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
      await sleep(ms / steps);
    }
    [this.x, this.y] = [x, y];
  }

  async find(fn, arg) {
    const handle = await this.page.waitForFunction(fn, { timeout: 8000 }, arg);
    const el = handle.asElement();
    if (!el) throw new Error(`element not found: ${arg ?? fn}`);
    return el;
  }

  async click(el, { ms = 600, count = 1, dy = 0 } = {}) {
    const box = await el.boundingBox();
    if (!box) throw new Error('element has no bounding box');
    const x = box.x + Math.min(box.width / 2, 60);
    const y = box.y + box.height / 2 + dy;
    await this.moveTo(x, y, ms);
    await sleep(120);
    this.mark('click');
    await this.page.mouse.click(x, y, { count });
  }

  button(text) {
    return this.find((t) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(t)) || null, text);
  }

  sidebar(name) {
    return this.find(
      (n) => [...document.querySelectorAll('aside button')].find((b) => b.textContent.trim().startsWith(n)) || null,
      name
    );
  }

  cell(text) {
    return this.find((t) => [...document.querySelectorAll('td')].find((td) => td.textContent.trim() === t) || null, text);
  }

  async type(text, delay = 45) {
    const t = this.now();
    await this.page.keyboard.type(text, { delay });
    if (this.started !== null) this.events.push({ type: 'type', t, end: this.now() });
  }

  async chord(...keys) {
    for (const k of keys) await this.page.keyboard.down(k);
    for (const k of [...keys].reverse()) await this.page.keyboard.up(k);
  }

  async selectAll() {
    await this.chord('Meta', 'KeyA');
    await this.chord('Control', 'KeyA');
  }

  async select(index, value) {
    await this.page.evaluate(
      (i, v) => {
        const s = document.querySelectorAll('main select, select')[i];
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
        setter.call(s, v);
        s.dispatchEvent(new Event('change', { bubbles: true }));
      },
      index,
      value
    );
  }
}

const scenes = {
  async tables(d) {
    await d.sidebar('article_tags');
    await sleep(700);
    await d.moveTo(120, 330, 700);
    await d.click(await d.sidebar('users'), { ms: 700 });
    await d.cell('Testing culture and fast CI.');
    await sleep(900);
    await d.moveTo(760, 420, 900);
    await d.moveTo(900, 600, 900);
    await sleep(800);
  },

  async filter(d) {
    await sleep(400);
    await d.click(await d.button('Filter'));
    await sleep(350);
    await d.click(await d.button('Add condition'));
    await sleep(300);
    await d.select(0, 'email');
    await d.select(1, 'ends_with');
    await sleep(250);
    await d.click(await d.find(() => document.querySelector('input[placeholder*="Filter value"]')));
    await d.type('.dev', 90);
    await sleep(250);
    await d.page.keyboard.press('Enter');
    await sleep(1600);
  },

  async edit(d) {
    await sleep(300);
    await d.click(await d.cell('Accessibility advocate.'), { count: 2 });
    await sleep(250);
    await d.selectAll();
    await d.type('Accessibility advocate & screen reader tester.', 28);
    await d.page.keyboard.press('Enter');
    await sleep(350);
    await d.click(await d.cell('Kamal deploys and tiny servers.'), { count: 2 });
    await sleep(250);
    await d.selectAll();
    await d.type('Kamal 2 deploys on a $5 VPS.', 32);
    await d.page.keyboard.press('Enter');
    await sleep(900);
    await d.click(await d.button('Save'), { ms: 800 });
    await sleep(1500);
  },

  async fk(d) {
    await sleep(300);
    await d.moveTo(560, 420, 500);
    await d.click(await d.find(() => [...document.querySelectorAll('button')].filter((b) => /categories #/.test(b.textContent))[3] || null), { ms: 700 });
    await sleep(2200);
  },

  async sql(d) {
    await sleep(200);
    await d.click(await d.find(() => document.querySelector('textarea')), { ms: 500 });
    await d.type('SELECT name, email, role FROM users WHERE role = \'admin\';', 18);
    await sleep(250);
    await d.click(await d.button('Run'), { ms: 600 });
    await sleep(1800);
  },

  async console(d) {
    await sleep(200);
    await d.click(await d.find(() => document.querySelector('input[placeholder*="Active Record"]')), { ms: 500 });
    await d.type('User.where(role: :admin).pluck(:name)', 30);
    await d.page.keyboard.press('Escape');
    await d.click(await d.button('Eval'), { ms: 500 });
    await sleep(1800);
  },

  async palette(d) {
    await sleep(200);
    await d.chord('Meta', 'KeyK');
    await sleep(350);
    await d.type('comm', 80);
    await sleep(350);
    await d.page.keyboard.press('Enter');
    await sleep(700);
    await d.click(await d.find(() => document.querySelector('[data-theme-toggle]')), { ms: 600 });
    await sleep(1600);
  }
};

const setup = {
  tables: async () => {},
  filter: async (d) => {
    await (await d.sidebar('users')).click();
    await d.cell('Testing culture and fast CI.');
  },
  edit: async (d) => {
    await (await d.sidebar('users')).click();
    await d.cell('Accessibility advocate.');
  },
  fk: async (d) => {
    await (await d.sidebar('articles')).click();
    await d.cell('Form Builders That Scale');
  },
  sql: async (d) => {
    await (await d.button('SQL Runner')).click();
    await d.find(() => document.querySelector('textarea'));
  },
  console: async (d) => {
    await (await d.sidebar('users')).click();
    await d.cell('Testing culture and fast CI.');
    await d.page.mouse.click(400, HEIGHT - 15);
    await d.find(() => document.querySelector('input[placeholder*="Active Record"]'));
  },
  palette: async (d) => {
    await (await d.sidebar('articles')).click();
    await d.cell('Form Builders That Scale');
  }
};

async function newPage(browser) {
  const page = await browser.newPage();
  page.on('dialog', (dialog) => dialog.accept());
  await page.evaluateOnNewDocument(() => {
    localStorage.clear();
    localStorage.setItem('rails_studio_theme', 'dark');
  });
  await page.evaluateOnNewDocument(injectCursor);
  const session = await page.createCDPSession();
  const { windowId, bounds } = await session.send('Browser.getWindowForTarget');
  const [w, h] = await page.evaluate(() => [innerWidth, innerHeight]);
  await session.send('Browser.setWindowBounds', {
    windowId,
    bounds: { width: bounds.width + (WIDTH - w), height: bounds.height + (HEIGHT - h) }
  });
  await page.goto(STUDIO_URL, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('aside button'));
  const size = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
  if (size[0] !== WIDTH || size[1] !== HEIGHT) throw new Error(`viewport is ${size.join('x')}, expected ${WIDTH}x${HEIGHT}`);
  return page;
}

async function run() {
  const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) throw new Error('Chrome not found; set CHROME_PATH');
  mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: null,
    args: [`--window-size=${WIDTH},${HEIGHT}`, '--force-device-scale-factor=2', '--hide-scrollbars']
  });

  const manifest = {};
  try {
    for (const [name, act] of Object.entries(scenes)) {
      if (ONLY && !ONLY.includes(name)) continue;
      const page = await newPage(browser);
      page.setDefaultTimeout(8000);
      const d = new Director(page);
      await setup[name](d);
      await page.mouse.move(d.x, d.y);
      await sleep(500);

      const file = join(OUT, `${name}.webm`);
      const recorder = await page.screencast({ path: file, fps: FPS });
      d.started = performance.now();
      try {
        await act(d);
      } catch (err) {
        await page.screenshot({ path: join(OUT, `${name}-error.png`) });
        throw err;
      }
      const seconds = d.now();
      await recorder.stop();
      await page.screenshot({ path: join(OUT, `${name}.png`) });
      await page.close();

      manifest[name] = { seconds, events: d.events };
      console.log(`${name.padEnd(8)} ${seconds.toFixed(2)}s  ${d.events.length} events`);
    }
  } finally {
    await browser.close();
  }

  const path = join(OUT, 'manifest.json');
  const previous = ONLY && existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  writeFileSync(path, JSON.stringify({ ...previous, ...manifest }, null, 2) + '\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
