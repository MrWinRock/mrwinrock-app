import { Hono } from 'hono';
import { SkillSchema } from './skills.schema';
import { requireApiKey } from '../../middleware/apiKey.ts';
import { createSkill, listSkills } from './skills.repo';

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

export default skills;
