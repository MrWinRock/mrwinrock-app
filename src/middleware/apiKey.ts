import type { Context, Next } from 'hono';
import { env } from '../config/env';

export function requireApiKey() {
    const key = env.API_KEY;
    const strict = env.NODE_ENV !== 'development';

    return async (c: Context, next: Next) => {
        if (!key) {
            if (strict) return c.json({ ok: false, error: 'API key not configured' }, 401);
            return next();
        }

        const header = c.req.header('x-api-key');
        if (header !== key) {
            return c.json({ ok: false, error: 'Unauthorized' }, 401);
        }

        await next();
    };
}