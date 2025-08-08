import { z } from 'zod';

export const ExperienceSchema = z.object({
    company: z.string().min(1),
    role: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    tech: z.array(z.string()).default([]),
    order: z.number().int().nonnegative().default(0),
});

export type ExperienceInput = z.infer<typeof ExperienceSchema>;
