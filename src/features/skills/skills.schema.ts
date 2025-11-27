import { z } from 'zod';

export const SkillSchema = z.object({
    name: z.string().min(1),
    category: z.string().optional(),
    icon: z.string().url().optional(),
    order: z.number().int().nonnegative().default(0),
});

export const CreateSkillSchema = SkillSchema.omit({ order: true });

export type SkillInput = z.infer<typeof SkillSchema>;
export type CreateSkillInput = z.infer<typeof CreateSkillSchema>;
