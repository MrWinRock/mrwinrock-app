import { Elysia } from 'elysia';
import { ContactSchema } from './contact.schema';
import { sendContactEmail } from './contact.service';

const contact = new Elysia();

contact.post('/', async ({ body, set }) => {
    const parsed = ContactSchema.safeParse(body);
    if (!parsed.success) {
        set.status = 400;
        return { ok: false, error: parsed.error.flatten() };
    }

    const result = await sendContactEmail(parsed.data);

    if (!result.ok) {
        set.status = 500;
        return { ok: false, error: result.error };
    }

    return {
        ok: true,
        message: result.message ?? (result.skipped ? 'Email send skipped' : 'Email sent'),
        skipped: result.skipped || undefined
    };
});

export default contact;