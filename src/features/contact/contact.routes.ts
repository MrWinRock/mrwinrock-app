import { Hono } from 'hono';
import { ContactSchema } from './contact.schema';
import { sendContactEmail } from './contact.service';

const contact = new Hono();

contact.post('/', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = ContactSchema.safeParse(body);
    if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);

    const result = await sendContactEmail(parsed.data);

    if (!result.ok) {
        return c.json({ ok: false, error: result.error }, 500);
    }

    return c.json({
        ok: true,
        message: result.message ?? (result.skipped ? 'Email send skipped' : 'Email sent'),
        skipped: result.skipped || undefined
    });
});

export default contact;