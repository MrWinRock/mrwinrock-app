import { Elysia } from 'elysia';
import { ExperienceSchema } from './experience.schema';
import { requireApiKey } from '../../middleware/apiKey.ts';
import { createExperience, listExperience } from './experience.repo';

const experience = new Elysia();

experience.get('/', async () => {
    const data = await listExperience();
    return { ok: true, data };
});

experience.post('/', async ({ body, set }) => {
    const parsed = ExperienceSchema.safeParse(body);
    if (!parsed.success) {
        set.status = 400;
        return { ok: false, error: parsed.error.flatten() };
    }
    const saved = await createExperience(parsed.data);
    set.status = 201;
    return { ok: true, data: saved };
}, {
    beforeHandle: requireApiKey()
});

export default experience;
