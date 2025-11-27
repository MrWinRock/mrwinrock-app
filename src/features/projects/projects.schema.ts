import { z } from 'zod';

export const ProjectSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    url: z.string().url().optional(),
    repo: z.string().url().optional(),
    tech: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    order: z.number().int().nonnegative().default(0),
});

export const CreateProjectSchema = ProjectSchema.omit({ order: true });

export type ProjectInput = z.infer<typeof ProjectSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
