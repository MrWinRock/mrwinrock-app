import { z } from 'zod';

export const ContactSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    message: z.string().min(10).max(5000),
});

export type ContactInput = z.infer<typeof ContactSchema>;
