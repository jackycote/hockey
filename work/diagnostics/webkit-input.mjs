// Standalone reproduction: no Hockey IQ code, server, styles or contracts loaded.
import { devices, webkit } from '@playwright/test';

const browser = await webkit.launch({ headless: true });
try {
  const page = await browser.newPage({ ...devices['iPhone 13'] });
  await page.setContent(`
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <div style="height:1200px"></div>
    <button>Test button</button>
    <div style="height:1200px"></div>
  `);
  await page.evaluate(() => {
    window.hockeyPointerEvents = [];
    document.addEventListener('pointerdown', (event) => {
      window.hockeyPointerEvents.push({
        x: event.clientX,
        y: event.clientY,
        target: event.target.tagName,
      });
    });
    document.querySelector('button').addEventListener('click', (event) => {
      event.currentTarget.textContent = 'Clicked';
    });
  });
  const button = page.getByRole('button');
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  if (!box) throw new Error('Reproduction button is missing.');
  const expected = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.click(expected.x, expected.y);
  const observed = await page.evaluate(() => window.hockeyPointerEvents);
  const clicked = (await button.textContent()) === 'Clicked';
  console.log(
    JSON.stringify(
      { browser: browser.version(), expected, observed, clicked },
      null,
      2,
    ),
  );
  if (!clicked) process.exitCode = 1;
} finally {
  await browser.close();
}
