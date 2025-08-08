import { getCollection } from '../../db/mongo';
import type { ExperienceInput } from './experience.schema';

const collection = () => getCollection<ExperienceInput>('experience');

export async function listExperience() {
    return collection().find({}).sort({ order: 1, startDate: -1 }).toArray();
}

export async function createExperience(doc: ExperienceInput) {
    const res = await collection().insertOne(doc);
    return { ...doc, _id: res.insertedId };
}
