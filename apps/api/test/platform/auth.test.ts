import { it, expect } from 'vitest';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import { database } from '../../src/platform/db.js';
import { PlatformService } from '../../src/platform/service.js';
import { buildApp } from '../../src/app.js';
it('OIDC verifies PKCE, state cookie, nonce, issuer, audience, expiry and signature; code/state are single use', async () => {
  const db = await database();
  await db.migrate();
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const jwk = {
    ...publicKey.export({ format: 'jwk' }),
    kid: 'contract-key',
    alg: 'RS256',
    use: 'sig',
  };
  const issuer = 'https://idp.hockeydoo.invalid',
    clientId = 'hockeydoo-contract';
  let nonce = '',
    challenge = '',
    fault = '';
  const json = (v: unknown) =>
    new Response(JSON.stringify(v), {
      headers: { 'content-type': 'application/json' },
    });
  const provider: import('openid-client').CustomFetch = async (input, init) => {
    const url = String(input);
    if (url.includes('/.well-known/'))
      return json({
        issuer,
        authorization_endpoint: issuer + '/authorize',
        token_endpoint: issuer + '/token',
        jwks_uri: issuer + '/jwks',
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['client_secret_post'],
      });
    if (url.endsWith('/jwks')) return json({ keys: [jwk] });
    if (url.endsWith('/token')) {
      const body = new URLSearchParams(String(init?.body));
      expect(
        createHash('sha256')
          .update(body.get('code_verifier')!)
          .digest('base64url'),
      ).toBe(challenge);
      const now = Math.floor(Date.now() / 1000),
        claims = {
          iss: fault === 'issuer' ? issuer + '/wrong' : issuer,
          aud: fault === 'audience' ? 'other-client' : clientId,
          sub: 'synthetic-subject',
          iat: now,
          exp: fault === 'expiry' ? now - 3600 : now + 300,
          nonce: fault === 'nonce' ? 'wrong-nonce' : nonce,
        };
      const encode = (v: unknown) =>
        Buffer.from(JSON.stringify(v)).toString('base64url');
      const text =
        encode({ alg: 'RS256', kid: 'contract-key' }) + '.' + encode(claims);
      const signature = sign(
        'RSA-SHA256',
        Buffer.from(text),
        privateKey,
      ).toString('base64url');
      return json({
        token_type: 'Bearer',
        access_token: 'fake-token-for-contract-only',
        id_token:
          text +
          '.' +
          (fault === 'signature' ? 'A'.repeat(signature.length) : signature),
        expires_in: 300,
      });
    }
    throw new Error('UNEXPECTED_PROVIDER_REQUEST');
  };
  const service = new PlatformService(db, {
    put: async () => {
      throw new Error('NO_BLOB_WRITE');
    },
    get: async () => {
      throw new Error('NO_BLOB_READ');
    },
  });
  const app = await buildApp({
    service,
    options: {
      production: true,
      demoAuth: false,
      publicUrl: 'https://app.hockeydoo.invalid',
      oidcIssuer: issuer,
      oidcClientId: clientId,
      oidcClientSecret: 'test-secret',
      oidcFetch: provider,
    },
  });
  async function start() {
    const response = await app.inject('/api/v1/auth/start');
    expect(response.statusCode).toBe(302);
    const url = new URL(String(response.headers.location));
    nonce = url.searchParams.get('nonce')!;
    challenge = url.searchParams.get('code_challenge')!;
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    return {
      state: url.searchParams.get('state')!,
      cookie: String(response.headers['set-cookie']).split(';')[0]!,
    };
  }
  try {
    for (const failure of [
      'nonce',
      'issuer',
      'audience',
      'expiry',
      'signature',
    ]) {
      fault = failure;
      const flow = await start();
      const response = await app.inject({
        url: '/api/v1/auth/callback?code=contract-code&state=' + flow.state,
        headers: { cookie: flow.cookie },
      });
      expect(response.statusCode, failure).toBe(401);
    }
    fault = '';
    const flow = await start();
    expect(
      (await app.inject('/api/v1/auth/callback?code=x&state=' + flow.state))
        .statusCode,
    ).toBe(400);
    const response = await app.inject({
      url: '/api/v1/auth/callback?code=contract-code&state=' + flow.state,
      headers: { cookie: flow.cookie },
    });
    expect(response.statusCode, response.body).toBe(302);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('Secure')]),
    );
    expect(
      (
        await app.inject({
          url: '/api/v1/auth/callback?code=contract-code&state=' + flow.state,
          headers: { cookie: flow.cookie },
        })
      ).statusCode,
    ).toBe(400);
    expect(await db.query('SELECT platform_admin FROM users')).toEqual([
      { platform_admin: false },
    ]);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/dev',
          payload: { userId: 'demo-coach' },
        })
      ).statusCode,
    ).toBe(404);
  } finally {
    await app.close();
    await db.close();
  }
}, 30000);
