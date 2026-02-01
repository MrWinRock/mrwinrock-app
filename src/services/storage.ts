import { Storage } from '@google-cloud/storage';
import { env } from '../config/env';

function formatPrivateKey(key: string | undefined): string | undefined {
    if (!key) return undefined;
    if (key.includes('\n') && !key.includes('\\n')) {
        throw new Error(
            'GOOGLE_CLOUD_PRIVATE_KEY contains actual newlines. ' +
            'It should be a single-line string with literal \\n sequences. ' +
            'Please check your environment variable formatting.'
        );
    }
    return key.replace(/\\n/g, '\n');
}

let storage: Storage | null = null;
let bucket: any = null;

if (
    env.GOOGLE_CLOUD_PROJECT_ID &&
    env.GOOGLE_CLOUD_CLIENT_EMAIL &&
    env.GOOGLE_CLOUD_PRIVATE_KEY &&
    env.GOOGLE_CLOUD_BUCKET_NAME
) {
    storage = new Storage({
        projectId: env.GOOGLE_CLOUD_PROJECT_ID,
        credentials: {
            client_email: env.GOOGLE_CLOUD_CLIENT_EMAIL,
            private_key: formatPrivateKey(env.GOOGLE_CLOUD_PRIVATE_KEY),
        },
    });
    bucket = storage.bucket(env.GOOGLE_CLOUD_BUCKET_NAME);
}

export class StorageService {
    static async uploadFile(file: File, path: string): Promise<string> {
        if (!bucket) {
            throw new Error('Google Cloud Storage is not configured.');
        }

        try {
            const buffer = await file.arrayBuffer();
            const fileBuffer = Buffer.from(buffer);
            // Sanitize filename: remove any non-alphanumeric chars except dots, hyphens, and underscores
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            // Normalize path: remove trailing slashes to prevent double slashes
            const normalizedPath = path.replace(/\/+$/, '');
            const fileName = `${normalizedPath}/${sanitizedFileName}`;
            const blob = bucket.file(fileName);

            await blob.save(fileBuffer, {
                contentType: file.type,
            });

            const publicUrl = `https://storage.googleapis.com/${env.GOOGLE_CLOUD_BUCKET_NAME}/${fileName}`;
            return publicUrl;
        } catch (error) {
            throw new Error(
                `Failed to upload file "${file.name}" to path "${path}": ${error instanceof Error ? error.message : String(error)
                }`
            );
        }
    }
}
