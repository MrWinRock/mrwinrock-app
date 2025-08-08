import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const root = process.cwd();
const envFiles = [
    `.env.${NODE_ENV}.local`,
    NODE_ENV !== 'test' ? '.env.local' : undefined,
    `.env.${NODE_ENV}`,
    '.env',
].filter(Boolean) as string[];

for (const file of envFiles) {
    const full = path.resolve(root, file);
    if (fs.existsSync(full)) {
        dotenv.config({ path: full, override: false });
    }
}

const EnvSchema = z.object({
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    PORT: z.coerce.number().default(5000),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    RESEND_API_KEY: z.string().optional(),
    CONTACT_TO: z.string().optional(),
    CONTACT_FROM: z.string().default('Portfolio <onboarding@resend.dev>'),
    API_KEY: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);