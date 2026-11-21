import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { TacticalSimulation } from '../packages/tactical-engine/dist/index.js';
import { templateSystem } from '../packages/play-systems/dist/index.js';
import { templateScenario } from '../packages/scenario-schema/dist/index.js';
test('tactical Worker matches Node hashes and runs its fixed timer', async ({
  page,
}) => {
  await page.goto('/equipes');
  const scenario = templateScenario('LOW_CENTER_SUPPORT'),
    system = templateSystem('LOW_CENTER_SUPPORT');
  const asset = readdirSync('apps/web/dist/assets').find((n) =>
    n.startsWith('tactics.worker-'),
  )!;
  const hashes = await page.evaluate(
    async ({ scenario, system, asset }) => {
      const worker = new Worker('/assets/' + asset, { type: 'module' }),
        hashes: string[] = [];
      return await new Promise<string[]>((resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(
            new Error('Worker stalled after ' + hashes.length + ' frames'),
          );
        }, 10000);
        worker.onerror = (e) => reject(new Error(e.message));
        worker.onmessage = (e) => {
          if (e.data.type === 'error') reject(new Error(e.data.message));
          if (e.data.type !== 'frame') return;
          hashes.push(e.data.frame.hash);
          if (hashes.length === 16) {
            clearTimeout(timeout);
            worker.terminate();
            resolve(hashes);
          } else if (hashes.length === 1) worker.postMessage({ type: 'play' });
        };
        worker.postMessage({
          type: 'initialize',
          scenario,
          system,
          teamId: 'home',
        });
      });
    },
    { scenario, system, asset },
  );
  const node = new TacticalSimulation(scenario, system, 'home');
  for (let i = 0; i < 15; i++) node.step();
  expect(hashes).toEqual(node.frames.map((f) => f.hash));
});
test('bounded demonstration preparation produces the same immutable track as Node', async ({
  page,
}) => {
  await page.goto('/equipes');
  const scenario = templateScenario('D_TO_D_REVERSE'),
    system = templateSystem('D_TO_D_REVERSE'),
    asset = readdirSync('apps/web/dist/assets').find((n) =>
      n.startsWith('tactics.worker-'),
    )!;
  const hashes = await page.evaluate(
    async ({ scenario, system, asset }) => {
      const worker = new Worker('/assets/' + asset, { type: 'module' });
      return new Promise<string[]>((resolve, reject) => {
        const timer = setTimeout(() => {
          worker.terminate();
          reject(new Error('Preparation stalled'));
        }, 10000);
        worker.onmessage = (e) => {
          if (e.data.type === 'prepared') {
            clearTimeout(timer);
            worker.terminate();
            resolve(
              e.data.recording.frames.map((f: { hash: string }) => f.hash),
            );
          } else if (e.data.type === 'error') {
            clearTimeout(timer);
            worker.terminate();
            reject(new Error(e.data.message));
          }
        };
        worker.postMessage({
          type: 'prepare',
          scenario,
          system,
          teamId: 'home',
          ticks: 60,
        });
      });
    },
    { scenario, system, asset },
  );
  const node = new TacticalSimulation(scenario, system, 'home');
  for (let i = 0; i < 60; i++) node.step();
  expect(hashes).toEqual(node.frames.map((f) => f.hash));
});
