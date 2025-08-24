import { env } from '../../config/env'
import { Resend } from 'resend'

export type SendContactEmailResult =
    | { ok: true; skipped?: true; message?: string }
    | { ok: false; error: string }

export async function sendContactEmail({
    name,
    email,
    message,
}: {
    name: string
    email: string
    message: string
}): Promise<SendContactEmailResult> {
    if (!env.RESEND_API_KEY || !env.CONTACT_TO) {
        return { ok: true, skipped: true, message: 'email send skipped (missing config)' }
    }

    const resend = new Resend(env.RESEND_API_KEY)

    try {
        const bodyLines = [
            'New contact submission',
            `Name: ${name.trim()}`,
            `Email: ${email.trim()}`,
            '',
            'Message:',
            message.trim(),
            '',
            `Received: ${new Date().toISOString()}`
        ]
        const body = bodyLines.join('\n')
        const from = env.CONTACT_FROM
        const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined

        const { data, error } = await resend.emails.send({
            from,
            to: [env.CONTACT_TO],
            subject: (name && name.trim()) || 'Contact',
            text: body,
            replyTo,
        })

        if (error) {
            if (env.NODE_ENV === 'development') {

                console.error('Resend send error raw:', error)
            }
            const errMsg =
                (error as any).message ||
                (error as any).error ||
                (error as any).name ||
                JSON.stringify(error)
            return { ok: false, error: `Resend error: ${errMsg}` }
        }

        if (!data) {
            return { ok: false, error: 'Resend error: no data returned' }
        }

        return { ok: true, message: 'Email sent successfully' }
    } catch (e) {
        return { ok: false, error: (e as Error).message }
    }
}