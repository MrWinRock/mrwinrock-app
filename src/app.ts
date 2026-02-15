import { Elysia, type Context } from 'elysia'
import { cors } from '@elysiajs/cors'
import { connectMongo } from './db/mongo'
import routes from './routes'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env } from './config/env'
import { rateLimit } from './middleware/rateLimit'
import { requestLogger } from './middleware/logger'

const app = new Elysia()
  .use(requestLogger())

const PUBLIC_ORIGINS = [
  // Development
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // Staging
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  // Production
  'https://mrwinrock.com',
  'https://admin.mrwinrock.com',
];

const ALLOW = new Set(PUBLIC_ORIGINS);

// CORS for /api/* routes
app.group('/api', app => app
  .use(cors({
    origin: (origin) => {
      if (!origin) return true;
      const originStr = typeof origin === 'string' ? origin : origin.toString();
      return ALLOW.has(originStr);
    },
    credentials: false,
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 86400
  }))
  .onBeforeHandle(rateLimit())
  .onBeforeHandle(({ request, set }) => {
    // Method restriction - GET only
    if (request.method !== 'GET') {
      set.status = 405;
      return { ok: false, error: 'Method not allowed' };
    }
  })
  .use(routes)
);

// CORS for /admin/* routes
const jwks = createRemoteJWKSet(new URL(`https://${env.CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`));

const requireAccess = async ({ request, set }: Context) => {
  if (request.method === 'OPTIONS') return;

  // Development: allow x-api-key as alternative auth
  if (env.NODE_ENV === 'development') {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey && apiKey === env.API_KEY) {
      return;
    }
  }

  // Production: require Cloudflare Access JWT
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
  .use(cors({
    origin: env.ADMIN_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cf-Access-Jwt-Assertion', 'x-api-key'],
    maxAge: 86400
  }))
  .onBeforeHandle(requireAccess)
  .use(routes)
);

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
