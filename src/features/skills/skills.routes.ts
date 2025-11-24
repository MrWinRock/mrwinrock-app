import { Hono } from 'hono';
import { SkillSchema } from './skills.schema';
import { requireApiKey } from '../../middleware/apiKey.ts';
import { createSkill, listSkills, updateSkill, deleteSkill } from './skills.repo';

const skills = new Hono();

skills.get('/', async (c) => {
    const data = await listSkills();
    return c.json({ ok: true, data });
});

skills.post('/', requireApiKey(), async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = SkillSchema.safeParse(body);
    if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);
    const saved = await createSkill(parsed.data);
    return c.json({ ok: true, data: saved }, 201);
});

skills.put('/:id', requireApiKey(), async (c) => {
    const id = c.req.param('id');
    if (!id || id.length !== 24) {
        return c.json({ ok: false, error: 'Invalid id' }, 400);
    }
    const body = await c.req.json().catch(() => ({}));
    const parsed = SkillSchema.safeParse(body);
    if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);
    const updated = await updateSkill({ _id: id, ...parsed.data });
    if (!updated) return c.json({ ok: false, error: 'Skill not found' }, 404);
    return c.json({ ok: true, data: updated }, 200);
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
