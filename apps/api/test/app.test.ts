import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { HealthSchema } from '@hockey-iq/contracts';
describe('API foundation', () => {
  it('serves a contract-validated health response and OpenAPI', async () => {
    const app = await buildApp();
    try {
      const response = await app.inject('/api/health');
      expect(response.statusCode).toBe(200);
      expect(HealthSchema.parse(response.json()).status).toBe('ok');
      const spec = await app.inject('/api/openapi.json');
      expect(spec.json().paths).toHaveProperty('/api/health');
    } finally {
      await app.close();
    }
  });
  it('does not expose private-team routes before authentication exists', async () => {
    const app = await buildApp();
    try {
      const response = await app.inject('/api/teams/private/lessons');
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: { code: 'NOT_FOUND', message: 'Ressource introuvable.' },
      });
    } finally {
      await app.close();
    }
  });
});
