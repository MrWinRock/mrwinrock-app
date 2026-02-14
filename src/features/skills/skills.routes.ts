import { Elysia } from 'elysia';
import { SkillSchema, CreateSkillSchema } from './skills.schema';
import { requireApiKey } from '../../middleware/apiKey.ts';
import { createSkill, listSkills, updateSkill, deleteSkill, reorderSkills } from './skills.repo';
import { StorageService } from '../../services/storage';

const skills = new Elysia();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

skills.get('/', async () => {
    const data = await listSkills();
    return { ok: true, data };
});

type SkillRequestBody = {
    name: string;
    category?: string;
    icon?: File | string;
    order?: number | string;
};


async function processSkillBody(request: Request): Promise<Partial<SkillRequestBody>> {
    const contentType = request.headers.get('content-type');
    let body: Partial<SkillRequestBody> = {};

    if (contentType?.includes('multipart/form-data')) {
        const formData = await request.formData();
        body = Object.fromEntries(formData.entries()) as unknown as Partial<SkillRequestBody>;

        // Convert order to number if it's a string
        if (typeof body.order === 'string') {
            const parsedOrder = parseInt(body.order, 10);
            if (!isNaN(parsedOrder)) {
                body.order = parsedOrder;
            }
        }

        if (body.icon instanceof File) {
            const file = body.icon;
            if (file.size > MAX_FILE_SIZE) {
                throw new Error('File size exceeds 5MB limit');
            }
            if (!ALLOWED_FILE_TYPES.includes(file.type)) {
                throw new Error('Invalid file type. Only images are allowed');
            }
            try {
                const url = await StorageService.uploadFile(file, 'skills/icons/');
                body.icon = url;
            } catch (error) {
                console.error(
                    `Error uploading file for skill. Filename: ${file.name}, Type: ${file.type}, Size: ${file.size}. Error:`,
                    error
                );
                throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    } else {
        try {
            body = await request.json() as SkillRequestBody;
        } catch {
            body = {};
        }
    }
    return body;
}

skills.post('/', async ({ request, set }) => {
    try {
        const body = await processSkillBody(request);
        const parsed = CreateSkillSchema.safeParse(body);
        if (!parsed.success) {
            set.status = 400;
            return { ok: false, error: parsed.error.flatten() };
        }
        const saved = await createSkill(parsed.data);
        set.status = 201;
        return { ok: true, data: saved };
    } catch (error: any) {
        const status = error.message?.startsWith('Failed to upload') ? 500 : 400;
        set.status = status;
        return { ok: false, error: error.message || 'Invalid request' };
    }
}, {
    beforeHandle: requireApiKey()
});

skills.put('/:id', async ({ params: { id }, request, set }) => {
    if (!id || id.length !== 24) {
        set.status = 400;
        return { ok: false, error: 'Invalid id' };
    }

    try {
        const body = await processSkillBody(request);
        const parsed = SkillSchema.safeParse(body);
        if (!parsed.success) {
            set.status = 400;
            return { ok: false, error: parsed.error.flatten() };
        }
        const updated = await updateSkill({ _id: id, ...parsed.data });
        if (!updated) {
            set.status = 404;
            return { ok: false, error: 'Skill not found' };
        }
        return { ok: true, data: updated };
    } catch (error: any) {
        const status = error.message?.startsWith('Failed to upload') ? 500 : 400;
        set.status = status;
        return { ok: false, error: error.message || 'Invalid request' };
    }
}, {
    beforeHandle: requireApiKey()
});

skills.patch('/reorder', async ({ body, set }) => {
    const bodyData = body as any;
    if (!bodyData.items || !Array.isArray(bodyData.items)) {
        set.status = 400;
        return { ok: false, error: 'Expected { items: Array<{ id, order }> }' };
    }

    for (const item of bodyData.items) {
        if (!item.id || typeof item.id !== 'string' || item.id.length !== 24) {
            set.status = 400;
            return { ok: false, error: 'Each item must have a valid 24-character id' };
        }
        if (typeof item.order !== 'number' || item.order < 0 || !Number.isInteger(item.order)) {
            set.status = 400;
            return { ok: false, error: 'order must be a non-negative integer' };
        }
    }

    try {
        const data = await reorderSkills(bodyData.items);
        return { ok: true, data };
    } catch (error) {
        set.status = 400;
        return { ok: false, error: error instanceof Error ? error.message : 'Reorder failed' };
    }
}, {
    beforeHandle: requireApiKey()
});

skills.delete('/:id', async ({ params: { id }, set }) => {
    if (!id || id.length !== 24) {
        set.status = 400;
        return { ok: false, error: 'Invalid id' };
    }
    try {
        await deleteSkill(id);
        return { ok: true };
    } catch {
        set.status = 404;
        return { ok: false, error: 'Skill not found' };
    }
}, {
    beforeHandle: requireApiKey()
});

export default skills;
