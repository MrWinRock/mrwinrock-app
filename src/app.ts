// app.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { connectMongo } from './db/mongo'
import routes from './routes'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env } from './config/env'

const app = new Hono()

const PUBLIC_ORIGINS = [
  'http://localhost:5173',
  'https://mrwinrock.com',
  'https://www.mrwinrock.com'
];

app.use('/*', cors({
  origin: (origin) => {
    if (!origin) return '*';
    return PUBLIC_ORIGINS.includes(origin) ? origin : PUBLIC_ORIGINS[1];
  },
  credentials: false,
  allowMethods: ['GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));

app.use('/admin/*', cors({
  origin: env.ADMIN_ORIGIN,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cf-Access-Jwt-Assertion'],
  maxAge: 86400
}));

const jwks = createRemoteJWKSet(new URL(`https://${env.CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`));

const requireAccess = async (c: any, next: any) => {
  const t = c.req.header('Cf-Access-Jwt-Assertion');
  if (!t) return c.text('unauthorized', 401);
  try {
    await jwtVerify(t, jwks, {
      issuer: `https://${env.CF_ACCESS_TEAM_DOMAIN}`,
      audience: env.CF_ACCESS_AUD
    });
    return next();
  } catch {
    return c.text('forbidden', 403);
  }
};

app.use('/admin/*', requireAccess);

app.get('/', c => c.json({ ok: true, message: 'Welcome to MrWinRock API' }));

app.get('/health', async c => {
  try {
    const db = await connectMongo();
    await db.command({ ping: 1 });
    const uptime = typeof process !== 'undefined' && process.uptime ? process.uptime() : null;
    return c.json({ ok: true, status: 'live', uptime, timestamp: new Date().toISOString() });
  } catch (e) {
    return c.json({ ok: false, error: (e as Error).message }, 500);
  }
});

app.get('/fish', c => c.json({ fish: '<><' }));

app.route('/api', routes);
app.route('/admin', routes);

export default app;
