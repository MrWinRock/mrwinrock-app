import { Elysia, type Context } from 'elysia'
import { connectMongo } from './db/mongo'
import routes from './routes'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env } from './config/env'
import { rateLimit } from './middleware/rateLimit'
import { requestLogger } from './middleware/logger'

/* ── allowed origins ─────────────────────────────────── */

const PUBLIC_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://mrwinrock.com',
  'https://admin.mrwinrock.com',
]);

/* ── CORS helpers ────────────────────────────────────── */

function corsHeadersForApi(origin: string | null) {
  const headers: Record<string, string> = {
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'Content-Type',
    'access-control-max-age': '86400',
    'vary': 'Origin',
  };
  if (origin && PUBLIC_ORIGINS.has(origin)) {
    headers['access-control-allow-origin'] = origin;
  }
  return headers;
}

const ADMIN_CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': env.ADMIN_ORIGIN,
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization, Cf-Access-Jwt-Assertion, x-api-key',
  'access-control-allow-credentials': 'true',
  'access-control-max-age': '86400',
};

/* ── app ─────────────────────────────────────────────── */

const app = new Elysia()
  .use(requestLogger())
  // Handle CORS preflight at top level, BEFORE route matching
  .onRequest(({ request, set }) => {
    if (request.method !== 'OPTIONS') return;

    const url = new URL(request.url);
    const origin = request.headers.get('origin');

    let headers: Record<string, string>;
    if (url.pathname.startsWith('/admin')) {
      headers = { ...ADMIN_CORS_HEADERS };
    } else if (url.pathname.startsWith('/api')) {
      headers = corsHeadersForApi(origin);
    } else {
      return;
    }

    return new Response(null, { status: 204, headers });
  });

/* ── /api routes ─────────────────────────────────────── */

app.group('/api', app => app
  .onBeforeHandle(({ request, set }) => {
    Object.assign(set.headers, corsHeadersForApi(request.headers.get('origin')));
  })
  .onBeforeHandle(rateLimit())
  .onBeforeHandle(({ request, set }) => {
    if (request.method !== 'GET') {
      set.status = 405;
      return { ok: false, error: 'Method not allowed' };
    }
  })
  .use(routes)
);

/* ── /admin routes ───────────────────────────────────── */

const jwks = createRemoteJWKSet(new URL(`https://${env.CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`));

const requireAccess = async ({ request, set }: Context) => {
  if (env.NODE_ENV === 'development') {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey && apiKey === env.API_KEY) {
      return;
    }
  }

  const t = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!t) {
    set.status = 401;
    return 'unauthorized';
  }
  try {
    await jwtVerify(t, jwks, {
      issuer: `https://${env.CF_ACCESS_TEAM_DOMAIN}`,
      audience: env.CF_ACCESS_AUD
    });
  } catch {
    set.status = 403;
    return 'forbidden';
  }
};

app.group('/admin', app => app
  .onBeforeHandle(({ set }) => {
    Object.assign(set.headers, ADMIN_CORS_HEADERS);
  })
  .onBeforeHandle(requireAccess)
  .use(routes)
);

/* ── standalone routes ───────────────────────────────── */

app.get('/', () => ({ ok: true, message: 'Welcome to MrWinRock API' }));

app.get('/health', async ({ set }) => {
  try {
    const db = await connectMongo();
    await db.command({ ping: 1 });
    const uptime = typeof process !== 'undefined' && process.uptime ? process.uptime() : null;
    return { ok: true, status: 'live', method: "GET", uptime, timestamp: new Date().toISOString() };
  } catch (e) {
    set.status = 500;
    return { ok: false, error: (e as Error).message };
  }
});

app.get('/fish', () => ({ fish: '<><' }));

connectMongo()
  .catch((err) => console.error('Failed to connect to MongoDB:', err));

export default app;
