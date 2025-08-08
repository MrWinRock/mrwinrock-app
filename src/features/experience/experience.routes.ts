import { Hono } from 'hono';
import { ExperienceSchema } from './experience.schema';
import { requireApiKey } from '../../middleware/apiKey.ts';
import { createExperience, listExperience } from './experience.repo';

const experience = new Hono();

experience.get('/', async (c) => {
    const data = await listExperience();
    return c.json({ ok: true, data });
});

experience.post('/', requireApiKey(), async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = ExperienceSchema.safeParse(body);
    if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);
    const saved = await createExperience(parsed.data);
    return c.json({ ok: true, data: saved }, 201);
});

export default experience;
