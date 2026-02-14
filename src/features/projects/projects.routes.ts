import { Elysia } from 'elysia';
import { ProjectSchema, CreateProjectSchema } from './projects.schema';
import { requireApiKey } from '../../middleware/apiKey.ts';
import { createProject, listProjects, updateProject, deleteProject, reorderProjects } from './projects.repo';

const projects = new Elysia();

interface ReorderItem {
    id: string;
    order: number;
}

interface ReorderBody {
    items: ReorderItem[];
}

projects.get('/', async () => {
    const data = await listProjects();
    return { ok: true, data };
});

projects.post('/', async ({ body, set }) => {
    const parsed = CreateProjectSchema.safeParse(body);
    if (!parsed.success) {
        set.status = 400;
        return { ok: false, error: parsed.error.flatten() };
    }
    const saved = await createProject(parsed.data);
    set.status = 201;
    return { ok: true, data: saved };
}, {
    beforeHandle: requireApiKey()
});

projects.put('/:id', async ({ params: { id }, body, set }) => {
    if (!id || id.length !== 24) {
        set.status = 400;
        return { ok: false, error: 'Invalid id' };
    }
    const parsed = ProjectSchema.safeParse(body);
    if (!parsed.success) {
        set.status = 400;
        return { ok: false, error: parsed.error.flatten() };
    }
    const updated = await updateProject({ _id: id, ...parsed.data });
    return { ok: true, data: updated };
}, {
    beforeHandle: requireApiKey()
});

projects.patch('/reorder', async ({ body, set }) => {
    const bodyData = body as ReorderBody;
    if (!bodyData.items || !Array.isArray(bodyData.items)) {
        set.status = 400;
        return { ok: false, error: 'Expected { items: Array<{ id, order }> }' };
    }

    for (const item of bodyData.items) {
        if (!item.id || typeof item.id !== 'string' || item.id.length !== 24) {
            set.status = 400;
            return { ok: false, error: 'Each item must have a valid 24-character id' };
        }
        if (typeof item.order !== 'number' || item.order < 0 || !Number.isInteger(item.order)) {
            set.status = 400;
            return { ok: false, error: 'Each item must have a non-negative integer order' };
        }
    }

    try {
        const data = await reorderProjects(bodyData.items);
        return { ok: true, data };
    } catch (error) {
        set.status = 400;
        return { ok: false, error: error instanceof Error ? error.message : 'Reorder failed' };
    }
}, {
    beforeHandle: requireApiKey()
});

projects.delete('/:id', async ({ params: { id }, set }) => {
    if (!id || id.length !== 24) {
        set.status = 400;
        return { ok: false, error: 'Invalid id' };
    }
    await deleteProject(id);
    return { ok: true };
}, {
    beforeHandle: requireApiKey()
});

export default projects;