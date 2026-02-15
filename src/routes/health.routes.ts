import { Elysia } from 'elysia';
import { connectMongo } from '../db/mongo.ts';

const health = new Elysia();

health.get('/', () => {
    return {
        ok: true,
        status: 'live',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    };
});

health.get('/ready', async ({ set }) => {
    try {
        const db = await connectMongo();
        await db.command({ ping: 1 });
        return { ok: true, status: 'live' };
    } catch (e) {
        set.status = 503;
        return { ok: false, error: (e as Error).message };
    }
});

export default health;
