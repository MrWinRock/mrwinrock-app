import { env } from '../../config/env';

export async function sendContactEmail({ name, email, message }: { name: string; email: string; message: string }) {
    if (!env.RESEND_API_KEY || !env.CONTACT_TO) {

        return { ok: true, skipped: true };
    }

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: env.CONTACT_FROM,
            to: [env.CONTACT_TO],
            subject: `New contact from ${name}`,
            reply_to: email,
            text: message,
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to send email: ${res.status} ${text}`);
    }
    return { ok: true } as const;
}
