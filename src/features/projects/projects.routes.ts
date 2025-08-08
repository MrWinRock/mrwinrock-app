import { Hono } from 'hono';
import { ProjectSchema } from './projects.schema';
import { requireApiKey } from '../../middleware/apiKey.ts';
import { createProject, listProjects } from './projects.repo';

const projects = new Hono();

projects.get('/', async (c) => {
    const data = await listProjects();
    return c.json({ ok: true, data });
});

projects.post('/', requireApiKey(), async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = ProjectSchema.safeParse(body);
    if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);
    const saved = await createProject(parsed.data);
    return c.json({ ok: true, data: saved }, 201);
});

export default projects;
