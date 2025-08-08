import { Hono } from 'hono';
import { connectMongo } from './db/mongo.ts';
import routes from './routes/index.ts';

const app = new Hono();

app.get('/', (c) => c.json({ ok: true, message: 'Welcome to MrWinRock API' }));

app.get('/health', async (c) => {
  try {
    const db = await connectMongo();
    await db.command({ ping: 1 });
    return c.json({
      ok: true,
      status: 'live',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return c.json({ ok: false, error: (e as Error).message }, 500);
  }
});

app.get('/fish', (c) => {
  return c.json({ fish: "<><" });
})

app.route('/api', routes);

export default app;