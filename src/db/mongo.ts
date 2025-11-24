import { Db, MongoClient } from 'mongodb';
import { env } from '../config/env';
import type { Document } from 'mongodb';

let client: MongoClient | undefined;

export const DB_MRWINROCK = env.MONGODB_DB_NAME;
export const DB_LOGIC = env.MONGODB_DB_LOGIC;

export async function connectMongo(): Promise<Db> {
    if (!client) {
        client = new MongoClient(env.MONGODB_URI);
        await client.connect();
        console.log('Connected to MongoDB');
    }
    return client.db(DB_MRWINROCK);
}

export function getDb(dbName: string = DB_MRWINROCK): Db {
    if (!client) throw new Error('MongoDB not connected. Call connectMongo() at startup.');
    return client.db(dbName);
}

export function getCollection<T extends Document = Document>(name: string, dbName: string = DB_MRWINROCK) {
    return getDb(dbName).collection<T>(name);
}

export async function disconnectMongo() {
    await client?.close();
    client = undefined;
}