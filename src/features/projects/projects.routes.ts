import { Hono } from 'hono';
import { ProjectSchema, CreateProjectSchema } from './projects.schema';
import { requireApiKey } from '../../middleware/apiKey.ts';
import { createProject, listProjects, updateProject, deleteProject, reorderProjects } from './projects.repo';

const projects = new Hono();

projects.get('/', async (c) => {
    const data = await listProjects();
    return c.json({ ok: true, data });
});

projects.post('/', requireApiKey(), async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = CreateProjectSchema.safeParse(body);
    if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);
    const saved = await createProject(parsed.data);
    return c.json({ ok: true, data: saved }, 201);
});

projects.put('/:id', requireApiKey(), async (c) => {
    const id = c.req.param('id');
    if (!id || id.length !== 24) {
        return c.json({ ok: false, error: 'Invalid id' }, 400);
    }
    const body = await c.req.json().catch(() => ({}));
    const parsed = ProjectSchema.safeParse(body);
    if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);
    const updated = await updateProject({ _id: id, ...parsed.data });
    return c.json({ ok: true, data: updated }, 200);
});

projects.patch('/reorder', requireApiKey(), async (c) => {
    const body = await c.req.json().catch(() => ({}));

    if (!body.items || !Array.isArray(body.items)) {
        return c.json({ ok: false, error: 'Expected { items: Array<{ id, order }> }' }, 400);
    }

    for (const item of body.items) {
        if (!item.id || typeof item.id !== 'string' || item.id.length !== 24) {
            return c.json({ ok: false, error: 'Each item must have a valid 24-character id' }, 400);
        }
        if (typeof item.order !== 'number' || item.order < 0 || !Number.isInteger(item.order)) {
            return c.json({ ok: false, error: 'Each item must have a non-negative integer order' }, 400);
        }
    }

    try {
        const data = await reorderProjects(body.items);
        return c.json({ ok: true, data }, 200);
    } catch (error) {
        return c.json({ ok: false, error: error instanceof Error ? error.message : 'Reorder failed' }, 400);
    }
});

projects.delete('/:id', requireApiKey(), async (c) => {
    const id = c.req.param('id');
    if (!id || id.length !== 24) {
        return c.json({ ok: false, error: 'Invalid id' }, 400);
    }
    await deleteProject(id);
    return c.json({ ok: true }, 200);
});

export default projects;