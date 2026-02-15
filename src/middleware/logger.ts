import { Elysia } from 'elysia';

const colors = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
};

function statusColor(status: number): string {
    if (status >= 500) return colors.red;
    if (status >= 400) return colors.yellow;
    if (status >= 300) return colors.cyan;
    return colors.green;
}

function methodColor(method: string): string {
    switch (method) {
        case 'GET': return colors.green;
        case 'POST': return colors.cyan;
        case 'PUT': return colors.yellow;
        case 'PATCH': return colors.magenta;
        case 'DELETE': return colors.red;
        default: return colors.white;
    }
}

function formatDuration(ms: number): string {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

const startTimes = new WeakMap<Request, number>();

function logRequest(request: Request, status: number, start?: number) {
    const ms = start !== undefined ? performance.now() - start : 0;
    const method = request.method;

    let path: string;
    try { path = new URL(request.url).pathname; } catch { path = request.url; }

    const sc = statusColor(status);
    const mc = methodColor(method);
    const r = colors.reset;
    const d = colors.dim;

    const timestamp = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
    console.log(
        `${d}${timestamp}${r} ${mc}${method.padEnd(7)}${r} ${path} ${sc}${status}${r} ${d}${formatDuration(ms)}${r}`
    );
}

/**
 * Request logger plugin for Elysia.
 * Logs method, path, status code, and response time for every request.
 *
 * Usage: `app.use(requestLogger())`
 */
export const requestLogger = () =>
    new Elysia({ name: 'request-logger' })
        .onRequest(({ request }) => {
            startTimes.set(request, performance.now());
        })
        .onAfterResponse(({ request, set }) => {
            logRequest(request, (set.status as number) || 200, startTimes.get(request));
        })
        .onError(({ request, set }) => {
            logRequest(request, (set.status as number) || 500, startTimes.get(request));
        })
        .as('global');

