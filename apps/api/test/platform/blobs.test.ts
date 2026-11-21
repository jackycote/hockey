import { it, expect } from 'vitest';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { blobs } from '../../src/platform/blobs.js';
it('S3 adapter sends conditional gzip objects, tolerates only duplicate preconditions and detects corruption', async () => {
  const objects = new Map<string, Buffer>();
  const seen: { method: string; key: string; condition: string | undefined }[] =
    [];
  const server = createServer(async (req, res) => {
    const key = new URL(req.url!, 'http://localhost').pathname;
    seen.push({
      method: req.method!,
      key,
      condition: req.headers['if-none-match'],
    });
    if (req.method === 'PUT') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      if (objects.has(key)) {
        res.writeHead(412, { 'content-type': 'application/xml' });
        res.end('<Error><Code>PreconditionFailed</Code></Error>');
        return;
      }
      expect(req.headers['content-encoding']).toBe('gzip');
      objects.set(key, Buffer.concat(chunks));
      res.writeHead(200);
      res.end();
    } else if (req.method === 'GET' && objects.has(key)) {
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      res.end(objects.get(key));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as { port: number };
  const store = blobs({
    directory: 'unused',
    endpoint: `http://127.0.0.1:${address.port}`,
    bucket: 'test-private',
    accessKey: 'synthetic-access',
    secretKey: 'synthetic-secret',
  });
  try {
    const key = await store.put({ frames: [1, 2, 3] });
    expect(await store.put({ frames: [1, 2, 3] })).toBe(key);
    expect(await store.get(key)).toEqual({ frames: [1, 2, 3] });
    expect(
      seen.filter((r) => r.method === 'PUT').every((r) => r.condition === '*'),
    ).toBe(true);
    await expect(store.get('../private')).rejects.toThrow('INVALID_OBJECT_KEY');
    const original = objects.get('/test-private/' + key)!;
    objects.set('/test-private/' + key, Buffer.from(original).fill(0, 4));
    await expect(store.get(key)).rejects.toThrow();
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
  }
});
