import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import { TacticalSimulation } from '../packages/tactical-engine/dist/index.js';
import { templateSystem } from '../packages/play-systems/dist/index.js';
import { templateScenario } from '../packages/scenario-schema/dist/index.js';
const rows = [];
for (const template of [
  'FORECHECK_212',
  'BOARDS_BREAKOUT',
  'D_TO_D_REVERSE',
  'LOW_CENTER_SUPPORT',
  'UNDER_PRESSURE_BREAKOUT',
]) {
  const sim = new TacticalSimulation(
      templateScenario(template),
      templateSystem(template),
      'home',
    ),
    times = [];
  for (let i = 0; i < 300; i++) {
    const start = performance.now();
    sim.step();
    times.push(performance.now() - start);
  }
  const sorted = [...times].sort((a, b) => a - b),
    recording = sim.recording(template, 'benchmark-system', 1);
  rows.push({
    template,
    ticks: 300,
    meanMs: times.reduce((a, b) => a + b, 0) / times.length,
    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
    maxMs: sorted.at(-1),
    recordingBytes: Buffer.byteLength(JSON.stringify(recording)),
    finalHash: sim.frames.at(-1).hash,
    phases: [...new Set(sim.frames.map((f) => f.phase))],
  });
}
const report = {
  engine: 'hockey-doo-tactics-1',
  runtime: process.version,
  platform: process.platform,
  architecture: process.arch,
  method:
    'Node wall time per 30 Hz tick, 300 ticks/template, includes full frozen frame hashing; local measurement, not a physical mobile-device benchmark.',
  rows,
};
await writeFile(
  'docs/demo/v1.2/tactical-performance.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  rows
    .map(
      (r) =>
        `${r.template}: p95 ${r.p95Ms.toFixed(2)} ms; ${(r.recordingBytes / 1024).toFixed(0)} KiB/10s`,
    )
    .join('\n'),
);
