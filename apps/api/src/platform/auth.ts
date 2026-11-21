import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as oidc from 'openid-client';
import { randomUUID } from 'node:crypto';
import { PlatformService, Problem, secret, tokenHash } from './service.js';
import type { PlatformOptions } from './routes.js';
const extract = (header: string | undefined, name: string) =>
  header
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(name + '='))
    ?.slice(name.length + 1) ?? '';
export async function registerAuth(
  api: FastifyInstance,
  service: PlatformService,
  options: PlatformOptions,
) {
  const cookie = (name: string, value: string, maxAge: number) =>
    `${name}=${value}; HttpOnly; SameSite=Lax; Path=/api/v1; Max-Age=${maxAge}${options.production ? '; Secure' : ''}`;
  let config: Promise<oidc.Configuration> | undefined;
  const oidcConfig = () => {
    if (!options.oidcIssuer || !options.oidcClientId)
      throw new Problem(503, 'OIDC_NOT_CONFIGURED');
    if (!options.oidcIssuer.startsWith('https://'))
      throw new Problem(503, 'OIDC_HTTPS_REQUIRED');
    config ??= oidc.discovery(
      new URL(options.oidcIssuer),
      options.oidcClientId,
      options.oidcClientSecret,
      undefined,
      {
        execute: [oidc.enableNonRepudiationChecks],
        ...(options.oidcFetch ? { [oidc.customFetch]: options.oidcFetch } : {}),
      },
    );
    return config;
  };
  api.get('/auth/methods', async () => ({
    demo: options.demoAuth,
    oidc: !!(options.oidcIssuer && options.oidcClientId),
    version: '1.2',
  }));
  api.post('/auth/dev', async (req, reply) => {
    if (!options.demoAuth || options.production)
      throw new Problem(404, 'NOT_FOUND');
    const body = z
      .strictObject({
        userId: z.enum([
          'demo-coach',
          'demo-player-m11',
          'demo-player-m13',
          'demo-admin',
        ]),
      })
      .parse(req.body);
    if (
      !(
        await service.db.query('SELECT id FROM users WHERE id=$1', [
          body.userId,
        ])
      ).length
    )
      throw new Problem(503, 'DEMO_NOT_SEEDED');
    const session = await service.session(body.userId);
    reply.header(
      'Set-Cookie',
      cookie('hockey_session', session.token, 8 * 3600),
    );
    return { csrf: session.csrf };
  });
  api.post('/auth/logout', async (req, reply) => {
    if (req.viewer)
      await service.db.query('DELETE FROM sessions WHERE token_hash=$1', [
        req.viewer.sessionHash,
      ]);
    reply.header('Set-Cookie', cookie('hockey_session', '', 0));
    return { ok: true };
  });
  api.get('/auth/start', async (_req, reply) => {
    const cfg = await oidcConfig(),
      state = secret(),
      nonce = secret(),
      verifier = oidc.randomPKCECodeVerifier(),
      redirectUri = new URL('/api/v1/auth/callback', options.publicUrl).href;
    await service.db.query('DELETE FROM oidc_states WHERE expires_at<$1', [
      service.now().toISOString(),
    ]);
    await service.db.query(
      'INSERT INTO oidc_states(state_hash,verifier,nonce,redirect_uri,expires_at) VALUES($1,$2,$3,$4,$5)',
      [
        tokenHash(state),
        verifier,
        nonce,
        redirectUri,
        new Date(service.now().getTime() + 10 * 60000).toISOString(),
      ],
    );
    const url = oidc.buildAuthorizationUrl(cfg, {
      redirect_uri: redirectUri,
      scope: 'openid',
      state,
      nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: 'S256',
    });
    reply.header('Set-Cookie', cookie('hockey_oidc_state', state, 600));
    return reply.redirect(url.href);
  });
  api.get('/auth/callback', async (req, reply) => {
    const cfg = await oidcConfig(),
      url = new URL(req.url, options.publicUrl),
      state = url.searchParams.get('state');
    if (!state || extract(req.headers.cookie, 'hockey_oidc_state') !== state)
      throw new Problem(400, 'OIDC_STATE_INVALID');
    const row = await service.db.transaction(async (tx) => {
      const row = (
        await tx.query(
          'DELETE FROM oidc_states WHERE state_hash=$1 AND expires_at>$2 RETURNING *',
          [tokenHash(state), service.now().toISOString()],
        )
      )[0];
      if (!row) throw new Problem(400, 'OIDC_STATE_INVALID');
      return row;
    });
    let subject: string;
    try {
      const tokens = await oidc.authorizationCodeGrant(cfg, url, {
        pkceCodeVerifier: String(row.verifier),
        expectedState: state,
        expectedNonce: String(row.nonce),
        idTokenExpected: true,
      });
      const claims = tokens.claims();
      if (!claims?.sub) throw new Error('MISSING_SUBJECT');
      subject = options.oidcIssuer + '|' + claims.sub;
    } catch {
      throw new Problem(401, 'OIDC_AUTHENTICATION_FAILED');
    }
    const user = (
      await service.db.query(
        "INSERT INTO users(id,subject,display_name) VALUES($1,$2,'Membre Hockey Doo') ON CONFLICT(subject) DO UPDATE SET subject=EXCLUDED.subject RETURNING id",
        [randomUUID(), subject],
      )
    )[0]!;
    const session = await service.session(String(user.id));
    reply.header('Set-Cookie', [
      cookie('hockey_session', session.token, 8 * 3600),
      cookie('hockey_oidc_state', '', 0),
    ]);
    return reply.redirect('/equipes');
  });
}
