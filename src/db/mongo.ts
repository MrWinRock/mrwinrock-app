import { Db, MongoClient } from 'mongodb';
import { env } from '../config/env';

let client: MongoClient | undefined;
let db: Db | undefined;

export async function connectMongo(): Promise<Db> {
    if (db) return db;
    client = new MongoClient(env.MONGODB_URI);
    await client.connect();
    db = client.db();
    return db;
}

export function getDb(): Db {
    if (!db) throw new Error('MongoDB not connected. Call connectMongo() at startup.');
    return db;
}

import type { Document } from 'mongodb';

export function getCollection<T extends Document = Document>(name: string) {
    return getDb().collection<T>(name);
}

export async function disconnectMongo() {
    await client?.close();
    client = undefined;
    db = undefined;
}