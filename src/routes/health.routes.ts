import { Hono } from 'hono';
import { connectMongo } from '../db/mongo.ts';

const health = new Hono();

health.get('/', (c) => {
    return c.json({
        ok: true,
        status: 'live',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

health.get('/ready', async (c) => {
    try {
        const db = await connectMongo();
        await db.command({ ping: 1 });
        return c.json({ ok: true, status: 'live' });
    } catch (e) {
        return c.json({ ok: false, error: (e as Error).message }, 503);
    }
});

export default health;
