import { getCollection } from '../../db/mongo';
import type { SkillInput } from './skills.schema';

const collection = () => getCollection<SkillInput>('skills');

export async function listSkills() {
    return collection().find({}).sort({ order: 1, name: 1 }).toArray();
}

export async function createSkill(doc: SkillInput) {
    const res = await collection().insertOne(doc);
    return { ...doc, _id: res.insertedId };
}
