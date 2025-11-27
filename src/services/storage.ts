import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env';

const storage = new Storage({
    projectId: env.GOOGLE_CLOUD_PROJECT_ID,
    credentials: {
        client_email: env.GOOGLE_CLOUD_CLIENT_EMAIL,
        private_key: env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
});

const bucket = storage.bucket(env.GOOGLE_CLOUD_BUCKET_NAME);

export class StorageService {
    static async uploadFile(file: File, path: string): Promise<string> {
        const buffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(buffer);
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${path}/${randomUUID()}-${sanitizedFileName}`;
        const blob = bucket.file(fileName);

        await blob.save(fileBuffer, {
            contentType: file.type,
        });

        return blob.publicUrl();
    }
}
