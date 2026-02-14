import { env } from '../config/env';

export function requireApiKey() {
    const key = env.API_KEY;
    const strict = env.NODE_ENV !== 'development';

    return async ({ request, set }: any) => {
        if (!key) {
            if (strict) {
                set.status = 401;
                return { ok: false, error: 'API key not configured' };
            }
            return;
        }

        const header = request.headers.get('x-api-key');
        if (header !== key) {
            set.status = 401;
            return { ok: false, error: 'Unauthorized' };
        }
    };
}