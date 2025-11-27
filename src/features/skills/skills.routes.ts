import { Hono } from 'hono';
import { SkillSchema, CreateSkillSchema } from './skills.schema';
import { requireApiKey } from '../../middleware/apiKey.ts';
import { createSkill, listSkills, updateSkill, deleteSkill, reorderSkills } from './skills.repo';
import { StorageService } from '../../services/storage';


const skills = new Hono();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];


skills.get('/', async (c) => {
    const data = await listSkills();
    return c.json({ ok: true, data });
});

skills.post('/', requireApiKey(), async (c) => {
    let body: any = {};
    const contentType = c.req.header('content-type');

    if (contentType?.includes('multipart/form-data')) {
        const formData = await c.req.parseBody();
        body = { ...formData };
        if (body.icon instanceof File) {
            if (body.icon.size > MAX_FILE_SIZE) {
                return c.json({ ok: false, error: 'File size exceeds 5MB limit' }, 400);
            }
            if (!ALLOWED_FILE_TYPES.includes(body.icon.type)) {
                return c.json({ ok: false, error: 'Invalid file type. Only images are allowed' }, 400);
            }
            try {
                const url = await StorageService.uploadFile(body.icon, 'skills');
                body.icon = url;
            } catch (error) {
                console.error('Error uploading file:', error);
                return c.json({ ok: false, error: 'Failed to upload file' }, 500);
            }
        }
    } else {
        body = await c.req.json().catch(() => ({}));
    }

    const parsed = CreateSkillSchema.safeParse(body);
    if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);
    const saved = await createSkill(parsed.data);
    return c.json({ ok: true, data: saved }, 201);
});

skills.put('/:id', requireApiKey(), async (c) => {
    const id = c.req.param('id');
    if (!id || id.length !== 24) {
        return c.json({ ok: false, error: 'Invalid id' }, 400);
    }

    let body: any = {};
    const contentType = c.req.header('content-type');

    if (contentType?.includes('multipart/form-data')) {
        const formData = await c.req.parseBody();
        body = { ...formData };
        if (body.icon instanceof File) {
            if (body.icon.size > MAX_FILE_SIZE) {
                return c.json({ ok: false, error: 'File size exceeds 5MB limit' }, 400);
            }
            if (!ALLOWED_FILE_TYPES.includes(body.icon.type)) {
                return c.json({ ok: false, error: 'Invalid file type. Only images are allowed' }, 400);
            }
            try {
                const url = await StorageService.uploadFile(body.icon, 'skills');
                body.icon = url;
            } catch (error) {
                console.error('Error uploading file:', error);
                return c.json({ ok: false, error: 'Failed to upload file' }, 500);
            }
        }
    } else {
        body = await c.req.json().catch(() => ({}));
    }

    const parsed = SkillSchema.safeParse(body);
    if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);
    const updated = await updateSkill({ _id: id, ...parsed.data });
    if (!updated) return c.json({ ok: false, error: 'Skill not found' }, 404);
    return c.json({ ok: true, data: updated }, 200);
});

skills.patch('/reorder', requireApiKey(), async (c) => {
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
        const data = await reorderSkills(body.items);
        return c.json({ ok: true, data }, 200);
    } catch (error) {
        return c.json({ ok: false, error: error instanceof Error ? error.message : 'Reorder failed' }, 400);
    }
});

skills.delete('/:id', requireApiKey(), async (c) => {
    const id = c.req.param('id');
    if (!id || id.length !== 24) {
        return c.json({ ok: false, error: 'Invalid id' }, 400);
    }
    try {
        await deleteSkill(id);
        return c.json({ ok: true }, 200);
    } catch {
        return c.json({ ok: false, error: 'Skill not found' }, 404);
    }
});

export default skills;
