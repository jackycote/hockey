import type { SimEvent } from '@hockey-iq/contracts';
export class SimEventBus {
  private listeners = new Set<(event: SimEvent) => void>();
  private failures: unknown[] = [];
  subscribe(listener: (event: SimEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  publish(events: readonly SimEvent[]) {
    for (const event of events)
      for (const listener of [...this.listeners]) {
        // Observers receive copies, run after commit, and cannot alter the simulation or its hashes.
        try {
          listener(JSON.parse(JSON.stringify(event)) as SimEvent);
        } catch (error) {
          this.failures.push(error);
          if (this.failures.length > 16) this.failures.shift();
        }
      }
  }
  drainErrors(): unknown[] {
    const errors = this.failures;
    this.failures = [];
    return errors;
  }
}
