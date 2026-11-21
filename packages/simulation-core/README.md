# @hockey-iq/simulation-core

M2 : moteur TypeScript headless, sans DOM, réseau ou horloge réelle. Un tick vaut exactement 1/30 seconde. Il suit les cibles et vitesses de préparation; les comportements tactiques automatiques appartiennent à M3.

```ts
import { DeterministicSimulation } from '@hockey-iq/simulation-core';

const engine = new DeterministicSimulation(scenario);
const unsubscribe = engine.events.subscribe((event) => console.info(event));
const { snapshot, trace } = engine.step();
const resumed = DeterministicSimulation.restore(snapshot);
// engine.step().trace.hash === resumed.step().trace.hash
unsubscribe();
```

`step(inputs)` reçoit au plus 64 inputs du prochain tick, ordonnés par séquence croissante. Une référence, un tick ou une séquence invalide est refusé avant modification de l’état. Une passe devenue impossible est tracée dans `rejectedInputs` sans interrompre les ticks ni consommer de RNG. Les observateurs reçoivent des copies après commit; leurs erreurs sont accessibles via `events.drainErrors()` et ne changent pas les décisions.

L’état complet comprend WorldState, l’état RNG, la configuration physique et sa version, les délais de récupération, le dernier passeur et les compteurs d’inputs/événements. `hashSnapshot` calcule SHA-256 de ces données en JSON canonique. Les coordonnées/vitesses sont quantifiées à 10⁻⁶; les entités et clés sont ordonnées lexicalement. `nextRandom` est Mulberry32, compatible avec seed zéro.

Le cœur partage `clampToRink`/`cornerRadius` avec l’éditeur. Déplacements avec accélération/virage limités, ralentissement à l’approche d’une cible, inertie sans cible, résolution simple des chevauchements et bandes arrondies. La rondelle libre subit traînée et rebond; les passes utilisent une faible dispersion seedée; la récupération dépend de proximité, orientation et délais. Ces paramètres sont une approximation pédagogique versionnée, pas un modèle de contacts réalistes.

Voir [ADR-007](../../docs/adr/007-m2-simulation.md) pour les unités, la normalisation initiale, les garanties et les limites. Les fixtures de référence versionnées sont dans `test/fixtures`; ne pas les régénérer pour masquer une divergence. Toute modification physique publiée devra changer de version et conserver les références précédentes.
