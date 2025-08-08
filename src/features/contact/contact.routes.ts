import { Hono } from 'hono';
import { ContactSchema } from './contact.schema';
import { sendContactEmail } from './contact.service';

const contact = new Hono();

contact.post('/', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = ContactSchema.safeParse(body);
    if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);

    try {
        await sendContactEmail(parsed.data);
        return c.json({ ok: true });
    } catch (e) {
        return c.json({ ok: false, error: (e as Error).message }, 500);
    }
});

export default contact;
